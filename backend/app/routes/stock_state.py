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


def _table_exists(db: pyodbc.Connection, table: str) -> bool:
	cur = db.cursor()
	row = cur.execute(
		"SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?",
		(table,),
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
	only_service: Optional[bool] = Query(False),
	db: pyodbc.Connection = Depends(get_db),
):
	# 1) Базовий набір залишків: якщо є StockBalances — беремо з нього, інакше з Parties
	use_balances = _table_exists(db, "StockBalances")

	# Визначаємо, чи обрано склад типу write_off (уцінка)
	is_writeoff = False
	if warehouse_id:
		try:
			row_w = db.cursor().execute("SELECT Type FROM Warehouses WHERE ID=?", (warehouse_id,)).fetchone()
			if row_w and str(row_w[0] or '').strip().lower() == 'write_off':
				is_writeoff = True
		except Exception:
			is_writeoff = False

	join_center = ""
	where_center = []
	params: List[Any] = []
	if center_id:
		join_center = " JOIN Warehouses w ON w.ID = sb.WarehouseID " if use_balances else " JOIN Warehouses w ON w.ID = p.WarehouseID "
		where_center.append(" w.CenterID = ? ")
		params.append(center_id)
	if warehouse_id:
		where_center.append(" sb.WarehouseID = ? " if use_balances else " p.WarehouseID = ? ")
		params.append(warehouse_id)

	where_sql = (" WHERE " + " AND ".join(where_center)) if where_center else ""

	if use_balances:
		base_sql = (
			"SELECT sb.ProductID, sb.WarehouseID, SUM(sb.Quantity) AS Qty, 0 AS AmountCost "
			"FROM StockBalances sb " + join_center + where_sql + " GROUP BY sb.ProductID, sb.WarehouseID"
		)
	else:
		has_rem = _has_column(db, "Parties", "RemainingQty")
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

	# Вирахуємо середню собівартість по Parties (навіть якщо основне джерело залишків — StockBalances)
	avg_cost_by_pid: Dict[int, float] = {}
	if prod_ids:
		try:
			in_ph = ",".join(["?"] * len(prod_ids))
			has_rem_col = _has_column(db, "Parties", "RemainingQty")
			qty_col = "p.RemainingQty" if has_rem_col else "p.Quantity"
			join_sql = ""
			where_sql2_parts: List[str] = []
			params2: List[Any] = []
			if center_id:
				join_sql = " JOIN Warehouses w2 ON w2.ID = p.WarehouseID "
				where_sql2_parts.append(" w2.CenterID = ? ")
				params2.append(center_id)
			if warehouse_id:
				where_sql2_parts.append(" p.WarehouseID = ? ")
				params2.append(warehouse_id)
			where_sql2 = (" WHERE " + " AND ".join(where_sql2_parts)) if where_sql2_parts else ""
			if where_sql2:
				q = (
					"SELECT p.ProductID, "
					f"CASE WHEN SUM(CASE WHEN {qty_col} > 0 THEN {qty_col} ELSE 0 END) > 0 "
					f"THEN SUM(CASE WHEN {qty_col} > 0 THEN {qty_col} * ISNULL(p.PurchasePrice,0) ELSE 0 END) / "
					f"SUM(CASE WHEN {qty_col} > 0 THEN {qty_col} ELSE 0 END) ELSE 0 END AS AvgCost "
					"FROM Parties p " + join_sql + where_sql2 + f" AND p.ProductID IN ({in_ph}) "
				)
			else:
				q = (
					"SELECT p.ProductID, "
					f"CASE WHEN SUM(CASE WHEN {qty_col} > 0 THEN {qty_col} ELSE 0 END) > 0 "
					f"THEN SUM(CASE WHEN {qty_col} > 0 THEN {qty_col} * ISNULL(p.PurchasePrice,0) ELSE 0 END) / "
					f"SUM(CASE WHEN {qty_col} > 0 THEN {qty_col} ELSE 0 END) ELSE 0 END AS AvgCost "
					"FROM Parties p " + f"WHERE p.ProductID IN ({in_ph}) "
				)
			q += " GROUP BY p.ProductID"
			rows_avg = cur.execute(q, tuple(params2 + prod_ids)).fetchall() or []
			for pid, av in rows_avg:
				avg_cost_by_pid[int(pid)] = float(av or 0)
		except Exception:
			avg_cost_by_pid = {}
	products: Dict[int, Dict[str, Any]] = {}
	if prod_ids:
		in_placeholders = ",".join(["?"] * len(prod_ids))
		extra_cols: List[str] = []  # raw column names from Products to fetch
		# Додаткові атрибути, якщо існують
		has_isweight = _has_column(db, "Products", "IsWeight") or _has_column(db, "Products", "IsWeighted")
		has_category = _has_column(db, "Products", "CategoryID")
		has_manufacturer = _has_column(db, "Products", "ManufacturerID")
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
		if has_manufacturer:
			select_cols.append("ManufacturerID")
			extra_cols.append("ManufacturerID")

		# Кастомні поля з ProductCardTemplateFields (всі створені), без дублікатів стандартних
		custom_cols: List[str] = []
		try:
			std_sql = {"FullName", "Barcode", "Article", "Photo", "CategoryID", "ManufacturerID", "IsWeight", "IsWeighted"}
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
				if col in ("IsWeight", "IsWeighted", "CategoryID", "ManufacturerID"):
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
			std_sql = {"FullName", "Barcode", "Article", "Photo", "CategoryID", "ManufacturerID", "IsWeight", "IsWeighted"}
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

	# Якщо обрано склад уцінки — підвантажуємо штрихкоди уцінки та ціни з останніх записаних документів уцінки
	discount_barcode_by_product: Dict[int, str] = {}
	discount_price_by_product: Dict[int, float] = {}
	if is_writeoff and prod_ids:
		try:
			placeholders = ",".join(["?"] * len(prod_ids))
			rows_bc = db.cursor().execute(
				f"SELECT ProductID, DiscountBarcode FROM ProductDiscountBarcodes WHERE WarehouseID=? AND ProductID IN ({placeholders})",
				(warehouse_id, *prod_ids),
			).fetchall() or []
			for pid, bc in rows_bc:
				discount_barcode_by_product[int(pid)] = str(bc)
		except Exception:
			pass
		# Ціна уцінки – з останніх posted документів по цьому складу
		try:
			placeholders = ",".join(["?"] * len(prod_ids))
			query = (
				"SELECT di.ProductID, di.Price "
				"FROM DiscountDocItems di "
				"JOIN DiscountDocs d ON d.ID = di.DocID "
				"WHERE d.WarehouseID = ? AND d.Status = 'posted' AND di.ProductID IN (" + placeholders + ") "
				"ORDER BY di.ID DESC"
			)
			rows_dp = db.cursor().execute(query, (warehouse_id, *prod_ids)).fetchall() or []
			for pid, price in rows_dp:
				if int(pid) not in discount_price_by_product:
					discount_price_by_product[int(pid)] = float(price or 0)
		except Exception:
			pass


	# Підтягнемо назви виробників, якщо у product info є ManufacturerID
	manu_ids = {int(p.get("ManufacturerID")) for p in products.values() if p.get("ManufacturerID") is not None}
	manufacturers: Dict[int, str] = {}
	if manu_ids:
		placeholders = ",".join(["?"] * len(manu_ids))
		try:
			rows_m = cur.execute(
				f"SELECT ID, Name, Country FROM Manufacturers WHERE ID IN ({placeholders})",
				tuple(manu_ids),
			).fetchall() or []
			for mid, mname, mcountry in rows_m:
				label = str(mname or "").strip()
				if mcountry:
					cc = str(mcountry).strip()
					if cc:
						label = f"{label} ({cc})"
				manufacturers[int(mid)] = label
		except Exception:
			manufacturers = {}

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
		avg_cost = (avg_cost_by_pid.get(pid, 0.0) if use_balances else ((amount_cost / qty) if qty else 0.0))
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
			"Manufacturer": manufacturers.get(int(prod.get("ManufacturerID")) if prod.get("ManufacturerID") is not None else None),
			"IsWeight": is_weight,
			"Qty": qty,
			"AvgCost": avg_cost,
			"Price": price,
			"Amount": qty * price,
			"PriceWithDiscount": price_disc,
		}
		# Якщо склад уцінки — підміняємо штрихкод та уцінену ціну
		if is_writeoff:
			if pid in discount_barcode_by_product:
				base_item["Barcode"] = discount_barcode_by_product[pid]
			if pid in discount_price_by_product:
				base_item["PriceWithDiscount"] = discount_price_by_product[pid]
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

	# Визначення типу категорії (послуга/товар) за полем Categories.ProductType
	def _is_service_value(val: Any) -> bool:
		try:
			if val is None:
				return False
			# числові коди (наприклад, 3) або рядки типу 'service', 'послуга'
			if isinstance(val, (int, float)):
				return int(val) in {3, 4}  # покриваємо можливі коди для послуг
			text = str(val).strip().lower()
			return text in {"service", "послуга", "послуги", "srv"}
		except Exception:
			return False

	if only_weight or only_piece or only_service:
		# Підтягуємо типи категорій лише для потрібних кейсів
		cat_ids = {int(it.get("CategoryID")) for it in items if it.get("CategoryID") is not None}
		cat_types: Dict[int, Any] = {}
		if cat_ids:
			placeholders = ",".join(["?"] * len(cat_ids))
			try:
				rows_ct = db.cursor().execute(
					f"SELECT ID, ProductType FROM Categories WHERE ID IN ({placeholders})",
					tuple(cat_ids),
				).fetchall() or []
				for cid, ptype in rows_ct:
					cat_types[int(cid)] = ptype
			except Exception:
				cat_types = {}

		if only_service:
			items = [it for it in items if _is_service_value(cat_types.get(int(it.get("CategoryID") or 0)))]
		elif only_piece:
			# Штучні = не вагові і не послуги
			items = [
				it
				for it in items
				if (not bool(it.get("IsWeight"))) and (not _is_service_value(cat_types.get(int(it.get("CategoryID") or 0))))
			]
		elif only_weight:
			# вагові, та на всяк випадок відсікаємо послуги
			items = [
				it
				for it in items
				if bool(it.get("IsWeight")) and (not _is_service_value(cat_types.get(int(it.get("CategoryID") or 0))))
			]
	else:
		# старий шлях сумісності
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

