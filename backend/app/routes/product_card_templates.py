from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db  # ← правильно для uvicorn app.main:app

router = APIRouter()

# ==== 1. Всі шаблони карток (шапки) ====
@router.get("/product-card-templates")
def get_card_templates(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, Name, Description, IsDefault FROM ProductCardTemplateHeaders ORDER BY ID")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# ==== 2. Додати новий шаблон картки ====
@router.post("/product-card-templates")
def add_card_template(data: dict, db=Depends(get_db)):
    name = data.get("Name")
    desc = data.get("Description")
    if not name:
        raise HTTPException(status_code=400, detail="Поле Name обовʼязкове!")
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO ProductCardTemplateHeaders (Name, Description) VALUES (?, ?)",
        (name, desc)
    )
    db.commit()
    return {"message": "Шаблон картки створено!"}

# ==== 3. Оновити шаблон картки ====
@router.put("/product-card-templates/{id}")
def update_card_template(id: int, data: dict, db=Depends(get_db)):
    name = data.get("Name")
    desc = data.get("Description")
    if not name:
        raise HTTPException(status_code=400, detail="Поле Name обовʼязкове!")
    cursor = db.cursor()
    cursor.execute(
        "UPDATE ProductCardTemplateHeaders SET Name = ?, Description = ? WHERE ID = ?",
        (name, desc, id)
    )
    db.commit()
    return {"message": "Шаблон картки оновлено!"}

# ==== 4. Видалити шаблон картки ====
@router.delete("/product-card-templates/{id}")
def delete_card_template(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    # Перевіряємо, чи є пов'язані поля (можеш забрати цей блок, якщо не треба)
    cursor.execute("SELECT COUNT(*) FROM ProductCardTemplates WHERE TemplateID = ?", (id,))
    if cursor.fetchone()[0] > 0:
        raise HTTPException(status_code=400, detail="Неможливо видалити шаблон: спочатку видаліть усі його поля!")
    cursor.execute("DELETE FROM ProductCardTemplateHeaders WHERE ID = ?", (id,))
    db.commit()
    return {"message": "Шаблон картки видалено!"}

# ==== 5. Отримати один шаблон по ID ====
@router.get("/product-card-templates/{id}")
def get_card_template_by_id(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, Name, Description FROM ProductCardTemplateHeaders WHERE ID = ?", (id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Шаблон не знайдено")
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))
