from fastapi import APIRouter, Depends, Query
from typing import Optional, Any, Dict, List
import pyodbc
from app.db_connection import get_db

router = APIRouter()


def _has_column(db: pyodbc.Connection, table: str, column: str) -> bool:
	cur = db.cursor()
	row = cur.execute(
		"SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?",
		(table, column),
	).fetchone()
	return bool(row)


def _get_program_param(db: pyodbc.Connection, key: str, default: Optional[str] = None) -> Optional[str]:
	cur = db.cursor()
	row = cur.execute("SELECT ParamValue FROM ProgrammParameters WHERE ParamKey= ?", (key,)).fetchone()
	return row[0] if row and row[0] is not None else default

# --- added helper for default price category ---

def _get_default_price_category_id(db: pyodbc.Connection) -> Optional[int]:
	"""Визначає категорію цін за замовчуванням.
	Порядок: ProgrammParameters.DefaultPriceCategoryID -> IsDefault=1 -> назва ~ 'роздр' -> перша за ID.
	"""
	try:
		val = _get_program_param(db, "DefaultPriceCategoryID")
		if val:
			cid = int(val)
			r = db.cursor().execute("SELECT ID FROM PriceCategories WHERE ID = ?", (cid,)).fetchone()
			if r:
				return cid
	except Exception:
		pass
	cur = db.cursor()
	try:
		if _has_column(db, "PriceCategories", "IsDefault"):
			row = cur.execute("SELECT TOP 1 ID FROM PriceCategories WHERE IsDefault = 1 ORDER BY ID").fetchone()
			if row:
				return int(row[0])
	except Exception:
		pass
	try:
		row = cur.execute("SELECT TOP 1 ID FROM PriceCategories WHERE CategoryName LIKE N'%роздр%' ORDER BY ID").fetchone()
		if row:
			return int(row[0])
	except Exception:
		pass
	try:
		row = cur.execute("SELECT TOP 1 ID FROM PriceCategories ORDER BY ID").fetchone()
		if row:
			return int(row[0])
	except Exception:
		pass
	return None


@router.get("/stock/state")
def stock_state(
	center_id: Optional[int] = Query(None),
	warehouse_id: Optional[int] = Query(None),
	on_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
	price_category_id: Optional[int] = Query(None),
	search: Optional[str] = Query(None, description="Пошук: штрихкод/повна назва/артикул"),
	category_id: Optional[int] = Query(None),
	qty_filter: Optional[str] = Query(None, description="in_stock|negative|zero"),
	only_weight: Optional[bool] = Query(False),
	only_piece: Optional[bool] = Query(False),
	db: pyodbc.Connection = Depends(get_db),
):
	# 1) Базовий набір залишків із партій
	has_rem = _has_column(db, "Parties", "RemainingQty")

	join_center = ""
	where_center = []
	params: List[Any] = []
	if center_id:
		join_center = " JOIN Warehouses w ON w.ID = p.WarehouseID "
		where_center.append(" w.CenterID = ? ")
		params.append(center_id)
	if warehouse_id:
		where_center.append(" p.WarehouseID = ? ")
		params.append(warehouse_id)

	where_sql = (" WHERE " + " AND ".join(where_center)) if where_center else ""

	qty_expr = "SUM(p.RemainingQty)" if has_rem else "SUM(p.Quantity)"
	base_sql = (
		"SELECT p.ProductID, p.WarehouseID, " + qty_expr + " AS Qty, "
		"SUM(CASE WHEN " + ("p.RemainingQty" if has_rem else "p.Quantity") + 
		" > 0 THEN (" + ("p.RemainingQty" if has_rem else "p.Quantity") + ") * ISNULL(p.PurchasePrice,0) ELSE 0 END) AS AmountCost "
		"FROM Parties p " + join_center + where_sql + " GROUP BY p.ProductID, p.WarehouseID"
	)

	cur = db.cursor()
	rows = cur.execute(base_sql, tuple(params)).fetchall()

	# Map product info
	prod_ids = list({int(r[0]) for r in rows})
	products: Dict[int, Dict[str, Any]] = {}
	if prod_ids:
		in_placeholders = ",".join(["?"] * len(prod_ids))
		extra_cols: List[str] = []  # raw column names from Products to fetch
		# Додаткові атрибути, якщо існують
		has_isweight = _has_column(db, "Products", "IsWeight") or _has_column(db, "Products", "IsWeighted")
		has_category = _has_column(db, "Products", "CategoryID")
		select_cols = ["ID", "FullName", "Barcode", "Article", "Photo"]
		if has_isweight:
			# пробуємо обидва варіанти назв
			if _has_column(db, "Products", "IsWeight"):
				select_cols.append("IsWeight")
				extra_cols.append("IsWeight")
			elif _has_column(db, "Products", "IsWeighted"):
				select_cols.append("IsWeighted")
				extra_cols.append("IsWeighted")
		if has_category:
			select_cols.append("CategoryID")
			extra_cols.append("CategoryID")

		# Кастомні поля з ProductCardTemplateFields (всі створені), без дублікатів стандартних
		custom_cols: List[str] = []
		try:
			std_sql = {"FullName", "Barcode", "Article", "Photo", "CategoryID", "IsWeight", "IsWeighted"}
			rows_cf = cur.execute(
				"SELECT DISTINCT SqlName FROM ProductCardTemplateFields WHERE SqlName IS NOT NULL AND LTRIM(RTRIM(SqlName)) <> ''"
			).fetchall() or []
			for row_cf in rows_cf:
				sql_name = str(row_cf[0]).strip()
				if not sql_name:
					continue
				if sql_name in std_sql:
					continue
				# Перевіряємо, що така колонка реально існує в Products
				if _has_column(db, "Products", sql_name):
					# Уникаємо повторів у вибірці
					if sql_name not in select_cols:
						select_cols.append(sql_name)
						extra_cols.append(sql_name)
						custom_cols.append(sql_name)
		except Exception:
			custom_cols = []

		info = cur.execute(
			f"SELECT {', '.join(select_cols)} FROM Products WHERE ID IN ({in_placeholders})",
			tuple(prod_ids),
		).fetchall()
		for r in info:
			data = {
				"FullName": r[1],
				"Barcode": r[2],
				"Article": r[3],
				"Photo": r[4],
			}
			idx = 5
			for col in extra_cols:
				val = r[idx]
				# Для відомих службових полів кладемо як є
				if col in ("IsWeight", "IsWeighted", "CategoryID"):
					data[col] = val
				else:
					# Кладемо в custom_<sql>
					key = f"custom_{col.lower()}"
					data[key] = val
				idx += 1
			products[int(r[0])] = data

		# Додатково: значення з таблиці ProductAttributes (динамічні поля)
		try:
			attrs = cur.execute(
				f"""
				SELECT pa.ProductID, f.SqlName, pa.AttrValue
				FROM ProductAttributes pa
				JOIN ProductCardTemplateFields f ON f.ID = pa.FieldID
				WHERE pa.ProductID IN ({in_placeholders}) AND f.SqlName IS NOT NULL AND LTRIM(RTRIM(f.SqlName)) <> ''
				""",
				tuple(prod_ids),
			).fetchall() or []
			std_sql = {"FullName", "Barcode", "Article", "Photo", "CategoryID", "IsWeight", "IsWeighted"}
			for pid, sql_name, value in attrs:
				if not sql_name:
					continue
				sql = str(sql_name).strip()
				if not sql or sql in std_sql:
					continue
				key = f"custom_{sql.lower()}"
				if int(pid) not in products:
					products[int(pid)] = {}
				products[int(pid)][key] = value
		except Exception:
			pass

	# 2) Підбір ціни продажу (за моделлю глобально/по центру)
	price_model = (_get_program_param(db, "PriceModel", "global") or "global").lower()
	on_date_val = on_date
	effective_price_category_id = price_category_id or _get_default_price_category_id(db)

	def resolve_price(product_id: int) -> Optional[float]:
		# Коли модель by_center і задано центр — спочатку шукаємо по центру, далі глобальна
		if price_model == "by_center" and center_id:
			parts = ["ProductID=?"]
			params: List[Any] = [product_id]
			if effective_price_category_id:
				parts.append("PriceCategoryID=?")
				params.append(effective_price_category_id)
			if on_date_val:
				parts.append("DateStart <= ?")
				params.append(on_date_val)
				parts.append("(DateEnd IS NULL OR DateEnd >= ?)")
				params.append(on_date_val)
			parts.append("ISNULL(CenterID,0)=ISNULL(?,0)")
			params.append(center_id)
			sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
			row = cur.execute(sql, tuple(params)).fetchone()
			if row:
				return float(row[0])
			# fallback: глобальна
			parts = ["ProductID=?"]
			params = [product_id]
			if effective_price_category_id:
				parts.append("PriceCategoryID=?")
				params.append(effective_price_category_id)
			if on_date_val:
				parts.append("DateStart <= ?")
				params.append(on_date_val)
				parts.append("(DateEnd IS NULL OR DateEnd >= ?)")
				params.append(on_date_val)
			parts.append("ISNULL(CenterID,0)=0")
			sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
			row = cur.execute(sql, tuple(params)).fetchone()
			if row:
				return float(row[0])
			# якщо на дату не знайшли, беремо останній глобальний без обмеження по даті
			parts = ["ProductID=?"]
			params = [product_id]
			if effective_price_category_id:
				parts.append("PriceCategoryID=?")
				params.append(effective_price_category_id)
			parts.append("ISNULL(CenterID,0)=0")
			sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
			row = cur.execute(sql, tuple(params)).fetchone()
			return float(row[0]) if row else None
		# Всі інші випадки: остання актуальна ціна (без фільтра по центру)
		parts = ["ProductID=?"]
		params: List[Any] = [product_id]
		if effective_price_category_id:
			parts.append("PriceCategoryID=?")
			params.append(effective_price_category_id)
		if on_date_val:
			parts.append("DateStart <= ?")
			params.append(on_date_val)
			parts.append("(DateEnd IS NULL OR DateEnd >= ?)")
			params.append(on_date_val)
		sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
		row = cur.execute(sql, tuple(params)).fetchone()
		return float(row[0]) if row else None

	# Підбір записаної ціни зі знижкою (PriceWithDiscount) за тими ж правилами
	def resolve_discount_price(product_id: int) -> Optional[float]:
		parts = ["ProductID=?"]
		params2: List[Any] = [product_id]
		if effective_price_category_id:
			parts.append("PriceCategoryID=?")
			params2.append(effective_price_category_id)
		if on_date_val:
			parts.append("DateStart <= ?")
			params2.append(on_date_val)
			parts.append("(DateEnd IS NULL OR DateEnd >= ?)")
			params2.append(on_date_val)
		order_sql = " ORDER BY DateStart DESC, ID DESC"
		if price_model == "by_center" and center_id:
			parts.append("ISNULL(CenterID,0)=ISNULL(?,0)")
			params2.append(center_id)
		# читаємо PriceWithDiscount
		sql2 = "SELECT TOP 1 PriceWithDiscount FROM ProductPrices WHERE " + " AND ".join(parts) + order_sql
		row2 = cur.execute(sql2, tuple(params2)).fetchone()
		return (None if (not row2 or row2[0] is None) else float(row2[0]))

	items: List[Dict[str, Any]] = []
	for r in rows:
		pid = int(r[0])
		wid = int(r[1]) if r[1] is not None else None
		qty = float(r[2] or 0)
		amount_cost = float(r[3] or 0)
		avg_cost = (amount_cost / qty) if qty else 0.0
		prod = products.get(pid, {})
		price = resolve_price(pid) or 0.0
		price_disc = resolve_discount_price(pid)
		# Визначаємо ваговий товар ТІЛЬКИ за полем у БД, без інференсу з штрихкоду
		is_weight = bool(prod.get("IsWeight") or prod.get("IsWeighted") or False)
		base_item = {
			"ProductID": pid,
			"WarehouseID": wid,
			"FullName": prod.get("FullName", ""),
			"Barcode": prod.get("Barcode", ""),
			"Article": prod.get("Article", ""),
			"Photo": prod.get("Photo"),
			"CategoryID": prod.get("CategoryID"),
			"IsWeight": is_weight,
			"Qty": qty,
			"AvgCost": avg_cost,
			"Price": price,
			"Amount": qty * price,
			"PriceWithDiscount": price_disc,
		}
		# Додаємо всі кастомні поля (custom_*) в рядок відповіді
		try:
			custom_pairs = {k: v for k, v in prod.items() if isinstance(k, str) and k.startswith("custom_")}
			if custom_pairs:
				base_item.update(custom_pairs)
		except Exception:
			pass
		items.append(base_item)

	# --- Пошук і фільтри на боці сервера ---
	s = (search or "").strip().lower()
	if s:
		def _match(it: Dict[str, Any]) -> bool:
			return (
				(it.get("Barcode") or "").lower().find(s) >= 0
				or (it.get("FullName") or "").lower().find(s) >= 0
				or (it.get("Article") or "").lower().find(s) >= 0
			)
		items = [it for it in items if _match(it)]

	if category_id:
		items = [it for it in items if int(it.get("CategoryID") or 0) == int(category_id)]

	if qty_filter == "in_stock":
		items = [it for it in items if float(it.get("Qty") or 0) > 0]
	elif qty_filter == "negative":
		items = [it for it in items if float(it.get("Qty") or 0) < 0]
	elif qty_filter == "zero":
		items = [it for it in items if float(it.get("Qty") or 0) == 0]

	if only_weight:
		items = [it for it in items if bool(it.get("IsWeight"))]
	if only_piece:
		items = [it for it in items if not bool(it.get("IsWeight"))]

	return {"items": items}


@router.get("/stock/state/available-fields")
def available_fields(db: pyodbc.Connection = Depends(get_db)):
	"""Повертає повний список доступних колонок для 'Стан складу':
	- standard: стандартні колонки
	- custom: додаткові поля з ProductCardTemplateFields (всі шаблони)
	"""
	standard = [
		{"key": "photo", "label": "Фото", "sql": "Photo", "group": "standard"},
		{"key": "name", "label": "Товар", "sql": "FullName", "group": "standard"},
		{"key": "barcode", "label": "Штрихкод", "sql": "Barcode", "group": "standard"},
		{"key": "article", "label": "Артикул", "sql": "Article", "group": "standard"},
		{"key": "qty", "label": "К-сть", "sql": "Qty", "group": "standard"},
		{"key": "price", "label": "Ціна", "sql": "Price", "group": "standard"},
		{"key": "avgcost", "label": "Сер.собівартість", "sql": "AvgCost", "group": "standard"},
		{"key": "amount", "label": "Сума", "sql": "Amount", "group": "standard"},
	]

	cur = db.cursor()
	try:
		cur.execute(
			"""
			SELECT DISTINCT DisplayName, SqlName, FieldType, TemplateID
			FROM ProductCardTemplateFields
			ORDER BY DisplayName
			"""
		)
		rows = cur.fetchall() or []
		std_sql = {"FullName", "Barcode", "Article", "Photo", "Qty", "Price", "AvgCost", "Amount"}
		seen_keys = set()
		custom: List[Dict[str, Any]] = []
		for row in rows:
			sql = (row[1] or "").strip()
			label = (row[0] or row[1] or "—").strip()
			if not sql:
				# Без SqlName пропускаємо, щоб не дублювати стандартні/невідомі
				continue
			if sql in std_sql:
				continue
			key = f"custom_{sql.lower()}"
			if key in seen_keys:
				continue
			custom.append({
				"key": key,
				"label": label,
				"sql": sql,
				"type": row[2] or None,
				"templateId": int(row[3]) if row[3] is not None else None,
				"group": "custom",
			})
			seen_keys.add(key)
	except Exception:
		custom = []

	return {"standard": standard, "custom": custom}

