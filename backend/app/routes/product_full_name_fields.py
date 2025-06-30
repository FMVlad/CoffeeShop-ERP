from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.models.product_full_name_field import ProductFullNameField
from app.db_connection import get_db

router = APIRouter()

@router.get("/product-full-name-fields")
def get_product_full_name_fields(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, SqlName, DisplayName, DisplayOrder, IsIncluded FROM ProductFullNameFields ORDER BY DisplayOrder")
    rows = cursor.fetchall()
    return [
        {
            "ID": row[0],
            "SqlName": row[1],
            "DisplayName": row[2],
            "DisplayOrder": row[3],
            "IsEnabled": bool(row[4])
        }
        for row in rows
    ]

@router.post("/product-full-name-fields")
def save_product_full_name_fields(rules: List[Dict[str, Any]], db=Depends(get_db)):
    cursor = db.cursor()
    
    # Спочатку очищаємо всі записи
    cursor.execute("DELETE FROM ProductFullNameFields")
    
    # Додаємо нові записи
    for rule in rules:
        if rule.get("IsEnabled", False):
            cursor.execute("""
                INSERT INTO ProductFullNameFields (SqlName, DisplayName, DisplayOrder, IsIncluded)
                VALUES (?, ?, ?, ?)
            """, (
                rule["SqlName"], 
                rule["SqlName"],  # Використовуємо SqlName як DisplayName тимчасово
                rule["DisplayOrder"], 
                1 if rule["IsEnabled"] else 0
            ))
    
    db.commit()
    return {"success": True, "message": "Правила збережено!"}
