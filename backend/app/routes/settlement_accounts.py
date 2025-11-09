from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

_ACCOUNT_TYPE_DEFAULT = "bank"
_ACCOUNT_TYPE_ALLOWED = {"bank", "card"}


def _normalize_account_type(raw_value: str) -> str:
    value = (raw_value or _ACCOUNT_TYPE_DEFAULT).strip().lower()
    if value not in _ACCOUNT_TYPE_ALLOWED:
        raise HTTPException(
            status_code=400,
            detail=f"AccountType має бути одним із {sorted(_ACCOUNT_TYPE_ALLOWED)}"
        )
    return value


@router.get("/settlement-accounts")
def get_accounts(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT ID,
               AccountName,
               AccountNumber,
               BankName,
               BankCity,
               MFO,
               IsActive,
               AccountType
        FROM SettlementAccounts
        ORDER BY AccountName
        """
    )
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


@router.post("/settlement-accounts")
def create_account(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    account_type = _normalize_account_type(data.get("AccountType"))
    cursor.execute(
        """
        INSERT INTO SettlementAccounts
            (AccountName, AccountNumber, BankName, BankCity, MFO, IsActive, AccountType)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("AccountName"),
            data.get("AccountNumber"),
            data.get("BankName"),
            data.get("BankCity"),
            data.get("MFO"),
            data.get("IsActive", 1),
            account_type,
        ),
    )
    db.commit()
    return {"ok": True}


@router.put("/settlement-accounts/{id}")
def update_account(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    account_type = _normalize_account_type(data.get("AccountType"))
    cursor.execute(
        """
        UPDATE SettlementAccounts
        SET AccountName = ?,
            AccountNumber = ?,
            BankName = ?,
            BankCity = ?,
            MFO = ?,
            IsActive = ?,
            AccountType = ?
        WHERE ID = ?
        """,
        (
            data.get("AccountName"),
            data.get("AccountNumber"),
            data.get("BankName"),
            data.get("BankCity"),
            data.get("MFO"),
            data.get("IsActive", 1),
            account_type,
            id,
        ),
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Рахунок не знайдено")
    db.commit()
    return {"ok": True}


@router.delete("/settlement-accounts/{id}")
def delete_account(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM SettlementAccounts WHERE ID=?", (id,))
    db.commit()
    return {"ok": True}
