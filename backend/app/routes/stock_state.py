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
    row = cur.execute("SELECT ParamValue FROM ProgrammParameters WHERE ParamKey=?", (key,)).fetchone()
    return row[0] if row and row[0] is not None else default


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
        extra_cols = []
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
                data[col] = r[idx]
                idx += 1
            products[int(r[0])] = data

    # 2) Підбір ціни продажу (за моделлю глобально/по центру)
    price_model = (_get_program_param(db, "PriceModel", "global") or "global").lower()
    on_date_val = on_date

    def resolve_price(product_id: int) -> Optional[float]:
        where = ["ProductID=?"]
        pms: List[Any] = [product_id]
        if price_category_id:
            where.append("PriceCategoryID=?")
            pms.append(price_category_id)
        if on_date_val:
            where.append("DateStart <= ?")
            pms.append(on_date_val)
            where.append("(DateEnd IS NULL OR DateEnd >= ?)")
            pms.append(on_date_val)
        center_priority_sql = ""
        if price_model == "by_center" and center_id:
            # Спочатку по центру, далі глобальна
            center_priority_sql = " ORDER BY CASE WHEN CenterID=? THEN 0 ELSE 1 END, DateStart DESC"
            pms.append(center_id)
        else:
            center_priority_sql = " ORDER BY DateStart DESC"
        sql = (
            "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(where) + center_priority_sql
        )
        row = cur.execute(sql, tuple(pms)).fetchone()
        return float(row[0]) if row else None

    items: List[Dict[str, Any]] = []
    for r in rows:
        pid = int(r[0])
        wid = int(r[1]) if r[1] is not None else None
        qty = float(r[2] or 0)
        amount_cost = float(r[3] or 0)
        avg_cost = (amount_cost / qty) if qty else 0.0
        prod = products.get(pid, {})
        price = resolve_price(pid) or 0.0
        barcode_s = str(prod.get("Barcode") or "")
        inferred_weight = True if (len(barcode_s) >= 1 and barcode_s[0] == "2") else False
        is_weight = bool(prod.get("IsWeight") or prod.get("IsWeighted") or inferred_weight)
        items.append(
            {
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
            }
        )

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


