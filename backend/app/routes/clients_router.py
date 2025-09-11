from fastapi import APIRouter, Depends, HTTPException, Query
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


def _get_or_create_default_retail_customer(db: pyodbc.Connection) -> int:
    _ensure_clients_table(db)
    cur = db.cursor()
    # спочатку шукаємо по коду 'RETAIL'
    row = cur.execute("SELECT TOP 1 ID FROM Clients WHERE Code='RETAIL'").fetchone()
    if row:
        return int(row[0])

    price_cat_id = _get_default_price_category_id(db)
    cur.execute("INSERT INTO Clients (Name, Code, PriceCategoryID) OUTPUT INSERTED.ID VALUES (N'Роздрібний покупець','RETAIL', ?)", (price_cat_id,))
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


@router.get("/{client_id}")
def get_client(client_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_clients_table(db)
    cur = db.cursor()
    row = cur.execute("SELECT ID, Name, Barcode, Code, PriceCategoryID FROM Clients WHERE ID=?", (client_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Клієнта не знайдено")
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


