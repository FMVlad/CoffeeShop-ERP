# app/routes/center_companies.py

from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db

router = APIRouter()

# Отримати список компаній, прив'язаних до центру обліку
@router.get("/center-companies")
def get_center_companies(center_id: int = Query(...), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT c.ID, c.Name, c.ShortName
        FROM Companies c
        INNER JOIN CompanyCenters cc ON cc.CompanyID = c.ID
        WHERE cc.CenterID = ?
        ORDER BY c.Name
    """, (center_id,))
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# Додати компанію до центру обліку
@router.post("/center-companies")
def add_company_to_center(data: dict, db=Depends(get_db)):
    center_id = data.get("center_id")
    company_id = data.get("company_id")
    if not (center_id and company_id):
        raise HTTPException(status_code=400, detail="center_id та company_id обовʼязкові")
    cursor = db.cursor()
    cursor.execute("INSERT INTO CompanyCenters (CenterID, CompanyID) VALUES (?, ?)", (center_id, company_id))
    db.commit()
    return {"success": True}


# Відв'язати компанію від центру обліку
@router.delete("/center-companies")
def remove_company_from_center(center_id: int = Query(...), company_id: int = Query(...), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM CompanyCenters WHERE CenterID = ? AND CompanyID = ?", (center_id, company_id))
    db.commit()
    return {"success": True}
