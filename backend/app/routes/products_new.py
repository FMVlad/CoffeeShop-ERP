from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.db_connection import get_db
import os
import uuid
from PIL import Image

router = APIRouter()

@router.get("/products")
def get_products(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Products ORDER BY ID DESC")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.get("/products/{id}")
def get_product(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Products WHERE ID = ?", (id,))
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    if row:
        return dict(zip(columns, row))
    raise HTTPException(status_code=404, detail="Товар не знайдено")

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), db=Depends(get_db)):
    """Завантаження фото з унікальним ім'ям"""
    print(f"📤 Отримано файл: {file.filename}, тип: {file.content_type}")
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Файл повинен бути зображенням")
    
    # Використовуємо папку uploads напряму
    photo_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    print(f"📁 Папка для збереження: {photo_dir}")
    os.makedirs(photo_dir, exist_ok=True)
    
    # Генеруємо унікальне ім'я файлу
    file_extension = os.path.splitext(file.filename)[1] or '.jpg'
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(photo_dir, unique_filename)
    print(f"💾 Шлях для збереження: {file_path}")
    
    # Зберігаємо файл
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            print(f"📊 Розмір файлу: {len(content)} байт")
            buffer.write(content)
        
        print(f"✅ Файл збережено: {unique_filename}")
        
        # Перевіряємо чи файл існує
        if os.path.exists(file_path):
            print(f"✅ Файл підтверджено: {file_path}")
        else:
            print(f"❌ Файл не знайдено після збереження: {file_path}")
            
    except Exception as e:
        print(f"❌ Помилка збереження файлу: {e}")
        raise HTTPException(status_code=500, detail=f"Помилка збереження файлу: {e}")
    
    return {"message": "Фото завантажено", "filename": unique_filename}

@router.post("/products")
def create_product(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    columns = list(data.keys())
    values = list(data.values())
    placeholders = ', '.join(['?' for _ in values])
    column_list = ', '.join(columns)
    
    query = f"INSERT INTO Products ({column_list}) VALUES ({placeholders})"
    print(f"🔍 SQL запит: {query}")
    print(f"📊 Значення: {values}")
    
    cursor.execute(query, values)
    db.commit()
    
    # Отримуємо ID нового товару
    new_id = cursor.lastrowid
    print(f"✅ Створено товар з ID: {new_id}")
    
    return {"message": "Товар створено!", "id": new_id}

@router.put("/products/{id}")
def update_product(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    
    # Генеруємо SET частину запиту
    set_clauses = []
    values = []
    for key, value in data.items():
        set_clauses.append(f"{key} = ?")
        values.append(value)
    
    set_clause = ', '.join(set_clauses)
    query = f"UPDATE Products SET {set_clause} WHERE ID = ?"
    values.append(id)
    
    print(f"🔍 SQL запит: {query}")
    print(f"📊 Значення: {values}")
    
    cursor.execute(query, values)
    db.commit()

    return {"message": "Товар оновлено!"}

@router.delete("/products/{id}")
def delete_product(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Products WHERE ID = ?", (id,))
    db.commit()
    return {"message": "Товар видалено!"}

def create_preview(image_path, preview_path, size=(200, 200)):
    """Створює прев'ю зображення"""
    try:
        with Image.open(image_path) as img:
            # Створюємо прев'ю зберігаючи пропорції
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Створюємо білий фон
            background = Image.new('RGB', size, (255, 255, 255))
            
            # Центруємо зображення
            offset = ((size[0] - img.size[0]) // 2, (size[1] - img.size[1]) // 2)
            background.paste(img, offset)
            
            # Зберігаємо прев'ю
            background.save(preview_path, 'JPEG', quality=85)
            print(f"✅ Прев'ю створено: {preview_path}")
            return True
    except Exception as e:
        print(f"❌ Помилка створення прев'ю: {e}")
        return False

@router.post("/products/{id}/upload-photo")
async def upload_product_photo(id: int, file: UploadFile = File(...), db=Depends(get_db)):
    """Завантаження фото товару з автоматичним створенням прев'ю"""
    print(f"📤 Завантаження фото для товару ID: {id}")
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Файл повинен бути зображенням")
    
    cursor = db.cursor()
    
    # Отримуємо шляхи з системних параметрів
    cursor.execute("SELECT ParamKey, ParamValue FROM SystemParameters WHERE ParamKey IN ('PhotoPath', 'PreviewPath')")
    params = {row[0]: row[1] for row in cursor.fetchall()}
    
    photo_path = params.get('PhotoPath')
    preview_path = params.get('PreviewPath')
    
    if not photo_path:
        raise HTTPException(status_code=500, detail="PhotoPath не налаштовано в системних параметрах")
    
    if not preview_path:
        raise HTTPException(status_code=500, detail="PreviewPath не налаштовано в системних параметрах")
    
    # Створюємо папки якщо не існують
    os.makedirs(photo_path, exist_ok=True)
    os.makedirs(preview_path, exist_ok=True)
    
    # Назва файлу = ID товару
    filename = f"{id}.jpg"
    full_photo_path = os.path.join(photo_path, filename)
    full_preview_path = os.path.join(preview_path, filename)
    
    try:
        # Зберігаємо оригінальне фото
        content = await file.read()
        with open(full_photo_path, "wb") as buffer:
            buffer.write(content)
        
        print(f"✅ Оригінальне фото збережено: {full_photo_path}")
        
        # Створюємо прев'ю
        if create_preview(full_photo_path, full_preview_path):
            print(f"✅ Прев'ю створено: {full_preview_path}")
        else:
            print(f"⚠️ Не вдалося створити прев'ю, але основне фото збережено")
        
        # Оновлюємо запис у базі
        cursor.execute("UPDATE Products SET Photo = ? WHERE ID = ?", (filename, id))
        db.commit()
        
        print(f"✅ Запис у базі оновлено: Photo = {filename}")
        
        return {
            "message": "Фото та прев'ю збережено!", 
            "filename": filename,
            "photo_path": full_photo_path,
            "preview_path": full_preview_path
        }
        
    except Exception as e:
        print(f"❌ Помилка збереження фото: {e}")
        raise HTTPException(status_code=500, detail=f"Помилка збереження фото: {e}")

@router.get("/manufacturers")
def get_manufacturers(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, Name FROM Manufacturers ORDER BY Name")
    return [{"ID": row[0], "ManufacturerName": row[1]} for row in cursor.fetchall()] 