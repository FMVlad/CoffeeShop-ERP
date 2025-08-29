from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Any, Dict, List
from datetime import datetime
import pyodbc

from app.db_connection import get_db
from app.routes.accounting_periods import is_closed as period_is_closed


router = APIRouter(prefix="/money-movements", tags=["money-movements"])


def _fetch_one(db, sql, params=()):
    cur = db.cursor(); cur.execute(sql, params); return cur.fetchone()


def _table_has_column(db: pyodbc.Connection, table: str, column: str) -> bool:
    try:
        row = _fetch_one(db, "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=? AND COLUMN_NAME=?", (table, column))
        return bool(row)
    except Exception:
        return False


@router.get("")
def list_movements(
    related_type: Optional[str] = Query(None),
    related_id: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: pyodbc.Connection = Depends(get_db)
):
    where: List[str] = []
    p: List[Any] = []
    if related_type:
        where.append("RelatedObjectType=?"); p.append(related_type)
    if related_id:
        where.append("RelatedObjectID=?"); p.append(related_id)
    if date_from:
        where.append("DateTime>=?"); p.append(date_from)
    if date_to:
        where.append("DateTime<=?"); p.append(date_to + " 23:59:59")
    sql = (
        "SELECT ID, OperationType, DateTime, CompanyID, CenterID, EmployeeID, DebitAccountID, CreditAccountID, Amount, CurrencyID, "
        "RelatedObjectType, RelatedObjectID, PaymentMethod, Comment FROM MoneyMovements"
    )
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY DateTime DESC, ID DESC"
    cur = db.cursor(); cur.execute(sql, tuple(p))
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


@router.post("")
def create_movement(payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    op_type = (payload.get("OperationType") or "SALE_PAYMENT").upper()
    on_dt = payload.get("DateTime") or payload.get("Date") or datetime.now()
    if period_is_closed(db, str(on_dt)[:10]):
        raise HTTPException(400, "Період закритий для рухів")

    method = (payload.get("PaymentMethod") or "cash").lower()
    amount = float(payload.get("Amount") or 0)
    if amount <= 0:
        raise HTTPException(400, "Amount має бути > 0")

    # Визначаємо тип рахунку за методом
    debit_acc = int(payload.get("DebitAccountID") or (301 if method == 'cash' else 311))
    credit_acc = int(payload.get("CreditAccountID") or 361)

    cols = [
        "OperationType","DateTime","CompanyID","CenterID","EmployeeID","DebitAccountID","CreditAccountID",
        "Amount","CurrencyID","RelatedObjectType","RelatedObjectID","PaymentMethod","Comment"
    ]
    vals = [
        op_type, on_dt, payload.get("CompanyID"), payload.get("CenterID"), payload.get("EmployeeID"), debit_acc, credit_acc,
        amount, payload.get("CurrencyID"), payload.get("RelatedObjectType"), payload.get("RelatedObjectID"), method, payload.get("Comment")
    ]
    placeholders = ",".join(["?"]*len(vals))
    cur = db.cursor(); cur.execute(f"INSERT INTO MoneyMovements ({','.join(cols)}) OUTPUT INSERTED.ID VALUES ({placeholders})", tuple(vals))
    r = cur.fetchone(); mm_id = int(r[0])
    db.commit()
    return {"ok": True, "ID": mm_id}


@router.post("/{movement_id}/postings")
def movement_postings(movement_id: int, db: pyodbc.Connection = Depends(get_db)):
    row = _fetch_one(db, "SELECT DateTime, DebitAccountID, CreditAccountID, Amount, CompanyID, RelatedObjectType, RelatedObjectID FROM MoneyMovements WHERE ID=?", (movement_id,))
    if not row:
        raise HTTPException(404, "Рух не знайдено")
    on_date = str(row[0])[:10]
    if period_is_closed(db, on_date):
        raise HTTPException(400, "Період закритий")
    debit, credit, amount, company_id, rtype, rid = int(row[1] or 0), int(row[2] or 0), float(row[3] or 0), row[4], row[5], row[6]
    has_company = _table_has_column(db, "DocumentPostings", "CompanyID")
    cur = db.cursor()
    try:
        cur.execute("DELETE FROM DocumentPostings WHERE DocumentType='PAYMENT' AND DocumentID=?", (movement_id,))
    except Exception:
        pass
    if has_company:
        cur.execute(
            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CompanyID, CreatedAt, CreatedBy, Comment) VALUES (?, 'PAYMENT', ?, ?, ?, ?, ?, GETDATE(), ?, ?)",
            (movement_id, on_date, debit, credit, amount, company_id, 1, f"{rtype}#{rid}")
        )
    else:
        cur.execute(
            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CreatedAt, CreatedBy, Comment) VALUES (?, 'PAYMENT', ?, ?, ?, ?, GETDATE(), ?, ?)",
            (movement_id, on_date, debit, credit, amount, 1, f"{rtype}#{rid}")
        )
    db.commit()
    return {"ok": True}
















