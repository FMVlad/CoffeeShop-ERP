from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db  # ← головне виправлення!

router = APIRouter()

@router.get("/categories")
def get_categories(
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db=Depends(get_db)
):
    cursor = db.cursor()
    query = """
        SELECT ID, CategoryName, ProductType, UnitID, IsVAT, IsExcise,
               ParentID, DisplayOrder, CategoryCode, ProductCardTemplateID
        FROM Categories
        WHERE 1=1
    """
    params = []
    if search:
        query += " AND CategoryName LIKE ?"
        params.append(f"%{search}%")
    query += " ORDER BY CategoryName OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
    params.extend([skip, limit])
    cursor.execute(query, *params)
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, row)) for row in rows]

@router.post("/categories")
def add_category(category: dict, db=Depends(get_db)):
    fields = (
        category.get("CategoryName"),
        category.get("ProductType"),
        category.get("UnitID"),
        category.get("IsVAT", False),
        category.get("IsExcise", False),
        category.get("ParentID"),
        category.get("DisplayOrder", 0),
        category.get("CategoryCode"),
        category.get("ProductCardTemplateID"),  # Додаємо поле
    )
    if not fields[0]:
        raise HTTPException(status_code=400, detail="CategoryName is required")
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Categories
            (CategoryName, ProductType, UnitID, IsVAT, IsExcise, ParentID, DisplayOrder, CategoryCode, ProductCardTemplateID)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, fields)
    db.commit()
    return {"message": "Категорію додано"}

@router.put("/categories/{id}")
def update_category(id: int, category: dict, db=Depends(get_db)):
    fields = (
        category.get("CategoryName"),
        category.get("ProductType"),
        category.get("UnitID"),
        category.get("IsVAT", False),
        category.get("IsExcise", False),
        category.get("ParentID"),
        category.get("DisplayOrder", 0),
        category.get("CategoryCode"),
        category.get("ProductCardTemplateID"),  # Додаємо поле
        id,
    )
    if not fields[0]:
        raise HTTPException(status_code=400, detail="CategoryName is required")
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Categories SET
            CategoryName=?, ProductType=?, UnitID=?, IsVAT=?, IsExcise=?,
            ParentID=?, DisplayOrder=?, CategoryCode=?, ProductCardTemplateID=?
        WHERE ID=?
    """, fields)
    db.commit()
    return {"message": "Категорію оновлено"}

@router.delete("/categories/{id}")
def delete_category(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Categories WHERE ID=?", (id,))
    db.commit()
    return {"message": "Категорію видалено"}
