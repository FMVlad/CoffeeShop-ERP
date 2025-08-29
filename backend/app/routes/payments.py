from fastapi import APIRouter, Depends, HTTPException, Query
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
    cur = db.cursor()
    cur.execute(
        """
        IF OBJECT_ID('dbo.Payments','U') IS NULL
        BEGIN
          CREATE TABLE dbo.Payments (
            ID INT IDENTITY(1,1) PRIMARY KEY,
            DocumentType NVARCHAR(30) NOT NULL,
            DocumentID INT NOT NULL,
            PaymentMethod NVARCHAR(20) NOT NULL, -- cash|bank|card|mixed|other
            Amount DECIMAL(18,2) NOT NULL,
            CurrencyID INT NULL,
            [Date] DATE NOT NULL,
            CashboxID INT NULL,
            AccountID INT NULL,
            CompanyID INT NULL,
            Notes NVARCHAR(255) NULL,
            CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
            CreatedBy INT NULL
          );
          CREATE INDEX IX_Payments_Doc ON dbo.Payments(DocumentType, DocumentID);
          CREATE INDEX IX_Payments_Date ON dbo.Payments([Date]);
        END
        """
    )
    db.commit()


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
        where.append("DocumentType=?"); p.append(document_type)
    if document_id:
        where.append("DocumentID=?"); p.append(document_id)
    if date_from:
        where.append("[Date]>=?"); p.append(date_from)
    if date_to:
        where.append("[Date]<=?"); p.append(date_to)
    sql = "SELECT ID, DocumentType, DocumentID, PaymentMethod, Amount, CurrencyID, [Date], CashboxID, AccountID, CompanyID, Notes, CreatedAt, CreatedBy FROM Payments"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY [Date] DESC, ID DESC"
    cur = db.cursor(); cur.execute(sql, tuple(p))
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


@router.post("")
def create_payment(payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    _ensure_table(db)
    doc_type = (payload.get("DocumentType") or "").upper()
    doc_id = payload.get("DocumentID")
    method = (payload.get("PaymentMethod") or "cash").lower()
    amount = float(payload.get("Amount") or 0)
    date_val = (payload.get("Date") or datetime.now().date())
    if not doc_type or not doc_id or amount <= 0:
        raise HTTPException(400, "DocumentType, DocumentID і додатна Amount — обов'язково")
    if period_is_closed(db, str(date_val)[:10]):
        raise HTTPException(400, "Період закритий для проведень")
    cols = ["DocumentType","DocumentID","PaymentMethod","Amount","CurrencyID","Date","CashboxID","AccountID","CompanyID","Notes","CreatedBy"]
    vals = [doc_type, doc_id, method, amount, payload.get("CurrencyID"), date_val, payload.get("CashboxID"), payload.get("AccountID"), payload.get("CompanyID"), payload.get("Notes"), payload.get("CreatedBy")]
    placeholders = ",".join(["?"]*len(vals))
    cur = db.cursor(); cur.execute(f"INSERT INTO Payments ({','.join(cols)}) OUTPUT INSERTED.ID VALUES ({placeholders})", tuple(vals))
    r = cur.fetchone(); pay_id = int(r[0])
    db.commit()
    return {"ok": True, "ID": pay_id}


@router.post("/{payment_id}/postings")
def generate_payment_postings(payment_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_table(db)
    p = _fetch_one(db, "SELECT DocumentType, DocumentID, PaymentMethod, Amount, [Date], CompanyID FROM Payments WHERE ID=?", (payment_id,))
    if not p:
        raise HTTPException(404, "Оплату не знайдено")
    doc_type, doc_id, method, amount, on_date, company_id = p[0], int(p[1]), (p[2] or "cash").lower(), float(p[3] or 0), str(p[4])[:10], p[5]
    if period_is_closed(db, on_date):
        raise HTTPException(400, "Період закритий для проведень")

    # Постинг: каса/банк
    debit = 301 if method == 'cash' else 311
    credit = 361
    has_company = _table_has_column(db, "DocumentPostings", "CompanyID")
    cur = db.cursor()
    try:
        cur.execute("DELETE FROM DocumentPostings WHERE DocumentType='PAYMENT' AND DocumentID=?", (payment_id,))
    except Exception:
        pass
    if has_company:
        cur.execute(
            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CompanyID, CreatedAt, CreatedBy, Comment) VALUES (?, 'PAYMENT', ?, ?, ?, ?, ?, GETDATE(), ?, ?)",
            (payment_id, on_date, debit, credit, amount, company_id, 1, f"{doc_type}#{doc_id}")
        )
    else:
        cur.execute(
            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CreatedAt, CreatedBy, Comment) VALUES (?, 'PAYMENT', ?, ?, ?, ?, GETDATE(), ?, ?)",
            (payment_id, on_date, debit, credit, amount, 1, f"{doc_type}#{doc_id}")
        )
    db.commit()
    return {"ok": True}
















