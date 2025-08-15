# app/routes/auth.py

from fastapi import APIRouter, HTTPException, Depends
from app.db_connection import get_db
from hashlib import sha256

router = APIRouter()

@router.post("/login")
def login(data: dict, db=Depends(get_db)):
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Логін і пароль обовʼязкові")

    # Витягуємо користувача з бази
    cursor = db.cursor()
    cursor.execute("SELECT ID, Username, PasswordHash, IsActive, CentersOfAccountingID FROM Users WHERE Username=?", (username,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Невірний логін або пароль")
    user = dict(zip([col[0] for col in cursor.description], row))

    # Перевірка пароля (sha256, якщо саме так ти зберігаєш)
    if sha256(password.encode()).hexdigest() != user["PasswordHash"]:
        raise HTTPException(status_code=401, detail="Невірний логін або пароль")
    if not user["IsActive"]:
        raise HTTPException(status_code=403, detail="Користувач не активний")

    # Можна видати додаткові дані, але не віддавати PasswordHash!
    del user["PasswordHash"]
    return user
