from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

@router.get("/product-attributes")
def get_product_attributes(product_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT pa.ID, pa.ProductID, pa.FieldID, paf.DisplayName, paf.SqlName, paf.FieldType, pa.AttrValue
        FROM ProductAttributes pa
        JOIN ProductCardTemplateFields paf ON paf.ID = pa.FieldID
        WHERE pa.ProductID = ?
    """, (product_id,))
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.post("/product-attributes", status_code=201)
def add_product_attribute(data: dict, db=Depends(get_db)):
    product_id = data.get("ProductID")
    field_id = data.get("FieldID")
    attr_value = data.get("AttrValue")
    if not product_id or not field_id:
        raise HTTPException(status_code=400, detail="Обовʼязкові поля!")
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO ProductAttributes (ProductID, FieldID, AttrValue)
        VALUES (?, ?, ?)
    """, (product_id, field_id, attr_value))
    db.commit()
    return {"message": "Атрибут додано!"}

@router.put("/product-attributes/{id}")
def update_product_attribute(id: int, data: dict, db=Depends(get_db)):
    attr_value = data.get("AttrValue")
    cursor = db.cursor()
    cursor.execute("UPDATE ProductAttributes SET AttrValue = ? WHERE ID = ?", (attr_value, id))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Атрибут не знайдено!")
    return {"message": "Атрибут оновлено!"}

@router.delete("/product-attributes/{id}")
def delete_product_attribute(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM ProductAttributes WHERE ID = ?", (id,))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Атрибут не знайдено!")
    return {"message": "Атрибут видалено!"}
