from fastapi import APIRouter, Depends
from app.db_connection import get_db  # Виправила шлях!

router = APIRouter()

@router.get("/units")
def get_units(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, UnitName, ShortName FROM Units ORDER BY UnitName")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]
