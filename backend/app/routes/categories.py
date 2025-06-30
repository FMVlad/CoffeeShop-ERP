from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db  # ← головне виправлення!

router = APIRouter()

# ---------- КАТЕГОРІЇ (як було) ----------
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
               ParentID, DisplayOrder, CategoryCode
        FROM Categories
        WHERE 1=1
    """
    params = []
    if search:
        query += " AND CategoryName LIKE ?"
        params.append(f"%{search}%")
    query += " ORDER BY DisplayOrder, CategoryName OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
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
        category.get("DisplayOrder"),
        category.get("CategoryCode"),
    )
    if not fields[0]:
        raise HTTPException(status_code=400, detail="CategoryName is required")
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Categories
            (CategoryName, ProductType, UnitID, IsVAT, IsExcise, ParentID, DisplayOrder, CategoryCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        category.get("DisplayOrder"),
        category.get("CategoryCode"),
        id,
    )
    if not fields[0]:
        raise HTTPException(status_code=400, detail="CategoryName is required")
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Categories SET
            CategoryName=?, ProductType=?, UnitID=?, IsVAT=?, IsExcise=?,
            ParentID=?, DisplayOrder=?, CategoryCode=?
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

# ---------- ПОСЛУГИ ----------
@router.get("/services")
def get_services(
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db=Depends(get_db)
):
    cursor = db.cursor()
    query = """
        SELECT ID, CategoryName, ProductType, UnitID, IsVAT, IsExcise,
               ParentID, DisplayOrder, CategoryCode
        FROM Categories
        WHERE ProductType = 'Service'
    """
    params = []
    if search:
        query += " AND CategoryName LIKE ?"
        params.append(f"%{search}%")
    query += " ORDER BY DisplayOrder, CategoryName OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
    params.extend([skip, limit])
    cursor.execute(query, *params)
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, row)) for row in rows]

@router.post("/services")
def add_service(service: dict, db=Depends(get_db)):
    fields = (
        service.get("CategoryName"),
        "Service",  # ProductType завжди Service
        service.get("UnitID"),
        service.get("IsVAT", False),
        service.get("IsExcise", False),
        service.get("ParentID"),
        service.get("DisplayOrder"),
        service.get("CategoryCode"),
    )
    if not fields[0]:
        raise HTTPException(status_code=400, detail="CategoryName is required")
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Categories
            (CategoryName, ProductType, UnitID, IsVAT, IsExcise, ParentID, DisplayOrder, CategoryCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, fields)
    db.commit()
    return {"message": "Послугу додано"}

@router.put("/services/{id}")
def update_service(id: int, service: dict, db=Depends(get_db)):
    fields = (
        service.get("CategoryName"),
        "Service",  # ProductType завжди Service
        service.get("UnitID"),
        service.get("IsVAT", False),
        service.get("IsExcise", False),
        service.get("ParentID"),
        service.get("DisplayOrder"),
        service.get("CategoryCode"),
        id,
    )
    if not fields[0]:
        raise HTTPException(status_code=400, detail="CategoryName is required")
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Categories SET
            CategoryName=?, ProductType=?, UnitID=?, IsVAT=?, IsExcise=?,
            ParentID=?, DisplayOrder=?, CategoryCode=?
        WHERE ID=?
    """, fields)
    db.commit()
    return {"message": "Послугу оновлено"}

@router.delete("/services/{id}")
def delete_service(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Categories WHERE ID=? AND ProductType = 'Service'", (id,))
    db.commit()
    return {"message": "Послугу видалено"}
