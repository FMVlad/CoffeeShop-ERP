from fastapi import APIRouter, Depends, HTTPException, Query
from app.db_connection import get_db
from datetime import datetime

router = APIRouter()

def get_supplier_prefix(db):
    cursor = db.cursor()
    cursor.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey = 'BarcodeSuppliers'")
    row = cursor.fetchone()
    return str(row[0]) if row else "991"  # запасний префікс

def ean13_check_digit(ean12):
    digits = [int(x) for x in ean12]
    s = sum(d if i % 2 == 0 else d*3 for i, d in enumerate(digits))
    return (10 - (s % 10)) % 10

def generate_supplier_barcode(db):
    prefix = get_supplier_prefix(db)
    cursor = db.cursor()
    cursor.execute("SELECT MAX(Barcode) FROM Suppliers WHERE Barcode LIKE ?", (f"{prefix}%",))
    last_barcode = cursor.fetchone()[0]
    if last_barcode and str(last_barcode).isdigit():
        next_num = int(str(last_barcode)[len(prefix):-1]) + 1
    else:
        next_num = 1
    body = f"{prefix}{str(next_num).zfill(12 - len(prefix))}"
    check = ean13_check_digit(body)
    return f"{body}{check}"

@router.get("/suppliers")
def get_suppliers(
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db=Depends(get_db)
):
    cursor = db.cursor()
    query = """
        SELECT ID, Name, Barcode, BankAccount, BankName, MFO, Code, Address,
               Phone, Email, DateCreated, IsVATPayer
        FROM Suppliers
        WHERE 1=1
    """
    params = []
    if search:
        query += " AND (Name LIKE ? OR Address LIKE ? OR Email LIKE ?)"
        params.extend([f"%{search}%"] * 3)
    query += " ORDER BY Name OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
    params.extend([skip, limit])
    cursor.execute(query, *params)
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, row)) for row in rows]

@router.post("/suppliers")
def add_supplier(supplier: dict, db=Depends(get_db)):
    # Генерація штрихкоду, якщо не передано вручну
    barcode = supplier.get("Barcode")
    if not barcode or not str(barcode).isdigit() or len(str(barcode)) != 13:
        barcode = generate_supplier_barcode(db)
    # Дата створення, якщо не передано
    date_created = supplier.get("DateCreated") or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    fields = (
        supplier.get("Name"),
        barcode,
        supplier.get("BankAccount"),
        supplier.get("BankName"),
        supplier.get("MFO"),
        supplier.get("Code"),
        supplier.get("Address"),
        supplier.get("Phone"),
        supplier.get("Email"),
        date_created,
        supplier.get("IsVATPayer", False),
    )
    if not fields[0]:
        raise HTTPException(status_code=400, detail="Name is required")
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Suppliers
            (Name, Barcode, BankAccount, BankName, MFO, Code, Address, Phone, Email, DateCreated, IsVATPayer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, fields)
    db.commit()
    return {"message": "Постачальника додано", "Barcode": barcode}

@router.put("/suppliers/{id}")
def update_supplier(id: int, supplier: dict, db=Depends(get_db)):
    fields = (
        supplier.get("Name"),
        supplier.get("Barcode"),
        supplier.get("BankAccount"),
        supplier.get("BankName"),
        supplier.get("MFO"),
        supplier.get("Code"),
        supplier.get("Address"),
        supplier.get("Phone"),
        supplier.get("Email"),
        supplier.get("DateCreated"),
        supplier.get("IsVATPayer", False),
        id,
    )
    if not fields[0]:
        raise HTTPException(status_code=400, detail="Name is required")
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Suppliers SET
            Name=?, Barcode=?, BankAccount=?, BankName=?, MFO=?, Code=?, Address=?, Phone=?, Email=?, DateCreated=?, IsVATPayer=?
        WHERE ID=?
    """, fields)
    db.commit()
    return {"message": "Постачальника оновлено"}

@router.delete("/suppliers/{id}")
def delete_supplier(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Suppliers WHERE ID=?", (id,))
    db.commit()
    return {"message": "Постачальника видалено"}
