from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db  # ← виправлений імпорт!

router = APIRouter()

@router.get("/companies")
def get_companies(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT ID, Name, ShortName, EDRPOU, INN AS IPN, Address, RegistrationInfo, TaxInfo, MainAccountID
        FROM Companies
        """
    )
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/companies")
def create_company(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Companies (Name, ShortName, EDRPOU, INN, Address, RegistrationInfo, TaxInfo, MainAccountID)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("Name"), data.get("ShortName"), data.get("EDRPOU"), data.get("IPN") or data.get("INN"), data.get("Address"),
        data.get("RegistrationInfo"), data.get("TaxInfo"), data.get("MainAccountID")
    ))
    db.commit()
    return {"ok": True}


@router.put("/companies/{id}")
def update_company(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    sets = []
    vals = []
    mapping = {
        "Name": "Name",
        "ShortName": "ShortName",
        "EDRPOU": "EDRPOU",
        # front sends IPN; store into INN
        "IPN": "INN",
        "INN": "INN",
        "Address": "Address",
        "RegistrationInfo": "RegistrationInfo",
        "TaxInfo": "TaxInfo",
        "MainAccountID": "MainAccountID",
    }
    for key, col in mapping.items():
        if key in data and data.get(key) is not None:
            sets.append(f"{col}=?")
            vals.append(data.get(key))
    if not sets:
        return {"ok": True}
    vals.append(id)
    cursor.execute(f"UPDATE Companies SET {', '.join(sets)} WHERE ID=?", tuple(vals))
    db.commit()
    return {"ok": True}

@router.delete("/companies/{id}")
def delete_company(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Companies WHERE ID=?", (id,))
    db.commit()
    return {"ok": True}
