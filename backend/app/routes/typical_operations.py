from fastapi import APIRouter, Depends
from app.db_connection import get_db  # Виправлено імпорт!

router = APIRouter()

@router.get("/typical-operations")
def get_operations(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, OperationCode, Name, Description, IsActive
        FROM TypicalOperations
    """)
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/typical-operations")
def create_operation(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO TypicalOperations (
            OperationCode, Name, Description, IsActive
        ) VALUES (?, ?, ?, ?)
    """, (
        data.get("OperationCode"), data.get("Name"),
        data.get("Description"), data.get("IsActive", True)
    ))
    db.commit()
    return {"ok": True}

@router.put("/typical-operations/{op_id}")
def update_operation(op_id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE TypicalOperations SET
            OperationCode = ?, Name = ?, Description = ?, IsActive = ?
        WHERE ID = ?
    """, (
        data.get("OperationCode"), data.get("Name"),
        data.get("Description"), data.get("IsActive", True), op_id
    ))
    db.commit()
    return {"ok": True}

@router.delete("/typical-operations/{op_id}")
def delete_operation(op_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM TypicalOperations WHERE ID = ?", (op_id,))
    db.commit()
    return {"ok": True}
