# app/services/accounting_ledger.py
"""
Сервіс роботи з журналом проводок (Головна книга).
"""

from __future__ import annotations
from typing import Iterable, List, Optional, Dict, Any
import datetime as dt
import pyodbc


# Назва реальної таблиці у БД
T_LEDGER = "dbo.DocumentPostings"


def _now() -> dt.datetime:
    return dt.datetime.now()


def get_document_postings(
    conn: pyodbc.Connection,
    document_id: int,
    document_type: str,
) -> List[Dict[str, Any]]:
    """
    Повертає всі проводки документа у “плоскому” вигляді для UI.
    """
    sql = f"""
        SELECT
            ID,
            DocumentID,
            DocumentType,
            PostingDate,
            DebitAccountID,
            CreditAccountID,
            Amount,
            CurrencyID,
            Comment
        FROM {T_LEDGER}
        WHERE DocumentID = ?
          AND DocumentType = ?
        ORDER BY ID
    """
    cur = conn.cursor()
    cur.execute(sql, (document_id, document_type))
    rows = cur.fetchall()

    result: List[Dict[str, Any]] = []
    for i, r in enumerate(rows, start=1):
        result.append(
            {
                "ID": r.ID,
                "LineNo": i,
                "DocumentID": r.DocumentID,
                "DocumentType": r.DocumentType,
                "PostingDate": r.PostingDate.isoformat() if r.PostingDate else None,
                "DebitAccountID": r.DebitAccountID,
                "CreditAccountID": r.CreditAccountID,
                "DebitAccount": r.DebitAccountID,   # для простого відображення числом
                "CreditAccount": r.CreditAccountID, # (за бажанням можна підджойнити план рахунків)
                "Amount": float(r.Amount or 0),
                "CurrencyID": r.CurrencyID,
                "Comment": r.Comment or "",
            }
        )
    return result


def delete_document_postings(
    conn: pyodbc.Connection,
    document_id: int,
    document_type: str,
) -> int:
    """
    Видаляє всі проводки конкретного документа.
    Повертає кількість видалених рядків.
    """
    sql = f"DELETE FROM {T_LEDGER} WHERE DocumentID = ? AND DocumentType = ?"
    cur = conn.cursor()
    cur.execute(sql, (document_id, document_type))
    deleted = cur.rowcount
    conn.commit()
    return deleted


def insert_document_postings(
    conn: pyodbc.Connection,
    *,
    document_id: int,
    document_type: str,
    postings: Iterable[Dict[str, Any]],
    user_id: Optional[int] = None,
    posting_date: Optional[dt.datetime] = None,
    currency_id: Optional[int] = None,
    comment_prefix: Optional[str] = None,
) -> int:
    """
    Додає набір проводок у таблицю dbo.DocumentPostings.

    `postings` – ітератор словників з ключами:
        - DebitAccountID   (int, обов'язково)
        - CreditAccountID  (int, обов'язково)
        - Amount           (число, обов'язково)
        - Comment          (опціонально)

    Повертає кількість вставлених рядків.
    """
    posting_date = posting_date or _now()

    sql = f"""
        INSERT INTO {T_LEDGER}
            (DocumentID, DocumentType, PostingDate,
             DebitAccountID, CreditAccountID, Amount,
             CurrencyID, CreatedBy, CreatedAt, Comment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    cur = conn.cursor()

    inserted = 0
    for p in postings:
        debit = int(p["DebitAccountID"])
        credit = int(p["CreditAccountID"])
        amount = float(p["Amount"])
        cmt = p.get("Comment") or ""
        if comment_prefix:
            cmt = f"{comment_prefix} {cmt}".strip()

        cur.execute(
            sql,
            (
                document_id,
                document_type,
                posting_date,
                debit,
                credit,
                amount,
                currency_id,
                user_id,
                _now(),
                cmt,
            ),
        )
        inserted += 1

    conn.commit()
    return inserted


def upsert_document_postings(
    conn: pyodbc.Connection,
    *,
    document_id: int,
    document_type: str,
    postings: Iterable[Dict[str, Any]],
    user_id: Optional[int] = None,
    posting_date: Optional[dt.datetime] = None,
    currency_id: Optional[int] = None,
    comment_prefix: Optional[str] = None,
) -> Dict[str, int]:
    """
    Заміна всього набору проводок документа:
      - видаляє попередні
      - вставляє нові
    Повертає {"deleted": N, "inserted": M}.
    """
    deleted = delete_document_postings(conn, document_id, document_type)
    inserted = insert_document_postings(
        conn,
        document_id=document_id,
        document_type=document_type,
        postings=postings,
        user_id=user_id,
        posting_date=posting_date,
        currency_id=currency_id,
        comment_prefix=comment_prefix,
    )
    return {"deleted": deleted, "inserted": inserted}


# --- Дрібний помічник для конвертації з “типової операції” у готові проводки ----

def postings_from_typical_entries(
    typical_entries: Iterable[Dict[str, Any]],
    *,
    base_amount: float,
    tax_percent: Optional[float] = None,
    comment: str = "",
) -> List[Dict[str, Any]]:
    """
    Готує масив проводок на основі рядків типової операції.

    typical_entries: [{DebitAccountID, CreditAccountID, AmountType("sum"|"percent"), Notes?}, ...]
    - якщо AmountType == "percent", використовується `tax_percent` (наприклад 20%)
    - якщо AmountType пустий або "sum" — береться весь `base_amount`
    """
    result: List[Dict[str, Any]] = []
    for e in typical_entries:
        amt_type = (e.get("AmountType") or "").strip().lower()
        if amt_type in ("percent", "%"):
            rate = float(tax_percent or 0)
            amount = round(base_amount * rate / 100.0, 2)
        else:
            amount = float(base_amount)

        if amount == 0:
            continue

        result.append(
            {
                "DebitAccountID": int(e["DebitAccountID"]),
                "CreditAccountID": int(e["CreditAccountID"]),
                "Amount": amount,
                "Comment": (e.get("Notes") or comment or "").strip(),
            }
        )
    return result
