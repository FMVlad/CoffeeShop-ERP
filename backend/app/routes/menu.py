from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

# --- Отримати всі товари ---
@router.get("/menu")
def get_menu(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Products")
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, row)) for row in rows]

# --- Отримати один товар по ID ---
@router.get("/menu/{item_id}")
def get_menu_item(item_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Products WHERE ID=?", (item_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))

# --- Додати новий товар ---
@router.post("/menu")
def create_menu_item(item: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO Products (Name, Description, Barcode, Photo, CategoryID) VALUES (?, ?, ?, ?, ?)",
        (
            item.get("Name"),
            item.get("Description"),
            item.get("Barcode"),
            item.get("Photo"),
            item.get("CategoryID")
        )
    )
    db.commit()
    # У MSSQL з pyodbc іноді lastrowid не працює — можна отримати ID так:
    cursor.execute("SELECT SCOPE_IDENTITY()")
    new_id = cursor.fetchone()[0]
    return {"message": "Товар додано", "id": new_id}

# --- Оновити товар ---
@router.put("/menu/{item_id}")
def update_menu_item(item_id: int, item: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "UPDATE Products SET Name=?, Description=?, Barcode=?, Photo=?, CategoryID=? WHERE ID=?",
        (
            item.get("Name"),
            item.get("Description"),
            item.get("Barcode"),
            item.get("Photo"),
            item.get("CategoryID"),
            item_id
        )
    )
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    return {"message": "Товар оновлено"}

# --- Видалити товар ---
@router.delete("/menu/{item_id}")
def delete_menu_item(item_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Products WHERE ID=?", (item_id,))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    return {"message": "Товар видалено"}
