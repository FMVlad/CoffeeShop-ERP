from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from app.db_connection import get_db
import os

router = APIRouter()

@router.get("/system-parameters")
def get_system_parameters(db=Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("SELECT ID, ParamKey, ParamValue FROM SystemParameters ORDER BY ParamKey")
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    except Exception as e:
        # Якщо не працює, повертаємо помилку з деталями
        return {"error": str(e), "message": "Проблема з доступом до таблиці SystemParameters"}

@router.put("/system-parameters/{id}")
def update_system_parameter(id: int, data: dict, db=Depends(get_db)):
    key = data.get("ParamKey")
    value = data.get("ParamValue")
    if not key:
        raise HTTPException(status_code=400, detail="ParamKey обов'язковий!")
    cursor = db.cursor()
    cursor.execute(
        "UPDATE SystemParameters SET ParamKey = ?, ParamValue = ? WHERE ID = ?",
        (key, value, id)
    )
    db.commit()
    return {"message": "Системний параметр оновлено!"}

@router.post("/system-parameters")
def add_system_parameter(data: dict, db=Depends(get_db)):
    key = data.get("ParamKey")
    value = data.get("ParamValue")
    if not key:
        raise HTTPException(status_code=400, detail="ParamKey обов'язковий!")
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO SystemParameters (ParamKey, ParamValue) VALUES (?, ?)",
        (key, value)
    )
    db.commit()
    return {"message": "Системний параметр додано!"}

@router.delete("/system-parameters/{id}")
def delete_system_parameter(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM SystemParameters WHERE ID = ?", (id,))
    db.commit()
    return {"message": "Системний параметр видалено!"}

@router.get("/photo/{filename}")
def get_photo(filename: str, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey = 'PhotoPath'")
    result = cursor.fetchone()
    
    if not result:
        # Якщо не знайдено PhotoPath, використовуємо uploads
        photo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    else:
        photo_path = result[0]
    
    file_path = os.path.join(photo_path, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не знайдено")
    
    return FileResponse(file_path)

@router.get("/preview/{filename}")
def get_preview(filename: str, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey = 'PreviewPath'")
    result = cursor.fetchone()
    
    if not result:
        # Якщо не знайдено PreviewPath, спробуємо PhotoPath
        cursor.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey = 'PhotoPath'")
        photo_result = cursor.fetchone()
        if photo_result:
            preview_path = os.path.join(photo_result[0], "Preview")
        else:
            preview_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "Preview")
    else:
        preview_path = result[0]
    
    file_path = os.path.join(preview_path, filename)
    
    if not os.path.exists(file_path):
        # Якщо прев'ю не знайдено, повертаємо оригінальне фото
        return get_photo(filename, db)
    
    return FileResponse(file_path)
