from fastapi import APIRouter, Depends
from typing import Optional
from app.db_connection import get_db  # ← ось тут виправлено!

router = APIRouter()

@router.get("/account-tax-rates")
def get_tax_rates(account_id: Optional[int] = None, db=Depends(get_db)):
    cursor = db.cursor()
    if account_id:
        cursor.execute("SELECT * FROM AccountTaxRates WHERE AccountID = ?", (account_id,))
    else:
        cursor.execute("SELECT * FROM AccountTaxRates")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/account-tax-rates")
def create_tax_rate(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO AccountTaxRates (
            AccountID, TaxType, Rate, DateFrom, DateTo
        ) VALUES (?, ?, ?, ?, ?)
    """, (
        data.get("AccountID"), data.get("TaxType"), data.get("Rate"),
        data.get("DateFrom"), data.get("DateTo")
    ))
    db.commit()
    return {"ok": True}

@router.put("/account-tax-rates/{rate_id}")
def update_tax_rate(rate_id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE AccountTaxRates SET
            AccountID = ?, TaxType = ?, Rate = ?, DateFrom = ?, DateTo = ?
        WHERE ID = ?
    """, (
        data.get("AccountID"), data.get("TaxType"), data.get("Rate"),
        data.get("DateFrom"), data.get("DateTo"), rate_id
    ))
    db.commit()
    return {"ok": True}

@router.delete("/account-tax-rates/{rate_id}")
def delete_tax_rate(rate_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM AccountTaxRates WHERE ID = ?", (rate_id,))
    db.commit()
    return {"ok": True}
