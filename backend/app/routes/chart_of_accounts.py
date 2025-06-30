from fastapi import APIRouter, Depends
from typing import Optional
from app.db_connection import get_db   # ← виправлений імпорт!

router = APIRouter()

@router.get("/accounts")
def get_accounts(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, AccountCode, Name, ParentID, AccountType,
               AccountPurpose, CurrencyID, IsActive, IsSystem, Notes
        FROM ChartOfAccounts
    """)
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/accounts")
def create_account(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO ChartOfAccounts (
            AccountCode, Name, ParentID, AccountType,
            AccountPurpose, CurrencyID, IsActive, IsSystem, Notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("AccountCode"), data.get("Name"), data.get("ParentID"), data.get("AccountType"),
        data.get("AccountPurpose"), data.get("CurrencyID"), data.get("IsActive", True),
        data.get("IsSystem", False), data.get("Notes")
    ))
    db.commit()
    return {"ok": True}

@router.put("/accounts/{account_id}")
def update_account(account_id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE ChartOfAccounts SET
            AccountCode = ?, Name = ?, ParentID = ?, AccountType = ?,
            AccountPurpose = ?, CurrencyID = ?, IsActive = ?, IsSystem = ?, Notes = ?
        WHERE ID = ?
    """, (
        data.get("AccountCode"), data.get("Name"), data.get("ParentID"), data.get("AccountType"),
        data.get("AccountPurpose"), data.get("CurrencyID"), data.get("IsActive", True),
        data.get("IsSystem", False), data.get("Notes"), account_id
    ))
    db.commit()
    return {"ok": True}

@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM ChartOfAccounts WHERE ID = ?", (account_id,))
    db.commit()
    return {"ok": True}
