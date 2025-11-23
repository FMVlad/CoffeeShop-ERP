"""Return documents routes (повернення постачальнику).

This module provides:
- Get unclosed parties from arrival document
- Create return document with party movements
- List/get return documents
- Handle party RemainingQty and StockBalances updates
"""

from __future__ import annotations
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
import pyodbc

from app.db_connection import get_db


router = APIRouter(prefix="/return-documents", tags=["return-documents"])


# ---------- Helpers ----------
def _fetch_one(db: pyodbc.Connection, query: str, params: List[Any] | tuple = ()) -> Optional[pyodbc.Row]:
    cursor = db.cursor()
    cursor.execute(query, params)
    return cursor.fetchone()


def _fetch_all(db: pyodbc.Connection, query: str, params: List[Any] | tuple = ()) -> List[pyodbc.Row]:
    cursor = db.cursor()
    cursor.execute(query, params)
    return cursor.fetchall()


def _table_has_column(db: pyodbc.Connection, table_name: str, column_name: str) -> bool:
    try:
        row = _fetch_one(
            db,
            "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?",
            (table_name, column_name),
        )
        return bool(row)
    except Exception:
        return False


def _ensure_tables(db: pyodbc.Connection) -> None:
    """Створює таблиці для повернень якщо їх немає."""
    cursor = db.cursor()
    try:
        # ReturnDocuments
        cursor.execute("""
            IF OBJECT_ID('dbo.ReturnDocuments','U') IS NULL
            BEGIN
              CREATE TABLE dbo.ReturnDocuments (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Number NVARCHAR(50) NULL,
                Date DATE NOT NULL DEFAULT GETDATE(),
                ArrivalDocumentID INT NULL, -- Посилання на прибуткову накладну
                SupplierID INT NULL,
                CenterID INT NOT NULL,
                WarehouseID INT NULL,
                CompanyID INT NULL,
                TotalAmount DECIMAL(18,2) NULL DEFAULT 0,
                Status VARCHAR(16) NOT NULL DEFAULT 'draft',
                CurrencyID INT NULL,
                PricesIncludeVAT BIT NOT NULL DEFAULT 0,
                Comment NVARCHAR(500) NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT FK_ReturnDocuments_Arrival FOREIGN KEY (ArrivalDocumentID) REFERENCES ArrivalDocuments(ID),
                CONSTRAINT FK_ReturnDocuments_Supplier FOREIGN KEY (SupplierID) REFERENCES Suppliers(ID),
                CONSTRAINT FK_ReturnDocuments_Center FOREIGN KEY (CenterID) REFERENCES CentersOfAccounting(ID),
                CONSTRAINT FK_ReturnDocuments_Company FOREIGN KEY (CompanyID) REFERENCES Companies(ID)
              );
              CREATE INDEX IX_ReturnDocuments_Date ON dbo.ReturnDocuments(Date);
              CREATE INDEX IX_ReturnDocuments_Arrival ON dbo.ReturnDocuments(ArrivalDocumentID);
            END
        """)
        
        # ReturnDocumentItems
        cursor.execute("""
            IF OBJECT_ID('dbo.ReturnDocumentItems','U') IS NULL
            BEGIN
              CREATE TABLE dbo.ReturnDocumentItems (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                DocID INT NOT NULL,
                ProductID INT NOT NULL,
                PartyID INT NOT NULL, -- Партія з прибуткової накладної
                Quantity DECIMAL(18,6) NOT NULL,
                Price DECIMAL(18,4) NOT NULL, -- Ціна з партії
                TaxRateID INT NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT FK_ReturnDocumentItems_Doc FOREIGN KEY (DocID) REFERENCES ReturnDocuments(ID) ON DELETE CASCADE,
                CONSTRAINT FK_ReturnDocumentItems_Product FOREIGN KEY (ProductID) REFERENCES Products(ID),
                CONSTRAINT FK_ReturnDocumentItems_Party FOREIGN KEY (PartyID) REFERENCES Parties(ID)
              );
              CREATE INDEX IX_ReturnDocumentItems_Doc ON dbo.ReturnDocumentItems(DocID);
              CREATE INDEX IX_ReturnDocumentItems_Party ON dbo.ReturnDocumentItems(PartyID);
            END
        """)
        db.commit()
    except Exception as e:
        print(f"[RETURN] Помилка створення таблиць: {e}")
        try:
            db.rollback()
        except Exception:
            pass


# ---------------------------
# Get unclosed parties from arrival document
# ---------------------------
@router.get("/arrival/{arrival_doc_id}/unclosed-parties")
def get_unclosed_parties_from_arrival(
    arrival_doc_id: int,
    db: pyodbc.Connection = Depends(get_db),
):
    """Отримує незакриті партії з прибуткової накладної для вибору товарів для повернення."""
    
    # Перевіряємо, чи існує прибуткова накладна
    arrival = _fetch_one(
        db,
        "SELECT ID, SupplierID, CenterID, CompanyID, PricesIncludeVAT FROM ArrivalDocuments WHERE ID = ?",
        (arrival_doc_id,),
    )
    if not arrival:
        raise HTTPException(status_code=404, detail="Прибуткова накладна не знайдена")
    
    supplier_id = arrival[1]
    center_id = arrival[2]
    company_id = arrival[3]
    prices_include_vat = bool(arrival[4])
    
    # Отримуємо всі партії з цієї накладної через ArrivalDocumentItems
    has_remaining = _table_has_column(db, "Parties", "RemainingQty")
    has_is_closed = _table_has_column(db, "Parties", "IsClosed")
    has_company = _table_has_column(db, "Parties", "CompanyID")
    
    # Базовий запит для отримання партій
    if has_remaining and has_is_closed:
        # Використовуємо RemainingQty та IsClosed
        query = """
            SELECT DISTINCT
                p.ID AS PartyID,
                p.ProductID,
                pr.FullName AS ProductName,
                p.Quantity AS PartyQuantity,
                p.RemainingQty,
                p.PurchasePrice,
                p.NetPurchasePrice,
                p.VatRate,
                p.DateReceived,
                i.Quantity AS ArrivalQuantity,
                i.Price AS ArrivalPrice,
                i.ID AS ArrivalItemID
            FROM Parties p
            JOIN ArrivalDocumentItems i ON i.PartyID = p.ID
            JOIN Products pr ON pr.ID = p.ProductID
            WHERE i.DocID = ?
              AND p.RemainingQty > 0
              AND (p.IsClosed = 0 OR p.IsClosed IS NULL)
        """
        params = [arrival_doc_id]
        if has_company and company_id:
            query += " AND p.CompanyID = ?"
            params.append(company_id)
        query += " ORDER BY p.DateReceived, p.ID"
    else:
        # Обчислюємо залишок через рухи
        query = """
            SELECT 
                p.ID AS PartyID,
                p.ProductID,
                pr.FullName AS ProductName,
                p.Quantity AS PartyQuantity,
                p.Quantity - ISNULL((
                    SELECT SUM(pm.Quantity) 
                    FROM PartyMovements pm 
                    WHERE pm.PartyID = p.ID 
                      AND pm.MovementType IN ('sale', 'out', 'return', 'issue')
                ), 0) AS RemainingQty,
                p.PurchasePrice,
                NULL AS NetPurchasePrice,
                NULL AS VatRate,
                p.DateReceived,
                i.Quantity AS ArrivalQuantity,
                i.Price AS ArrivalPrice,
                i.ID AS ArrivalItemID
            FROM Parties p
            JOIN ArrivalDocumentItems i ON i.PartyID = p.ID
            JOIN Products pr ON pr.ID = p.ProductID
            WHERE i.DocID = ?
        """
        params = [arrival_doc_id]
        if has_company and company_id:
            query += " AND p.CompanyID = ?"
            params.append(company_id)
        query += """
            ORDER BY p.DateReceived, p.ID
        """
    
    rows = _fetch_all(db, query, tuple(params))
    
    result = []
    for r in rows:
        remaining = float(r[4] or 0)
        # Фільтруємо тільки партії з залишком > 0
        if remaining <= 0.000001:
            continue
        
        result.append({
            "PartyID": int(r[0]),
            "ProductID": int(r[1]),
            "ProductName": r[2],
            "PartyQuantity": float(r[3] or 0),
            "RemainingQty": remaining,
            "PurchasePrice": float(r[5] or 0),
            "NetPurchasePrice": float(r[6] or 0) if r[6] is not None else None,
            "VatRate": float(r[7] or 0) if r[7] is not None else None,
            "DateReceived": r[8],
            "ArrivalQuantity": float(r[9] or 0),
            "ArrivalPrice": float(r[10] or 0),
            "ArrivalItemID": int(r[11]),
        })
    
    return {
        "ArrivalDocumentID": arrival_doc_id,
        "SupplierID": supplier_id,
        "CenterID": center_id,
        "CompanyID": company_id,
        "PricesIncludeVAT": prices_include_vat,
        "Parties": result,
    }


# ---------------------------
# List return documents
# ---------------------------
@router.get("")
def list_return_documents(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    center_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: pyodbc.Connection = Depends(get_db),
):
    """Список документів повернення."""
    _ensure_tables(db)
    
    where: list[str] = []
    params: list[Any] = []
    if date_from:
        where.append("r.[Date] >= ?")
        params.append(date_from)
    if date_to:
        where.append("r.[Date] <= ?")
        params.append(date_to)
    if supplier_id:
        where.append("r.SupplierID = ?")
        params.append(supplier_id)
    if center_id:
        where.append("r.CenterID = ?")
        params.append(center_id)
    if company_id:
        where.append("r.CompanyID = ?")
        params.append(company_id)
    if status:
        where.append("r.Status = ?")
        params.append(status)
    
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    query = (
        "SELECT r.ID, r.Number, r.[Date], r.SupplierID, s.Name AS SupplierName, "
        "r.CenterID, co.Name AS CenterName, r.TotalAmount, r.Status, r.CurrencyID, cur.CurrencyCode, "
        "r.CompanyID, comp.Name AS CompanyName, r.ArrivalDocumentID, a.Number AS ArrivalNumber "
        "FROM ReturnDocuments r "
        "LEFT JOIN Suppliers s ON s.ID = r.SupplierID "
        "LEFT JOIN CentersOfAccounting co ON co.ID = r.CenterID "
        "LEFT JOIN Currencies cur ON cur.ID = r.CurrencyID "
        "LEFT JOIN Companies comp ON comp.ID = r.CompanyID "
        "LEFT JOIN ArrivalDocuments a ON a.ID = r.ArrivalDocumentID "
        f"{where_sql} "
        "ORDER BY r.[Date] DESC, r.ID DESC"
    )
    rows = _fetch_all(db, query, params)
    result = []
    for r in rows:
        result.append({
            "ID": int(r[0]),
            "Number": r[1],
            "Date": r[2],
            "SupplierID": r[3],
            "SupplierName": r[4],
            "CenterID": r[5],
            "CenterName": r[6],
            "TotalAmount": float(r[7]) if r[7] is not None else 0.0,
            "Status": r[8],
            "CurrencyID": r[9],
            "CurrencyCode": r[10],
            "CompanyID": int(r[11]) if r[11] is not None else None,
            "CompanyName": r[12],
            "ArrivalDocumentID": int(r[13]) if r[13] is not None else None,
            "ArrivalNumber": r[14],
        })
    return result


# ---------------------------
# Get one return document
# ---------------------------
@router.get("/{doc_id}")
def get_return_document(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    """Отримує деталі документа повернення."""
    _ensure_tables(db)
    
    head = _fetch_one(
        db,
        (
            "SELECT ID, Number, Date, ArrivalDocumentID, SupplierID, CenterID, WarehouseID, "
            "CompanyID, TotalAmount, Status, CurrencyID, PricesIncludeVAT, Comment "
            "FROM ReturnDocuments WHERE ID = ?"
        ),
        (doc_id,),
    )
    if not head:
        raise HTTPException(status_code=404, detail="Документ повернення не знайдено")
    
    items = _fetch_all(
        db,
        (
            "SELECT i.ID, i.ProductID, p.FullName, i.PartyID, i.Quantity, i.Price, i.TaxRateID "
            "FROM ReturnDocumentItems i "
            "JOIN Products p ON p.ID = i.ProductID "
            "WHERE i.DocID = ? ORDER BY i.ID"
        ),
        (doc_id,),
    )
    
    result = {
        "ID": int(head[0]),
        "Number": head[1],
        "Date": head[2],
        "ArrivalDocumentID": int(head[3]) if head[3] is not None else None,
        "SupplierID": head[4],
        "CenterID": head[5],
        "WarehouseID": head[6],
        "CompanyID": int(head[7]) if head[7] is not None else None,
        "TotalAmount": float(head[8]) if head[8] is not None else 0.0,
        "Status": head[9],
        "CurrencyID": head[10],
        "PricesIncludeVAT": bool(head[11]),
        "Comment": head[12],
        "Items": [
            {
                "ID": int(r[0]),
                "ProductID": int(r[1]),
                "ProductName": r[2],
                "PartyID": int(r[3]),
                "Quantity": r[4],
                "Price": r[5],
                "TaxRateID": r[6],
            }
            for r in items
        ],
    }
    return result


# ---------------------------
# Create return document
# ---------------------------
@router.post("")
def create_return_document(
    payload: Dict[str, Any],
    db: pyodbc.Connection = Depends(get_db),
):
    """Створює документ повернення постачальнику."""
    _ensure_tables(db)
    
    header: Dict[str, Any] = payload.get("Header") or payload
    items: List[Dict[str, Any]] = payload.get("Items") or []
    
    if not items:
        raise HTTPException(status_code=400, detail="Не вказано товари для повернення")
    
    # Отримуємо дані з шапки
    supplier_id = header.get("SupplierID")
    center_id = header.get("CenterID")
    company_id = header.get("CompanyID")
    arrival_posted = header.get("ArrivalPosted", False)
    with_vat = header.get("WithVAT", False)
    
    if not supplier_id:
        raise HTTPException(status_code=400, detail="Не вказано постачальника")
    if not center_id:
        raise HTTPException(status_code=400, detail="Не вказано центр обліку")
    
    # Визначаємо ArrivalDocumentID з першого товару (якщо всі товари з однієї накладної)
    # Або залишаємо NULL, якщо товари з різних накладних
    arrival_doc_id = None
    if items and items[0].get("ArrivalDocID"):
        # Перевіряємо, чи всі товари з однієї накладної
        first_arrival = items[0].get("ArrivalDocID")
        all_same = all(it.get("ArrivalDocID") == first_arrival for it in items)
        if all_same:
            arrival_doc_id = first_arrival
    
    # Отримуємо валюту та інші дані (якщо є ArrivalDocumentID, то з накладної, інакше за замовчуванням)
    currency_id = None
    prices_include_vat = with_vat
    
    if arrival_doc_id:
        arrival = _fetch_one(
            db,
            "SELECT CurrencyID, PricesIncludeVAT FROM ArrivalDocuments WHERE ID = ?",
            (arrival_doc_id,),
        )
        if arrival:
            currency_id = arrival[0]
            prices_include_vat = bool(arrival[1]) if arrival[1] is not None else with_vat
    
    if not currency_id:
        # Отримуємо валюту за замовчуванням
        currency_row = _fetch_one(db, "SELECT TOP 1 ID FROM Currencies WHERE IsActive = 1 ORDER BY ID")
        currency_id = int(currency_row[0]) if currency_row else None
    
    date_val = header.get("Date") or datetime.now().date()
    
    cursor = db.cursor()
    try:
        # Генеруємо номер
        today = datetime.now()
        prefix = f"RET-{today.year}{today.month:02d}-"
        row = _fetch_one(db, "SELECT MAX(Number) FROM ReturnDocuments WHERE Number LIKE ?", (prefix + '%',))
        if not row or not row[0]:
            number = f"{prefix}0001"
        else:
            last = str(row[0]).split('-')[-1]
            try:
                num = int(last)
            except Exception:
                num = 0
            number = f"{prefix}{num+1:04d}"
        
        # Створюємо заголовок
        cursor.execute(
            (
                "INSERT INTO ReturnDocuments (Number, Date, ArrivalDocumentID, SupplierID, CenterID, "
                "CompanyID, CurrencyID, PricesIncludeVAT, Status, Comment) "
                "OUTPUT INSERTED.ID VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)"
            ),
            (number, date_val, arrival_doc_id, supplier_id, center_id, company_id, currency_id, 
             1 if prices_include_vat else 0, header.get("Comment") or ''),
        )
        doc_id = int(cursor.fetchone()[0])
        
        total_amount = Decimal("0")
        user_id = header.get("UserID") or 1
        
        # Обробляємо позиції
        for idx, it in enumerate(items, start=1):
            party_id = it.get("PartyID")
            if not party_id:
                raise HTTPException(status_code=400, detail=f"Рядок {idx}: не вказано партію")
            
            qty = Decimal(str(it.get("Quantity", 0)))
            if qty <= 0:
                raise HTTPException(status_code=400, detail=f"Рядок {idx}: кількість має бути > 0")
            
            # Перевіряємо залишок партії
            has_remaining = _table_has_column(db, "Parties", "RemainingQty")
            if has_remaining:
                party_row = _fetch_one(
                    db,
                    "SELECT RemainingQty, ProductID, PurchasePrice, WarehouseID, CompanyID FROM Parties WHERE ID = ?",
                    (party_id,),
                )
            else:
                # Обчислюємо залишок
                party_row = _fetch_one(
                    db,
                    (
                        "SELECT p.Quantity - ISNULL(SUM(pm.Quantity),0), p.ProductID, p.PurchasePrice, "
                        "p.WarehouseID, p.CompanyID "
                        "FROM Parties p "
                        "LEFT JOIN PartyMovements pm ON pm.PartyID = p.ID "
                        "  AND pm.MovementType IN ('sale', 'out', 'return', 'issue') "
                        "WHERE p.ID = ? "
                        "GROUP BY p.Quantity, p.ProductID, p.PurchasePrice, p.WarehouseID, p.CompanyID"
                    ),
                    (party_id,),
                )
            
            if not party_row:
                raise HTTPException(status_code=404, detail=f"Рядок {idx}: партія не знайдена")
            
            remaining = float(party_row[0] or 0)
            if remaining < float(qty):
                raise HTTPException(
                    status_code=400,
                    detail=f"Рядок {idx}: недостатньо товару в партії (залишок: {remaining}, запитується: {qty})"
                )
            
            product_id = int(party_row[1])
            price = float(party_row[2] or 0)
            warehouse_id = party_row[3]
            party_company_id = party_row[4]
            
            # Перевіряємо CompanyID
            has_company_col = _table_has_column(db, "Parties", "CompanyID")
            if has_company_col and company_id and party_company_id and int(party_company_id) != int(company_id):
                raise HTTPException(
                    status_code=400,
                    detail=f"Рядок {idx}: партія належить іншому підприємству"
                )
            
            # Отримуємо ArrivalDocumentID з партії (через ArrivalDocumentItems)
            party_arrival = _fetch_one(
                db,
                "SELECT TOP 1 DocID FROM ArrivalDocumentItems WHERE PartyID = ?",
                (party_id,),
            )
            party_arrival_doc_id = int(party_arrival[0]) if party_arrival and party_arrival[0] else None
            
            # Якщо ArrivalDocumentID ще не встановлено, встановлюємо з першої партії
            if arrival_doc_id is None and party_arrival_doc_id:
                arrival_doc_id = party_arrival_doc_id
                # Оновлюємо заголовок
                cursor.execute(
                    "UPDATE ReturnDocuments SET ArrivalDocumentID = ? WHERE ID = ?",
                    (arrival_doc_id, doc_id),
                )
            
            # Зберігаємо позицію
            cursor.execute(
                (
                    "INSERT INTO ReturnDocumentItems (DocID, ProductID, PartyID, Quantity, Price, TaxRateID) "
                    "OUTPUT INSERTED.ID VALUES (?, ?, ?, ?, ?, ?)"
                ),
                (doc_id, product_id, party_id, float(qty), price, it.get("TaxRateID")),
            )
            item_id = int(cursor.fetchone()[0])
            
            total_amount += (qty * Decimal(str(price)))
            
            # Створюємо рух партії (тип 'return')
            has_pm_company = _table_has_column(db, "PartyMovements", "CompanyID")
            if has_pm_company:
                cursor.execute(
                    (
                        "INSERT INTO PartyMovements (PartyID, MovementType, Quantity, Date, DocumentID, "
                        "DocumentType, WarehouseID, CompanyID) "
                        "VALUES (?, 'return', ?, ?, ?, 'Return', ?, ?)"
                    ),
                    (party_id, float(qty), date_val, doc_id, warehouse_id, company_id),
                )
            else:
                cursor.execute(
                    (
                        "INSERT INTO PartyMovements (PartyID, MovementType, Quantity, Date, DocumentID, "
                        "DocumentType, WarehouseID) "
                        "VALUES (?, 'return', ?, ?, ?, 'Return', ?)"
                    ),
                    (party_id, float(qty), date_val, doc_id, warehouse_id),
                )
            
            # Оновлюємо RemainingQty партії
            if has_remaining:
                cursor.execute(
                    "UPDATE Parties SET RemainingQty = RemainingQty - ? WHERE ID = ?",
                    (float(qty), party_id),
                )
                # Закриваємо партію якщо залишок <= 0
                if _table_has_column(db, "Parties", "IsClosed"):
                    cursor.execute(
                        (
                            "UPDATE Parties SET IsClosed = CASE WHEN RemainingQty <= 0.000001 THEN 1 ELSE IsClosed END "
                            "WHERE ID = ?"
                        ),
                        (party_id,),
                    )
            
            # Оновлюємо StockBalances (зменшуємо кількість)
            has_sb_company = _table_has_column(db, "StockBalances", "CompanyID")
            if has_sb_company and company_id:
                cursor.execute(
                    "SELECT ID FROM StockBalances WHERE ProductID=? AND WarehouseID=? AND CompanyID=?",
                    (product_id, warehouse_id, company_id),
                )
            else:
                cursor.execute(
                    "SELECT ID FROM StockBalances WHERE ProductID=? AND WarehouseID=?",
                    (product_id, warehouse_id),
                )
            sb = cursor.fetchone()
            if sb:
                cursor.execute(
                    "UPDATE StockBalances SET Quantity = Quantity - ?, UpdatedAt = GETDATE() WHERE ID = ?",
                    (float(qty), sb[0]),
                )
            else:
                # Якщо залишку немає, це помилка (не повинно бути)
                print(f"[WARNING] StockBalance not found for ProductID={product_id}, WarehouseID={warehouse_id}")
        
        # Оновлюємо TotalAmount
        cursor.execute(
            "UPDATE ReturnDocuments SET TotalAmount = ? WHERE ID = ?",
            (float(total_amount), doc_id),
        )
        
        db.commit()
        return {"ok": True, "ID": doc_id, "Number": number}
    
    except pyodbc.Error as db_err:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Помилка БД: {str(db_err)}")
    except HTTPException:
        try:
            db.rollback()
        except Exception:
            pass
        raise
    except Exception as ex:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(ex))


def _rollback_return_document(db: pyodbc.Connection, doc_id: int) -> None:
    """Відкатує зміни, зроблені документом повернення:
    - Повертає RemainingQty партій
    - Видаляє PartyMovements
    - Оновлює StockBalances (додає кількість назад)
    """
    cursor = db.cursor()
    print(f"[ROLLBACK RETURN] Відкатуємо зміни для документа {doc_id}")
    
    # Отримуємо всі позиції документа
    items = _fetch_all(
        db,
        (
            "SELECT i.PartyID, i.Quantity, p.ProductID, p.WarehouseID, p.CompanyID "
            "FROM ReturnDocumentItems i "
            "JOIN Parties p ON p.ID = i.PartyID "
            "WHERE i.DocID = ?"
        ),
        (doc_id,),
    )
    
    has_sb_company = _table_has_column(db, "StockBalances", "CompanyID")
    has_remaining = _table_has_column(db, "Parties", "RemainingQty")
    has_pm_company = _table_has_column(db, "PartyMovements", "CompanyID")
    
    # Відкатуємо кожну позицію
    for item in items:
        party_id = int(item[0])
        qty = float(item[1])
        product_id = int(item[2])
        warehouse_id = item[3]
        company_id = item[4]
        
        # Повертаємо RemainingQty партії
        if has_remaining:
            cursor.execute(
                "UPDATE Parties SET RemainingQty = RemainingQty + ? WHERE ID = ?",
                (qty, party_id),
            )
            # Відкриваємо партію якщо залишок > 0
            if _table_has_column(db, "Parties", "IsClosed"):
                cursor.execute(
                    "UPDATE Parties SET IsClosed = 0 WHERE ID = ? AND RemainingQty > 0.000001",
                    (party_id,),
                )
        
        # Оновлюємо StockBalances (додаємо кількість назад)
        if warehouse_id:
            if has_sb_company and company_id:
                cursor.execute(
                    "SELECT ID FROM StockBalances WHERE ProductID=? AND WarehouseID=? AND CompanyID=?",
                    (product_id, warehouse_id, company_id),
                )
            else:
                cursor.execute(
                    "SELECT ID FROM StockBalances WHERE ProductID=? AND WarehouseID=?",
                    (product_id, warehouse_id),
                )
            sb = cursor.fetchone()
            if sb:
                cursor.execute(
                    "UPDATE StockBalances SET Quantity = Quantity + ?, UpdatedAt = GETDATE() WHERE ID = ?",
                    (qty, sb[0]),
                )
            else:
                print(f"[ROLLBACK RETURN] WARNING: StockBalance not found for ProductID={product_id}, WarehouseID={warehouse_id}")
    
    # Видаляємо PartyMovements
    cursor.execute(
        "DELETE FROM PartyMovements WHERE DocumentType = 'Return' AND DocumentID = ?",
        (doc_id,),
    )
    deleted_movements = cursor.rowcount
    print(f"[ROLLBACK RETURN] Видалено {deleted_movements} рухів партій")


# ---------------------------
# Update return document
# ---------------------------
@router.put("/{doc_id}")
def update_return_document(
    doc_id: int,
    payload: Dict[str, Any],
    db: pyodbc.Connection = Depends(get_db),
):
    """Оновлює документ повернення."""
    _ensure_tables(db)
    
    # Перевіряємо, чи існує документ
    doc = _fetch_one(db, "SELECT ID, Status FROM ReturnDocuments WHERE ID = ?", (doc_id,))
    if not doc:
        raise HTTPException(status_code=404, detail="Документ повернення не знайдено")
    
    # Не дозволяємо редагувати проведені документи
    if doc[1] and doc[1].lower() in ('posted', 'completed'):
        raise HTTPException(status_code=400, detail="Не можна редагувати проведений документ")
    
    header: Dict[str, Any] = payload.get("Header") or payload
    items: List[Dict[str, Any]] = payload.get("Items") or []
    
    if not items:
        raise HTTPException(status_code=400, detail="Не вказано товари для повернення")
    
    supplier_id = header.get("SupplierID")
    center_id = header.get("CenterID")
    company_id = header.get("CompanyID")
    
    if not supplier_id:
        raise HTTPException(status_code=400, detail="Не вказано постачальника")
    if not center_id:
        raise HTTPException(status_code=400, detail="Не вказано центр обліку")
    
    cursor = db.cursor()
    try:
        # Відкатуємо попередні зміни
        _rollback_return_document(db, doc_id)
        
        # Оновлюємо заголовок
        date_val = header.get("Date") or datetime.now().date()
        cursor.execute(
            (
                "UPDATE ReturnDocuments SET Date=?, SupplierID=?, CenterID=?, CompanyID=?, "
                "Comment=?, UpdatedAt=GETDATE() WHERE ID=?"
            ),
            (date_val, supplier_id, center_id, company_id, header.get("Comment") or '', doc_id),
        )
        
        # Видаляємо старі позиції
        cursor.execute("DELETE FROM ReturnDocumentItems WHERE DocID = ?", (doc_id,))
        
        # Додаємо нові позиції (аналогічно до create)
        total_amount = Decimal("0")
        for idx, it in enumerate(items, start=1):
            party_id = it.get("PartyID")
            if not party_id:
                raise HTTPException(status_code=400, detail=f"Рядок {idx}: не вказано партію")
            
            qty = Decimal(str(it.get("Quantity", 0)))
            if qty <= 0:
                raise HTTPException(status_code=400, detail=f"Рядок {idx}: кількість має бути > 0")
            
            # Перевіряємо залишок партії
            has_remaining = _table_has_column(db, "Parties", "RemainingQty")
            if has_remaining:
                party_row = _fetch_one(
                    db,
                    "SELECT RemainingQty, ProductID, PurchasePrice, WarehouseID, CompanyID FROM Parties WHERE ID = ?",
                    (party_id,),
                )
            else:
                party_row = _fetch_one(
                    db,
                    (
                        "SELECT p.Quantity - ISNULL(SUM(pm.Quantity),0), p.ProductID, p.PurchasePrice, "
                        "p.WarehouseID, p.CompanyID "
                        "FROM Parties p "
                        "LEFT JOIN PartyMovements pm ON pm.PartyID = p.ID "
                        "  AND pm.MovementType IN ('sale', 'out', 'return', 'issue') "
                        "WHERE p.ID = ? "
                        "GROUP BY p.Quantity, p.ProductID, p.PurchasePrice, p.WarehouseID, p.CompanyID"
                    ),
                    (party_id,),
                )
            
            if not party_row:
                raise HTTPException(status_code=400, detail=f"Рядок {idx}: партія не знайдена")
            
            remaining = Decimal(str(party_row[0] or 0))
            if qty > remaining:
                raise HTTPException(
                    status_code=400,
                    detail=f"Рядок {idx}: кількість ({qty}) перевищує залишок партії ({remaining})"
                )
            
            product_id = int(party_row[1])
            price = Decimal(str(party_row[2] or 0))
            warehouse_id = party_row[3]
            party_company_id = party_row[4]
            
            # Додаємо позицію
            cursor.execute(
                (
                    "INSERT INTO ReturnDocumentItems (DocID, ProductID, PartyID, Quantity, Price, TaxRateID) "
                    "OUTPUT INSERTED.ID VALUES (?, ?, ?, ?, ?, ?)"
                ),
                (doc_id, product_id, party_id, float(qty), float(price), it.get("TaxRateID")),
            )
            item_id = int(cursor.fetchone()[0])
            
            total_amount += (qty * price)
            
            # Створюємо рух партії
            has_pm_company = _table_has_column(db, "PartyMovements", "CompanyID")
            date_val = header.get("Date") or datetime.now().date()
            if has_pm_company:
                cursor.execute(
                    (
                        "INSERT INTO PartyMovements (PartyID, MovementType, Quantity, Date, DocumentID, "
                        "DocumentType, WarehouseID, CompanyID) "
                        "VALUES (?, 'return', ?, ?, ?, 'Return', ?, ?)"
                    ),
                    (party_id, float(qty), date_val, doc_id, warehouse_id, party_company_id),
                )
            else:
                cursor.execute(
                    (
                        "INSERT INTO PartyMovements (PartyID, MovementType, Quantity, Date, DocumentID, "
                        "DocumentType, WarehouseID) "
                        "VALUES (?, 'return', ?, ?, ?, 'Return', ?)"
                    ),
                    (party_id, float(qty), date_val, doc_id, warehouse_id),
                )
            
            # Оновлюємо RemainingQty партії
            if has_remaining:
                cursor.execute(
                    "UPDATE Parties SET RemainingQty = RemainingQty - ? WHERE ID = ?",
                    (float(qty), party_id),
                )
                if _table_has_column(db, "Parties", "IsClosed"):
                    cursor.execute(
                        (
                            "UPDATE Parties SET IsClosed = CASE WHEN RemainingQty <= 0.000001 THEN 1 ELSE IsClosed END "
                            "WHERE ID = ?"
                        ),
                        (party_id,),
                    )
            
            # Оновлюємо StockBalances
            if warehouse_id:
                if has_sb_company and party_company_id:
                    cursor.execute(
                        "SELECT ID FROM StockBalances WHERE ProductID=? AND WarehouseID=? AND CompanyID=?",
                        (product_id, warehouse_id, party_company_id),
                    )
                else:
                    cursor.execute(
                        "SELECT ID FROM StockBalances WHERE ProductID=? AND WarehouseID=?",
                        (product_id, warehouse_id),
                    )
                sb = cursor.fetchone()
                if sb:
                    cursor.execute(
                        "UPDATE StockBalances SET Quantity = Quantity - ?, UpdatedAt = GETDATE() WHERE ID = ?",
                        (float(qty), sb[0]),
                    )
        
        # Оновлюємо TotalAmount
        cursor.execute(
            "UPDATE ReturnDocuments SET TotalAmount = ? WHERE ID = ?",
            (float(total_amount), doc_id),
        )
        
        db.commit()
        return {"ok": True, "ID": doc_id}
    
    except pyodbc.Error as db_err:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Помилка БД: {str(db_err)}")
    except HTTPException:
        try:
            db.rollback()
        except Exception:
            pass
        raise
    except Exception as ex:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(ex))


# ---------------------------
# Delete return document
# ---------------------------
@router.delete("/{doc_id}")
def delete_return_document(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    """Видаляє документ повернення."""
    _ensure_tables(db)
    
    # Перевіряємо, чи існує документ
    doc = _fetch_one(db, "SELECT ID, Status FROM ReturnDocuments WHERE ID = ?", (doc_id,))
    if not doc:
        raise HTTPException(status_code=404, detail="Документ повернення не знайдено")
    
    # Не дозволяємо видаляти проведені документи
    if doc[1] and doc[1].lower() in ('posted', 'completed'):
        raise HTTPException(status_code=400, detail="Не можна видаляти проведений документ")
    
    cursor = db.cursor()
    try:
        # Відкатуємо зміни
        _rollback_return_document(db, doc_id)
        
        # Видаляємо позиції (CASCADE має видалити автоматично, але для впевненості)
        cursor.execute("DELETE FROM ReturnDocumentItems WHERE DocID = ?", (doc_id,))
        
        # Видаляємо заголовок
        cursor.execute("DELETE FROM ReturnDocuments WHERE ID = ?", (doc_id,))
        
        db.commit()
        return {"ok": True}
    
    except Exception as ex:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(ex))

