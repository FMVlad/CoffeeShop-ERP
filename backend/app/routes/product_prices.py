from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db   # <- Ось так правильно для app/...
from typing import List, Optional, Dict, Any
import datetime

router = APIRouter()

@router.get("/product-prices")
def get_product_prices(
    product_id: int = Query(None),
    price_category_id: int = Query(None),
    center_id: int = Query(None),
    min_price: float = Query(None),
    max_price: float = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db=Depends(get_db)
):
    cursor = db.cursor()
    query = (
        "SELECT ID, ProductID, PriceCategoryID, Price, "
        "ISNULL(CenterID, 0) AS CenterID, "
        "DateStart, DateEnd "
        "FROM ProductPrices WHERE 1=1"
    )
    params = []
    if product_id:
        query += " AND ProductID=?"
        params.append(product_id)
    if price_category_id:
        query += " AND PriceCategoryID=?"
        params.append(price_category_id)
    if center_id is not None:
        query += " AND ISNULL(CenterID,0)=?"
        params.append(center_id or 0)
    if min_price is not None:
        query += " AND Price>=?"
        params.append(min_price)
    if max_price is not None:
        query += " AND Price<=?"
        params.append(max_price)
    query += " ORDER BY ID OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
    params.extend([skip, limit])
    cursor.execute(query, tuple(params))
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, row)) for row in rows]

@router.post("/product-prices")
def add_product_price(price: dict, db=Depends(get_db)):
    product_id = price.get("ProductID")
    price_category_id = price.get("PriceCategoryID")
    price_value = price.get("Price")
    center_id = price.get("CenterID")
    date_start = price.get("DateStart")
    date_end = price.get("DateEnd")
    if not product_id or not price_category_id or price_value is None:
        raise HTTPException(status_code=400, detail="ProductID, PriceCategoryID, Price are required")
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO ProductPrices (ProductID, PriceCategoryID, Price, CenterID, DateStart, DateEnd) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (product_id, price_category_id, price_value, center_id, date_start, date_end)
    )
    db.commit()
    return {"message": "Ціну додано"}

@router.put("/product-prices/{id}")
def update_product_price(id: int, price: dict, db=Depends(get_db)):
    product_id = price.get("ProductID")
    price_category_id = price.get("PriceCategoryID")
    price_value = price.get("Price")
    center_id = price.get("CenterID")
    date_start = price.get("DateStart")
    date_end = price.get("DateEnd")
    if not product_id or not price_category_id or price_value is None:
        raise HTTPException(status_code=400, detail="ProductID, PriceCategoryID, Price are required")
    cursor = db.cursor()
    cursor.execute(
        "UPDATE ProductPrices SET ProductID=?, PriceCategoryID=?, Price=?, CenterID=?, DateStart=?, DateEnd=? WHERE ID=?",
        (product_id, price_category_id, price_value, center_id, date_start, date_end, id)
    )
    db.commit()
    return {"message": "Ціну оновлено"}

@router.delete("/product-prices/{id}")
def delete_product_price(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM ProductPrices WHERE ID=?", (id,))
    db.commit()
    return {"message": "Ціну видалено"}


def _round_price(value: float, step: Optional[float]) -> float:
    if not step or step <= 0:
        return round(float(value), 2)
    # заокруглення вгору до кроку
    import math
    return round(math.ceil(value / step) * step, 2)


@router.post("/product-prices/generate")
def generate_prices(payload: dict, db=Depends(get_db)):
    """Генерація цін за націнками категорій.

    payload = {
      price_category_id: int,              # обов'язково
      center_id: Optional[int],            # для by_center моделі
      date_start: Optional[str],           # YYYY-MM-DD, за замовч. сьогодні
      rounding: Optional[float],           # крок заокруглення (напр. 1, 0.5, 0.1)
      use_category_margins: bool = True,   # брати з CategoryMargins
      default_margin_percent: Optional[float], # запасний варіант, якщо немає правила
      product_ids: Optional[List[int]]     # обмежити генерацію конкретними товарами
    }
    """
    price_category_id = payload.get("price_category_id")
    if not price_category_id:
        raise HTTPException(400, "price_category_id is required")
    center_id = payload.get("center_id")
    date_start = payload.get("date_start") or datetime.date.today().isoformat()
    rounding_step = payload.get("rounding")
    use_margins = bool(payload.get("use_category_margins", True))
    default_margin = payload.get("default_margin_percent")
    product_ids = payload.get("product_ids") or []

    cur = db.cursor()

    # 1) Підтягнемо товари і їх категорії (опційно обмежимо списком)
    if product_ids:
        placeholders = ",".join(["?"] * len(product_ids))
        products = cur.execute(
            f"SELECT ID, ISNULL(CategoryID, 0) FROM Products WHERE ID IN ({placeholders})",
            tuple(product_ids),
        ).fetchall()
    else:
        products = cur.execute("SELECT ID, ISNULL(CategoryID, 0) FROM Products").fetchall()
    prod_to_cat: Dict[int, int] = {int(r[0]): int(r[1] or 0) for r in products}

    # 2) Націнки по категоріям для потрібної цінової категорії
    margins: Dict[int, Dict[str, Any]] = {}
    if use_margins:
        rows = cur.execute(
            "SELECT CategoryID, MarginPercent, Rounding FROM CategoryMargins WHERE PriceCategoryID=?",
            (price_category_id,),
        ).fetchall()
        for r in rows:
            margins[int(r[0])] = {"MarginPercent": float(r[1] or 0), "Rounding": float(r[2] or 0) or None}

    # 3) Для кожного товару визначаємо базову собівартість (усереднена по партіях >0)
    generated = 0
    for pid, cat_id in prod_to_cat.items():
        row = cur.execute(
            """
            SELECT CASE WHEN SUM(CASE WHEN Quantity>0 THEN Quantity ELSE 0 END) > 0
                        THEN SUM(CASE WHEN Quantity>0 THEN Quantity*ISNULL(PurchasePrice,0) ELSE 0 END)
                             / SUM(CASE WHEN Quantity>0 THEN Quantity ELSE 0 END)
                        ELSE 0 END AS AvgCost
            FROM Parties WHERE ProductID=?
            """,
            (pid,),
        ).fetchone()
        avg_cost = float(row[0] or 0)
        if avg_cost <= 0:
            continue

        # 4) Націнка і заокруглення
        margin_percent = None
        rounding = rounding_step
        if use_margins and cat_id in margins:
            margin_percent = float(margins[cat_id]["MarginPercent"] or 0)
            if not rounding and margins[cat_id].get("Rounding"):
                rounding = margins[cat_id]["Rounding"]
        if margin_percent is None:
            margin_percent = float(default_margin or 0)

        price = avg_cost * (1.0 + margin_percent / 100.0)
        price = _round_price(price, rounding)

        # 5) Закриємо попередню активну ціну (якщо є)
        cur.execute(
            """
            UPDATE ProductPrices
            SET DateEnd = DATEADD(day, -1, ?)
            WHERE ProductID=? AND PriceCategoryID=? AND ISNULL(CenterID,0)=ISNULL(?,0)
              AND (DateEnd IS NULL OR DateEnd >= ?)
            """,
            (date_start, pid, price_category_id, center_id, date_start),
        )

        # 6) Вставляємо нову
        cur.execute(
            """
            INSERT INTO ProductPrices (ProductID, PriceCategoryID, Price, CenterID, DateStart, DateEnd)
            VALUES (?, ?, ?, ?, ?, NULL)
            """,
            (pid, price_category_id, price, center_id, date_start),
        )
        generated += 1

    db.commit()
    return {"generated": generated, "date_start": date_start}
