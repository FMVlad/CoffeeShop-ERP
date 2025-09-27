from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict, List, Optional
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import pyodbc

from app.db_connection import get_db
from app.services import inventory
from app.routes.accounting_periods import is_closed as period_is_closed
from app.services.typical_ops import get_operation_entries


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
def _resolve_default_warehouse(db: pyodbc.Connection, center_id: int) -> Optional[int]:
    """Повертає головний (або перший активний) склад центру для роздрібної реалізації."""
    try:
        cur = db.cursor()
        row = cur.execute(
            (
                "SELECT TOP 1 ID FROM Warehouses "
                "WHERE CenterID = ? AND IsActive = 1 "
                "ORDER BY CASE WHEN ParentID IS NULL THEN 0 ELSE 1 END, "
                "         CASE WHEN Type = 'main' THEN 0 ELSE 1 END, ID"
            ),
            (center_id,),
        ).fetchone()
        return int(row[0]) if row else None
    except Exception:
        return None


def _infer_company_for_sale_item(db: pyodbc.Connection, center_id: Optional[int], product_id: int) -> Optional[int]:
    """Спроба визначити CompanyID для товару з залишків/партій по головному складу центру."""
    if not center_id:
        return None
    wid = _resolve_default_warehouse(db, int(center_id))
    if not wid:
        return None
    cur = db.cursor()
    # Варіант 1: за StockBalances, якщо є CompanyID
    try:
        if _table_has_column(db, "StockBalances", "CompanyID"):
            row = cur.execute(
                "SELECT TOP 1 CompanyID, SUM(Quantity) AS Qty "
                "FROM StockBalances WHERE ProductID=? AND WarehouseID=? "
                "GROUP BY CompanyID ORDER BY SUM(Quantity) DESC",
                (product_id, wid),
            ).fetchone()
            if row and row[0] is not None:
                return int(row[0])
    except Exception:
        pass
    # Варіант 2: за Parties, якщо є CompanyID і RemainingQty
    try:
        has_party_company = _table_has_column(db, "Parties", "CompanyID")
        if has_party_company:
            row = cur.execute(
                "SELECT TOP 1 CompanyID, SUM(ISNULL(RemainingQty, Quantity)) AS Qty "
                "FROM Parties WHERE ProductID=? AND WarehouseID=? AND CompanyID IS NOT NULL "
                "GROUP BY CompanyID ORDER BY SUM(ISNULL(RemainingQty, Quantity)) DESC",
                (product_id, wid),
            ).fetchone()
            if row and row[0] is not None:
                return int(row[0])
    except Exception:
        pass
    return None
def _get_available_qty(db: pyodbc.Connection, warehouse_id: int, product_id: int, company_id: Optional[int]) -> Optional[float]:
    """Returns conservative available stock for a product in a warehouse.
    Uses total across all companies and, if CompanyID is provided and column exists, intersects with that bucket.
    If a failure occurs, returns None to skip validation (fail-open), but normal flow should return a float."""
    try:
        cur = db.cursor()
        # Total availability across all companies
        row_all = cur.execute(
            "SELECT ISNULL(SUM(Quantity),0) FROM StockBalances WHERE WarehouseID=? AND ProductID=?",
            (warehouse_id, product_id),
        ).fetchone()
        total_all = float(row_all[0] or 0)
        # If company dimension exists and provided, also read that bucket
        if company_id is not None and _table_has_column(db, "StockBalances", "CompanyID"):
            row_comp = cur.execute(
                "SELECT ISNULL(SUM(Quantity),0) FROM StockBalances WHERE WarehouseID=? AND ProductID=? AND ISNULL(CompanyID,0)=ISNULL(?,0)",
                (warehouse_id, product_id, int(company_id)),
            ).fetchone()
            total_comp = float(row_comp[0] or 0)
            return min(total_all, total_comp)
        return total_all
    except Exception:
        return None

def _get_existing_qty_in_doc(db: pyodbc.Connection, doc_id: int, product_id: int, company_id: Optional[int]) -> float:
    """Returns total quantity of product already in the document, ignoring CompanyID to avoid under-checking."""
    try:
        cur = db.cursor()
        row = cur.execute(
            "SELECT ISNULL(SUM(Quantity),0) FROM SalesDocumentItems WHERE DocID=? AND ProductID=?",
            (doc_id, product_id),
        ).fetchone()
        return float(row[0] or 0)
    except Exception:
        return 0.0




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
                CompanyID INT NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT FK_SalesItems_Doc FOREIGN KEY (DocID) REFERENCES dbo.SalesDocuments(ID) ON DELETE CASCADE
              );
              CREATE INDEX IX_SalesItems_Doc ON dbo.SalesDocumentItems(DocID);
              CREATE INDEX IX_SalesItems_Product ON dbo.SalesDocumentItems(ProductID);
            END;
            ELSE
            BEGIN
              IF COL_LENGTH('dbo.SalesDocumentItems','CompanyID') IS NULL
                ALTER TABLE dbo.SalesDocumentItems ADD CompanyID INT NULL;
            END;
            """
        )
    except Exception:
        # ignore errors in ensure
        pass


def _next_doc_number_for_center(db: pyodbc.Connection, center_id: int) -> str:
    """Повертає наступний номер документа по центру: MAX(TRY_CONVERT(INT, Number))+1.
    Якщо номерів немає або нечислові — повертає '1'."""
    try:
        cur = db.cursor()
        row = cur.execute(
            "SELECT ISNULL(MAX(TRY_CONVERT(INT, Number)), 0) + 1 FROM SalesDocuments WHERE CenterID=?",
            (center_id,),
        ).fetchone()
        nxt = int(row[0]) if row and row[0] is not None else 1
        return str(nxt)
    except Exception:
        return "1"


def _next_doc_number_global(db: pyodbc.Connection) -> str:
    """Повертає наступний номер документа глобально: MAX(Number)+1."""
    try:
        cur = db.cursor()
        row = cur.execute(
            "SELECT ISNULL(MAX(TRY_CONVERT(INT, Number)), 0) + 1 FROM SalesDocuments"
        ).fetchone()
        nxt = int(row[0]) if row and row[0] is not None else 1
        return str(nxt)
    except Exception:
        return "1"


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
    # Номер: якщо не переданий — генеруємо по центру обліку
    number_value = header.get("Number")
    if not number_value:
        # Спочатку по центру, якщо заданий; інакше — глобально
        number_value = (_next_doc_number_for_center(db, int(center_id)) if center_id else None) or _next_doc_number_global(db)

    cols = ["Number", "Date", "CustomerID", "CenterID", "PricesIncludeVAT", "TotalAmount", "Status"]
    vals = [number_value, on_date, customer_id, center_id, 1 if price_includes_vat else 0, 0, 'draft']
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
        # Визначимо CompanyID рядка: спочатку з payload, потім з заголовка, далі — інференс зі складу
        item_company_id = it.get("CompanyID") or company_id or _infer_company_for_sale_item(db, center_id, int(pid))
        total += (qty * price)
        # вставка з урахуванням опційного CompanyID у таблиці рядків
        if _table_has_column(db, "SalesDocumentItems", "CompanyID"):
            cur.execute(
                "INSERT INTO SalesDocumentItems (DocID, ProductID, Quantity, Price, CompanyID) VALUES (?, ?, ?, ?, ?)",
                (doc_id, pid, float(qty), float(price), item_company_id),
            )
        else:
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
    data = dict(zip(cols, row))

    # Якщо номер не проставлено (старі чернетки) — дозапишемо зараз
    if not data.get("Number"):
        try:
            center_id = data.get("CenterID")
            new_num = (_next_doc_number_for_center(db, int(center_id)) if center_id else _next_doc_number_global(db))
            cur.execute("UPDATE SalesDocuments SET Number=? WHERE ID=?", (new_num, doc_id))
            db.commit()
            data["Number"] = new_num
        except Exception:
            pass

    return data


@router.get("/{doc_id}/items")
def list_items(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    _ensure_tables(db)
    cur = db.cursor()
    rows = cur.execute(
        """
        SELECT i.ID, i.DocID, i.ProductID,
               p.FullName AS ProductName,
               i.Quantity, i.Price,
               i.CompanyID
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
    # Визначимо CompanyID рядка: спершу з payload, інакше із заголовка документа/інференс зі складу
    item_company_id = payload.get("CompanyID")
    if item_company_id is None:
        try:
            r = _fetch_one(db, "SELECT CompanyID, CenterID FROM SalesDocuments WHERE ID=?", (doc_id,))
            item_company_id = r[0] if r else None
            center_id = int(r[1]) if r and r[1] is not None else None
            if item_company_id is None:
                item_company_id = _infer_company_for_sale_item(db, center_id, product_id)
        except Exception:
            item_company_id = None

    # Перевірка наявності на складі: не дозволяємо додати більше, ніж доступно (по головному складу центру)
    try:
        r = _fetch_one(db, "SELECT CenterID FROM SalesDocuments WHERE ID=?", (doc_id,))
        center_id = int(r[0]) if r and r[0] is not None else None
        warehouse_id = _resolve_default_warehouse(db, int(center_id)) if center_id else None
        if warehouse_id:
            doc_existing = _get_existing_qty_in_doc(db, doc_id, product_id, item_company_id)
            available = _get_available_qty(db, int(warehouse_id), product_id, item_company_id)
            if available is not None and (qty + doc_existing) > available + 1e-9:
                raise HTTPException(400, f"Недостатньо залишку. На складі: {available:.3f}, у документі вже: {doc_existing:.3f}")
    except HTTPException:
        raise
    except Exception:
        pass

    if _table_has_column(db, "SalesDocumentItems", "CompanyID"):
        cur.execute(
            "INSERT INTO SalesDocumentItems (DocID, ProductID, Quantity, Price, CompanyID) OUTPUT INSERTED.ID VALUES (?, ?, ?, ?, ?)",
            (doc_id, product_id, qty, price, item_company_id)
        )
    else:
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
    if payload.get("CompanyID") is not None and _table_has_column(db, "SalesDocumentItems", "CompanyID"):
        sets.append("CompanyID=?"); vals.append(payload.get("CompanyID"))
    # Якщо оновлюється кількість — перевіримо на залишок
    want_qty = None
    if payload.get("Quantity") is not None:
        want_qty = float(payload.get("Quantity"))
        try:
            r = _fetch_one(db, "SELECT CenterID FROM SalesDocuments WHERE ID=?", (doc_id,))
            center_id = int(r[0]) if r and r[0] is not None else None
            warehouse_id = _resolve_default_warehouse(db, int(center_id)) if center_id else None
            if warehouse_id:
                row = _fetch_one(db, "SELECT ProductID, ISNULL(CompanyID,0) FROM SalesDocumentItems WHERE ID=? AND DocID=?", (item_id, doc_id))
                if row:
                    pid = int(row[0]); cid = int(row[1]) if row[1] is not None else None
                    # поточна сума по документу без цього рядка (ігноруємо CompanyID для строгості)
                    existing_total = _get_existing_qty_in_doc(db, doc_id, pid, cid)
                    row_q = _fetch_one(db, "SELECT Quantity FROM SalesDocumentItems WHERE ID=?", (item_id,))
                    this_qty = float(row_q[0] or 0) if row_q else 0.0
                    existing_minus_this = max(0.0, existing_total - this_qty)
                    available = _get_available_qty(db, int(warehouse_id), pid, cid)
                    if available is not None and (existing_minus_this + want_qty) > available + 1e-9:
                        raise HTTPException(400, f"Недостатньо залишку. На складі: {available:.3f}, у документі вже: {existing_minus_this:.3f}")
        except HTTPException:
            raise
        except Exception:
            pass

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

    # Спроба сформувати за типовою операцією через TypicalOperationBindings
    try:
        bind = cur.execute(
            "SELECT TOP 1 OperationID FROM TypicalOperationBindings WHERE DocumentType='SALE' AND IsActive=1 ORDER BY IsDefault DESC, Priority, ID DESC"
        ).fetchone()
        if bind and bind[0]:
            entries = get_operation_entries(db, int(bind[0]))
            for e in entries:
                debit = int(e.get("DebitAccountID"))
                credit = int(e.get("CreditAccountID"))
                amt_raw = (e.get("AmountType") or '').strip().lower()
                amount: Decimal
                if amt_raw.startswith("percent") or amt_raw.startswith("pct") or amt_raw.startswith("%"):
                    # percent[:value] → percent:20 => 20%
                    try:
                        parts = amt_raw.split(":", 1)
                        pct = Decimal(parts[1]) if len(parts) == 2 else Decimal("1")
                    except Exception:
                        pct = Decimal("1")
                    amount = (base * (pct / Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                elif amt_raw in ("vat", "пдв"):
                    amount = vat
                elif amt_raw in ("gross", "total", "sum"):
                    amount = total_gross
                else:  # "base" | "net" | empty
                    amount = base
                cur.execute(
                    "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CenterID, CreatedAt, CreatedBy, Comment) "
                    "VALUES (?, 'SALE', ?, ?, ?, ?, ?, GETDATE(), ?, ?)",
                    (doc_id, on_date, debit, credit, float(amount), head[1], 1, e.get("Notes") or "typical")
                )
            db.commit()
            return {"Postings": "generated from TypicalOperationBindings"}
    except Exception:
        pass

    # Fallback: простий шаблон проводок: виручка та ПДВ (COGS додамо згодом)
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

    # --- FIFO списання та рухи партій ---
    try:
        center_id = head[1]
        warehouse_id = _resolve_default_warehouse(db, int(center_id)) if center_id else None
        if warehouse_id:
            cur = db.cursor()
            items = cur.execute(
                "SELECT ID, ProductID, Quantity, CompanyID FROM SalesDocumentItems WHERE DocID=? ORDER BY ID",
                (doc_id,),
            ).fetchall()

            has_pm_company = _table_has_column(db, "PartyMovements", "CompanyID")
            has_party_company = _table_has_column(db, "Parties", "CompanyID")
            has_party_remaining = _table_has_column(db, "Parties", "RemainingQty")
            has_party_closed = _table_has_column(db, "Parties", "IsClosed")

            for it in items:
                pid = int(it[1])
                need = float(it[2] or 0)
                item_company = it[3]
                if need <= 0:
                    continue

                # Підбираємо партії FIFO
                where = ["ProductID=?", "WarehouseID=?"]
                params: list[Any] = [pid, warehouse_id]
                if has_party_company and item_company is not None:
                    where.append("ISNULL(CompanyID,0)=ISNULL(?,0)")
                    params.append(int(item_company))
                order = "ORDER BY DateReceived, ID"

                if has_party_remaining:
                    sql = f"SELECT ID, RemainingQty AS Rem, CompanyID FROM Parties WHERE {' AND '.join(where)} AND ISNULL(RemainingQty,0) > 0 {order}"
                else:
                    # Обчислимо залишок за рухами, якщо поля RemainingQty немає
                    sql = (
                        "SELECT p.ID, p.Quantity - ISNULL((SELECT SUM(m.Quantity) FROM PartyMovements m WHERE m.PartyID=p.ID AND m.MovementType IN ('sale','out')),0) AS Rem, p.CompanyID "
                        f"FROM Parties p WHERE {' AND '.join(where)} {order}"
                    )
                rows = cur.execute(sql, tuple(params)).fetchall()

                for r in rows:
                    if need <= 0:
                        break
                    party_id = int(r[0])
                    rem = float(r[1] or 0)
                    party_company = r[2] if len(r) > 2 else item_company
                    if rem <= 0:
                        continue
                    take = rem if rem < need else need
                    # Рух 'sale'
                    try:
                        if has_pm_company:
                            cur.execute(
                                "INSERT INTO PartyMovements (PartyID, MovementType, Quantity, Date, DocumentID, DocumentType, WarehouseID, CompanyID) VALUES (?, 'sale', ?, ?, ?, 'SALE', ?, ?)",
                                (party_id, float(take), on_date, doc_id, warehouse_id, party_company),
                            )
                        else:
                            cur.execute(
                                "INSERT INTO PartyMovements (PartyID, MovementType, Quantity, Date, DocumentID, DocumentType, WarehouseID) VALUES (?, 'sale', ?, ?, ?, 'SALE', ?)",
                                (party_id, float(take), on_date, doc_id, warehouse_id),
                            )
                    except Exception:
                        pass

                    # Оновити залишок партії, якщо є поле
                    if has_party_remaining:
                        try:
                            if has_party_closed:
                                cur.execute(
                                    "UPDATE Parties SET RemainingQty = RemainingQty - ?, IsClosed = CASE WHEN RemainingQty - ? <= 0 THEN 1 ELSE IsClosed END WHERE ID=?",
                                    (float(take), float(take), party_id),
                                )
                            else:
                                cur.execute(
                                    "UPDATE Parties SET RemainingQty = RemainingQty - ? WHERE ID=?",
                                    (float(take), party_id),
                                )
                        except Exception:
                            pass

                    # Оновити складські залишки (з CompanyID по можливості)
                    try:
                        inventory.upsert_stock_balance(
                            db,
                            product_id=pid,
                            warehouse_id=warehouse_id,
                            delta_qty=-float(take),
                            comment=f"SALE #{doc_id}",
                            parent_id=party_id,
                            company_id=(int(party_company) if party_company is not None else None),
                        )
                    except Exception:
                        pass

                    need -= float(take)

                # Якщо ще залишилось списати (наприклад, немає партій) — спишемо з балансу загально
                if need > 0:
                    try:
                        inventory.upsert_stock_balance(
                            db,
                            product_id=pid,
                            warehouse_id=warehouse_id,
                            delta_qty=-float(need),
                            comment=f"SALE #{doc_id} remainder",
                            parent_id=None,
                            company_id=(int(item_company) if item_company is not None else None),
                        )
                    except Exception:
                        pass

            db.commit()
    except Exception:
        # інвентарний модуль — best-effort, помилки ігноруємо щоб не ламати проведення
        try:
            db.rollback()
        except Exception:
            pass

    return {"Postings": [
        {"DebitAccount": 361, "CreditAccount": 702, "Amount": float(base), "Comment": "revenue"},
        {"DebitAccount": 702, "CreditAccount": 641, "Amount": float(vat), "Comment": "VAT"},
    ]}



@router.get("/{doc_id}/postings")
def list_postings(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    """Повертає проводки, прив'язані до документа реалізації."""
    try:
        cur = db.cursor()
        rows = cur.execute(
            """
            SELECT PostingDate, DebitAccountID, CreditAccountID, Amount, Comment
              FROM DocumentPostings
             WHERE DocumentType = 'SALE' AND DocumentID = ?
             ORDER BY PostingDate, ID
            """,
            (doc_id,),
        ).fetchall()
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, r)) for r in rows]
    except Exception:
        return []

