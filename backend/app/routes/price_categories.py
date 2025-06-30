from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db   # <-- Виправлено тут

router = APIRouter()

@router.get("/price-categories")
def get_price_categories(
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db=Depends(get_db)
):
    cursor = db.cursor()
    query = "SELECT ID, CategoryName FROM PriceCategories WHERE 1=1"
    params = []
    if search:
        query += " AND CategoryName LIKE ?"
        params.append(f"%{search}%")
    query += " ORDER BY CategoryName OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
    params.extend([skip, limit])
    cursor.execute(query, tuple(params))
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, row)) for row in rows]

@router.post("/price-categories")
def add_price_category(category: dict, db=Depends(get_db)):
    name = category.get("CategoryName")
    if not name:
        raise HTTPException(status_code=400, detail="CategoryName is required")
    cursor = db.cursor()
    cursor.execute("INSERT INTO PriceCategories (CategoryName) VALUES (?)", (name,))
    db.commit()
    return {"message": "Категорію цін додано"}

@router.put("/price-categories/{id}")
def update_price_category(id: int, category: dict, db=Depends(get_db)):
    name = category.get("CategoryName")
    if not name:
        raise HTTPException(status_code=400, detail="CategoryName is required")
    cursor = db.cursor()
    cursor.execute("UPDATE PriceCategories SET CategoryName=? WHERE ID=?", (name, id))
    db.commit()
    return {"message": "Категорію цін оновлено"}

@router.delete("/price-categories/{id}")
def delete_price_category(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM PriceCategories WHERE ID=?", (id,))
    db.commit()
    return {"message": "Категорію цін видалено"}
