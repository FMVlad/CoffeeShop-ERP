from fastapi import APIRouter, Depends, Body
from app.db_connection import get_db

router = APIRouter()

@router.get("/typical-operations/{operation_id}/entries")
def get_entries(operation_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM TypicalOperationEntries WHERE OperationID=? ORDER BY ID", (operation_id,))
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]

@router.post("/typical-operations/{operation_id}/entries")
def save_entries(operation_id: int, entries: list = Body(...), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM TypicalOperationEntries WHERE OperationID=?", (operation_id,))
    for e in entries:
        cursor.execute(
            "INSERT INTO TypicalOperationEntries (OperationID, DebitAccountID, CreditAccountID, AmountType, Notes) VALUES (?, ?, ?, ?, ?)",
            (operation_id, e.get("DebitAccountID"), e.get("CreditAccountID"), e.get("AmountType", ""), e.get("Notes", ""))
        )
    db.commit()
    return {"status": "ok"}
