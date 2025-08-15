# app/services/taxes.py
from __future__ import annotations
from typing import Optional, Dict, Any, List
import pyodbc
from .utils import money

T_ACC_RATES = "dbo.AccountTaxRates"
T_TAXES     = "dbo.Taxes"
T_DOC_TAXES = "dbo.DocumentTaxes"

def get_account_tax(
    conn: pyodbc.Connection, account_id: int, on_date
) -> Optional[Dict[str, Any]]:
    """
    Повертає актуальну для рахунку ставку податку (якщо є) + довідник податку.
    """
    sql = f"""
      SELECT TOP 1 r.ID as RateID, r.AccountID, r.Rate, r.TaxID,
             t.Name, t.TaxRate as DefaultRate, t.IsFixed, t.CurrencyID
      FROM {T_ACC_RATES} r
      LEFT JOIN {T_TAXES} t ON t.ID = r.TaxID
      WHERE r.AccountID = ?
        AND r.DateFrom <= ?
        AND (r.DateTo IS NULL OR r.DateTo >= ?)
      ORDER BY r.DateFrom DESC, r.ID DESC
    """
    cur = conn.cursor()
    cur.execute(sql, (account_id, on_date, on_date))
    r = cur.fetchone()
    if not r:
        return None
    return {
        "RateID": r.RateID,
        "AccountID": r.AccountID,
        "TaxID": r.TaxID,
        "Rate": float(r.Rate or 0),            # % з таблиці AccountTaxRates
        "TaxName": r.Name,
        "IsFixed": bool(r.IsFixed),
        "CurrencyID": r.CurrencyID,           # якщо задано — фіксована сума у валюті (ЄСВ тощо)
    }

def split_amount_by_vat(
    net_or_gross: float, *,
    prices_include_vat: bool,
    percent: float
) -> Dict[str, float]:
    """
    Розщеплює суму на 'net' і 'vat' для відсоткових податків.
    Якщо ціни з ПДВ — відділяємо податок із загальної суми,
    інакше — додаємо податок зверху.
    """
    p = (percent or 0) / 100.0
    if p <= 0:
        return {"net": money(net_or_gross), "vat": 0.0, "gross": money(net_or_gross)}
    if prices_include_vat:
        net = net_or_gross / (1.0 + p)
        vat = net_or_gross - net
        return {"net": money(net), "vat": money(vat), "gross": money(net_or_gross)}
    else:
        net = net_or_gross
        vat = net * p
        return {"net": money(net), "vat": money(vat), "gross": money(net + vat)}

def insert_document_tax(
    conn: pyodbc.Connection,
    *,
    document_id: int,
    document_type: str,
    tax_id: int,
    account_id: int,
    base_amount: float,
    tax_rate: float,
    tax_amount: float,
    currency_id: int | None,
    user_id: int | None,
    comment: str = ""
) -> int:
    sql = f"""
      INSERT INTO {T_DOC_TAXES}
        (DocumentType, DocumentID, TaxID, AccountID,
         BaseAmount, TaxRate, TaxAmount, CurrencyID, CreatedAt, CreatedBy, Comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), ?, ?)
    """
    cur = conn.cursor()
    cur.execute(sql, (document_type, document_id, tax_id, account_id,
                      base_amount, tax_rate, tax_amount, currency_id, user_id, comment))
    conn.commit()
    return cur.rowcount
