# app/services/typical_ops.py
from __future__ import annotations
from typing import List, Dict, Any
import pyodbc

T_OPS = "dbo.TypicalOperations"
T_ENT = "dbo.TypicalOperationEntries"

def get_operation(conn: pyodbc.Connection, op_id: int) -> Dict[str, Any] | None:
    cur = conn.cursor()
    cur.execute(f"SELECT ID, OperationCode, Name, Description, IsActive FROM {T_OPS} WHERE ID=?", (op_id,))
    r = cur.fetchone()
    if not r:
        return None
    return {
        "ID": r.ID, "OperationCode": r.OperationCode, "Name": r.Name,
        "Description": r.Description, "IsActive": bool(r.IsActive),
    }

def get_operation_entries(conn: pyodbc.Connection, op_id: int) -> List[Dict[str, Any]]:
    """
    Повертає рядки типової операції: Дт, Кт, тип суми (None/'percent'), нотатка.
    """
    sql = f"""
      SELECT ID, OperationID, DebitAccountID, CreditAccountID, AmountType, Notes
      FROM {T_ENT}
      WHERE OperationID=?
      ORDER BY ID
    """
    cur = conn.cursor()
    cur.execute(sql, (op_id,))
    out: List[Dict[str, Any]] = []
    for r in cur.fetchall():
        out.append({
            "ID": r.ID,
            "OperationID": r.OperationID,
            "DebitAccountID": r.DebitAccountID,
            "CreditAccountID": r.CreditAccountID,
            "AmountType": (r.AmountType or "").strip().lower() or None,
            "Notes": r.Notes or "",
        })
    return out
