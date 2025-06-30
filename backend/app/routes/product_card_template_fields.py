from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db


router = APIRouter()

# --- СТАНДАРТНІ ПОЛЯ З ТАБЛИЦІ PRODUCTS ---
BASE_FIELDS = [
    {
        "ID": "std_name",
        "DisplayName": "Назва",
        "SqlName": "Name",
        "FieldType": "string",
        "MaxLength": 100,
        "Precision": None,
        "IsRequired": True,
        "IsVisible": True,
        "DisplayOrder": 0,
        "Description": "Основна назва товару",
        "IsStandard": True
    },
    {
        "ID": "std_description",
        "DisplayName": "Опис",
        "SqlName": "Description",
        "FieldType": "string",
        "MaxLength": 500,
        "Precision": None,
        "IsRequired": False,
        "IsVisible": True,
        "DisplayOrder": 1,
        "Description": "Детальний опис товару",
        "IsStandard": True
    },
    {
        "ID": "std_barcode",
        "DisplayName": "Штрихкод",
        "SqlName": "Barcode",
        "FieldType": "string",
        "MaxLength": 20,
        "Precision": None,
        "IsRequired": False,
        "IsVisible": True,
        "DisplayOrder": 2,
        "Description": "Основний штрихкод товару",
        "IsStandard": True
    },
    {
        "ID": "std_barcode_discount",
        "DisplayName": "Штрихкод уцінки",
        "SqlName": "BarcodeDiscount",
        "FieldType": "string",
        "MaxLength": 20,
        "Precision": None,
        "IsRequired": False,
        "IsVisible": True,
        "DisplayOrder": 3,
        "Description": "Штрихкод для уцінених товарів",
        "IsStandard": True
    },
    {
        "ID": "std_article",
        "DisplayName": "Артикул",
        "SqlName": "Article",
        "FieldType": "string",
        "MaxLength": 50,
        "Precision": None,
        "IsRequired": False,
        "IsVisible": True,
        "DisplayOrder": 4,
        "Description": "Артикул виробника",
        "IsStandard": True
    },
    {
        "ID": "std_category",
        "DisplayName": "Категорія",
        "SqlName": "CategoryID",
        "FieldType": "number",
        "MaxLength": None,
        "Precision": None,
        "IsRequired": True,
        "IsVisible": True,
        "DisplayOrder": 5,
        "Description": "Категорія товару",
        "IsStandard": True
    },
    {
        "ID": "std_manufacturer",
        "DisplayName": "Виробник",
        "SqlName": "ManufacturerID",
        "FieldType": "number",
        "MaxLength": None,
        "Precision": None,
        "IsRequired": False,
        "IsVisible": True,
        "DisplayOrder": 6,
        "Description": "Виробник товару",
        "IsStandard": True
    },
    {
        "ID": "std_photo",
        "DisplayName": "Фото",
        "SqlName": "Photo",
        "FieldType": "string",
        "MaxLength": 255,
        "Precision": None,
        "IsRequired": False,
        "IsVisible": True,
        "DisplayOrder": 7,
        "Description": "Зображення товару",
        "IsStandard": True
    },
]

@router.get("/product-card-template-fields")
def get_fields(template_id: int = Query(...), db=Depends(get_db)):
    # Додаткові поля
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, TemplateID, DisplayName, SqlName, FieldType, MaxLength, Precision, 
               IsRequired, IsVisible, DisplayOrder, Description
        FROM ProductCardTemplateFields
        WHERE TemplateID = ?
        ORDER BY DisplayOrder, ID
    """, (template_id,))
    columns = [col[0] for col in cursor.description]
    custom_fields = [dict(zip(columns, row)) | {"IsStandard": False} for row in cursor.fetchall()]

    # Повертаємо спочатку стандартні, потім додаткові
    return BASE_FIELDS + custom_fields

@router.post("/product-card-template-fields")
def add_field(data: dict, db=Depends(get_db)):
    template_id = data.get("TemplateID")
    display_name = data.get("DisplayName")
    sql_name = data.get("SqlName")
    field_type = data.get("FieldType")
    max_length = data.get("MaxLength")
    precision = data.get("Precision")
    is_required = data.get("IsRequired", False)
    is_visible = data.get("IsVisible", True)
    display_order = data.get("DisplayOrder")
    description = data.get("Description", "")

    if not template_id or not display_name or not sql_name or not field_type:
        raise HTTPException(status_code=400, detail="Всі основні поля обовʼязкові!")

    # Забороняємо дубль SqlName (і серед стандартних, і серед додаткових)
    cursor = db.cursor()
    if any(f["SqlName"].lower() == sql_name.lower() for f in BASE_FIELDS):
        raise HTTPException(status_code=400, detail="Це поле вже існує як стандартне!")
    cursor.execute("""
        SELECT COUNT(*) FROM ProductCardTemplateFields WHERE TemplateID = ? AND LOWER(SqlName) = LOWER(?)
    """, (template_id, sql_name))
    if cursor.fetchone()[0]:
        raise HTTPException(status_code=400, detail="Поле з такою SqlName вже додано до шаблону!")

    cursor.execute("""
        INSERT INTO ProductCardTemplateFields (TemplateID, DisplayName, SqlName, FieldType, MaxLength, Precision, IsRequired, IsVisible, DisplayOrder, Description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (template_id, display_name, sql_name, field_type, max_length, precision, is_required, is_visible, display_order, description))
    db.commit()
    return {"message": "Поле додано!"}

@router.put("/product-card-template-fields/{id}")
def update_field(id: int, data: dict, db=Depends(get_db)):
    display_name = data.get("DisplayName")
    field_type = data.get("FieldType")
    max_length = data.get("MaxLength")
    precision = data.get("Precision")
    is_required = data.get("IsRequired", False)
    is_visible = data.get("IsVisible", True)
    display_order = data.get("DisplayOrder")
    description = data.get("Description", "")

    cursor = db.cursor()
    cursor.execute("""
        UPDATE ProductCardTemplateFields
        SET DisplayName = ?, FieldType = ?, MaxLength = ?, Precision = ?, 
            IsRequired = ?, IsVisible = ?, DisplayOrder = ?, Description = ?
        WHERE ID = ?
    """, (display_name, field_type, max_length, precision, is_required, is_visible, display_order, description, id))
    db.commit()
    return {"message": "Поле оновлено!"}

@router.delete("/product-card-template-fields/{id}")
def delete_field(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM ProductCardTemplateFields WHERE ID = ?", (id,))
    db.commit()
    return {"message": "Поле видалено!"}
