from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

@router.get("/settlement-accounts")
def get_accounts(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, AccountName, AccountNumber, BankName, BankCity, MFO, IsActive FROM SettlementAccounts ORDER BY AccountName")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/settlement-accounts")
def create_account(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO SettlementAccounts (AccountName, AccountNumber, BankName, BankCity, MFO, IsActive)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("AccountName"),
            data.get("AccountNumber"),
            data.get("BankName"),
            data.get("BankCity"),
            data.get("MFO"),
            data.get("IsActive", 1)
        )
    )
    db.commit()
    return {"ok": True}

@router.delete("/settlement-accounts/{id}")
def delete_account(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM SettlementAccounts WHERE ID=?", (id,))
    db.commit()
    return {"ok": True}
