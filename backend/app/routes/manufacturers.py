from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

@router.get("/manufacturers")
def get_manufacturers(db=Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("SELECT ID, Name FROM Manufacturers ORDER BY Name")
        items = [{"ID": row[0], "ManufacturerName": row[1]} for row in cursor.fetchall()]
        return items
    except Exception as e:
        print(f"❌ Помилка в manufacturers: {e}")
        # Повертаємо порожній список якщо помилка
        return []

@router.post("/manufacturers")
def create_manufacturer(data: dict, db=Depends(get_db)):
    name = data.get("Name") or data.get("ManufacturerName")
    if not name:
        raise HTTPException(status_code=400, detail="Потрібна назва виробника")
    cursor = db.cursor()
    cursor.execute("INSERT INTO Manufacturers (Name) VALUES (?)", (name,))
    cursor.execute("SELECT SCOPE_IDENTITY()")
    new_id = cursor.fetchone()[0]
    db.commit()
    return {"ID": new_id, "ManufacturerName": name}

@router.put("/manufacturers/{id}")
def update_manufacturer(id: int, data: dict, db=Depends(get_db)):
    name = data.get("Name") or data.get("ManufacturerName")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    cursor = db.cursor()
    cursor.execute("UPDATE Manufacturers SET Name=? WHERE ID=?", (name, id))
    db.commit()
    return {"ok": True}

@router.delete("/manufacturers/{id}")
def delete_manufacturer(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Manufacturers WHERE ID=?", (id,))
    db.commit()
    return {"ok": True}
