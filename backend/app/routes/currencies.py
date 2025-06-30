from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db
from datetime import date

router = APIRouter()

# --- Currencies ---

@router.get("/currencies")
def get_currencies(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, CurrencyCode, Name, Symbol, IsActive FROM Currencies")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/currencies")
def add_currency(currency: dict, db=Depends(get_db)):
    code = currency.get("CurrencyCode")
    name = currency.get("Name")
    symbol = currency.get("Symbol")
    if not code or not name:
        raise HTTPException(400, "Потрібні код і назва")
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO Currencies (CurrencyCode, Name, Symbol) VALUES (?, ?, ?)",
        (code, name, symbol)
    )
    db.commit()
    return {"message": "Валюта додана"}

@router.put("/currencies/{id}")
def update_currency(id: int, currency: dict, db=Depends(get_db)):
    code = currency.get("CurrencyCode")
    name = currency.get("Name")
    symbol = currency.get("Symbol")
    is_active = currency.get("IsActive", 1)
    cursor = db.cursor()
    cursor.execute(
        "UPDATE Currencies SET CurrencyCode=?, Name=?, Symbol=?, IsActive=? WHERE ID=?",
        (code, name, symbol, is_active, id)
    )
    db.commit()
    return {"message": "Валюту оновлено"}

@router.delete("/currencies/{id}")
def delete_currency(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Currencies WHERE ID=?", (id,))
    db.commit()
    return {"message": "Валюту видалено"}

# --- Currency Rates ---

@router.get("/currency-rates")
def get_currency_rates(
    currency_id: int = Query(None),
    date_from: date = Query(None),
    date_to: date = Query(None),
    db=Depends(get_db)
):
    query = "SELECT ID, CurrencyID, Rate, RateDate FROM CurrencyRates WHERE 1=1"
    params = []
    if currency_id:
        query += " AND CurrencyID=?"
        params.append(currency_id)
    if date_from:
        query += " AND RateDate >= ?"
        params.append(date_from)
    if date_to:
        query += " AND RateDate <= ?"
        params.append(date_to)
    query += " ORDER BY RateDate DESC"
    cursor = db.cursor()
    cursor.execute(query, tuple(params))
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/currency-rates")
def add_currency_rate(rate: dict, db=Depends(get_db)):
    currency_id = rate.get("CurrencyID")
    rate_value = rate.get("Rate")
    rate_date = rate.get("RateDate")
    if not currency_id or not rate_value or not rate_date:
        raise HTTPException(400, "CurrencyID, Rate, RateDate обов'язково")
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO CurrencyRates (CurrencyID, Rate, RateDate) VALUES (?, ?, ?)",
        (currency_id, rate_value, rate_date)
    )
    db.commit()
    return {"message": "Курс валюти додано"}

@router.put("/currency-rates/{id}")
def update_currency_rate(id: int, rate: dict, db=Depends(get_db)):
    currency_id = rate.get("CurrencyID")
    rate_value = rate.get("Rate")
    rate_date = rate.get("RateDate")
    cursor = db.cursor()
    cursor.execute(
        "UPDATE CurrencyRates SET CurrencyID=?, Rate=?, RateDate=? WHERE ID=?",
        (currency_id, rate_value, rate_date, id)
    )
    db.commit()
    return {"message": "Курс валюти оновлено"}

@router.delete("/currency-rates/{id}")
def delete_currency_rate(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM CurrencyRates WHERE ID=?", (id,))
    db.commit()
    return {"message": "Курс видалено"}
