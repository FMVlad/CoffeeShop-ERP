from fastapi import APIRouter, Depends, Body, Query
from app.db_connection import get_db

router = APIRouter()

# 1. GET: отримати всі поля для формування назви для конкретного шаблону (ProductCardTemplateHeaders)
@router.get("/product-full-name-fields")
def get_product_full_name_fields(
    template_id: int = Query(..., description="ID шаблону картки (ProductCardTemplateHeaders.ID)"),
    db=Depends(get_db)
):
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, SqlName, DisplayName, DisplayOrder, IsIncluded, FieldID, TemplateID
        FROM ProductFullNameFields
        WHERE TemplateID = ?
        ORDER BY DisplayOrder
    """, (template_id,))
    rows = cursor.fetchall()
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in rows]

# 2. POST: зберегти набір полів для конкретного шаблону
@router.post("/product-full-name-fields")
def save_product_full_name_fields(
    template_id: int = Body(..., embed=True),
    fields: list = Body(..., embed=True),
    db=Depends(get_db)
):
    cursor = db.cursor()
    # Видаляємо лише записи для конкретного шаблону
    cursor.execute("DELETE FROM ProductFullNameFields WHERE TemplateID = ?", (template_id,))
    for f in fields:
        cursor.execute("""
            INSERT INTO ProductFullNameFields
                (SqlName, DisplayName, DisplayOrder, IsIncluded, FieldID, TemplateID)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            f.get("SqlName"),
            f.get("DisplayName"),
            f.get("DisplayOrder"),
            1 if f.get("IsIncluded") else 0,
            f.get("FieldID"),
            template_id
        ))
    db.commit()
    return {"success": True}
