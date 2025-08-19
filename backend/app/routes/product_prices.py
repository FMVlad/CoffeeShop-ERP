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
    base_sql = "FROM ProductPrices WHERE 1=1"
    # Спроба з додатковими колонками (можуть бути відсутні в деяких БД)
    try_sql = (
        "SELECT ID, ProductID, PriceCategoryID, Price, ISNULL(CenterID,0) AS CenterID, DateStart, DateEnd, "
        "PriceWithDiscount, DiscountRecalcAt " + base_sql
    )
    fallback_sql = (
        "SELECT ID, ProductID, PriceCategoryID, Price, ISNULL(CenterID,0) AS CenterID, DateStart, DateEnd "
        + base_sql
    )
    # Оберемо SQL, який спрацює
    try:
        cursor.execute(try_sql + " AND 1=0")
        query = try_sql
    except Exception:
        query = fallback_sql
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


# === ВИНЯТКИ ЗІ ЗНИЖОК (повтор знизу, аби функції були доступні вище) ===
def _ensure_exclusions_table(db):
    cur = db.cursor()
    cur.execute(
        """
        IF OBJECT_ID('dbo.PriceDiscountExclusions','U') IS NULL
        BEGIN
          CREATE TABLE dbo.PriceDiscountExclusions (
            ID INT IDENTITY(1,1) PRIMARY KEY,
            PriceCategoryID INT NOT NULL,
            CenterID INT NULL,
            WarehouseID INT NULL,
            ProductID INT NOT NULL,
            DateStart DATE NOT NULL,
            DateEnd DATE NULL,
            Comment NVARCHAR(250) NULL,
            CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
          );
          CREATE INDEX IX_PDE_Scope ON dbo.PriceDiscountExclusions(PriceCategoryID, CenterID, WarehouseID, ProductID, DateStart, DateEnd);
        END
        """
    )
    db.commit()

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


# === Допоміжне: колонки PriceWithDiscount / DiscountRecalcAt у ProductPrices ===
def _ensure_product_prices_extra(db):
    cur = db.cursor()
    cur.execute(
        """
        IF COL_LENGTH('dbo.ProductPrices','PriceWithDiscount') IS NULL
        BEGIN
          ALTER TABLE dbo.ProductPrices ADD PriceWithDiscount DECIMAL(18,4) NULL;
        END;
        IF COL_LENGTH('dbo.ProductPrices','DiscountRecalcAt') IS NULL
        BEGIN
          ALTER TABLE dbo.ProductPrices ADD DiscountRecalcAt DATETIME NULL;
        END;
        """
    )
    db.commit()


def _round_to_step(value: float, step: Optional[float]) -> float:
    if step is None or step <= 0:
        return round(float(value), 2)
    import math
    return round(math.ceil(value / step) * step, 2)


def _pick_rule_for_product(cur, price_category_id: int, center_id: Optional[int], product_id: int, on_date: str, product_category_id: Optional[int]) -> Optional[Dict[str, Any]]:
    params_base = [price_category_id]
    sql_base = [
        "SELECT TOP 1 ID, DiscountType, DiscountValue, RoundingStep, DateStart, DateEnd, CenterID, CategoryID, ProductID",
        "FROM PriceDiscounts WHERE PriceCategoryID=?",
        "AND DateStart<=? AND (DateEnd IS NULL OR DateEnd>=?)",
    ]
    # 1) конкретний товар у конкретному центрі
    if center_id is not None:
        row = cur.execute(
            " ".join(sql_base + ["AND ISNULL(CenterID,0)=ISNULL(?,0) AND ISNULL(ProductID,0)=? ORDER BY DateStart DESC, ID DESC"]),
            (price_category_id, on_date, on_date, center_id, product_id),
        ).fetchone()
        if row:
            return {
                "DiscountType": row[1],
                "DiscountValue": float(row[2] or 0),
                "RoundingStep": float(row[3] or 0) or None,
            }
    # 2) конкретний товар глобально
    row = cur.execute(
        " ".join(sql_base + ["AND ISNULL(CenterID,0)=0 AND ISNULL(ProductID,0)=? ORDER BY DateStart DESC, ID DESC"]),
        (price_category_id, on_date, on_date, product_id),
    ).fetchone()
    if row:
        return {
            "DiscountType": row[1],
            "DiscountValue": float(row[2] or 0),
            "RoundingStep": float(row[3] or 0) or None,
        }
    # 3) категорія товару у конкретному центрі
    if product_category_id is not None and center_id is not None:
        row = cur.execute(
            " ".join(sql_base + ["AND ISNULL(CenterID,0)=ISNULL(?,0) AND ISNULL(CategoryID,0)=? AND ISNULL(ProductID,0)=0 ORDER BY DateStart DESC, ID DESC"]),
            (price_category_id, on_date, on_date, center_id, product_category_id),
        ).fetchone()
        if row:
            return {
                "DiscountType": row[1],
                "DiscountValue": float(row[2] or 0),
                "RoundingStep": float(row[3] or 0) or None,
            }
    # 4) категорія товару глобально
    if product_category_id is not None:
        row = cur.execute(
            " ".join(sql_base + ["AND ISNULL(CenterID,0)=0 AND ISNULL(CategoryID,0)=? AND ISNULL(ProductID,0)=0 ORDER BY DateStart DESC, ID DESC"]),
            (price_category_id, on_date, on_date, product_category_id),
        ).fetchone()
        if row:
            return {
                "DiscountType": row[1],
                "DiscountValue": float(row[2] or 0),
                "RoundingStep": float(row[3] or 0) or None,
            }
    # 5) глобальне правило для всіх
    row = cur.execute(
        " ".join(sql_base + ["AND ISNULL(CenterID,0)=ISNULL(?,0) AND ISNULL(CategoryID,0)=0 AND ISNULL(ProductID,0)=0 ORDER BY DateStart DESC, ID DESC"]),
        (price_category_id, on_date, on_date, center_id or 0),
    ).fetchone()
    if row:
        return {
            "DiscountType": row[1],
            "DiscountValue": float(row[2] or 0),
            "RoundingStep": float(row[3] or 0) or None,
        }
    return None


@router.post("/product-prices/apply-discounts")
def apply_discounts(payload: dict, db=Depends(get_db)):
    """Обчислює ціну зі знижкою для вибраної категорії цін/центру і записує у ProductPrices.PriceWithDiscount.

    payload = {
      price_category_id: int,            # обов'язково
      center_id?: int,                   # null/відсутній = глобальні
      active_on?: 'YYYY-MM-DD',          # дата актуальності; за замовч. сьогодні
      product_ids?: [int]                # обмежити перерахунок
    }
    """
    price_category_id = payload.get("price_category_id")
    if not price_category_id:
        raise HTTPException(400, "price_category_id is required")
    center_id = payload.get("center_id")
    on_date = payload.get("active_on") or datetime.date.today().isoformat()
    product_ids: List[int] = payload.get("product_ids") or []
    # ad-hoc знижка з модалки
    adhoc_type = (payload.get("discount_type") or "").strip().lower() or None
    adhoc_value = payload.get("discount_value")
    adhoc_round = payload.get("rounding_step")

    _ensure_exclusions_table(db)
    _ensure_product_prices_extra(db)

    cur = db.cursor()

    # Побудуємо список товарів: або обрані, або всі, для яких є ціна у цій категорії/центрі
    if not product_ids:
        q = [
            "SELECT DISTINCT ProductID FROM ProductPrices WHERE PriceCategoryID=? AND ISNULL(CenterID,0)=ISNULL(?,0)"
        ]
        params = [price_category_id, center_id or 0]
        rows = cur.execute(" ".join(q), tuple(params)).fetchall() or []
        product_ids = [int(r[0]) for r in rows]

    updated = 0
    for pid in product_ids:
        # Категорія товару (для категорних правил)
        row_cat = cur.execute("SELECT ISNULL(CategoryID,0) FROM Products WHERE ID=?", (pid,)).fetchone()
        prod_cat_id = int(row_cat[0] or 0) if row_cat else None

        # Базова ціна: спочатку по центру, потім глобальна
        def _get_base_price_row(for_center_id: Optional[int]):
            parts = [
                "SELECT TOP 1 ID, Price FROM ProductPrices WHERE ProductID=? AND PriceCategoryID=?",
                "AND DateStart<=? AND (DateEnd IS NULL OR DateEnd>=?)",
                "AND ISNULL(CenterID,0)=ISNULL(?,0) ORDER BY DateStart DESC, ID DESC",
            ]
            return cur.execute(" ".join(parts), (pid, price_category_id, on_date, on_date, for_center_id or 0)).fetchone()

        base = _get_base_price_row(center_id)
        if not base and (center_id or 0) != 0:
            base = _get_base_price_row(0)
        if not base:
            # немає базової ціни — обійдемо
            continue
        price_row_id, base_price = int(base[0]), float(base[1] or 0)

        # Перевірка виключень
        ex = cur.execute(
            """
            SELECT TOP 1 1 FROM PriceDiscountExclusions
            WHERE PriceCategoryID=? AND ISNULL(CenterID,0)=ISNULL(?,0) AND ProductID=?
              AND DateStart<=? AND (DateEnd IS NULL OR DateEnd>=?)
            """,
            (price_category_id, center_id or 0, pid, on_date, on_date),
        ).fetchone()
        if ex:
            # Скасовуємо знижку
            cur.execute(
                "UPDATE ProductPrices SET PriceWithDiscount=NULL, DiscountRecalcAt=GETDATE() WHERE ID=?",
                (price_row_id,),
            )
            updated += 1
            continue

        # Правило знижки або ad-hoc параметри з модалки
        rule = None
        if adhoc_type and adhoc_value is not None:
            rule = {"DiscountType": adhoc_type, "DiscountValue": float(adhoc_value or 0), "RoundingStep": float(adhoc_round or 0) or 0.01}
        else:
            rule = _pick_rule_for_product(cur, price_category_id, center_id, pid, on_date, prod_cat_id)
        if not rule:
            # Немає правила — обнуляємо можливу стару знижку
            cur.execute(
                "UPDATE ProductPrices SET PriceWithDiscount=NULL, DiscountRecalcAt=GETDATE() WHERE ID=?",
                (price_row_id,),
            )
            updated += 1
            continue

        dtype = (rule.get("DiscountType") or "").strip().lower()
        dval = float(rule.get("DiscountValue") or 0)
        step = float(rule.get("RoundingStep") or 0) or 0.01
        if dtype == "percent":
            discounted = base_price * (1.0 - dval / 100.0)
        elif dtype == "amount":
            discounted = max(0.0, base_price - dval)
        else:
            discounted = base_price
        discounted = _round_to_step(discounted, step)

        cur.execute(
            "UPDATE ProductPrices SET PriceWithDiscount=?, DiscountRecalcAt=GETDATE() WHERE ID=?",
            (float(discounted), price_row_id),
        )
        updated += 1

    db.commit()
    return {"updated": updated, "active_on": on_date, "center_id": center_id or 0, "price_category_id": price_category_id}


@router.post("/product-prices/clear-discounts")
def clear_discounts(payload: dict, db=Depends(get_db)):
    """Знімає знижку (ставить PriceWithDiscount = NULL) для активних цін за скоупом.

    payload = {
      price_category_id: int,            # обов'язково
      center_id?: int,                   # null/0 = глобальні
      active_on?: 'YYYY-MM-DD',          # дата актуальності; за замовч. сьогодні
      product_ids?: [int]                # опційно
    }
    """
    price_category_id = payload.get("price_category_id")
    if not price_category_id:
        raise HTTPException(400, "price_category_id is required")
    center_id = payload.get("center_id")
    on_date = payload.get("active_on") or datetime.date.today().isoformat()
    product_ids: List[int] = payload.get("product_ids") or []

    _ensure_product_prices_extra(db)
    cur = db.cursor()

    if product_ids:
        placeholders = ",".join(["?"] * len(product_ids))
        cur.execute(
            f"""
            UPDATE ProductPrices
            SET PriceWithDiscount = NULL, DiscountRecalcAt = GETDATE()
            WHERE PriceCategoryID=?
              AND ISNULL(CenterID,0)=ISNULL(?,0)
              AND ProductID IN ({placeholders})
              AND DateStart<=? AND (DateEnd IS NULL OR DateEnd>=?)
            """,
            (price_category_id, center_id or 0, *product_ids, on_date, on_date),
        )
        cleared = cur.rowcount or 0
    else:
        cur.execute(
            """
            UPDATE ProductPrices
            SET PriceWithDiscount = NULL, DiscountRecalcAt = GETDATE()
            WHERE PriceCategoryID=?
              AND ISNULL(CenterID,0)=ISNULL(?,0)
              AND DateStart<=? AND (DateEnd IS NULL OR DateEnd>=?)
            """,
            (price_category_id, center_id or 0, on_date, on_date),
        )
        cleared = cur.rowcount or 0

    db.commit()
    return {"cleared": cleared, "active_on": on_date, "center_id": center_id or 0, "price_category_id": price_category_id}

