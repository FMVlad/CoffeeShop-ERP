from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from typing import List, Dict, Any, Optional
import pyodbc

from app.db_connection import get_db

router = APIRouter(prefix="/clients", tags=["clients"])


def _ensure_clients_table(db: pyodbc.Connection) -> None:
    cur = db.cursor()
    try:
        cur.execute(
            """
            IF OBJECT_ID('dbo.Clients','U') IS NULL
            BEGIN
              CREATE TABLE dbo.Clients (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Name NVARCHAR(255) NOT NULL,
                Barcode NVARCHAR(64) NULL,
                Address NVARCHAR(255) NULL,
                Phone NVARCHAR(64) NULL,
                Email NVARCHAR(128) NULL,
                Code NVARCHAR(64) NULL,
                DateCreated DATETIME NOT NULL DEFAULT GETDATE(),
                IsVATPayer BIT NULL,
                PriceCategoryID INT NULL
              );
              CREATE INDEX IX_Clients_Barcode ON dbo.Clients(Barcode);
              CREATE INDEX IX_Clients_Code ON dbo.Clients(Code);
            END;
            -- Гарантуємо унікальність штрихкоду клієнта
            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes 
                WHERE object_id = OBJECT_ID('dbo.Clients') AND name = 'UQ_Clients_Barcode'
            )
            BEGIN
              CREATE UNIQUE INDEX UQ_Clients_Barcode ON dbo.Clients(Barcode);
            END
            """
        )
    except Exception:
        pass


def _get_param(db: pyodbc.Connection, key: str, default: Optional[str] = None) -> Optional[str]:
    try:
        row = db.cursor().execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey=?", (key,)).fetchone()
        return (row[0] if row else default)
    except Exception:
        return default


def _get_default_price_category_id(db: pyodbc.Connection) -> Optional[int]:
    try:
        row = db.cursor().execute("SELECT TOP 1 ID FROM PriceCategories WHERE IsDefault=1 ORDER BY ID").fetchone()
        return int(row[0]) if row else None
    except Exception:
        return None


def _ean13_checksum(body12: str) -> str:
    """Коректний EAN-13 checksum для 12-значного тіла."""
    if not body12 or len(body12) != 12 or not body12.isdigit():
        return "0"
    s = 0
    # позиції з права наліво: 1..12; але простіше зліва: індекси 0..11
    for i, ch in enumerate(body12):
        d = int(ch)
        # парні індекси (0,2,4,...) – вага 1; непарні – вага 3
        s += d if (i % 2 == 0) else (3 * d)
    return str((10 - (s % 10)) % 10)


def _generate_client_barcode(db: pyodbc.Connection) -> str:
    """Генерує унікальний EAN-13 клієнта за префіксом SystemParameters.BarcodeClient."""
    cur = db.cursor()
    prefix = _get_param(db, 'BarcodeClient', '990') or '990'
    prefix_digits = ''.join(ch for ch in str(prefix) if ch.isdigit()) or '990'
    # забезпечимо довжину < 12
    if len(prefix_digits) >= 12:
        prefix_digits = prefix_digits[:12]
    # початкова послідовність
    row_next = cur.execute("SELECT ISNULL(MAX(ID),0)+1 FROM Clients").fetchone()
    next_id = int(row_next[0] or 1)
    while True:
        fill = max(0, 12 - len(prefix_digits))
        body12 = (prefix_digits + f"{next_id:0{fill}d}")[:12]
        code = body12 + _ean13_checksum(body12)
        r = cur.execute("SELECT COUNT(*) FROM Clients WHERE Barcode=?", (code,)).fetchone()
        if int(r[0]) == 0:
            return code
        next_id += 1


def _get_or_create_default_retail_customer(db: pyodbc.Connection) -> int:
    _ensure_clients_table(db)
    cur = db.cursor()
    # спочатку шукаємо по коду 'RETAIL'
    row = cur.execute("SELECT TOP 1 ID FROM Clients WHERE Code='RETAIL'").fetchone()
    if row:
        return int(row[0])

    price_cat_id = _get_default_price_category_id(db)
    # Генеруємо штрихкод одразу, бо колонка може бути NOT NULL
    try:
        barcode = _generate_client_barcode(db)
    except Exception:
        prefix = _get_param(db, 'BarcodeClient', '990') or '990'
        body12 = (str(prefix) + "000000000000")[:12]
        barcode = body12 + _ean13_checksum(body12)
    cur.execute("INSERT INTO Clients (Name, Barcode, Code, PriceCategoryID) OUTPUT INSERTED.ID VALUES (N'Роздрібний покупець', ?, 'RETAIL', ?)", (barcode, price_cat_id))
    new_id = int(cur.fetchone()[0])

    # Запишемо штрихкод з префіксом, якщо є
    prefix = _get_param(db, 'BarcodeClient', '990') or '990'
    try:
        cur.execute("UPDATE Clients SET Barcode=? WHERE ID=?", (f"{prefix}{new_id}", new_id))
    except Exception:
        pass
    db.commit()
    return new_id


@router.get("")
def list_clients(q: Optional[str] = Query(None), db: pyodbc.Connection = Depends(get_db)):
    _ensure_clients_table(db)
    cur = db.cursor()
    if q:
        like = f"%{q}%"
        rows = cur.execute("SELECT ID, Name, Barcode, Code, PriceCategoryID FROM Clients WHERE Name LIKE ? OR Code LIKE ? OR Barcode LIKE ? ORDER BY Name", (like, like, like)).fetchall()
    else:
        rows = cur.execute("SELECT ID, Name, Barcode, Code, PriceCategoryID FROM Clients ORDER BY Name").fetchall()
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]

# CORS preflight (інколи у dev оточенні корисно мати явні OPTIONS)
@router.options("")
def options_root():
    return Response()


@router.get("/{client_id}")
def get_client(client_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_clients_table(db)
    cur = db.cursor()
    row = cur.execute("SELECT ID, Name, Barcode, Code, PriceCategoryID FROM Clients WHERE ID=?", (client_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Клієнта не знайдено")
    cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))

@router.options("/{client_id}")
def options_client_id(client_id: int):
    return Response()


# === Create ===
@router.post("")
def create_client(payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    _ensure_clients_table(db)
    name = (payload.get("Name") or "").strip()
    if not name:
        raise HTTPException(400, "Name обов'язкове")
    barcode = (payload.get("Barcode") or None)
    code = (payload.get("Code") or None)
    # Нормалізація типів
    raw_pcid = payload.get("PriceCategoryID")
    try:
        price_category_id = int(raw_pcid) if raw_pcid not in ("", None) else None
    except Exception:
        price_category_id = None
    address = payload.get("Address")
    phone = payload.get("Phone")
    email = payload.get("Email")
    raw_is_vat = payload.get("IsVATPayer")
    is_vat = (1 if bool(raw_is_vat) else 0) if raw_is_vat is not None else None
    cur = db.cursor()
    # Якщо штрихкод не передано, згенеруємо унікальний: <prefix><next_id>
    if not barcode:
        try:
            barcode = _generate_client_barcode(db)
        except Exception:
            # Фолбек: хоча б щось валідне за довжиною
            prefix = _get_param(db, 'BarcodeClient', '990') or '990'
            body12 = (str(prefix) + "000000000000")[:12]
            barcode = body12 + _ean13_checksum(body12)
    cur.execute(
        """
        INSERT INTO Clients (Name, Barcode, Code, PriceCategoryID, Address, Phone, Email, IsVATPayer)
        OUTPUT INSERTED.ID
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (name, barcode, code, price_category_id, address, phone, email, is_vat)
    )
    new_id = int(cur.fetchone()[0])
    db.commit()
    row = cur.execute("SELECT ID, Name, Barcode, Code, PriceCategoryID FROM Clients WHERE ID=?", (new_id,)).fetchone()
    cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))


@router.get("/by-barcode/{barcode}")
def get_client_by_barcode(barcode: str, db: pyodbc.Connection = Depends(get_db)):
    _ensure_clients_table(db)
    cur = db.cursor()
    code = (barcode or '').strip()
    if not code:
        raise HTTPException(400, "Порожній штрихкод")

    # Пробуємо точний збіг по Barcode
    row = cur.execute("SELECT TOP 1 ID, Name, Barcode, Code, PriceCategoryID FROM Clients WHERE Barcode=?", (code,)).fetchone()
    if row:
        cols = [c[0] for c in cur.description]
        return dict(zip(cols, row))

    # Якщо задано префікс у системних параметрах — обрізаємо і шукаємо по коду/ID
    prefix = _get_param(db, 'BarcodeClient', '990') or '990'
    rest = code
    if code.startswith(prefix):
        rest = code[len(prefix):]
    # шукаємо по Code
    row = cur.execute("SELECT TOP 1 ID, Name, Barcode, Code, PriceCategoryID FROM Clients WHERE Code=?", (rest,)).fetchone()
    if row:
        cols = [c[0] for c in cur.description]
        return dict(zip(cols, row))
    # як fallback — по ID
    try:
        cid = int(rest)
        row = cur.execute("SELECT TOP 1 ID, Name, Barcode, Code, PriceCategoryID FROM Clients WHERE ID=?", (cid,)).fetchone()
        if row:
            cols = [c[0] for c in cur.description]
            return dict(zip(cols, row))
    except Exception:
        pass

    raise HTTPException(404, "Клієнта не знайдено")


# Допоміжний ендпоїнт: повернути або створити роздрібного за замовчуванням
@router.post("/ensure-default-retail")
def ensure_default_retail(db: pyodbc.Connection = Depends(get_db)):
    cid = _get_or_create_default_retail_customer(db)
    cur = db.cursor()
    row = cur.execute("SELECT ID, Name, Barcode, Code, PriceCategoryID FROM Clients WHERE ID=?", (cid,)).fetchone()
    cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))


# === Update ===
@router.put("/{client_id}")
def update_client(client_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    _ensure_clients_table(db)
    sets = []
    vals: list[Any] = []
    for field in ("Name", "Barcode", "Code", "PriceCategoryID", "Address", "Phone", "Email", "IsVATPayer"):
        if field in payload:
            sets.append(f"{field}=?")
            vals.append(payload.get(field))
    if not sets:
        return {"ok": True}
    vals.extend([client_id])
    cur = db.cursor()
    cur.execute(f"UPDATE Clients SET {', '.join(sets)} WHERE ID=?", tuple(vals))
    db.commit()
    row = cur.execute("SELECT ID, Name, Barcode, Code, PriceCategoryID FROM Clients WHERE ID=?", (client_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Клієнта не знайдено")
    cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))


# === Delete ===
@router.delete("/{client_id}")
def delete_client(client_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_clients_table(db)
    cur = db.cursor()
    cur.execute("DELETE FROM Clients WHERE ID=?", (client_id,))
    db.commit()
    return {"ok": True}


