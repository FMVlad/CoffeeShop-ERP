from fastapi import APIRouter, Depends, Body, HTTPException
from app.db_connection import get_db

router = APIRouter()

# === CRUD для TypicalOperations ===
@router.get("/typical-operations")
def get_operations(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, OperationCode, Name, Description, IsActive FROM TypicalOperations ORDER BY ID")
    cols = [c[0] for c in cursor.description]
    operations = [dict(zip(cols, row)) for row in cursor.fetchall()]
    # Entries для кожної операції
    for op in operations:
        cursor.execute("""
            SELECT ID, OperationID, DebitAccountID, CreditAccountID, AmountType, Notes
            FROM TypicalOperationEntries WHERE OperationID=? ORDER BY ID
        """, (op['ID'],))
        entry_cols = [c[0] for c in cursor.description]
        op['Entries'] = [dict(zip(entry_cols, row)) for row in cursor.fetchall()]
    return operations

@router.post("/typical-operations")
def add_operation(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    # Вставка без OperationCode
    cursor.execute("""
        INSERT INTO TypicalOperations (Name, Description, IsActive)
        OUTPUT INSERTED.ID
        VALUES (?, ?, ?)
    """, (
        data.get("Name"),
        data.get("Description", ""),
        int(data.get("IsActive", 1))
    ))
    new_id = cursor.fetchone()[0]
    # Генеруємо OperationCode і оновлюємо
    op_code = f"OP_{new_id:05d}"
    cursor.execute("UPDATE TypicalOperations SET OperationCode=? WHERE ID=?", (op_code, new_id))
    db.commit()
    return {"id": new_id}

@router.put("/typical-operations/{id}")
def update_operation(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "UPDATE TypicalOperations SET Name=?, Description=?, IsActive=? WHERE ID=?",
        (
            data.get("Name"),
            data.get("Description", ""),
            int(data.get("IsActive", 1)),
            id
        )
    )
    db.commit()
    return {"status": "ok"}

@router.delete("/typical-operations/{id}")
def delete_operation(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM TypicalOperationEntries WHERE OperationID=?", (id,))
    cursor.execute("DELETE FROM TypicalOperations WHERE ID=?", (id,))
    db.commit()
    return {"status": "ok"}

# === CRUD для Entries ===
@router.get("/typical-operations/{operation_id}/entries")
def get_entries(operation_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "SELECT ID, OperationID, DebitAccountID, CreditAccountID, AmountType, Notes FROM TypicalOperationEntries WHERE OperationID=? ORDER BY ID",
        (operation_id,)
    )
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]

@router.post("/typical-operations/{operation_id}/entries")
def save_entries(operation_id: int, entries: list = Body(...), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM TypicalOperationEntries WHERE OperationID=?", (operation_id,))
    for e in entries:
        cursor.execute(
            "INSERT INTO TypicalOperationEntries (OperationID, DebitAccountID, CreditAccountID, AmountType, Notes) VALUES (?, ?, ?, ?, ?)",
            (
                operation_id,
                e.get("DebitAccountID"),
                e.get("CreditAccountID"),
                e.get("AmountType", ""),
                e.get("Notes", "")
            )
        )
    db.commit()
    return {"status": "ok"}
