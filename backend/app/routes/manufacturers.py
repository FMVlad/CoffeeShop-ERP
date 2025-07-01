print("!!! ЯКРАЇНА!!!")
from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

@router.get("/manufacturers")
def get_manufacturers(db=Depends(get_db)):
    print("DEBUG get_manufacturers")
    cursor = db.cursor()
    try:
        cursor.execute("SELECT ID, Name, Country FROM Manufacturers ORDER BY Name")
        rows = cursor.fetchall()
        print("DEBUG rows:", rows)
        items = [{"ID": row[0], "ManufacturerName": row[1], "Country": row[2]} for row in rows]
        print("DEBUG items:", items)
        return items
    except Exception as e:
        print(f"❌ Помилка в manufacturers: {e}")
        return []

@router.post("/manufacturers")
def create_manufacturer(data: dict, db=Depends(get_db)):
    name = data.get("Name") or data.get("ManufacturerName")
    country = data.get("Country")
    if not name:
        raise HTTPException(status_code=400, detail="Потрібна назва виробника")
    cursor = db.cursor()
    cursor.execute("INSERT INTO Manufacturers (Name, Country) VALUES (?, ?)", (name, country))
    cursor.execute("SELECT SCOPE_IDENTITY()")
    new_id = cursor.fetchone()[0]
    db.commit()
    return {"ID": new_id, "ManufacturerName": name, "Country": country}

@router.put("/manufacturers/{id}")
def update_manufacturer(id: int, data: dict, db=Depends(get_db)):
    name = data.get("Name") or data.get("ManufacturerName")
    country = data.get("Country")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    cursor = db.cursor()
    cursor.execute("UPDATE Manufacturers SET Name=?, Country=? WHERE ID=?", (name, country, id))
    db.commit()
    return {"ok": True}

@router.delete("/manufacturers/{id}")
def delete_manufacturer(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Manufacturers WHERE ID=?", (id,))
    db.commit()
    return {"ok": True}

@router.get("/manufacturers2")
def get_manufacturers2(db=Depends(get_db)):
    print("DEBUG get_manufacturers2")
    cursor = db.cursor()
    try:
        cursor.execute("SELECT ID, Name, Country FROM Manufacturers ORDER BY Name")
        rows = cursor.fetchall()
        print("DEBUG rows:", rows)
        items = [{"ID": row[0], "ManufacturerName": row[1], "Country": row[2]} for row in rows]
        print("DEBUG items:", items)
        return items
    except Exception as e:
        print(f"❌ Помилка в manufacturers2: {e}")
        return []
