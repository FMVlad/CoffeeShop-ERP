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
    payment_method: Optional[str] = Query(None),
    center_id: Optional[int] = Query(None),
    db: pyodbc.Connection = Depends(get_db)
):
    _ensure_table(db)
    where: List[str] = []
    p: List[Any] = []
    if document_type:
        where.append("mm.RelatedObjectType=?"); p.append(document_type)
    if document_id:
        where.append("mm.RelatedObjectID=?"); p.append(document_id)
    if date_from:
        where.append("mm.DateTime>=?"); p.append(date_from)
    if date_to:
        where.append("mm.DateTime<=?"); p.append(date_to)
    if payment_method:
        where.append("mm.PaymentMethod=?"); p.append(payment_method)
    if center_id:
        where.append("mm.CenterID=?"); p.append(center_id)

    # Розширений запит з JOIN для платника, отримувача та пов'язаного документа
    sql = f"""
    SELECT 
        mm.ID, mm.RelatedObjectType AS DocumentType, mm.RelatedObjectID AS DocumentID,
        mm.PaymentMethod, mm.Amount, mm.CurrencyID, mm.DateTime AS [Date],
        mm.DebitAccountID, mm.CreditAccountID,
        '' AS DebitAccountCode,
        COALESCE(deb.Name, '') AS DebitAccountName,
        '' AS CreditAccountCode,
        COALESCE(cre.Name, '') AS CreditAccountName,
        mm.CompanyID, mm.Comment AS Notes, mm.OperationPurpose,
        mm.CreatedAt, mm.CreatedBy,
        ISNULL(mm.IsAuto, 0) AS IsAuto,
        mm.CheckboxReceiptID, mm.CheckboxFiscalNumber, mm.CheckboxStatus,
        CASE 
            WHEN mm.PaymentMethod = 'cash' AND mm.Amount > 0 THEN 'Прибуток'
            WHEN mm.PaymentMethod = 'cash' AND mm.Amount < 0 THEN 'Видаток'
            WHEN mm.PaymentMethod != 'cash' AND mm.Amount > 0 THEN 'Надходження'
            WHEN mm.PaymentMethod != 'cash' AND mm.Amount < 0 THEN 'Розрахунок'
            ELSE 'Невідомо'
        END AS Direction,
        mm.DocumentNumber,
        CASE 
            WHEN mm.RelatedObjectType = 'SALE' THEN sd.Number
            ELSE mm.ExternalDocumentNumber
        END AS RelatedDocumentNumber,
        CASE 
            WHEN mm.RelatedObjectType = 'SALE' THEN sd.[Date]
            ELSE mm.DateTime
        END AS RelatedDocumentDate,
        -- Платник: для SALE - назва клієнта, інакше - порожньо або назва рахунку
        CASE 
            WHEN mm.RelatedObjectType = 'SALE' THEN COALESCE(payer.Name, '')
            ELSE COALESCE(deb.Name, '')
        END AS PayerName,
        -- Отримувач: назва центру обліку, інакше - назва рахунку
        COALESCE(center.Name, cre.Name, '') AS RecipientName,
        -- Підстава з датою документа
        CASE 
            WHEN mm.RelatedObjectType = 'SALE' AND mm.OperationPurpose IS NOT NULL AND sd.[Date] IS NOT NULL THEN 
                mm.OperationPurpose + ' від ' + CONVERT(varchar, sd.[Date], 104)
            WHEN mm.RelatedObjectType = 'SALE' AND sd.Number IS NOT NULL AND sd.[Date] IS NOT NULL THEN 
                'Оплата реалізації №' + CAST(sd.Number AS varchar) + ' від ' + CONVERT(varchar, sd.[Date], 104)
            WHEN mm.OperationPurpose IS NOT NULL THEN 
                mm.OperationPurpose
            ELSE ''
        END AS OperationPurposeWithDate
    FROM dbo.MoneyMovements mm
    LEFT JOIN dbo.ChartOfAccounts deb ON deb.ID = mm.DebitAccountID
    LEFT JOIN dbo.ChartOfAccounts cre ON cre.ID = mm.CreditAccountID
    LEFT JOIN dbo.SalesDocuments sd ON sd.ID = mm.RelatedObjectID AND mm.RelatedObjectType = 'SALE'
    LEFT JOIN dbo.Clients payer ON payer.ID = mm.PayerID
    LEFT JOIN dbo.CentersOfAccounting center ON center.ID = mm.CenterID
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY mm.DateTime DESC, mm.ID DESC"

    cur = db.cursor()
    cur.execute(sql, tuple(p))
    cols = [c[0] for c in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
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

    # Додаткова інформація для SALE документів
    payer_id = payload.get("PayerID")
    recipient_id = payload.get("RecipientID")
    center_id = payload.get("CenterID")
    employee_id = payload.get("EmployeeID")
    document_number = payload.get("DocumentNumber")
    operation_purpose = payload.get("OperationPurpose")
    operation_type = payload.get("OperationType") or ("SALE_PAYMENT" if doc_type == "SALE" else None)
    
    # Якщо це оплата за реалізацію (SALE) - заповнюємо дані з документа
    if doc_type == "SALE":
        cur_check = db.cursor()
        sale_row = cur_check.execute(
            "SELECT CustomerID, CompanyID, CenterID, Number, CreatedBy FROM SalesDocuments WHERE ID=?",
            (doc_id,)
        ).fetchone()
        if sale_row:
            customer_id = sale_row[0]
            sale_company_id = sale_row[1]
            sale_center_id = sale_row[2]
            sale_number = sale_row[3]
            sale_created_by = sale_row[4] if len(sale_row) > 4 else None
            
            # Заповнюємо EmployeeID з документа якщо не передано
            if employee_id is None and sale_created_by:
                employee_id = sale_created_by
            
            # Заповнюємо PayerID (клієнт з документа)
            if payer_id is None and customer_id:
                payer_id = customer_id
            # Якщо клієнта немає - шукаємо системного роздрібного покупця
            if payer_id is None:
                retail_row = cur_check.execute(
                    "SELECT ID FROM Clients WHERE Name LIKE '%Роздрібний%' OR Name LIKE '%Retail%' ORDER BY ID"
                ).fetchone()
                if retail_row:
                    payer_id = retail_row[0]
            
            # Заповнюємо RecipientID (компанія з документа або з payload)
            if recipient_id is None:
                recipient_id = sale_company_id or company_id
            
            # Заповнюємо CenterID
            if center_id is None:
                center_id = sale_center_id
            
            # Заповнюємо CompanyID якщо не передано
            if company_id is None:
                company_id = sale_company_id or recipient_id
            
            # Заповнюємо DocumentNumber
            if document_number is None:
                document_number = sale_number or str(doc_id)
            
            # Заповнюємо OperationPurpose
            if operation_purpose is None:
                operation_purpose = f"Оплата реалізації №{document_number}"

    # Визначаємо CreatedBy: з payload, або з документа SALE, або EmployeeID
    created_by = payload.get("CreatedBy") or employee_id or None
    
    cols = [
        "RelatedObjectType","RelatedObjectID","PaymentMethod","Amount","CurrencyID",
        "DateTime","DebitAccountID","CreditAccountID","CompanyID","Comment","CreatedAt"
    ]
    vals = [
        doc_type, doc_id, method, amount_abs, payload.get("CurrencyID"),
        date_val, int(debit_id), int(credit_id), company_id, payload.get("Notes"),
        datetime.now()
    ]
    # Додаємо CreatedBy тільки якщо він є
    if _table_has_column(db, 'MoneyMovements', 'CreatedBy') and created_by:
        cols.append("CreatedBy")
        vals.append(created_by)
    
    # Додаємо додаткові поля якщо вони є
    if _table_has_column(db, 'MoneyMovements', 'OperationType') and operation_type:
        cols.append("OperationType")
        vals.append(operation_type)
    if _table_has_column(db, 'MoneyMovements', 'PayerID') and payer_id:
        cols.append("PayerID")
        vals.append(payer_id)
    if _table_has_column(db, 'MoneyMovements', 'RecipientID') and recipient_id:
        cols.append("RecipientID")
        vals.append(recipient_id)
    if _table_has_column(db, 'MoneyMovements', 'CenterID') and center_id:
        cols.append("CenterID")
        vals.append(center_id)
    if _table_has_column(db, 'MoneyMovements', 'EmployeeID') and employee_id:
        cols.append("EmployeeID")
        vals.append(employee_id)
    if _table_has_column(db, 'MoneyMovements', 'DocumentNumber') and document_number:
        cols.append("DocumentNumber")
        vals.append(document_number)
    if _table_has_column(db, 'MoneyMovements', 'OperationPurpose') and operation_purpose:
        cols.append("OperationPurpose")
        vals.append(operation_purpose)
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
















