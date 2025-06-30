from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db   # <- Ось так правильно для app/...

router = APIRouter()

@router.get("/product-prices")
def get_product_prices(
    product_id: int = Query(None),
    price_category_id: int = Query(None),
    min_price: float = Query(None),
    max_price: float = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db=Depends(get_db)
):
    cursor = db.cursor()
    query = "SELECT ID, ProductID, PriceCategoryID, Price FROM ProductPrices WHERE 1=1"
    params = []
    if product_id:
        query += " AND ProductID=?"
        params.append(product_id)
    if price_category_id:
        query += " AND PriceCategoryID=?"
        params.append(price_category_id)
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
    if not product_id or not price_category_id or price_value is None:
        raise HTTPException(status_code=400, detail="ProductID, PriceCategoryID, Price are required")
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO ProductPrices (ProductID, PriceCategoryID, Price) VALUES (?, ?, ?)",
        (product_id, price_category_id, price_value)
    )
    db.commit()
    return {"message": "Ціну додано"}

@router.put("/product-prices/{id}")
def update_product_price(id: int, price: dict, db=Depends(get_db)):
    product_id = price.get("ProductID")
    price_category_id = price.get("PriceCategoryID")
    price_value = price.get("Price")
    if not product_id or not price_category_id or price_value is None:
        raise HTTPException(status_code=400, detail="ProductID, PriceCategoryID, Price are required")
    cursor = db.cursor()
    cursor.execute(
        "UPDATE ProductPrices SET ProductID=?, PriceCategoryID=?, Price=? WHERE ID=?",
        (product_id, price_category_id, price_value, id)
    )
    db.commit()
    return {"message": "Ціну оновлено"}

@router.delete("/product-prices/{id}")
def delete_product_price(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM ProductPrices WHERE ID=?", (id,))
    db.commit()
    return {"message": "Ціну видалено"}
