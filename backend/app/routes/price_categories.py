from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

# --- Категорії товару ---
@router.get("/categories")
def get_categories(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, CategoryName FROM Categories ORDER BY CategoryName")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# --- Категорії цін (повний CRUD) ---
@router.get("/price-categories")
def get_price_categories(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, CategoryName FROM PriceCategories ORDER BY CategoryName")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/price-categories")
def add_price_category(data: dict, db=Depends(get_db)):
    name = data.get("CategoryName")
    if not name:
        raise HTTPException(status_code=400, detail="CategoryName is required")
    cursor = db.cursor()
    cursor.execute("INSERT INTO PriceCategories (CategoryName) VALUES (?)", (name,))
    db.commit()
    return {"message": "Категорію цін додано"}

@router.put("/price-categories/{id}")
def update_price_category(id: int, data: dict, db=Depends(get_db)):
    name = data.get("CategoryName")
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

# --- Націнки по категоріях ---
@router.get("/category-margins")
def get_category_margins(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT cm.ID, cm.CategoryID, c.CategoryName, cm.PriceCategoryID, pc.CategoryName AS PriceCategoryName,
               cm.MarginPercent, cm.Rounding
        FROM CategoryMargins cm
        JOIN Categories c ON cm.CategoryID = c.ID
        JOIN PriceCategories pc ON cm.PriceCategoryID = pc.ID
        ORDER BY c.CategoryName, pc.CategoryName
    """)
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/category-margins")
def add_category_margin(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO CategoryMargins (CategoryID, PriceCategoryID, MarginPercent, Rounding)
        VALUES (?, ?, ?, ?)
    """, (data["CategoryID"], data["PriceCategoryID"], data["MarginPercent"], data["Rounding"]))
    db.commit()
    return {"message": "Націнку додано"}

@router.put("/category-margins/{id}")
def update_category_margin(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE CategoryMargins
        SET CategoryID=?, PriceCategoryID=?, MarginPercent=?, Rounding=?
        WHERE ID=?
    """, (data["CategoryID"], data["PriceCategoryID"], data["MarginPercent"], data["Rounding"], id))
    db.commit()
    return {"message": "Націнку оновлено"}

@router.delete("/category-margins/{id}")
def delete_category_margin(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM CategoryMargins WHERE ID=?", (id,))
    db.commit()
    return {"message": "Націнку видалено"}
