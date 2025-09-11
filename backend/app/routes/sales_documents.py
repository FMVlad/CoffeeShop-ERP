from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict, List, Optional
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import pyodbc

from app.db_connection import get_db
from app.routes.accounting_periods import is_closed as period_is_closed


router = APIRouter(prefix="/sales-documents", tags=["sales-documents"])


def _fetch_one(db, sql, params=()):
    cur = db.cursor()
    cur.execute(sql, params)
    return cur.fetchone()


def _table_has_column(db: pyodbc.Connection, table: str, column: str) -> bool:
    try:
        row = _fetch_one(db, "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=? AND COLUMN_NAME=?", (table, column))
        return bool(row)
    except Exception:
        return False


def _ensure_tables(db: pyodbc.Connection) -> None:
    """Create SalesDocuments and SalesDocumentItems if missing (best-effort)."""
    cur = db.cursor()
    try:
        cur.execute(
            """
            IF OBJECT_ID('dbo.SalesDocuments','U') IS NULL
            BEGIN
              CREATE TABLE dbo.SalesDocuments (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Number NVARCHAR(50) NULL,
                [Date] DATE NOT NULL DEFAULT GETDATE(),
                CustomerID INT NULL,
                CenterID INT NOT NULL,
                CompanyID INT NULL,
                PricesIncludeVAT BIT NOT NULL DEFAULT 1,
                TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
                Status VARCHAR(16) NOT NULL DEFAULT 'draft',
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
              );
              CREATE INDEX IX_SalesDocuments_Date ON dbo.SalesDocuments([Date]);
            END;
            ELSE
            BEGIN
              IF COL_LENGTH('dbo.SalesDocuments','UpdatedAt') IS NULL
                ALTER TABLE dbo.SalesDocuments ADD UpdatedAt DATETIME NULL;
              IF COL_LENGTH('dbo.SalesDocuments','PricesIncludeVAT') IS NULL
                ALTER TABLE dbo.SalesDocuments ADD PricesIncludeVAT BIT NOT NULL DEFAULT 1;
              IF COL_LENGTH('dbo.SalesDocuments','TotalAmount') IS NULL
                ALTER TABLE dbo.SalesDocuments ADD TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0;
              IF COL_LENGTH('dbo.SalesDocuments','Status') IS NULL
                ALTER TABLE dbo.SalesDocuments ADD Status VARCHAR(16) NOT NULL DEFAULT 'draft';
              IF COL_LENGTH('dbo.SalesDocuments','CompanyID') IS NULL
                ALTER TABLE dbo.SalesDocuments ADD CompanyID INT NULL;
            END;

            IF OBJECT_ID('dbo.SalesDocumentItems','U') IS NULL
            BEGIN
              CREATE TABLE dbo.SalesDocumentItems (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                DocID INT NOT NULL,
                ProductID INT NOT NULL,
                Quantity DECIMAL(18,6) NOT NULL,
                Price DECIMAL(18,4) NOT NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT FK_SalesItems_Doc FOREIGN KEY (DocID) REFERENCES dbo.SalesDocuments(ID) ON DELETE CASCADE
              );
              CREATE INDEX IX_SalesItems_Doc ON dbo.SalesDocumentItems(DocID);
              CREATE INDEX IX_SalesItems_Product ON dbo.SalesDocumentItems(ProductID);
            END;
            """
        )
    except Exception:
        # ignore errors in ensure
        pass


@router.get("")
def list_sales(date_from: Optional[str] = Query(None), date_to: Optional[str] = Query(None), db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    cur = db.cursor()
    where = []
    p: List[Any] = []
    if date_from:
        where.append("d.[Date]>=?"); p.append(date_from)
    if date_to:
        where.append("d.[Date]<=?"); p.append(date_to)
    sql = "SELECT d.ID, d.Number, d.[Date], d.CustomerID, d.CenterID, d.TotalAmount, d.Status FROM SalesDocuments d "
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY d.[Date] DESC, d.ID DESC"
    rows = cur.execute(sql, tuple(p)).fetchall()
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


@router.post("")
def create_sale(payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    header = payload.get("Header") or payload
    items: List[Dict[str, Any]] = payload.get("Items") or []
    on_date = str(header.get("Date") or datetime.now().date())[:10]
    if period_is_closed(db, on_date):
        raise HTTPException(400, "Період закритий для проведень")

    center_id = header.get("CenterID")
    company_id = header.get("CompanyID")
    customer_id = header.get("CustomerID")
    price_includes_vat = bool(header.get("PricesIncludeVAT", True))

    cur = db.cursor()
    # Заголовок
    # Динамічна вставка з урахуванням CompanyID, якщо така колонка існує
    cols = ["Number", "Date", "CustomerID", "CenterID", "PricesIncludeVAT", "TotalAmount", "Status"]
    vals = [header.get("Number") or None, on_date, customer_id, center_id, 1 if price_includes_vat else 0, 0, 'draft']
    if _table_has_column(db, "SalesDocuments", "CompanyID"):
        cols.insert(4, "CompanyID")
        vals.insert(4, company_id)
    placeholders = ", ".join(["?" for _ in cols])
    col_list = ", ".join(cols)
    cur.execute(f"INSERT INTO SalesDocuments ({col_list}) OUTPUT INSERTED.ID VALUES ({placeholders})", tuple(vals))
    row = cur.fetchone(); doc_id = int(row[0])

    total = Decimal("0")
    for it in items:
        pid = it.get("ProductID")
        qty = Decimal(str(it.get("Quantity") or 0))
        price = Decimal(str(it.get("Price") or 0))
        total += (qty * price)
        cur.execute(
            "INSERT INTO SalesDocumentItems (DocID, ProductID, Quantity, Price) VALUES (?, ?, ?, ?)",
            (doc_id, pid, float(qty), float(price)),
        )
        # рухи по партіях: списання FIFO — для MVP просто позначка, детальну реалізацію додамо далі
        # тут же можна зменшити StockBalances за аналогією до прибуткової (у зворотному напрямку)

    cur.execute("UPDATE SalesDocuments SET TotalAmount=? WHERE ID=?", (float(total), doc_id))
    db.commit()
    return {"ok": True, "ID": doc_id}


@router.get("/{doc_id}")
def get_sale(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    cur = db.cursor()
    row = cur.execute(
        "SELECT ID, Number, [Date], CustomerID, CenterID, CompanyID, PricesIncludeVAT, TotalAmount, Status FROM SalesDocuments WHERE ID=?",
        (doc_id,)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Документ не знайдено")
    cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))


@router.get("/{doc_id}/items")
def list_items(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    cur = db.cursor()
    rows = cur.execute(
        """
        SELECT i.ID, i.DocID, i.ProductID,
               p.FullName AS ProductName,
               i.Quantity, i.Price
          FROM SalesDocumentItems i
          LEFT JOIN Products p ON p.ID = i.ProductID
         WHERE i.DocID = ?
         ORDER BY i.ID
        """,
        (doc_id,)
    ).fetchall()
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


@router.post("/{doc_id}/items")
def add_item(doc_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    cur = db.cursor()
    if not _fetch_one(db, "SELECT 1 FROM SalesDocuments WHERE ID=?", (doc_id,)):
        raise HTTPException(404, "Документ не знайдено")
    product_id = int(payload.get("ProductID") or 0)
    qty = float(payload.get("Quantity") or 0)
    price = float(payload.get("Price") or 0)
    if product_id <= 0 or qty <= 0:
        raise HTTPException(400, "ProductID і Quantity обов'язкові")
    cur.execute(
        "INSERT INTO SalesDocumentItems (DocID, ProductID, Quantity, Price) OUTPUT INSERTED.ID VALUES (?, ?, ?, ?)",
        (doc_id, product_id, qty, price)
    )
    new_id = int(cur.fetchone()[0])
    cur.execute(
        "UPDATE SalesDocuments SET TotalAmount=(SELECT ISNULL(SUM(Quantity*Price),0) FROM SalesDocumentItems WHERE DocID=?), UpdatedAt=GETDATE() WHERE ID=?",
        (doc_id, doc_id)
    )
    db.commit()
    return {"ok": True, "ID": new_id}


@router.put("/{doc_id}/items/{item_id}")
def update_item(doc_id: int, item_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    cur = db.cursor()
    sets: List[str] = []
    vals: List[Any] = []
    if payload.get("Quantity") is not None:
        sets.append("Quantity=?"); vals.append(float(payload.get("Quantity")))
    if payload.get("Price") is not None:
        sets.append("Price=?"); vals.append(float(payload.get("Price")))
    if not sets:
        return {"ok": True}
    cur.execute(f"UPDATE SalesDocumentItems SET {', '.join(sets)} WHERE ID=? AND DocID=?", (*vals, item_id, doc_id))
    cur.execute(
        "UPDATE SalesDocuments SET TotalAmount=(SELECT ISNULL(SUM(Quantity*Price),0) FROM SalesDocumentItems WHERE DocID=?), UpdatedAt=GETDATE() WHERE ID=?",
        (doc_id, doc_id)
    )
    db.commit()
    return {"ok": True}


@router.delete("/{doc_id}/items/{item_id}")
def delete_item(doc_id: int, item_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    cur = db.cursor()
    cur.execute("DELETE FROM SalesDocumentItems WHERE ID=? AND DocID=?", (item_id, doc_id))
    cur.execute(
        "UPDATE SalesDocuments SET TotalAmount=(SELECT ISNULL(SUM(Quantity*Price),0) FROM SalesDocumentItems WHERE DocID=?), UpdatedAt=GETDATE() WHERE ID=?",
        (doc_id, doc_id)
    )
    db.commit()
    return {"ok": True}


@router.delete("/{doc_id}")
def delete_sale(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    cur = db.cursor()
    r = cur.execute("SELECT Status FROM SalesDocuments WHERE ID=?", (doc_id,)).fetchone()
    if not r:
        return {"ok": True}
    status = str(r[0] or 'draft').lower()
    if status != 'draft':
        raise HTTPException(400, "Видалення дозволено лише для чернеток")
    cur.execute("DELETE FROM SalesDocumentItems WHERE DocID=?", (doc_id,))
    cur.execute("DELETE FROM SalesDocuments WHERE ID=?", (doc_id,))
    db.commit()
    return {"ok": True}

@router.post("/{doc_id}/postings")
def generate_postings(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    # Перевірка періоду
    head = _fetch_one(db, "SELECT [Date], CenterID, PricesIncludeVAT, CompanyID FROM SalesDocuments WHERE ID=?", (doc_id,))
    if not head: raise HTTPException(404, "Документ не знайдено")
    on_date = str(head[0])[:10]
    if period_is_closed(db, on_date):
        raise HTTPException(400, "Період закритий для проведень")

    # Зібрати суми
    cur = db.cursor()
    rows = cur.execute("SELECT ProductID, Quantity, Price FROM SalesDocumentItems WHERE DocID=?", (doc_id,)).fetchall()
    total_gross = sum((Decimal(str(r[1] or 0)) * Decimal(str(r[2] or 0))) for r in rows)
    # ПДВ 20% для прикладу
    vat_rate = Decimal("20")
    base = (total_gross / (Decimal("1") + vat_rate/Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    vat = (total_gross - base).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Очистити старі проводки
    try:
        cur.execute("DELETE FROM DocumentPostings WHERE DocumentType='SALE' AND DocumentID=?", (doc_id,))
    except Exception:
        pass

    # Простий шаблон проводок: виручка та ПДВ (COGS додамо, коли підв’яжемо FIFO борди)
    center_id = head[1]
    company_id = head[3]
    has_company = _table_has_column(db, "DocumentPostings", "CompanyID")
    if has_company:
        insert_sql = (
            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CenterID, CompanyID, CreatedAt, CreatedBy, Comment) "
            "VALUES (?, 'SALE', ?, ?, ?, ?, ?, ?, GETDATE(), ?, ?)"
        )
    else:
        insert_sql = (
            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CenterID, CreatedAt, CreatedBy, Comment) "
            "VALUES (?, 'SALE', ?, ?, ?, ?, ?, GETDATE(), ?, ?)"
        )
    # Дт 361 Кт 702 — на суму без ПДВ
    if has_company:
        cur.execute(insert_sql, (doc_id, on_date, 361, 702, float(base), center_id, company_id, 1, 'revenue'))
    else:
        cur.execute(insert_sql, (doc_id, on_date, 361, 702, float(base), center_id, 1, 'revenue'))
    # Дт 702 Кт 641 — ПДВ
    if has_company:
        cur.execute(insert_sql, (doc_id, on_date, 702, 641, float(vat), center_id, company_id, 1, 'VAT'))
    else:
        cur.execute(insert_sql, (doc_id, on_date, 702, 641, float(vat), center_id, 1, 'VAT'))

    db.commit()
    return {"Postings": [
        {"DebitAccount": 361, "CreditAccount": 702, "Amount": float(base), "Comment": "revenue"},
        {"DebitAccount": 702, "CreditAccount": 641, "Amount": float(vat), "Comment": "VAT"},
    ]}


