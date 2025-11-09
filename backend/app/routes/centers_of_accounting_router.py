from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db
import pyodbc

router = APIRouter()

# === Всі центри обліку ===
@router.get("/centers-of-accounting")
def get_centers_of_accounting(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, Name, City, FullAddress, Phone
        FROM CentersOfAccounting
        ORDER BY Name
    """)
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# === Створити центр обліку (і склади з підлеглими одразу) ===
@router.post("/centers-of-accounting")
def create_center_of_accounting(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    # 1. Створити центр обліку
    cursor.execute("""
        INSERT INTO CentersOfAccounting (Name, City, FullAddress, Phone)
        OUTPUT INSERTED.ID
        VALUES (?, ?, ?, ?)
    """, (
        data.get("Name"),
        data.get("City"),
        data.get("FullAddress"),
        data.get("Phone"),
    ))
    center_id = cursor.fetchone()[0]

    # 2. Створити головний склад (ParentID=NULL)
    cursor.execute("""
        INSERT INTO Warehouses (CenterID, ParentID, Name, Type, IsActive)
        OUTPUT INSERTED.ID
        VALUES (?, NULL, ?, ?, 1)
    """, (center_id, "Головний склад", "main"))
    main_id = cursor.fetchone()[0]

    # 3. Додаємо всі інші підлеглі склади (ParentID = main_id)
    for wh in [
        {"Name": "Резервний склад", "Type": "reserve"},
        {"Name": "Резерв замовлення", "Type": "order_reserve"},
        {"Name": "Резерв виробництва", "Type": "production_reserve"},
        {"Name": "Товар в дорозі", "Type": "in_transit"},
        {"Name": "Уцінка", "Type": "write_off"},
    ]:
        cursor.execute("""
            INSERT INTO Warehouses (CenterID, ParentID, Name, Type, IsActive)
            VALUES (?, ?, ?, ?, 1)
        """, (center_id, main_id, wh["Name"], wh["Type"]))
    db.commit()
    return {"id": center_id}

# === Оновити центр обліку ===
@router.put("/centers-of-accounting/{id}")
def update_center_of_accounting(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE CentersOfAccounting
        SET Name = ?, City = ?, FullAddress = ?, Phone = ?
        WHERE ID = ?
    """, (
        data.get("Name"),
        data.get("City"),
        data.get("FullAddress"),
        data.get("Phone"),
        id
    ))
    db.commit()
    return {"success": True}

# === Видалити центр обліку (+ всі каси та склади цього центру) ===
@router.delete("/centers-of-accounting/{id}")
def delete_center_of_accounting(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    try:
        # 1. Видаляємо каси, прив'язані до центру
        cursor.execute("DELETE FROM Cashboxes WHERE CenterID = ?", (id,))
        # 2. Видаляємо всі склади (підлеглі та головний, ParentID не важливий)
        cursor.execute("DELETE FROM Warehouses WHERE CenterID = ?", (id,))
        # 3. Видаляємо сам центр обліку
        cursor.execute("DELETE FROM CentersOfAccounting WHERE ID = ?", (id,))
        db.commit()
        return {"success": True}
    except pyodbc.IntegrityError as e:
        msg = str(e)
        if "REFERENCE constraint" in msg:
            raise HTTPException(
                status_code=400,
                detail="Неможливо видалити центр обліку: є пов'язані записи в інших таблицях (наприклад, CompanyCenters, документи чи рух товару). Спочатку видаліть пов’язані дані."
            )
        raise HTTPException(status_code=500, detail="Виникла невідома помилка видалення.")

# === Всі склади для центру ===
@router.get("/warehouses")
def get_warehouses(center_id: int = Query(...), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, CenterID, ParentID, Name, Type, IsActive
        FROM Warehouses
        WHERE CenterID = ?
        ORDER BY
          CASE
            WHEN Type = 'main' THEN 0
            WHEN Type = 'reserve' THEN 1
            WHEN Type = 'order_reserve' THEN 2
            WHEN Type = 'production_reserve' THEN 3
            WHEN Type = 'in_transit' THEN 4
            WHEN Type = 'write_off' THEN 5
            ELSE 99
          END, Name
    """, (center_id,))
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# === Додати склад (підтримка ParentID) ===
@router.post("/warehouses")
def create_warehouse(data: dict, db=Depends(get_db)):
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
        data.get("IsActive", 1),
    ))
    wh_id = cursor.fetchone()[0]
    db.commit()
    return {"id": wh_id}

# === Оновити склад ===
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
        data.get("IsActive", 1),
        id
    ))
    db.commit()
    return {"success": True}

# === Видалити склад ===
@router.delete("/warehouses/{id}")
def delete_warehouse(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM Warehouses WHERE ID = ?", (id,))
        db.commit()
        return {"success": True}
    except pyodbc.IntegrityError as e:
        msg = str(e)
        if "REFERENCE constraint" in msg:
            raise HTTPException(
                status_code=400,
                detail="Неможливо видалити склад: є пов'язані записи в інших таблицях (наприклад, рух товару або партії). Спочатку видаліть пов’язані дані."
            )
        raise HTTPException(status_code=500, detail="Виникла невідома помилка видалення.")
