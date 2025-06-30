from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

# --- CRUD ProductNameRules ---

@router.get("/product-name-rules")
def get_rules(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, CategoryID, Rule FROM ProductNameRules ORDER BY ID")
    columns = [column[0] for column in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

@router.post("/product-name-rules")
def add_rule(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO ProductNameRules (CategoryID, Rule) VALUES (?, ?)",
        (data.get("CategoryID"), data.get("Rule"))
    )
    db.commit()
    return {"status": "ok", "id": cursor.lastrowid}

@router.put("/product-name-rules/{id}")
def update_rule(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "UPDATE ProductNameRules SET CategoryID=?, Rule=? WHERE ID=?",
        (data.get("CategoryID"), data.get("Rule"), id)
    )
    db.commit()
    return {"status": "ok"}

@router.delete("/product-name-rules/{id}")
def delete_rule(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM ProductNameRules WHERE ID=?", (id,))
    db.commit()
    return {"status": "ok"}

@router.get("/product-name-rules/{id}")
def get_rule(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, CategoryID, Rule FROM ProductNameRules WHERE ID=?", (id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))

# --- API для змінних картки товару (ruleVars) ---

@router.get("/product-name-rule-vars")
def get_rule_vars():
    fields = [
        {"key": "Name", "label": "Назва"},
        {"key": "Description", "label": "Опис"},
        {"key": "Barcode", "label": "Штрихкод"},
        {"key": "Photo", "label": "Фото"},
        {"key": "Article", "label": "Артикул"},
        # Додавай ще свої колонки тут!
    ]
    return fields

# --- Генерація повної назви товару за шаблоном ---

@router.post("/product-full-name/generate")
def generate_full_name(data: dict):
    rule = data.get("rule")
    values = data.get("values", {})
    if not rule:
        raise HTTPException(status_code=400, detail="Rule is required")

    import re
    def repl(m):
        key = m.group(1)
        return str(values.get(key, ""))

    result = re.sub(r"\{(\w+)\}", repl, rule)
    return {"full_name": result}
