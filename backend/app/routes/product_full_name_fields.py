from fastapi import APIRouter, Depends
from app.db_connection import get_db

router = APIRouter()

@router.get("/product-full-name-fields")
def get_product_full_name_fields(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, SqlName, DisplayName, DisplayOrder, IsIncluded, FieldID
        FROM ProductFullNameFields
        ORDER BY DisplayOrder
    """)
    rows = cursor.fetchall()
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in rows]

@router.post("/product-full-name-fields")
def save_product_full_name_fields(fields: list, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM ProductFullNameFields")
    for f in fields:
        cursor.execute("""
            INSERT INTO ProductFullNameFields (SqlName, DisplayName, DisplayOrder, IsIncluded, FieldID)
            VALUES (?, ?, ?, ?, ?)
        """, (
            f.get("SqlName"),
            f.get("DisplayName"),
            f.get("DisplayOrder"),
            1 if f.get("IsIncluded") else 0,
            f.get("FieldID")
        ))
    db.commit()
    return {"success": True}
