from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

# === Всі користувачі ===
@router.get("/users")
def get_users(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT u.ID, u.Username, u.IsActive, u.CreatedAt, u.CentersOfAccountingID, ca.Name as CenterName
        FROM Users u
        LEFT JOIN CentersOfAccounting ca ON ca.ID = u.CentersOfAccountingID
        ORDER BY u.ID
    """)
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# === Додати користувача ===
@router.post("/users")
def create_user(data: dict, db=Depends(get_db)):
    username = data.get("Username")
    password_hash = data.get("PasswordHash")
    centers_of_accounting_id = data.get("CentersOfAccountingID")
    if not username or not password_hash:
        raise HTTPException(status_code=400, detail="Username і PasswordHash обовʼязкові")
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Users (Username, PasswordHash, IsActive, CentersOfAccountingID, CreatedAt)
        VALUES (?, ?, 1, ?, GETDATE())
    """, (username, password_hash, centers_of_accounting_id))
    db.commit()
    return {"success": True}

# === Оновити користувача ===
@router.put("/users/{id}")
def update_user(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Users
        SET Username = ?, PasswordHash = ?, CentersOfAccountingID = ?, IsActive = ?
        WHERE ID = ?
    """, (
        data.get("Username"),
        data.get("PasswordHash"),
        data.get("CentersOfAccountingID"),
        data.get("IsActive", 1),
        id
    ))
    db.commit()
    return {"success": True}

# === Видалити користувача ===
@router.delete("/users/{id}")
def delete_user(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Users WHERE ID = ?", (id,))
    db.commit()
    return {"success": True}

# === ЛОГІН користувача ===
@router.post("/login")
def login_user(data: dict, db=Depends(get_db)):
    username = data.get("username")
    password_hash = data.get("password_hash")
    if not username or not password_hash:
        raise HTTPException(status_code=400, detail="Логін і пароль обовʼязкові")
    cursor = db.cursor()
    cursor.execute(
        "SELECT ID, Username, CentersOfAccountingID, IsActive FROM Users WHERE Username = ? AND PasswordHash = ?",
        (username, password_hash)
    )
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Невірний логін або пароль")
    if not user[3]:
        raise HTTPException(status_code=403, detail="Користувач неактивний")
    return {
        "id": user[0],
        "username": user[1],
        "center_id": user[2]
    }
