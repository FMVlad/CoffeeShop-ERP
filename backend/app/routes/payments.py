from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import Optional, Any, Dict, List
from datetime import datetime
import pyodbc

from app.db_connection import get_db
from app.routes.accounting_periods import is_closed as period_is_closed


router = APIRouter(prefix="/payments", tags=["payments"])


def _fetch_one(db, sql, params=()):
    cur = db.cursor(); cur.execute(sql, params); return cur.fetchone()


def _table_has_column(db: pyodbc.Connection, table: str, column: str) -> bool:
    try:
        row = _fetch_one(db, "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=? AND COLUMN_NAME=?", (table, column))
        return bool(row)
    except Exception:
        return False


def _ensure_table(db: pyodbc.Connection) -> None:
    """Validate presence of required table; do NOT modify schema automatically."""
    try:
        row = _fetch_one(db, "SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.MoneyMovements') AND type in ('U')")
        if not row:
            raise HTTPException(500, "Таблиця dbo.MoneyMovements відсутня. Додайте її в БД")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(500, "Помилка перевірки наявності таблиці dbo.MoneyMovements")


def _resolve_account_for_company(db: pyodbc.Connection, company_id: int) -> Optional[int]:
    """Повертає MainAccountID компанії, якщо заданий, інакше None."""
    try:
        row = _fetch_one(db, "SELECT MainAccountID FROM dbo.Companies WHERE ID=?", (int(company_id),))
        if row and row[0] is not None:
            try:
                return int(row[0])
            except Exception:
                return None
        return None
    except Exception:
        return None


def _resolve_account_id(db: pyodbc.Connection, code_or_id) -> Optional[int]:
    """Повертає ChartOfAccounts.ID за ID або кодом (301, 311, 361 тощо)."""
    if code_or_id is None:
        return None
    try:
        val = int(code_or_id)
    except Exception:
        return None
    try:
        row = _fetch_one(db, "SELECT ID FROM ChartOfAccounts WHERE ID=?", (val,))
        if row and row[0] is not None:
            return int(row[0])
        # Підтримка різних назв колонок
        if _table_has_column(db, "ChartOfAccounts", "AccountCode"):
            row = _fetch_one(db, "SELECT TOP 1 ID FROM ChartOfAccounts WHERE TRY_CONVERT(INT, AccountCode)=?", (val,))
            if row and row[0] is not None:
                return int(row[0])
        if _table_has_column(db, "ChartOfAccounts", "Code"):
            row = _fetch_one(db, "SELECT TOP 1 ID FROM ChartOfAccounts WHERE TRY_CONVERT(INT, Code)=?", (val,))
            if row and row[0] is not None:
                return int(row[0])
        if _table_has_column(db, "ChartOfAccounts", "AccountNumber"):
            row = _fetch_one(db, "SELECT TOP 1 ID FROM ChartOfAccounts WHERE TRY_CONVERT(INT, AccountNumber)=?", (val,))
            if row and row[0] is not None:
                return int(row[0])
    except Exception:
        return None
    return None


@router.options("")
def options_payments_root():
    return Response()


@router.options("/{path:path}")
def options_payments_wildcard(path: str = ""):
    return Response()


@router.get("")
def list_payments(
    document_type: Optional[str] = Query(None),
    document_id: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: pyodbc.Connection = Depends(get_db)
):
    _ensure_table(db)
    where: List[str] = []
    p: List[Any] = []
    if document_type:
        where.append("RelatedObjectType=?"); p.append(document_type)
    if document_id:
        where.append("RelatedObjectID=?"); p.append(document_id)
    if date_from:
        where.append("DateTime>=?"); p.append(date_from)
    if date_to:
        where.append("DateTime<=?"); p.append(date_to)

    base = [
        "ID", "RelatedObjectType AS DocumentType", "RelatedObjectID AS DocumentID",
        "PaymentMethod", "Amount", "CurrencyID", "DateTime AS [Date]",
        "DebitAccountID", "CreditAccountID"
    ]
    # Повертаємо псевдонім AccountID для сумісності, якщо реальної колонки немає
    if _table_has_column(db, 'MoneyMovements', 'AccountID'):
        base.append("AccountID")
    else:
        base.append("DebitAccountID AS AccountID")
    # Інші колонки (допускаємо їх наявність)
    base.append("CompanyID")
    if _table_has_column(db, 'MoneyMovements', 'Comment'):
        base.append("Comment AS Notes")
    if _table_has_column(db, 'MoneyMovements', 'CreatedAt'):
        base.append("CreatedAt")
    if _table_has_column(db, 'MoneyMovements', 'CreatedBy'):
        base.append("CreatedBy")
    if _table_has_column(db, 'MoneyMovements', 'IsAuto'):
        base.append("IsNull(IsAuto,0) AS IsAuto")
    if _table_has_column(db, 'MoneyMovements', 'CheckboxReceiptID'):
        base.append("CheckboxReceiptID")
    if _table_has_column(db, 'MoneyMovements', 'CheckboxFiscalNumber'):
        base.append("CheckboxFiscalNumber")
    if _table_has_column(db, 'MoneyMovements', 'CheckboxStatus'):
        base.append("CheckboxStatus")

    sql = f"SELECT {', '.join(base)} FROM dbo.MoneyMovements"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY DateTime DESC, ID DESC"

    cur = db.cursor()
    cur.execute(sql, tuple(p))
    cols = [c[0] for c in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    if 'IsAuto' not in cols:
        for r in rows:
            r['IsAuto'] = 0
    return rows


@router.post("")
def create_payment(payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    _ensure_table(db)
    doc_type = (payload.get("DocumentType") or "").upper()
    doc_id = payload.get("DocumentID")
    method = (payload.get("PaymentMethod") or "cash").lower()
    amount = float(payload.get("Amount") or 0)
    date_val = (payload.get("Date") or datetime.now())
    if not doc_type or not doc_id or amount == 0:
        raise HTTPException(400, "DocumentType, DocumentID і ненульова Amount — обов'язково")
    if period_is_closed(db, str(date_val)[:10]):
        raise HTTPException(400, "Період закритий для проведень")

    # Визначаємо рахунки: каса/банк проти дебіторки (361). Знак суми інвертує напрямок.
    company_id = payload.get("CompanyID")
    amount_abs = abs(amount)
    cash_or_bank_code = 301 if method == 'cash' else 311
    ar_code = 361
    if amount > 0:
        debit_code, credit_code = cash_or_bank_code, ar_code
    else:
        debit_code, credit_code = ar_code, cash_or_bank_code
    debit_id = _resolve_account_id(db, debit_code)
    credit_id = _resolve_account_id(db, credit_code)
    if debit_id is None or credit_id is None:
        raise HTTPException(400, f"Не знайдено рахунки (Дт {debit_code}, Кт {credit_code}) у Плані рахунків")

    cols = [
        "RelatedObjectType","RelatedObjectID","PaymentMethod","Amount","CurrencyID",
        "DateTime","DebitAccountID","CreditAccountID","CompanyID","Comment","CreatedAt","CreatedBy"
    ]
    vals = [
        doc_type, doc_id, method, amount_abs, payload.get("CurrencyID"),
        date_val, int(debit_id), int(credit_id), company_id, payload.get("Notes"),
        datetime.now(), payload.get("CreatedBy")
    ]
    if _table_has_column(db, 'MoneyMovements', 'IsAuto'):
        cols.append("IsAuto"); vals.append(1 if payload.get("IsAuto") else 0)
    # Підтримка Checkbox-полів (опційно)
    if _table_has_column(db, 'MoneyMovements', 'CheckboxReceiptID') and payload.get("CheckboxReceiptID") is not None:
        cols.append("CheckboxReceiptID"); vals.append(payload.get("CheckboxReceiptID"))
    if _table_has_column(db, 'MoneyMovements', 'CheckboxFiscalNumber') and payload.get("CheckboxFiscalNumber") is not None:
        cols.append("CheckboxFiscalNumber"); vals.append(payload.get("CheckboxFiscalNumber"))
    if _table_has_column(db, 'MoneyMovements', 'CheckboxStatus') and payload.get("CheckboxStatus") is not None:
        cols.append("CheckboxStatus"); vals.append(payload.get("CheckboxStatus"))

    placeholders = ",".join(["?"]*len(vals))
    cur = db.cursor(); cur.execute(f"INSERT INTO dbo.MoneyMovements ({','.join(cols)}) OUTPUT INSERTED.ID VALUES ({placeholders})", tuple(vals))
    r = cur.fetchone(); pay_id = int(r[0])
    db.commit()
    return {"ok": True, "ID": pay_id}


@router.post("/{payment_id}/postings")
def generate_payment_postings(payment_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_table(db)
    p = _fetch_one(db, "SELECT RelatedObjectType, RelatedObjectID, PaymentMethod, Amount, DateTime, CompanyID FROM dbo.MoneyMovements WHERE ID=?", (payment_id,))
    if not p:
        raise HTTPException(404, "Оплату не знайдено")
    doc_type, doc_id, method, amount, on_dt, company_id = p[0], int(p[1]), (p[2] or "cash").lower(), float(p[3] or 0), str(p[4])[:10], p[5]
    if period_is_closed(db, on_dt):
        raise HTTPException(400, "Період закритий для проведень")

    # Постинг: каса/банк; негатив — повернення клієнту
    cash_or_bank = 301 if method == 'cash' else 311
    ar = 361
    amount_abs = abs(amount)
    if amount > 0:
        debit_code, credit_code = cash_or_bank, ar
    else:
        debit_code, credit_code = ar, cash_or_bank
    debit_id = _resolve_account_id(db, debit_code)
    credit_id = _resolve_account_id(db, credit_code)
    if debit_id is None or credit_id is None:
        raise HTTPException(400, f"Не знайдено рахунки (Дт {debit_code}, Кт {credit_code}) у Плані рахунків")

    has_company = _table_has_column(db, "DocumentPostings", "CompanyID")
    cur = db.cursor()
    try:
        cur.execute("DELETE FROM DocumentPostings WHERE DocumentType='PAYMENT' AND DocumentID=?", (payment_id,))
    except Exception:
        pass
    if has_company:
        cur.execute(
            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CompanyID, CreatedAt, CreatedBy, Comment) VALUES (?, 'PAYMENT', ?, ?, ?, ?, ?, GETDATE(), ?, ?)",
            (payment_id, on_dt, int(debit_id), int(credit_id), amount_abs, company_id, 1, f"{doc_type}#{doc_id}")
        )
    else:
        cur.execute(
            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CreatedAt, CreatedBy, Comment) VALUES (?, 'PAYMENT', ?, ?, ?, ?, GETDATE(), ?, ?)",
            (payment_id, on_dt, int(debit_id), int(credit_id), amount_abs, 1, f"{doc_type}#{doc_id}")
        )
    db.commit()
    return {"ok": True}


@router.put("/{payment_id}/checkbox")
def update_payment_checkbox(payment_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    """Оновлює CheckboxReceiptID/FiscalNumber/Status для платежу."""
    _ensure_table(db)
    sets: List[str] = []
    vals: List[Any] = []
    if _table_has_column(db, 'MoneyMovements', 'CheckboxReceiptID') and payload.get('CheckboxReceiptID') is not None:
        sets.append("CheckboxReceiptID=?"); vals.append(payload.get('CheckboxReceiptID'))
    if _table_has_column(db, 'MoneyMovements', 'CheckboxFiscalNumber') and payload.get('CheckboxFiscalNumber') is not None:
        sets.append("CheckboxFiscalNumber=?"); vals.append(payload.get('CheckboxFiscalNumber'))
    if _table_has_column(db, 'MoneyMovements', 'CheckboxStatus') and payload.get('CheckboxStatus') is not None:
        sets.append("CheckboxStatus=?"); vals.append(payload.get('CheckboxStatus'))
    if not sets:
        return {"ok": True}
    cur = db.cursor()
    cur.execute(f"UPDATE dbo.MoneyMovements SET {', '.join(sets)} WHERE ID=?", (*vals, payment_id))
    db.commit()
    return {"ok": True}


@router.delete("/{payment_id}")
def delete_payment(payment_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_table(db)
    cur = db.cursor()
    # Видаляємо пов'язані проводки типу PAYMENT
    try:
        cur.execute("DELETE FROM DocumentPostings WHERE DocumentType='PAYMENT' AND DocumentID=?", (payment_id,))
    except Exception:
        pass
    # Видаляємо сам платіж
    cur.execute("DELETE FROM dbo.MoneyMovements WHERE ID=?", (payment_id,))
    db.commit()
    return {"ok": True}
















