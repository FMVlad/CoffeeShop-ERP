from fastapi import APIRouter, Depends
from typing import Optional
from app.db_connection import get_db

router = APIRouter()

@router.get("/typical-operation-entries")
def get_entries(operation_id: Optional[int] = None, db=Depends(get_db)):
    cursor = db.cursor()
    if operation_id:
        cursor.execute("SELECT * FROM TypicalOperationEntries WHERE OperationID = ?", (operation_id,))
    else:
        cursor.execute("SELECT * FROM TypicalOperationEntries")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/typical-operation-entries")
def create_entry(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO TypicalOperationEntries (
            OperationID, DebitAccountID, CreditAccountID, AmountType, Notes
        ) VALUES (?, ?, ?, ?, ?)
    """, (
        data.get("OperationID"), data.get("DebitAccountID"),
        data.get("CreditAccountID"), data.get("AmountType"), data.get("Notes")
    ))
    db.commit()
    return {"ok": True}

@router.put("/typical-operation-entries/{entry_id}")
def update_entry(entry_id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE TypicalOperationEntries SET
            OperationID = ?, DebitAccountID = ?, CreditAccountID = ?, AmountType = ?, Notes = ?
        WHERE ID = ?
    """, (
        data.get("OperationID"), data.get("DebitAccountID"),
        data.get("CreditAccountID"), data.get("AmountType"), data.get("Notes"), entry_id
    ))
    db.commit()
    return {"ok": True}

@router.delete("/typical-operation-entries/{entry_id}")
def delete_entry(entry_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM TypicalOperationEntries WHERE ID = ?", (entry_id,))
    db.commit()
    return {"ok": True}
