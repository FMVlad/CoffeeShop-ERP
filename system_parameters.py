from fastapi import APIRouter, Depends, HTTPException
from ..db_connection import get_db

router = APIRouter()

# Отримати всі параметри
@router.get("/system-parameters")
def get_system_parameters(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, ParamKey, ParamValue FROM SystemParameters")
    items = [{"ID": row[0], "ParamKey": row[1], "ParamValue": row[2]} for row in cursor.fetchall()]
    return items

# Оновити параметр (за ID)
@router.put("/system-parameters/{id}")
def update_system_parameter(id: int, data: dict, db=Depends(get_db)):
    key = data.get("ParamKey")
    value = data.get("ParamValue")
    if not key or value is None:
        raise HTTPException(status_code=400, detail="Key and value required")
    cursor = db.cursor()
    cursor.execute("UPDATE SystemParameters SET ParamKey=?, ParamValue=? WHERE ID=?", (key, value, id))
    db.commit()
    return {"ok": True}

# Додати новий параметр
@router.post("/system-parameters")
def create_system_parameter(data: dict, db=Depends(get_db)):
    key = data.get("ParamKey")
    value = data.get("ParamValue")
    if not key or value is None:
        raise HTTPException(status_code=400, detail="Key and value required")
    cursor = db.cursor()
    cursor.execute("INSERT INTO SystemParameters (ParamKey, ParamValue) VALUES (?, ?)", (key, value))
    db.commit()
    return {"id": cursor.lastrowid, "ParamKey": key, "ParamValue": value}

# Видалити
@router.delete("/system-parameters/{id}")
def delete_system_parameter(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM SystemParameters WHERE ID=?", (id,))
    db.commit()
    return {"ok": True}
