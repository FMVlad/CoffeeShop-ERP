from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.db_connection import get_db

router = APIRouter()

# === Довідник податків ===
@router.get("/taxes")
def get_taxes(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Taxes ORDER BY Name")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/taxes")
def create_tax(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Taxes (Name, TaxRate, IsDefault, IsFixed, CurrencyID, Notes, DateFrom, DateTo, CreatedAt, UpdatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), NULL)
    """, (
        data.get("Name"),
        data.get("TaxRate"),
        data.get("IsDefault", 0),
        data.get("IsFixed", 0),
        data.get("CurrencyID"),
        data.get("Notes"),
        data.get("DateFrom"),
        data.get("DateTo"),
    ))
    db.commit()
    return {"ok": True}

@router.put("/taxes/{tax_id}")
def update_tax(tax_id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Taxes
        SET Name=?, TaxRate=?, IsDefault=?, IsFixed=?, CurrencyID=?, Notes=?, DateFrom=?, DateTo=?, UpdatedAt=GETDATE()
        WHERE ID=?
    """, (
        data.get("Name"),
        data.get("TaxRate"),
        data.get("IsDefault", 0),
        data.get("IsFixed", 0),
        data.get("CurrencyID"),
        data.get("Notes"),
        data.get("DateFrom"),
        data.get("DateTo"),
        tax_id
    ))
    db.commit()
    return {"ok": True}

@router.delete("/taxes/{tax_id}")
def delete_tax(tax_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Taxes WHERE ID = ?", (tax_id,))
    db.commit()
    return {"ok": True}

# === Прив'язка ставок до рахунків (AccountTaxRates) ===
@router.get("/account-tax-rates")
def get_tax_rates(account_id: Optional[int] = None, db=Depends(get_db)):
    cursor = db.cursor()
    if account_id:
        cursor.execute("""
            SELECT ar.*, t.Name AS TaxName, t.TaxRate, t.IsFixed, t.CurrencyID
            FROM AccountTaxRates ar
            LEFT JOIN Taxes t ON ar.TaxID = t.ID
            WHERE ar.AccountID = ?
        """, (account_id,))
    else:
        cursor.execute("""
            SELECT ar.*, t.Name AS TaxName, t.TaxRate, t.IsFixed, t.CurrencyID
            FROM AccountTaxRates ar
            LEFT JOIN Taxes t ON ar.TaxID = t.ID
        """)
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/account-tax-rates")
def create_tax_rate(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO AccountTaxRates (AccountID, TaxID, Rate, DateFrom, DateTo)
        VALUES (?, ?, ?, ?, ?)
    """, (
        data.get("AccountID"),
        data.get("TaxID"),
        data.get("Rate"),
        data.get("DateFrom"),
        data.get("DateTo"),
    ))
    db.commit()
    return {"ok": True}

@router.put("/account-tax-rates/{rate_id}")
def update_tax_rate(rate_id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE AccountTaxRates
        SET AccountID=?, TaxID=?, Rate=?, DateFrom=?, DateTo=?
        WHERE ID=?
    """, (
        data.get("AccountID"),
        data.get("TaxID"),
        data.get("Rate"),
        data.get("DateFrom"),
        data.get("DateTo"),
        rate_id
    ))
    db.commit()
    return {"ok": True}

@router.delete("/account-tax-rates/{rate_id}")
def delete_tax_rate(rate_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM AccountTaxRates WHERE ID = ?", (rate_id,))
    db.commit()
    return {"ok": True}
