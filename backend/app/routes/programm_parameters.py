from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

@router.get("/programm-parameters")
def get_programm_parameters(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, ParamKey, ParamValue FROM ProgrammParameters")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.put("/programm-parameters/{id}")
def update_programm_parameter(id: int, data: dict, db=Depends(get_db)):
    value = data.get("ParamValue")
    if value is None:
        raise HTTPException(400, "ParamValue is required")
    cursor = db.cursor()
    cursor.execute("UPDATE ProgrammParameters SET ParamValue=? WHERE ID=?", (value, id))
    db.commit()
    return {"message": "Оновлено"}
