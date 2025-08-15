from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db

router = APIRouter()

# --- Отримати всі склади для центру обліку ---
@router.get("/warehouses")
def get_warehouses(center_id: int = Query(...), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, CenterID, ParentID, Name, Type, IsActive
        FROM Warehouses
        WHERE CenterID = ?
        ORDER BY ID
    """, (center_id,))
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# --- Автоматичне створення складів при створенні центру ---
def create_default_warehouses(center_id, db):
    cursor = db.cursor()
    # 1. Створюємо Головний склад (без ParentID)
    cursor.execute("""
        INSERT INTO Warehouses (CenterID, ParentID, Name, Type, IsActive)
        OUTPUT INSERTED.ID
        VALUES (?, NULL, ?, ?, 1)
    """, (center_id, 'Головний склад', 'main'))
    main_id = cursor.fetchone()[0]

    # 2. Інші склади з ParentID = main_id
    other_warehouses = [
        ('Резервний склад', 'reserve'),
        ('Резерв замовлення', 'order_reserve'),
        ('Резерв виробництва', 'production_reserve'),
        ('Товар в дорозі', 'in_transit'),
        ('Уцінка', 'write_off'),
    ]
    for name, typ in other_warehouses:
        cursor.execute("""
            INSERT INTO Warehouses (CenterID, ParentID, Name, Type, IsActive)
            VALUES (?, ?, ?, ?, 1)
        """, (center_id, main_id, name, typ))
    db.commit()

# --- Додати новий склад (якщо треба вручну через API) ---
@router.post("/warehouses")
def add_warehouse(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Warehouses (CenterID, ParentID, Name, Type, IsActive)
        OUTPUT INSERTED.ID
        VALUES (?, ?, ?, ?, ?)
    """, (
        data.get("CenterID"),
        data.get("ParentID"),
        data.get("Name"),
        data.get("Type"),
        int(data.get("IsActive", 1)),
    ))
    warehouse_id = cursor.fetchone()[0]
    db.commit()
    return {"id": warehouse_id}

# --- Оновити склад ---
@router.put("/warehouses/{id}")
def update_warehouse(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Warehouses
        SET Name = ?, Type = ?, IsActive = ?
        WHERE ID = ?
    """, (
        data.get("Name"),
        data.get("Type"),
        int(data.get("IsActive", 1)),
        id
    ))
    db.commit()
    return {"success": True}

# --- Видалити склад ---
@router.delete("/warehouses/{id}")
def delete_warehouse(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Warehouses WHERE ID = ?", (id,))
    db.commit()
    return {"success": True}
