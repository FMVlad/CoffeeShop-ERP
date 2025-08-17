from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body, Query
from app.db_connection import get_db
import os
from PIL import Image

router = APIRouter()
@router.get("/products/search")
def search_products(q: str = Query(""), db=Depends(get_db)):
    s = (q or "").strip()
    if not s:
        return []
    like = f"%{s}%"
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT TOP 50 p.ID, p.Name, p.FullName, p.Barcode, p.DiscountBarcode, p.CategoryID
        FROM Products p
        WHERE p.Name LIKE ? OR p.FullName LIKE ? OR p.Barcode LIKE ? OR p.DiscountBarcode LIKE ?
        ORDER BY p.FullName IS NULL, p.FullName, p.Name
        """,
        (like, like, like, like),
    )
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, r)) for r in cursor.fetchall()]

@router.get("/products/by-barcode/{barcode}")
def get_product_by_barcode(barcode: str, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT TOP 1 p.ID, p.Name, p.FullName, p.Barcode, p.DiscountBarcode, p.CategoryID
        FROM Products p
        WHERE p.Barcode = ? OR p.DiscountBarcode = ?
        """,
        (barcode, barcode),
    )
    row = cursor.fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Товар з цим штрихкодом не знайдено")
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def generate_ean13_barcode(db, barcode_prefix):
    cursor = db.cursor()
    cursor.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey = 'BarcodeNum'")
    result = cursor.fetchone()
    barcode_num = int(result[0]) if result and result[0] else 1
    while True:
        num_digits = 12 - len(barcode_prefix)
        barcode_without_checksum = f"{barcode_prefix}{barcode_num:0{num_digits}d}"
        odd_sum = sum(int(barcode_without_checksum[i]) for i in range(0, 12, 2))
        even_sum = sum(int(barcode_without_checksum[i]) for i in range(1, 12, 2))
        total = odd_sum + (even_sum * 3)
        checksum = (10 - (total % 10)) % 10
        full_barcode = barcode_without_checksum + str(checksum)
        cursor.execute("SELECT COUNT(*) FROM Products WHERE Barcode = ?", (full_barcode,))
        exists = cursor.fetchone()[0]
        if not exists:
            break
        barcode_num += 1
    cursor.execute("UPDATE SystemParameters SET ParamValue = ? WHERE ParamKey = 'BarcodeNum'", (str(barcode_num + 1),))
    return full_barcode

def _get_fullname_fields(db, template_id: int | None):
    cursor = db.cursor()
    if template_id is not None:
        cursor.execute(
            """
            SELECT SqlName FROM ProductFullNameFields
            WHERE IsIncluded=1 AND TemplateID = ?
            ORDER BY DisplayOrder
            """,
            (template_id,),
        )
    else:
        cursor.execute(
            """
            SELECT SqlName FROM ProductFullNameFields
            WHERE IsIncluded=1
            ORDER BY DisplayOrder
            """
        )
    return [row[0] for row in cursor.fetchall()]

def _generate_fullname(product_id, db):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Products WHERE ID = ?", (product_id,))
    row = cursor.fetchone()
    if not row:
        return ""
    columns = [col[0] for col in cursor.description]
    product = dict(zip(columns, row))

    # 1. Визначаємо TemplateID за категорією товару
    template_id = None
    try:
        cat_id = product.get("CategoryID")
        if cat_id:
            cursor.execute("SELECT ProductCardTemplateID FROM Categories WHERE ID = ?", (cat_id,))
            r = cursor.fetchone()
            if r:
                template_id = r[0]
    except Exception:
        template_id = None

    # 2. Атрибути (ProductAttributes)
    cursor.execute("SELECT FieldID, AttrValue FROM ProductAttributes WHERE ProductID = ?", (product_id,))
    attrs = cursor.fetchall()
    attr_map = {}
    if attrs:
        cursor.execute("SELECT ID, SqlName FROM ProductCardTemplateFields")
        field_id_map = {r[0]: r[1] for r in cursor.fetchall()}
        for field_id, value in attrs:
            sql = field_id_map.get(field_id)
            if sql:
                attr_map[sql] = value

    # 3. Основні значення + атрибути
    values = {**product, **attr_map}

    # 4. Беремо потрібні поля для формування назви (за конкретним шаблоном)
    fields = _get_fullname_fields(db, template_id)
    full_name_parts = []
    for sql in fields:
        val = str(values.get(sql, "")).strip()
        # Особлива обробка ManufacturerID: підставляємо назву та країну
        if sql.lower() == "manufacturerid":
            m_id = values.get("ManufacturerID")
            if m_id:
                cursor.execute("SELECT Name, Country FROM Manufacturers WHERE ID = ?", (m_id,))
                man = cursor.fetchone()
                if man:
                    val = f"{man[0]} ({man[1]})" if man[1] and str(man[1]).strip() else man[0]
                else:
                    val = ""
            else:
                val = ""
        if val:
            full_name_parts.append(val)
    return " ".join(full_name_parts).strip()

# === Ось цей шматок для рекурсивного пошуку підкатегорій ===
def get_all_subcategory_ids(db, parent_id):
    cursor = db.cursor()
    ids = set()
    stack = [parent_id]
    while stack:
        cid = stack.pop()
        ids.add(cid)
        cursor.execute("SELECT ID FROM Categories WHERE ParentID = ?", (cid,))
        children = [row[0] for row in cursor.fetchall()]
        stack.extend(children)
    return list(ids)

@router.get("/products")
def get_products(
    search: str = Query(None, description="Пошук по назві або штрихкоду"),
    category: int = Query(None, description="ID категорії"),
    db=Depends(get_db)
):
    cursor = db.cursor()
    query = "SELECT * FROM Products WHERE 1=1"
    params = []
    if search and search.strip():
        query += " AND (Name LIKE ? OR Barcode LIKE ?)"
        params.extend([f"%{search.strip()}%", f"%{search.strip()}%"])
    if category:
        cat_ids = get_all_subcategory_ids(db, category)
        placeholders = ','.join('?' for _ in cat_ids)
        query += f" AND CategoryID IN ({placeholders})"
        params.extend(cat_ids)
    query += " ORDER BY ID DESC"
    cursor.execute(query, params)
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

@router.post("/products")
def create_product(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    if not data.get('Barcode') or data.get('Barcode').strip() == '':
        try:
            cursor.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey = 'BarcodePrefix'")
            prefix_result = cursor.fetchone()
            if not prefix_result or not prefix_result[0]:
                data['Barcode'] = ""
            else:
                prefix = prefix_result[0]
                data['Barcode'] = generate_ean13_barcode(db, prefix)
        except Exception:
            data['Barcode'] = ""
    db_columns = ['Name', 'Description', 'Barcode', 'Photo', 'CategoryID', 'ManufacturerID', 'FullName',
                  'DiscountBarcode', 'IsDiscountedAvailable', 'Article', 'IsActive']
    columns = [col for col in db_columns if col in data]
    values = [data[col] for col in columns]
    placeholders = ', '.join(['?' for _ in values])
    column_list = ', '.join(columns)
    query = f"INSERT INTO Products ({column_list}) OUTPUT INSERTED.ID VALUES ({placeholders})"
    cursor.execute(query, values)
    new_id = cursor.fetchone()[0]
    fullname = _generate_fullname(new_id, db)
    cursor.execute("UPDATE Products SET FullName = ? WHERE ID = ?", (fullname, new_id))
    db.commit()
    return {"message": "Товар створено!", "id": int(new_id), "barcode": data.get('Barcode')}

@router.put("/products/{id}")
def update_product(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    if not data.get('Barcode') or data.get('Barcode').strip() == '':
        try:
            cursor.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey = 'BarcodePrefix'")
            prefix_result = cursor.fetchone()
            if not prefix_result or not prefix_result[0]:
                data['Barcode'] = ""
            else:
                prefix = prefix_result[0]
                data['Barcode'] = generate_ean13_barcode(db, prefix)
        except Exception:
            data['Barcode'] = ""
    db_columns = ['Name', 'Description', 'Barcode', 'Photo', 'CategoryID', 'ManufacturerID', 'FullName',
                  'DiscountBarcode', 'IsDiscountedAvailable', 'Article', 'IsActive']
    set_clauses = []
    values = []
    for col in db_columns:
        if col in data:
            set_clauses.append(f"{col} = ?")
            values.append(data[col])
    if not set_clauses:
        raise HTTPException(status_code=400, detail="Дані для оновлення відсутні")
    set_clause = ', '.join(set_clauses)
    query = f"UPDATE Products SET {set_clause} WHERE ID = ?"
    values.append(id)
    cursor.execute(query, values)
    fullname = _generate_fullname(id, db)
    cursor.execute("UPDATE Products SET FullName = ? WHERE ID = ?", (fullname, id))
    db.commit()
    return {"message": "Товар оновлено!", "barcode": data.get('Barcode')}

@router.delete("/products/{id}")
def delete_product(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM ProductAttributes WHERE ProductID = ?", (id,))
    cursor.execute("DELETE FROM Products WHERE ID = ?", (id,))
    db.commit()
    return {"message": "Товар та його атрибути видалено!"}

@router.get("/products/{id}/fullname")
def get_product_fullname(id: int, db=Depends(get_db)):
    return {"FullName": _generate_fullname(id, db)}

@router.get("/products/{id}/attributes")
def get_product_attributes(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT FieldID, AttrValue FROM ProductAttributes WHERE ProductID = ?", (id,))
    return [{"FieldID": row[0], "Value": row[1]} for row in cursor.fetchall()]

@router.post("/products/{id}/attributes")
def save_product_attributes(id: int, attributes: list = Body(...), db=Depends(get_db)):
    if not isinstance(attributes, list):
        raise HTTPException(status_code=400, detail="Атрибути мають бути списком")
    cursor = db.cursor()
    saved_count = 0
    for attr in attributes:
        field_id = attr.get("FieldID")
        value = attr.get("Value")
        if field_id is None or not isinstance(field_id, int):
            continue
        cursor.execute(
            "SELECT ID FROM ProductAttributes WHERE ProductID = ? AND FieldID = ?",
            (id, field_id)
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                "UPDATE ProductAttributes SET AttrValue = ? WHERE ID = ?",
                (value, row[0])
            )
        else:
            cursor.execute(
                "INSERT INTO ProductAttributes (ProductID, FieldID, AttrValue) VALUES (?, ?, ?)",
                (id, field_id, value)
            )
        saved_count += 1
    db.commit()
    fullname = _generate_fullname(id, db)
    cursor.execute("UPDATE Products SET FullName = ? WHERE ID = ?", (fullname, id))
    db.commit()
    return {"message": f"Додаткові параметри збережено! Додано/оновлено: {saved_count}"}

def create_preview(image_path, preview_path, size=(200, 200)):
    try:
        with Image.open(image_path) as img:
            img.thumbnail(size, Image.Resampling.LANCZOS)
            background = Image.new('RGB', size, (255, 255, 255))
            offset = ((size[0] - img.size[0]) // 2, (size[1] - img.size[1]) // 2)
            background.paste(img, offset)
            background.save(preview_path, 'JPEG', quality=85)
            return True
    except Exception:
        return False

@router.post("/products/{id}/upload-photo")
async def upload_product_photo(id: int, file: UploadFile = File(...), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ParamKey, ParamValue FROM SystemParameters WHERE ParamKey IN ('PhotoPath', 'PreviewPath')")
    params = {row[0]: row[1] for row in cursor.fetchall()}
    photo_path = params.get('PhotoPath')
    preview_path = params.get('PreviewPath')
    if not photo_path:
        raise HTTPException(status_code=500, detail="PhotoPath не налаштовано в системних параметрах")
    if not preview_path:
        raise HTTPException(status_code=500, detail="PreviewPath не налаштовано в системних параметрах")
    os.makedirs(photo_path, exist_ok=True)
    os.makedirs(preview_path, exist_ok=True)
    filename = f"{id}.jpg"
    full_photo_path = os.path.join(photo_path, filename)
    full_preview_path = os.path.join(preview_path, filename)
    try:
        content = await file.read()
        with open(full_photo_path, "wb") as buffer:
            buffer.write(content)
        create_preview(full_photo_path, full_preview_path)
        cursor.execute("UPDATE Products SET Photo = ? WHERE ID = ?", (filename, id))
        db.commit()
        return {
            "message": "Фото та прев'ю збережено!",
            "filename": filename,
            "photo_path": full_photo_path,
            "preview_path": full_preview_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка збереження фото: {e}")
