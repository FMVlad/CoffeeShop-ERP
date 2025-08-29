from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, List
import pyodbc

from app.db_connection import get_db

router = APIRouter()


def _ensure_tables(cur) -> None:
    try:
        cur.execute(
            """
            IF OBJECT_ID('dbo.DiscountDocs','U') IS NULL
            BEGIN
              CREATE TABLE dbo.DiscountDocs (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                DocNumber NVARCHAR(50) NULL,
                DocDate DATE NOT NULL DEFAULT GETDATE(),
                CenterID INT NOT NULL,
                WarehouseID INT NOT NULL, -- write_off warehouse for center
                Status VARCHAR(16) NOT NULL DEFAULT 'open',
                Comment NVARCHAR(250) NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
              );
              CREATE INDEX IX_DiscountDocs_Date ON dbo.DiscountDocs(DocDate);
            END
            ELSE IF COL_LENGTH('dbo.DiscountDocs','DocNumber') IS NULL
            BEGIN
              ALTER TABLE dbo.DiscountDocs ADD DocNumber NVARCHAR(50) NULL;
            END
            IF OBJECT_ID('dbo.DiscountDocItems','U') IS NULL
            BEGIN
              CREATE TABLE dbo.DiscountDocItems (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                DocID INT NOT NULL,
                ProductID INT NOT NULL,
                Quantity DECIMAL(18,6) NOT NULL,
                Price DECIMAL(18,4) NOT NULL,
                PriceBase DECIMAL(18,4) NULL,
                AvgCost DECIMAL(18,4) NULL,
                DiscountBarcode NVARCHAR(50) NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT FK_DiscountDocItems_Doc FOREIGN KEY (DocID) REFERENCES dbo.DiscountDocs(ID) ON DELETE CASCADE
              );
              CREATE INDEX IX_DiscountDocItems_Doc ON dbo.DiscountDocItems(DocID);
              CREATE INDEX IX_DiscountDocItems_Product ON dbo.DiscountDocItems(ProductID);
            END
            ELSE
            BEGIN
              IF COL_LENGTH('dbo.DiscountDocItems','PriceBase') IS NULL ALTER TABLE dbo.DiscountDocItems ADD PriceBase DECIMAL(18,4) NULL;
              IF COL_LENGTH('dbo.DiscountDocItems','AvgCost') IS NULL ALTER TABLE dbo.DiscountDocItems ADD AvgCost DECIMAL(18,4) NULL;
            END
            
            -- Створюємо таблицю для штрихкодів уцінки по складах
            IF OBJECT_ID('dbo.ProductDiscountBarcodes','U') IS NULL
            BEGIN
              CREATE TABLE dbo.ProductDiscountBarcodes (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                ProductID INT NOT NULL,
                WarehouseID INT NOT NULL,
                DiscountBarcode NVARCHAR(50) NOT NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT UQ_ProductDiscountBarcodes_ProductWarehouse UNIQUE(ProductID, WarehouseID),
                CONSTRAINT UQ_ProductDiscountBarcodes_Barcode UNIQUE(DiscountBarcode)
              );
              CREATE INDEX IX_PDB_ProductID ON dbo.ProductDiscountBarcodes(ProductID);
              CREATE INDEX IX_PDB_WarehouseID ON dbo.ProductDiscountBarcodes(WarehouseID);
              CREATE INDEX IX_PDB_Barcode ON dbo.ProductDiscountBarcodes(DiscountBarcode);
            END
            """
        )
    except Exception:
        # ignore — best-effort
        pass


def _get_warehouse_id(cur, center_id: int, w_type: str) -> Optional[int]:
    r = cur.execute(
        "SELECT TOP 1 ID FROM Warehouses WHERE CenterID=? AND Type=? AND IsActive=1 ORDER BY ID",
        (center_id, w_type),
    ).fetchone()
    return int(r[0]) if r else None


def _ean13_checksum(body12: str) -> str:
    """
    Простий і надійний алгоритм контрольної суми для EAN-13.
    Сума всіх цифр по модулю 10.
    """
    if len(body12) != 12:
        return body12
    
    total = sum(int(d) for d in body12)
    checksum = total % 10
    return str(checksum)


def _get_or_create_discount_barcode(cur: pyodbc.Cursor, product_id: int, warehouse_id: int, original_barcode: str = None) -> str:
    """
    Отримує існуючий штрихкод уцінки або створює новий для товару на конкретному складі.
    """
    # Спочатку шукаємо існуючий штрихкод
    existing = cur.execute(
        "SELECT DiscountBarcode FROM dbo.ProductDiscountBarcodes WHERE ProductID=? AND WarehouseID=?",
        (product_id, warehouse_id)
    ).fetchone()
    
    if existing and existing[0]:
        return str(existing[0])
    
    # Якщо немає - створюємо новий
    if original_barcode and len(original_barcode) >= 13:
        # Беремо оригінальний штрихкод і формуємо штрихкод уцінки
        # Формат: 29 + 1 + warehouse_id + останні цифри оригінального
        # Наприклад: 2900000000025 -> 29136000000025 (склад ID=36)
        original_body = original_barcode[:12]  # перші 12 цифр без контрольної суми
        warehouse_part = f"{warehouse_id:04d}"  # ID складу з ведучими нулями
        remaining_digits = original_body[4:]  # цифри після префіксу 29
        new_body = f"291{warehouse_part}{remaining_digits}"[:12]  # обрізаємо до 12 цифр
        new_code = new_body + _ean13_checksum(new_body)
        
        # Перевіряємо чи не існує вже такий штрихкод
        exists = cur.execute("SELECT COUNT(*) FROM dbo.ProductDiscountBarcodes WHERE DiscountBarcode=?", (new_code,)).fetchone()[0]
        if not exists:
            # Зберігаємо новий штрихкод
            cur.execute(
                "INSERT INTO dbo.ProductDiscountBarcodes (ProductID, WarehouseID, DiscountBarcode) VALUES (?, ?, ?)",
                (product_id, warehouse_id, new_code)
            )
            return new_code
    
    # Fallback: генеруємо унікальний штрихкод
    try:
        row = cur.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey='BarcodeNum'").fetchone()
        seq = int(row[0]) if row and row[0] else 1
    except Exception:
        seq = 1
    
    while True:
        # Формуємо штрихкод: 2936 + warehouse_id + sequence
        head = f"2936{warehouse_id:04d}"
        body12 = f"{head}{seq:08d}"[:12]
        code = body12 + _ean13_checksum(body12)
        
        # Перевіряємо унікальність
        exists = cur.execute("SELECT COUNT(*) FROM dbo.ProductDiscountBarcodes WHERE DiscountBarcode=?", (code,)).fetchone()[0]
        if not exists:
            # Зберігаємо новий штрихкод
            cur.execute(
                "INSERT INTO dbo.ProductDiscountBarcodes (ProductID, WarehouseID, DiscountBarcode) VALUES (?, ?, ?)",
                (product_id, warehouse_id, code)
            )
            # Оновлюємо послідовність
            try:
                cur.execute("UPDATE SystemParameters SET ParamValue=? WHERE ParamKey='BarcodeNum'", (str(seq + 1),))
            except Exception:
                pass
            return code
        seq += 1


def _generate_discount_barcode(db: pyodbc.Connection, *, prefix: str, warehouse_id: int, original_barcode: str = None) -> str:
    """
    Генерує штрихкод уцінки на основі оригінального штрихкоду товару.
    Якщо оригінальний штрихкод не передано - генерує унікальний.
    """
    cur = db.cursor()
    if original_barcode and len(original_barcode) >= 13:
        # Беремо оригінальний штрихкод і змінюємо префікс на уцінку
        # Наприклад: 2900000000025 -> 2936000000025
        discount_prefix = "2936"  # префікс для уцінки
        original_body = original_barcode[:12]  # перші 12 цифр без контрольної суми
        new_body = discount_prefix + original_body[4:]  # замінюємо перші 4 цифри
        new_code = new_body + _ean13_checksum(new_body)
        
        # Перевіряємо чи не існує вже такий штрихкод
        exists = cur.execute("SELECT COUNT(*) FROM Products WHERE Barcode=? OR DiscountBarcode=?", (new_code, new_code)).fetchone()[0]
        if not exists:
            return new_code
    
    # Fallback: генеруємо унікальний штрихкод як раніше
    try:
        row = cur.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey='BarcodeNum'").fetchone()
        seq = int(row[0]) if row and row[0] else 1
    except Exception:
        seq = 1
    head = f"{prefix}{warehouse_id}"
    if len(head) >= 12:
        head = head[:12]
    while True:
        pad = max(0, 12 - len(head))
        body12 = f"{head}{seq:0{pad}d}"[:12]
        code = body12 + _ean13_checksum(body12)
        exists = cur.execute("SELECT COUNT(*) FROM Products WHERE Barcode=? OR DiscountBarcode=?", (code, code)).fetchone()[0]
        if not exists:
            break
        seq += 1
    try:
        cur.execute("UPDATE SystemParameters SET ParamValue=? WHERE ParamKey='BarcodeNum'", (str(seq + 1),))
    except Exception:
        pass
    return code


@router.get("/discount-documents")
def list_docs(db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    rows = cur.execute("SELECT ID, DocNumber, DocDate, CenterID, WarehouseID, Status, Comment FROM dbo.DiscountDocs ORDER BY ID DESC").fetchall()
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


@router.get("/discount-documents/{doc_id}")
def get_doc(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    r = cur.execute("SELECT ID, DocNumber, DocDate, CenterID, WarehouseID, Status, Comment FROM dbo.DiscountDocs WHERE ID=?", (doc_id,)).fetchone()
    if not r: raise HTTPException(404, "Документ не знайдено")
    cols = [c[0] for c in cur.description]
    return dict(zip(cols, r))


@router.post("/discount-documents")
def create_doc(payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    center_id = int(payload.get("CenterID") or payload.get("center_id") or 0)
    date = payload.get("DocDate") or payload.get("Date")
    comment = payload.get("Comment")
    if not center_id: raise HTTPException(400, "CenterID обов'язковий")
    wh = _get_warehouse_id(cur, center_id, "write_off")
    if not wh: raise HTTPException(400, "Для центру не знайдено підсклад 'Уцінка'")
    # Generate DocNumber DSC-YYYYMM-####
    from datetime import datetime
    dt = datetime.strptime(date[:10], "%Y-%m-%d") if isinstance(date, str) else datetime.now()
    yyyymm = dt.strftime("%Y%m")
    row = cur.execute("SELECT COUNT(*) FROM dbo.DiscountDocs WHERE DocDate >= DATEFROMPARTS(?, ?, 1) AND DocDate < DATEADD(MONTH, 1, DATEFROMPARTS(?, ?, 1))", (dt.year, dt.month, dt.year, dt.month)).fetchone()
    seq = int(row[0] or 0) + 1
    doc_number = f"DSC-{yyyymm}-{seq:04d}"
    cur.execute("INSERT INTO dbo.DiscountDocs (DocNumber, DocDate, CenterID, WarehouseID, Status, Comment) OUTPUT INSERTED.ID VALUES (?, ISNULL(?, GETDATE()), ?, ?, 'open', ?)", (doc_number, date, center_id, wh, comment))
    new_id = int(cur.fetchone()[0]); db.commit()
    return {"ok": True, "ID": new_id, "DocNumber": doc_number}


@router.put("/discount-documents/{doc_id}")
def update_doc(doc_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    comment = payload.get("Comment")
    status = payload.get("Status")
    sets = []; vals: List[Any] = []
    if comment is not None:
        sets.append("Comment=?"); vals.append(comment)
    if status:
        sets.append("Status=?"); vals.append(status)
    if not sets:
        return {"ok": True}
    cur.execute(f"UPDATE dbo.DiscountDocs SET {', '.join(sets)}, UpdatedAt=GETDATE() WHERE ID=?", (*vals, doc_id))
    db.commit(); return {"ok": True}


@router.delete("/discount-documents/{doc_id}")
def delete_doc(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    
    # Спочатку отримуємо інформацію про документ та його позиції
    rdoc = cur.execute("SELECT CenterID, WarehouseID FROM dbo.DiscountDocs WHERE ID=?", (doc_id,)).fetchone()
    if rdoc:
        center_id, writeoff_warehouse_id = int(rdoc[0]), int(rdoc[1])
        print(f"DEBUG: Видаляємо документ уцінки {doc_id}, центр {center_id}, склад уцінки {writeoff_warehouse_id}")
        
        # Отримуємо всі позиції документа перед видаленням
        items = cur.execute(
            "SELECT ProductID, Quantity FROM dbo.DiscountDocItems WHERE DocID=?", 
            (doc_id,)
        ).fetchall()
        
        # Повертаємо товари на головний склад
        main_warehouse_id = _get_warehouse_id(cur, center_id, 'main')
        if main_warehouse_id and items:
            print(f"DEBUG: Повертаємо товари на головний склад {main_warehouse_id}")
            
            for item in items:
                product_id, quantity = int(item[0]), float(item[1])
                print(f"DEBUG: Повертаємо товар {product_id}, кількість {quantity}")
                
                # Отримуємо поточну кількість на головному складі
                current_row = cur.execute(
                    "SELECT Quantity FROM dbo.StockBalances WHERE ProductID=? AND WarehouseID=?",
                    (product_id, main_warehouse_id)
                ).fetchone()
                
                if current_row:
                    # Оновлюємо існуючий запис
                    new_quantity = float(current_row[0] or 0) + quantity
                    cur.execute(
                        "UPDATE dbo.StockBalances SET Quantity=?, UpdatedAt=GETDATE(), Comment='returned from discount' WHERE ProductID=? AND WarehouseID=?",
                        (new_quantity, product_id, main_warehouse_id)
                    )
                    print(f"DEBUG: Оновлено головний склад: товар {product_id}, нова кількість {new_quantity}")
                else:
                    # Створюємо новий запис
                    cur.execute(
                        "INSERT INTO dbo.StockBalances (ProductID, WarehouseID, Quantity, UpdatedAt, Comment) VALUES (?, ?, ?, GETDATE(), 'returned from discount')",
                        (product_id, main_warehouse_id, quantity)
                    )
                    print(f"DEBUG: Створено запис на головному складі: товар {product_id}, кількість {quantity}")
        
        # Тепер очищаємо записи в StockBalances для складу уцінки
        cur.execute("DELETE FROM dbo.StockBalances WHERE WarehouseID=? AND Comment LIKE 'DISCOUNT DOC%'", (writeoff_warehouse_id,))
        deleted_stock = cur.rowcount
        print(f"DEBUG: Видалено {deleted_stock} записів з StockBalances для складу уцінки {writeoff_warehouse_id}")
        
        # Очищаємо записи з нульовою кількістю на головному складі
        if main_warehouse_id:
            cur.execute("DELETE FROM dbo.StockBalances WHERE WarehouseID=? AND Quantity=0 AND Comment='arrival'", (main_warehouse_id,))
            deleted_zero = cur.rowcount
            print(f"DEBUG: Видалено {deleted_zero} нульових записів з головного складу {main_warehouse_id}")
    
    # Видаляємо позиції документа
    cur.execute("DELETE FROM dbo.DiscountDocItems WHERE DocID=?", (doc_id,))
    deleted_items = cur.rowcount
    print(f"DEBUG: Видалено {deleted_items} позицій документа {doc_id}")
    
    # Видаляємо сам документ
    cur.execute("DELETE FROM dbo.DiscountDocs WHERE ID=?", (doc_id,))
    
    db.commit()
    print(f"DEBUG: Документ уцінки {doc_id} успішно видалено, товари повернуто на головний склад")
    return {"ok": True, "deleted_items": deleted_items, "returned_to_main_warehouse": len(items) if 'items' in locals() else 0}


@router.get("/discount-documents/{doc_id}/items")
def list_items(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    rows = cur.execute(
        """
        SELECT i.ID, i.DocID, i.ProductID, p.FullName AS ProductName, i.Quantity, i.Price, i.PriceBase, i.AvgCost, i.DiscountBarcode
          FROM dbo.DiscountDocItems i
          LEFT JOIN dbo.Products p ON p.ID = i.ProductID
         WHERE i.DocID = ?
         ORDER BY i.ID
        """,
        (doc_id,),
    ).fetchall()
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


@router.post("/discount-documents/{doc_id}/items")
def add_item(doc_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    rdoc = cur.execute("SELECT CenterID, WarehouseID FROM dbo.DiscountDocs WHERE ID=?", (doc_id,)).fetchone()
    if not rdoc: raise HTTPException(404, "Документ не знайдено")
    center_id, writeoff_id = int(rdoc[0]), int(rdoc[1])
    product_id = int(payload.get("ProductID") or payload.get("product_id") or 0)
    qty = float(payload.get("Quantity") or payload.get("qty") or 0)
    price = float(payload.get("Price") or payload.get("price") or 0)
    if not product_id or qty <= 0:
        raise HTTPException(400, "ProductID і Quantity обов'язкові")
    # Перевіряємо чи товар вже є в цьому документі уцінки
    existing_item = cur.execute(
        "SELECT SUM(Quantity) FROM dbo.DiscountDocItems WHERE DocID=? AND ProductID=?",
        (doc_id, product_id)
    ).fetchone()
    existing_qty = float(existing_item[0] or 0) if existing_item else 0.0
    
    print(f"DEBUG: doc_id={doc_id}, product_id={product_id}, existing_qty={existing_qty}")
    
    # Перевіряємо наявність на головному складі тільки для НОВИХ товарів
    # Якщо товар вже є в документі - дозволяємо редагувати без перевірки
    if existing_qty <= 0:
        # Отримуємо ID головного складу центру
        main_warehouse_id = _get_warehouse_id(cur, center_id, 'main')
        if not main_warehouse_id:
            raise HTTPException(400, "Для центру не знайдено головний склад")
        
        # Перевіряємо наявність на головному складі тільки для нових товарів
        available_row = cur.execute(
            "SELECT Quantity FROM dbo.StockBalances WHERE ProductID=? AND WarehouseID=?",
            (product_id, main_warehouse_id)
        ).fetchone()
        available = float(available_row[0] or 0) if available_row else 0.0
        
        print(f"DEBUG: main_warehouse_id={main_warehouse_id}, available={available}")
        
        # Перевіряємо наявність на головному складі для нового товару
        if available <= 0:
            raise HTTPException(400, "Товар відсутній на головному складі центру")
        
        # Перевіряємо чи не перевищуємо наявність
        if qty > available:
            raise HTTPException(400, f"Недостатньо залишку. Доступно: {available}")
        
        print(f"DEBUG: Додаємо товар з наявності: {available}, кількість: {qty}")
    else:
        # Якщо товар вже є в документі - дозволяємо редагувати без перевірки наявності
        # (товар вже може бути переміщений з головного складу)
        pass
    # Витягнемо базову ціну і середню собівартість для інформації
    try:
        pr_row = cur.execute("SELECT TOP 1 Price FROM ProductPrices WHERE ProductID=? ORDER BY DateStart DESC", (product_id,)).fetchone()
        price_base = float(pr_row[0] or 0) if pr_row else None
    except Exception:
        price_base = None
    try:
        from app.routes.stock_state import _avg_cost_for_product  # якщо є утиліта; fallback нижче
    except Exception:
        _avg_cost_for_product = None
    avg_cost = None
    try:
        r = cur.execute("SELECT AVG(UnitCostNet) FROM Parties WHERE ProductID=?", (product_id,)).fetchone()
        avg_cost = float(r[0] or 0) if r else None
    except Exception:
        pass
    # barcode прегенеруємо для зручності
    prefix_row = cur.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey='BarcodePrefix'").fetchone()
    prefix = str(prefix_row[0]) if prefix_row and prefix_row[0] else "29"
    
    # Отримуємо оригінальний штрихкод товару
    original_barcode = None
    try:
        barcode_row = cur.execute("SELECT Barcode FROM Products WHERE ID=?", (product_id,)).fetchone()
        if barcode_row and barcode_row[0]:
            original_barcode = str(barcode_row[0])
    except Exception:
        pass
    
    barcode = _get_or_create_discount_barcode(cur, product_id, writeoff_id, original_barcode)
    cur.execute("INSERT INTO dbo.DiscountDocItems (DocID, ProductID, Quantity, Price, PriceBase, AvgCost, DiscountBarcode) OUTPUT INSERTED.ID VALUES (?, ?, ?, ?, ?, ?, ?)", (doc_id, product_id, qty, price, price_base, avg_cost, barcode))
    new_id = int(cur.fetchone()[0]); db.commit()
    return {"ok": True, "ID": new_id, "DiscountBarcode": barcode}


@router.put("/discount-documents/{doc_id}/items/{item_id}")
def update_item(doc_id: int, item_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    qty = payload.get("Quantity"); price = payload.get("Price"); bc = payload.get("DiscountBarcode")
    sets = []; vals: List[Any] = []
    if qty is not None: sets.append("Quantity=?"); vals.append(float(qty))
    if price is not None: sets.append("Price=?"); vals.append(float(price))
    if bc is not None: sets.append("DiscountBarcode=?"); vals.append(str(bc))
    if not sets: return {"ok": True}
    cur.execute(f"UPDATE dbo.DiscountDocItems SET {', '.join(sets)} WHERE ID=? AND DocID=?", (*vals, item_id, doc_id))
    db.commit(); return {"ok": True}


@router.delete("/discount-documents/{doc_id}/items/{item_id}")
def delete_item(doc_id: int, item_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    cur.execute("DELETE FROM dbo.DiscountDocItems WHERE ID=? AND DocID=?", (item_id, doc_id))
    db.commit(); return {"ok": True}


@router.post("/discount-documents/{doc_id}/postings")
def generate_postings(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    rdoc = cur.execute("SELECT CenterID, WarehouseID, Status FROM dbo.DiscountDocs WHERE ID=?", (doc_id,)).fetchone()
    if not rdoc: raise HTTPException(404, "Документ не знайдено")
    if str(rdoc[2]).lower() == 'closed':
        raise HTTPException(400, "Документ вже закритий")
    center_id, writeoff_id = int(rdoc[0]), int(rdoc[1])
    main_id = _get_warehouse_id(cur, center_id, 'main')
    if not main_id: raise HTTPException(400, "Для центру не знайдено головний склад")

    items = cur.execute("SELECT ID, ProductID, Quantity, Price, DiscountBarcode FROM dbo.DiscountDocItems WHERE DocID=?", (doc_id,)).fetchall()
    from app.services import inventory
    # Перенесення залишків і лог уцінок
    for row in items:
        item_id, product_id, qty, price, bc = int(row[0]), int(row[1]), float(row[2] or 0), float(row[3] or 0), (row[4] or None)
        if qty <= 0: continue
        # Оновлюємо Product.DiscountBarcode для швидкого пошуку
        try:
            cur.execute("UPDATE Products SET DiscountBarcode=? WHERE ID=?", (bc, product_id))
        except Exception:
            pass
        inventory.upsert_stock_balance(db, product_id=product_id, warehouse_id=main_id, delta_qty=-abs(qty), comment=f"DISCOUNT DOC #{doc_id}")
        inventory.upsert_stock_balance(db, product_id=product_id, warehouse_id=writeoff_id, delta_qty=abs(qty), comment=f"DISCOUNT DOC #{doc_id}")
        # Лог уцінок (для аналітики)
        try:
            cur.execute(
                """
                IF OBJECT_ID('dbo.ProductDiscounts','U') IS NULL
                BEGIN
                  CREATE TABLE dbo.ProductDiscounts (
                    ID INT IDENTITY(1,1) PRIMARY KEY,
                    DateTime DATETIME NOT NULL DEFAULT GETDATE(),
                    CenterID INT NOT NULL,
                    WarehouseID INT NOT NULL,
                    ProductID INT NOT NULL,
                    Quantity DECIMAL(18,6) NOT NULL,
                    Price DECIMAL(18,4) NOT NULL,
                    DiscountBarcode NVARCHAR(50) NULL,
                    CreatedBy INT NULL,
                    Comment NVARCHAR(250) NULL
                  );
                END
                """
            )
            cur.execute(
                "INSERT INTO dbo.ProductDiscounts (CenterID, WarehouseID, ProductID, Quantity, Price, DiscountBarcode, CreatedBy, Comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (center_id, writeoff_id, product_id, qty, price, bc, 1, f"DISCOUNT DOC #{doc_id}")
            )
        except Exception:
            pass
    db.commit()
    return {"ok": True}


@router.post("/discount-documents/{doc_id}/close-if-empty")
def close_if_empty(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    """
    Закриває документ тільки якщо:
    1. Документ порожній (немає позицій)
    2. Або всі товари вже переміщені з головного складу в "Уцінка"
    """
    cur = db.cursor(); _ensure_tables(cur)
    rdoc = cur.execute("SELECT CenterID, WarehouseID, Status FROM dbo.DiscountDocs WHERE ID=?", (doc_id,)).fetchone()
    if not rdoc: raise HTTPException(404, "Документ не знайдено")
    if str(rdoc[1]).lower() == 'closed':
        return {"ok": True, "closed": True}
    
    center_id, writeoff_id = int(rdoc[0]), int(rdoc[1])
    
    # Якщо немає позицій - закриваємо
    items = cur.execute("SELECT DISTINCT ProductID FROM dbo.DiscountDocItems WHERE DocID=?", (doc_id,)).fetchall()
    products = [int(r[0]) for r in items]
    if not products:
        cur.execute("UPDATE dbo.DiscountDocs SET Status='closed', UpdatedAt=GETDATE() WHERE ID=?", (doc_id,)); 
        db.commit();
        return {"ok": True, "closed": True}
    
    # Перевіряємо чи всі товари переміщені з головного складу
    main_warehouse_id = _get_warehouse_id(cur, center_id, 'main')
    if not main_warehouse_id:
        return {"ok": True, "closed": False, "error": "Не знайдено головний склад"}
    
    # Перевіряємо залишки на головному складі
    placeholders = ",".join(["?"]*len(products))
    q = f"SELECT SUM(Quantity) FROM dbo.StockBalances WHERE WarehouseID=? AND ProductID IN ({placeholders})"
    row = cur.execute(q, (main_warehouse_id, *products)).fetchone()
    main_total = float(row[0] or 0)
    
    # Якщо на головному складі немає залишків - всі товари переміщені, закриваємо
    if abs(main_total) <= 0.000001:
        cur.execute("UPDATE dbo.DiscountDocs SET Status='closed', UpdatedAt=GETDATE() WHERE ID=?", (doc_id,)); 
        db.commit();
        return {"ok": True, "closed": True, "reason": "all_items_moved"}
    
    return {"ok": True, "closed": False, "remaining_on_main": main_total}


@router.post("/discount-documents/cleanup-stock-balances")
def cleanup_stock_balances(db: pyodbc.Connection = Depends(get_db)):
    """Очищення забруднених даних в StockBalances після видалення документів уцінки"""
    cur = db.cursor(); _ensure_tables(cur)
    
    try:
        # 1. Очищаємо записи з нульовою кількістю на всіх складах
        cur.execute("DELETE FROM dbo.StockBalances WHERE Quantity = 0")
        deleted_zero = cur.rowcount
        
        # 2. Очищаємо записи з коментарями "DISCOUNT DOC" (які могли залишитися)
        cur.execute("DELETE FROM dbo.StockBalances WHERE Comment LIKE 'DISCOUNT DOC%'")
        deleted_discount = cur.rowcount
        
        # 3. Очищаємо дублікати (залишаємо тільки останній запис для кожної пари ProductID+WarehouseID)
        cur.execute("""
            DELETE sb1 FROM dbo.StockBalances sb1
            INNER JOIN (
                SELECT ProductID, WarehouseID, MAX(UpdatedAt) as MaxUpdatedAt
                FROM dbo.StockBalances
                GROUP BY ProductID, WarehouseID
                HAVING COUNT(*) > 1
            ) sb2 ON sb1.ProductID = sb2.ProductID 
                   AND sb1.WarehouseID = sb2.WarehouseID 
                   AND sb1.UpdatedAt < sb2.MaxUpdatedAt
        """)
        deleted_duplicates = cur.rowcount
        
        db.commit()
        
        return {
            "ok": True, 
            "deleted_zero_quantity": deleted_zero,
            "deleted_discount_comments": deleted_discount,
            "deleted_duplicates": deleted_duplicates,
            "total_deleted": deleted_zero + deleted_discount + deleted_duplicates
        }
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: Помилка очищення StockBalances: {e}")
        raise HTTPException(500, f"Помилка очищення: {str(e)}")


