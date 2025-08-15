from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db

router = APIRouter()

# === Отримати всі каси (можна фільтрувати по центру обліку) ===
@router.get("/cashboxes")
def get_cashboxes(center_id: int = Query(None), db=Depends(get_db)):
    cursor = db.cursor()
    query = """
        SELECT cb.ID, cb.Name, cb.CurrencyID, cb.IsActive, cb.CenterID,
               c.CurrencyCode, c.Name as CurrencyName
        FROM Cashboxes cb
        JOIN Currencies c ON cb.CurrencyID = c.ID
    """
    params = []
    if center_id:
        query += " WHERE cb.CenterID = ?"
        params.append(center_id)
    query += " ORDER BY cb.Name"
    cursor.execute(query, params)
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# === Додати касу ===
@router.post("/cashboxes")
def create_cashbox(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Cashboxes (Name, CurrencyID, CenterID, IsActive)
        OUTPUT INSERTED.ID
        VALUES (?, ?, ?, ?)
    """, (
        data.get("Name"),
        data.get("CurrencyID"),
        data.get("CenterID"),      # <--- ID центру обліку
        data.get("IsActive", 1),
    ))
    new_id = cursor.fetchone()[0]
    db.commit()
    return {"id": new_id}

# === Оновити касу ===
@router.put("/cashboxes/{id}")
def update_cashbox(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Cashboxes
        SET Name = ?, CurrencyID = ?, CenterID = ?, IsActive = ?
        WHERE ID = ?
    """, (
        data.get("Name"),
        data.get("CurrencyID"),
        data.get("CenterID"),
        data.get("IsActive", 1),
        id
    ))
    db.commit()
    return {"success": True}

# === Видалити касу ===
@router.delete("/cashboxes/{id}")
def delete_cashbox(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Cashboxes WHERE ID = ?", (id,))
    db.commit()
    return {"success": True}
