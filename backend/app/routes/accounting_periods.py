from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Any, Dict, List
import pyodbc

from app.db_connection import get_db


router = APIRouter()


def _ensure_table(db: pyodbc.Connection) -> None:
    cur = db.cursor()
    cur.execute(
        """
        IF OBJECT_ID('dbo.AccountingPeriods','U') IS NULL
        BEGIN
          CREATE TABLE dbo.AccountingPeriods (
            ID INT IDENTITY(1,1) PRIMARY KEY,
            DateFrom DATE NOT NULL,
            DateTo DATE NOT NULL,
            IsClosed BIT NOT NULL DEFAULT 1,
            Comment NVARCHAR(250) NULL,
            CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
          );
          CREATE INDEX IX_AP_Period ON dbo.AccountingPeriods(DateFrom, DateTo);
        END
        """
    )
    db.commit()


def is_closed(db: pyodbc.Connection, on_date: str) -> bool:
    _ensure_table(db)
    cur = db.cursor()
    row = cur.execute(
        "SELECT TOP 1 1 FROM AccountingPeriods WHERE IsClosed=1 AND DateFrom<=? AND DateTo>=?",
        (on_date, on_date),
    ).fetchone()
    return bool(row)


@router.get("/accounting-periods")
def get_periods(db: pyodbc.Connection = Depends(get_db)):
    _ensure_table(db)
    cur = db.cursor()
    rows = cur.execute(
        "SELECT ID, DateFrom, DateTo, IsClosed, Comment, CreatedAt FROM AccountingPeriods ORDER BY DateFrom DESC, ID DESC"
    ).fetchall()
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


@router.post("/accounting-periods")
def upsert_period(
    data: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)
):
    _ensure_table(db)
    date_from = data.get("DateFrom")
    date_to = data.get("DateTo")
    is_closed = 1 if data.get("IsClosed", True) else 0
    comment = data.get("Comment")
    if not date_from or not date_to:
        raise HTTPException(400, "DateFrom and DateTo are required")
    cur = db.cursor()
    # якщо перетинається з існуючим періодом — оновлюємо/зливаємо
    cur.execute(
        """
        MERGE AccountingPeriods AS t
        USING (SELECT ? AS DateFrom, ? AS DateTo) AS s
        ON (t.DateFrom = s.DateFrom AND t.DateTo = s.DateTo)
        WHEN MATCHED THEN UPDATE SET IsClosed=?, Comment=?
        WHEN NOT MATCHED THEN INSERT(DateFrom, DateTo, IsClosed, Comment) VALUES (s.DateFrom, s.DateTo, ?, ?);
        """,
        (date_from, date_to, is_closed, comment, is_closed, comment),
    )
    db.commit()
    return {"ok": True}
















