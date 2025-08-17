from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

def _ensure_table(db):
    cursor = db.cursor()
    # Створюємо таблицю за потреби
    cursor.execute(
        """
        IF OBJECT_ID('dbo.ProgrammParameters', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.ProgrammParameters (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                ParamKey NVARCHAR(100) NOT NULL UNIQUE,
                ParamValue NVARCHAR(4000) NULL
            );
        END
        """
    )
    db.commit()

@router.get("/programm-parameters")
def get_programm_parameters(db=Depends(get_db)):
    _ensure_table(db)
    cursor = db.cursor()
    cursor.execute("SELECT ID, ParamKey, ParamValue FROM ProgrammParameters")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/programm-parameters")
def add_or_update_programm_parameter(data: dict, db=Depends(get_db)):
    _ensure_table(db)
    key = data.get("ParamKey")
    if not key:
        raise HTTPException(400, "ParamKey is required")
    value = data.get("ParamValue")
    cursor = db.cursor()
    # Якщо існує — оновлюємо, інакше додаємо
    cursor.execute("SELECT ID FROM ProgrammParameters WHERE ParamKey=?", (key,))
    row = cursor.fetchone()
    if row:
        cursor.execute("UPDATE ProgrammParameters SET ParamValue=? WHERE ID=?", (value, row[0]))
        db.commit()
        return {"ID": row[0], "ParamKey": key, "ParamValue": value, "updated": True}
    cursor.execute("INSERT INTO ProgrammParameters (ParamKey, ParamValue) VALUES (?, ?)", (key, value))
    db.commit()
    return {"message": "Додано", "ParamKey": key, "ParamValue": value}

@router.put("/programm-parameters/{id}")
def update_programm_parameter(id: int, data: dict, db=Depends(get_db)):
    value = data.get("ParamValue")
    if value is None:
        raise HTTPException(400, "ParamValue is required")
    cursor = db.cursor()
    cursor.execute("UPDATE ProgrammParameters SET ParamValue=? WHERE ID=?", (value, id))
    db.commit()
    return {"message": "Оновлено"}
