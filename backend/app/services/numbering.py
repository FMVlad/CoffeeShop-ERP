# app/services/numbering.py
from __future__ import annotations
from typing import Optional
import pyodbc

T_ARR = "dbo.ArrivalDocuments"

def next_doc_number(conn: pyodbc.Connection, *, for_date) -> str:
    """
    Проста автонумерація: YYYYMM-XXXX в межах місяця.
    Можна замінити на більш складну схему, якщо треба.
    """
    y = for_date.year
    m = for_date.month
    pref = f"{y}{m:02d}-"
    cur = conn.cursor()
    cur.execute(
        f"SELECT MAX(Number) FROM {T_ARR} WHERE Number LIKE ?",
        (pref + "%",),
    )
    last = cur.fetchone()[0] or ""
    try:
        tail = int((last.split("-")[1]) if "-" in last else "0")
    except Exception:
        tail = 0
    return f"{pref}{tail+1:04d}"
