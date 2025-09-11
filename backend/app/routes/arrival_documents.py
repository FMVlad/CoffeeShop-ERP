"""Arrival documents routes (self-contained logic as requested).

This module provides:
- Barcode lookup returning product with FullName
- Simple list/get of documents
- Inline create/update logic with VAT handling:
  If header.PricesIncludeVAT is False -> gross-up prices before saving
  Otherwise save as-is. Parties.PurchasePrice is always saved as gross.
"""

from __future__ import annotations
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
import pyodbc

from app.db_connection import get_db


router = APIRouter(prefix="/arrival-documents", tags=["arrival-documents"])


# ---------- Helpers ----------
def _fetch_one(db: pyodbc.Connection, query: str, params: List[Any] | tuple = ()) -> Optional[pyodbc.Row]:
    cursor = db.cursor()
    print(f"[DEBUG] SQL: {query}")
    print(f"[DEBUG] Params: {params}")
    cursor.execute(query, params)
    result = cursor.fetchone()
    print(f"[DEBUG] Result: {result}")
    return result


def _fetch_all(db: pyodbc.Connection, query: str, params: List[Any] | tuple = ()) -> List[pyodbc.Row]:
    cursor = db.cursor()
    cursor.execute(query, params)
    return cursor.fetchall()


def _get_tax_rate(db: pyodbc.Connection, tax_rate_id: Optional[int]) -> Decimal:
    if not tax_rate_id:
        return Decimal("20")  # default 20%
    row = _fetch_one(db, "SELECT Rate FROM Taxes WHERE ID = ?", (tax_rate_id,))
    if row is None or row[0] is None:
        return Decimal("20")
    return Decimal(str(row[0]))


def _resolve_warehouse_id(db: pyodbc.Connection, center_id: int, requested_warehouse_id: Optional[int]) -> int:
    print(f"[DEBUG] _resolve_warehouse_id: center_id={center_id}, requested_warehouse_id={requested_warehouse_id}")
    
    # Validate requested warehouse first
    if requested_warehouse_id is not None:
        print(f"[DEBUG] Checking requested warehouse {requested_warehouse_id} for center {center_id}")
        row = _fetch_one(
            db,
            "SELECT ID FROM Warehouses WHERE ID = ? AND CenterID = ? AND IsActive = 1",
            (requested_warehouse_id, center_id),
        )
        if row:
            print(f"[DEBUG] Found requested warehouse: {row[0]}")
            return int(row[0])
        else:
            print(f"[DEBUG] Requested warehouse {requested_warehouse_id} not found or inactive for center {center_id}")

    # Fallback to default main warehouse of center
    print(f"[DEBUG] Looking for default warehouse for center {center_id}")
    row = _fetch_one(
        db,
        (
            "SELECT TOP 1 ID FROM Warehouses "
            "WHERE CenterID = ? AND IsActive = 1 "
            "ORDER BY CASE WHEN ParentID IS NULL THEN 0 ELSE 1 END, "
            "         CASE WHEN Type = 'main' THEN 0 ELSE 1 END, ID"
        ),
        (center_id,),
    )
    if not row:
        print(f"[ERROR] No warehouses found for center {center_id}")
        raise HTTPException(
            status_code=400,
            detail="Некоректний склад: перевірте, що у вибраному центрі є активний головний склад",
        )
    print(f"[DEBUG] Found default warehouse: {row[0]}")
    return int(row[0])


def _gross_price(net_price: Decimal, vat_rate_percent: Decimal) -> Decimal:
    multiplier = Decimal("1") + (vat_rate_percent / Decimal("100"))
    return (net_price * multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# Parse Decimal safely from potentially empty strings/nulls
def _to_decimal(value: Any, default: str = "0") -> Decimal:
    try:
        if value is None:
            return Decimal(default)
        s = str(value).strip()
        if s == "":
            return Decimal(default)
        return Decimal(s)
    except Exception:
        return Decimal(default)

# Small helper
def _get_db_name(db: pyodbc.Connection) -> str:
    try:
        row = _fetch_one(db, "SELECT DB_NAME()")
        return row[0] if row else "?"
    except Exception:
        return "?"


def _rollback_balances_for_document(db: pyodbc.Connection, doc_id: int) -> None:
    """Reverse balances and movements previously created for this document.

    - Subtract summed quantities from StockBalances per (ProductID, WarehouseID)
    - Delete PartyMovements for this document
    """
    cursor = db.cursor()
    print(f"[ROLLBACK] Відкатуємо залишки для документу {doc_id}")
    
    # Sum quantities by product and warehouse via Parties join
    has_sb_company = _table_has_column(db, "StockBalances", "CompanyID")
    # Aggregate qty; include CompanyID when available
    if has_sb_company and _table_has_column(db, "Parties", "CompanyID"):
        cursor.execute(
            (
                "SELECT p.ProductID, pm.WarehouseID, p.CompanyID, SUM(pm.Quantity) AS Qty "
                "FROM PartyMovements pm JOIN Parties p ON p.ID = pm.PartyID "
                "WHERE pm.DocumentType = 'Arrival' AND pm.DocumentID = ? "
                "GROUP BY p.ProductID, pm.WarehouseID, p.CompanyID"
            ),
            (doc_id,),
        )
        rows = cursor.fetchall() or []
        print(f"[ROLLBACK] Знайдено {len(rows)} комбінацій ProductID+WarehouseID+CompanyID для відкату")
        for prod_id, wh_id, comp_id, qty in rows:
            try:
                cursor.execute(
                    "UPDATE StockBalances SET Quantity = Quantity - ?, UpdatedAt = GETDATE() WHERE ProductID = ? AND WarehouseID = ? AND CompanyID = ?",
                    (float(qty or 0), int(prod_id), int(wh_id), int(comp_id) if comp_id is not None else None),
                )
                print(f"[ROLLBACK] Відкачено {qty} для товару {prod_id} на складі {wh_id} компанії {comp_id}")
            except Exception as e:
                print(f"[ROLLBACK] Помилка відкату залишку для {prod_id}/{wh_id}/{comp_id}: {e}")
    else:
        cursor.execute(
            (
                "SELECT p.ProductID, pm.WarehouseID, SUM(pm.Quantity) AS Qty "
                "FROM PartyMovements pm JOIN Parties p ON p.ID = pm.PartyID "
                "WHERE pm.DocumentType = 'Arrival' AND pm.DocumentID = ? "
                "GROUP BY p.ProductID, pm.WarehouseID"
            ),
            (doc_id,),
        )
        rows = cursor.fetchall() or []
        print(f"[ROLLBACK] Знайдено {len(rows)} комбінацій ProductID+WarehouseID для відкату")
        for prod_id, wh_id, qty in rows:
            try:
                cursor.execute(
                    "UPDATE StockBalances SET Quantity = Quantity - ?, UpdatedAt = GETDATE() WHERE ProductID = ? AND WarehouseID = ?",
                    (float(qty or 0), int(prod_id), int(wh_id)),
                )
                print(f"[ROLLBACK] Відкачено {qty} для товару {prod_id} на складі {wh_id}")
            except Exception as e:
                print(f"[ROLLBACK] Помилка відкату залишку для {prod_id}/{wh_id}: {e}")
    
    # Delete cost calculations linked to parties of this document
    try:
        cursor.execute(
            (
                "DELETE FROM CostCalculations WHERE PartyID IN ("
                "  SELECT pm.PartyID FROM PartyMovements pm "
                "  WHERE pm.DocumentType='Arrival' AND pm.DocumentID = ?"
                ")"
            ),
            (doc_id,),
        )
        deleted_costs = cursor.rowcount
        print(f"[ROLLBACK] Видалено {deleted_costs} розрахунків собівартості")
    except Exception as e:
        print(f"[ROLLBACK] Помилка видалення розрахунків собівартості: {e}")
    
    # Delete movements for this document
    cursor.execute("DELETE FROM PartyMovements WHERE DocumentType='Arrival' AND DocumentID = ?", (doc_id,))
    deleted_movements = cursor.rowcount
    print(f"[ROLLBACK] Видалено {deleted_movements} рухів партій")

def _get_default_currency_id(db: pyodbc.Connection) -> Optional[int]:
    # Try SystemParameters.MainCurrencyID
    row = _fetch_one(db, "SELECT ParamValue FROM SystemParameters WHERE ParamKey = 'MainCurrencyID'")
    try:
        cid = int(row[0]) if row and row[0] is not None else None
    except Exception:
        cid = None
    if cid:
        check = _fetch_one(db, "SELECT ID FROM Currencies WHERE ID = ? AND (IsActive = 1 OR IsActive IS NULL)", (cid,))
        if check:
            return cid
    # Fallback to first active
    row = _fetch_one(db, "SELECT TOP 1 ID FROM Currencies WHERE IsActive = 1 ORDER BY ID")
    if row:
        return int(row[0])
    # Any currency
    row = _fetch_one(db, "SELECT TOP 1 ID FROM Currencies ORDER BY ID")
    return int(row[0]) if row else None

def _generate_next_number(db: pyodbc.Connection, date_val: Any) -> str:
    try:
        dt = datetime.fromisoformat(str(date_val)[:10])
    except Exception:
        dt = datetime.now()
    ym = f"{dt.year}{dt.month:02d}"
    prefix = f"ARR-{ym}-"
    row = _fetch_one(db, "SELECT MAX(Number) FROM ArrivalDocuments WHERE Number LIKE ?", (prefix + '%',))
    if not row or not row[0]:
        return f"{prefix}0001"
    last = str(row[0]).split('-')[-1]
    try:
        num = int(last)
    except Exception:
        num = 0
    return f"{prefix}{num+1:04d}"

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

# ---------- Health ----------
@router.get("/health")
def healthcheck(db: pyodbc.Connection = Depends(get_db)):
    return {"ok": True, "db": _get_db_name(db)}

# ---------- Debug endpoint ----------
@router.get("/diag/center/{center_id}")
def arrival_debug(center_id: int, db: pyodbc.Connection = Depends(get_db)):
    dbname_row = _fetch_one(db, "SELECT DB_NAME()")
    db_name = dbname_row[0] if dbname_row else None
    wh = _fetch_one(
        db,
        (
            "SELECT TOP 1 ID FROM Warehouses WHERE CenterID = ? AND IsActive = 1 "
            "ORDER BY CASE WHEN ParentID IS NULL THEN 0 ELSE 1 END, CASE WHEN Type='main' THEN 0 ELSE 1 END, ID"
        ),
        (center_id,),
    )
    all_wh = _fetch_all(db, "SELECT ID, CenterID, ParentID, Type, IsActive FROM Warehouses WHERE CenterID = ?", (center_id,))
    return {
        "DB": db_name,
        "CenterID": center_id,
        "ResolvedWarehouseID": int(wh[0]) if wh else None,
        "Warehouses": [
            {"ID": int(r[0]), "CenterID": int(r[1]), "ParentID": r[2], "Type": r[3], "IsActive": bool(r[4])}
            for r in all_wh
        ],
    }

# ---------- Barcode lookup ----------
@router.get("/find-by-barcode")
def find_product_by_barcode(barcode: str, db: pyodbc.Connection = Depends(get_db)):
    row = _fetch_one(
        db,
        "SELECT ID, Name, FullName FROM Products WHERE Barcode = ?",
        (barcode,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Товар за штрихкодом не знайдено")
    return {"ID": int(row[0]), "Name": row[1], "FullName": row[2]}


# ---------------------------
# List (very basic)
# ---------------------------
@router.get("")
def list_arrival_documents(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    db: pyodbc.Connection = Depends(get_db),
):
    where: list[str] = []
    params: list[Any] = []
    if date_from:
        where.append("d.[Date] >= ?")
        params.append(date_from)
    if date_to:
        where.append("d.[Date] <= ?")
        params.append(date_to)
    if supplier_id:
        where.append("d.SupplierID = ?")
        params.append(supplier_id)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    query = (
        "SELECT d.ID, d.Number, d.[Date], d.SupplierID, s.Name AS SupplierName, "
        "d.CenterID, co.Name AS CenterName, d.TotalAmount, d.Status, d.CurrencyID, cur.CurrencyCode, "
        "d.PricesIncludeVAT, d.ExternalNumber "
        "FROM ArrivalDocuments d "
        "LEFT JOIN Suppliers s ON s.ID = d.SupplierID "
        "LEFT JOIN CentersOfAccounting co ON co.ID = d.CenterID "
        "LEFT JOIN Currencies cur ON cur.ID = d.CurrencyID "
        f"{where_sql} "
        "ORDER BY d.[Date] DESC, d.ID DESC"
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
            "PricesIncludeVAT": bool(r[11]),
            "ExternalNumber": r[12],
        })
    return result


# ---------------------------
# Get one (header + items)
# ---------------------------
@router.get("/{doc_id}")
def get_arrival_document(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    head = _fetch_one(
        db,
        (
            "SELECT ID, Number, Date, SupplierID, CenterID, PricesIncludeVAT, TotalAmount, Status, "
            "CurrencyID, ExternalNumber, Comment, TypicalOperationID, CompanyID, "
            + ("CurrencyRate" if _table_has_column(db, "ArrivalDocuments", "CurrencyRate") else "NULL AS CurrencyRate") + ", "
            + ("CurrencyRateDate" if _table_has_column(db, "ArrivalDocuments", "CurrencyRateDate") else "NULL AS CurrencyRateDate") +
            " "
            "FROM ArrivalDocuments WHERE ID = ?"
        ),
        (doc_id,),
    )
    if not head:
        raise HTTPException(status_code=404, detail="Документ не знайдено")

    items = _fetch_all(
        db,
        (
            "SELECT i.ID, i.ProductID, p.FullName, i.Quantity, i.Price, i.TaxRateID, i.PartyID, i.QtyOrdered, i.QtyInvoiced, "
            + ("i.PriceFC" if _table_has_column(db, "ArrivalDocumentItems", "PriceFC") else "NULL AS PriceFC") +
            " FROM ArrivalDocumentItems i JOIN Products p ON p.ID = i.ProductID "
            "WHERE i.DocID = ? ORDER BY i.ID"
        ),
        (doc_id,),
    )
    # Load postings if exist
    postings: list[dict[str, Any]] = []
    try:
        rows = _fetch_all(
            db,
            (
                "SELECT DebitAccountID, CreditAccountID, Amount, Comment FROM DocumentPostings "
                "WHERE DocumentID = ? AND (DocumentType='Arrival' OR DocumentType='ARRIVAL') "
                "ORDER BY PostingDate, ID"
            ),
            (doc_id,),
        )
        line_no = 1
        for r in rows:
            postings.append({
                "LineNo": line_no,
                "DebitAccount": r[0],
                "CreditAccount": r[1],
                "Amount": float(r[2] or 0),
                "Comment": r[3] or "",
            })
            line_no += 1
    except Exception:
        postings = []
    result = {
        "ID": int(head[0]),
        "Number": head[1],
        "Date": head[2],
        "SupplierID": head[3],
        "CenterID": head[4],
        "PricesIncludeVAT": bool(head[5]),
        "TotalAmount": float(head[6]) if head[6] is not None else 0.0,
        "Status": head[7],
        "CurrencyID": head[8],
        "ExternalNumber": head[9],
        "Comment": head[10],
        "TypicalOperationID": head[11],
        "CompanyID": head[12],
        "CurrencyRate": head[13] if len(head) > 13 else None,
        "CurrencyRateDate": head[14] if len(head) > 14 else None,
        "Items": [
            {
                "ID": int(r[0]),
                "ProductID": int(r[1]),
                "ProductName": r[2],
                "Quantity": r[3],
                "Price": r[4],
                "TaxRateID": r[5],
                "PartyID": r[6],
                "QtyOrdered": r[7],
                "QtyInvoiced": r[8],
                "PriceFC": r[9] if len(r) > 9 else None,
            }
            for r in items
        ],
        "Postings": postings,
    }
    return result


# ---------------------------
# Create / Update (inline logic)
# ---------------------------
def _insert_or_update_document(db: pyodbc.Connection, payload: Dict[str, Any], editing_id: Optional[int]) -> Dict[str, Any]:
    header: Dict[str, Any] = payload.get("Header") or payload
    items: List[Dict[str, Any]] = payload.get("Items") or []

    print(f"[DEBUG] _insert_or_update_document called with payload keys: {list(payload.keys())}")
    print(f"[DEBUG] Header keys: {list(header.keys())}")
    print(f"[DEBUG] Items count: {len(items)}")
    print(f"[DEBUG] Raw payload: {payload}")

    center_id = int(header.get("CenterID")) if header.get("CenterID") is not None else None
    if not center_id:
        print(f"[ERROR] CenterID is missing or invalid: {header.get('CenterID')}")
        raise HTTPException(status_code=400, detail="Не вказано центр обліку")

    prices_include_vat = bool(header.get("PricesIncludeVAT", False))
    supplier_id = header.get("SupplierID")
    company_id = header.get("CompanyID")
    date_val = header.get("Date")

    print(
        f"[ARRIVAL] save: CenterID={center_id} SupplierID={supplier_id} Date={date_val} PricesIncludeVAT={prices_include_vat} Items={len(items)}"
    )

    # Resolve warehouse
    try:
        resolved_warehouse_id = _resolve_warehouse_id(db, center_id, header.get("WarehouseID"))
        print(f"[ARRIVAL] resolved warehouse: ID={resolved_warehouse_id} for CenterID={center_id}")
    except Exception as e:
        print(f"[ERROR] Failed to resolve warehouse: {e}")
        raise HTTPException(status_code=400, detail=f"Помилка визначення складу: {str(e)}")

    cursor = db.cursor()
    try:

        if editing_id is None:
            # Build INSERT dynamically to satisfy NOT NULL constraints like TotalAmount/Status when present
            cols = ["Number", "Date", "SupplierID", "CenterID", "PricesIncludeVAT"]
            # number with auto-generation
            auto_number = header.get("Number") or _generate_next_number(db, date_val)
            params = [
                auto_number,
                date_val,
                supplier_id,
                center_id,
                1 if prices_include_vat else 0,
            ]
            # Default currency
            currency_id = header.get("CurrencyID") or _get_default_currency_id(db)
            if _table_has_column(db, "ArrivalDocuments", "CurrencyID") and currency_id is not None:
                cols.append("CurrencyID")
                params.append(currency_id)
            # Autofill CurrencyRate from CurrencyRates if not provided
            if _table_has_column(db, "ArrivalDocuments", "CurrencyRate"):
                rate_in = header.get("CurrencyRate")
                if not rate_in and currency_id:
                    try:
                        rate_row = _fetch_one(db,
                            "SELECT TOP 1 Rate FROM CurrencyRates WHERE CurrencyID=? AND RateDate<=? ORDER BY RateDate DESC",
                            (currency_id, date_val)
                        )
                        rate_in = rate_row[0] if rate_row else 1
                    except Exception:
                        rate_in = 1
                cols.append("CurrencyRate")
                params.append(float(rate_in or 1))
            if _table_has_column(db, "ArrivalDocuments", "CurrencyRateDate"):
                date_in = header.get("CurrencyRateDate") or date_val
                cols.append("CurrencyRateDate")
                params.append(date_in)
            # Company
            if _table_has_column(db, "ArrivalDocuments", "CompanyID"):
                cols.append("CompanyID")
                params.append(company_id)
            # Typical operation
            if _table_has_column(db, "ArrivalDocuments", "TypicalOperationID"):
                cols.append("TypicalOperationID")
                params.append(header.get("TypicalOperationID"))
            if _table_has_column(db, "ArrivalDocuments", "TotalAmount"):
                cols.append("TotalAmount")
                params.append(0)
            if _table_has_column(db, "ArrivalDocuments", "Status"):
                cols.append("Status")
                params.append("draft")
            placeholders = ", ".join(["?" for _ in cols])
            col_list = ", ".join(cols)
            cursor.execute(
                f"INSERT INTO ArrivalDocuments ({col_list}) OUTPUT INSERTED.ID VALUES ({placeholders})",
                tuple(params),
            )
            row = cursor.fetchone()
            doc_id = int(row[0])
        else:
            doc_id = int(editing_id)
            # Build dynamic UPDATE to include optional columns
            update_cols = [
                ("Number", header.get("Number") or _generate_next_number(db, date_val)),
                ("Date", date_val),
                ("SupplierID", supplier_id),
                ("CenterID", center_id),
                ("PricesIncludeVAT", 1 if prices_include_vat else 0),
            ]
            if _table_has_column(db, "ArrivalDocuments", "CurrencyID"):
                update_cols.append(("CurrencyID", header.get("CurrencyID") or _get_default_currency_id(db)))
            if _table_has_column(db, "ArrivalDocuments", "TypicalOperationID"):
                update_cols.append(("TypicalOperationID", header.get("TypicalOperationID")))
            if _table_has_column(db, "ArrivalDocuments", "CompanyID"):
                update_cols.append(("CompanyID", company_id))

            set_sql = ", ".join([f"{col} = ?" for col, _ in update_cols])
            values = [val for _, val in update_cols] + [doc_id]
            cursor.execute(f"UPDATE ArrivalDocuments SET {set_sql} WHERE ID = ?", values)
            # Replace items on update
            cursor.execute("DELETE FROM ArrivalDocumentItems WHERE DocID = ?", (doc_id,))

        # Before inserting new items and movements, rollback previous balances if we are updating
        if editing_id is not None:
            _rollback_balances_for_document(db, doc_id)

        # Insert items + create parties and party movements
        user_id = header.get("UserID") or payload.get("UserID") or 1
        total_gross = Decimal("0")
        for idx, it in enumerate(items, start=1):
            product_id = it.get("ProductID")
            if not product_id and it.get("Barcode"):
                prod = _fetch_one(db, "SELECT ID FROM Products WHERE Barcode = ?", (it["Barcode"],))
                if prod:
                    product_id = int(prod[0])
            if not product_id:
                raise HTTPException(status_code=400, detail=f"Рядок {idx}: не вказано товар")

            qty = _to_decimal(it.get("Quantity", 0))
            if qty <= 0:
                raise HTTPException(status_code=400, detail=f"Рядок {idx}: кількість має бути > 0")

            # Support FC price input
            price_fc_input = _to_decimal(it.get("PriceFC", 0))
            price_input = _to_decimal(it.get("Price", 0))
            tax_rate_id = it.get("TaxRateID")
            vat_rate = _get_tax_rate(db, tax_rate_id)

            # Determine working price (in UAH)
            working_price = price_input
            try:
                if price_fc_input and price_fc_input > 0:
                    rate = _to_decimal(header.get("CurrencyRate") or 1, default="1")
                    working_price = (price_fc_input * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            except Exception:
                pass

            # VAT logic
            price_to_save = working_price if prices_include_vat else _gross_price(working_price, vat_rate)
            # Net for party (we store gross in Parties.PurchasePrice; compute net to fill NetPurchasePrice when available)
            try:
                net_for_party = (price_to_save / (Decimal("1") + vat_rate / Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            except Exception:
                net_for_party = price_input

            print(
                f"[ITEM] #{idx} product={product_id} qty={qty} price_in={price_input} vat%={vat_rate} price_save={price_to_save}"
            )

            # Save item and capture ID
            if _table_has_column(db, "ArrivalDocumentItems", "PriceFC"):
                cursor.execute(
                    (
                        "INSERT INTO ArrivalDocumentItems (DocID, ProductID, Quantity, Price, TaxRateID, PriceFC) "
                        "OUTPUT INSERTED.ID VALUES (?, ?, ?, ?, ?, ?)"
                    ),
                    (doc_id, product_id, float(qty), float(price_to_save), tax_rate_id, float(price_fc_input or 0)),
                )
            else:
                cursor.execute(
                    (
                        "INSERT INTO ArrivalDocumentItems (DocID, ProductID, Quantity, Price, TaxRateID) "
                        "OUTPUT INSERTED.ID VALUES (?, ?, ?, ?, ?)"
                    ),
                    (doc_id, product_id, float(qty), float(price_to_save), tax_rate_id),
                )
            item_row = cursor.fetchone()
            item_id = int(item_row[0]) if item_row else None

            total_gross += (qty * price_to_save)

            # Create party (always save gross price into Parties.PurchasePrice). If extended columns exist — fill them.
            try:
                if (_table_has_column(db, "Parties", "RemainingQty") or _table_has_column(db, "Parties", "NetPurchasePrice") or _table_has_column(db, "Parties", "VatRate") or _table_has_column(db, "Parties", "IsClosed")):
                    # Build dynamic column list for Parties insert (audit columns if present)
                    party_cols = [
                        "ProductID", "WarehouseID", "SupplierID", "Quantity", "PurchasePrice", "DateReceived", "Status"
                    ]
                    party_vals = [
                        product_id,
                        resolved_warehouse_id,
                        supplier_id,
                        float(qty),
                        float(price_to_save),
                        date_val,
                        'available'
                    ]
                    if _table_has_column(db, "Parties", "RemainingQty"):
                        party_cols.append("RemainingQty")
                        party_vals.append(float(qty))
                    if _table_has_column(db, "Parties", "NetPurchasePrice"):
                        party_cols.append("NetPurchasePrice")
                        party_vals.append(float(net_for_party))
                    if _table_has_column(db, "Parties", "VatRate"):
                        party_cols.append("VatRate")
                        party_vals.append(float(vat_rate))
                    if _table_has_column(db, "Parties", "IsClosed"):
                        party_cols.append("IsClosed")
                        party_vals.append(0)
                    # optional audit
                    if _table_has_column(db, "Parties", "CreatedAt"):
                        party_cols.append("CreatedAt")
                        party_vals.append(datetime.now())
                    if _table_has_column(db, "Parties", "CreatedBy"):
                        party_cols.append("CreatedBy")
                        party_vals.append(user_id)
                    if _table_has_column(db, "Parties", "CompanyID"):
                        party_cols.append("CompanyID")
                        party_vals.append(company_id)

                    placeholders = ", ".join(["?" for _ in party_cols])
                    col_list = ", ".join(party_cols)
                    cursor.execute(
                        f"INSERT INTO Parties ({col_list}) OUTPUT INSERTED.ID VALUES ({placeholders})",
                        tuple(party_vals),
                    )
                else:
                    # Minimal guaranteed column set
                    cursor.execute(
                        (
                            "INSERT INTO Parties (ProductID, WarehouseID, SupplierID, Quantity, PurchasePrice, DateReceived, Status) "
                            "OUTPUT INSERTED.ID VALUES (?, ?, ?, ?, ?, ?, 'available')"
                        ),
                        (
                            product_id,
                            resolved_warehouse_id,
                            supplier_id,
                            float(qty),
                            float(price_to_save),
                            date_val,
                        ),
                    )
            except Exception:
                # Absolute fallback with audit columns
                cursor.execute(
                    (
                        "INSERT INTO Parties (ProductID, WarehouseID, SupplierID, Quantity, PurchasePrice, DateReceived, Status) "
                        "OUTPUT INSERTED.ID VALUES (?, ?, ?, ?, ?, ?, 'available')"
                    ),
                    (
                        product_id,
                        resolved_warehouse_id,
                        supplier_id,
                        float(qty),
                        float(price_to_save),
                        date_val,
                    ),
                )
            party_row = cursor.fetchone()
            party_id = int(party_row[0])

            # back-reference PartyID in item
            if item_id is not None:
                try:
                    cursor.execute("UPDATE ArrivalDocumentItems SET PartyID=? WHERE ID=?", (party_id, item_id))
                except Exception:
                    pass

            # Movement (with optional CompanyID)
            has_pm_company = _table_has_column(db, "PartyMovements", "CompanyID")
            if has_pm_company:
                try:
                    cursor.execute(
                        (
                            "INSERT INTO PartyMovements (PartyID, MovementType, Quantity, Date, DocumentID, DocumentType, WarehouseID, CompanyID) "
                            "VALUES (?, 'receipt', ?, ?, ?, 'Arrival', ?, ?)"
                        ),
                        (party_id, float(qty), date_val, doc_id, resolved_warehouse_id, company_id),
                    )
                except Exception:
                    cursor.execute(
                        (
                            "INSERT INTO PartyMovements (PartyID, MovementType, Quantity, Date, DocumentID, DocumentType, WarehouseID) "
                            "VALUES (?, 'receipt', ?, ?, ?, 'Arrival', ?)"
                        ),
                        (party_id, float(qty), date_val, doc_id, resolved_warehouse_id),
                    )
            else:
                cursor.execute(
                    (
                        "INSERT INTO PartyMovements (PartyID, MovementType, Quantity, Date, DocumentID, DocumentType, WarehouseID) "
                        "VALUES (?, 'receipt', ?, ?, ?, 'Arrival', ?)"
                    ),
                    (party_id, float(qty), date_val, doc_id, resolved_warehouse_id),
                )

            # Cost calculation (store gross purchase price as calculated cost)
            cursor.execute(
                (
                    "INSERT INTO CostCalculations (ProductID, PartyID, Method, CalculatedCost, CalculationDate, CreatedBy, Comment) "
                    "VALUES (?, ?, 'purchase', ?, ?, ?, NULL)"
                ),
                (product_id, party_id, float(price_to_save), date_val, user_id),
            )

            # Stock balances (with optional CompanyID)
            try:
                has_sb_company = _table_has_column(db, "StockBalances", "CompanyID")
                if has_sb_company:
                    cursor.execute(
                        "SELECT ID FROM StockBalances WHERE ProductID=? AND WarehouseID=? AND CompanyID=?",
                        (product_id, resolved_warehouse_id, company_id),
                    )
                else:
                    cursor.execute(
                        "SELECT ID FROM StockBalances WHERE ProductID=? AND WarehouseID=?",
                        (product_id, resolved_warehouse_id),
                    )
                sb = cursor.fetchone()
                if sb:
                    if has_sb_company:
                        cursor.execute(
                            "UPDATE StockBalances SET Quantity = Quantity + ?, UpdatedAt = GETDATE(), UpdatedBy = ? WHERE ID = ?",
                            (float(qty), user_id, sb[0]),
                        )
                    else:
                        cursor.execute(
                            "UPDATE StockBalances SET Quantity = Quantity + ?, UpdatedAt = GETDATE(), UpdatedBy = ? WHERE ID = ?",
                            (float(qty), user_id, sb[0]),
                        )
                else:
                    if has_sb_company:
                        cursor.execute(
                            (
                                "INSERT INTO StockBalances (ProductID, WarehouseID, CompanyID, Quantity, UpdatedAt, UpdatedBy, Comment) "
                                "VALUES (?, ?, ?, ?, GETDATE(), ?, 'arrival')"
                            ),
                            (product_id, resolved_warehouse_id, company_id, float(qty), user_id),
                        )
                    else:
                        cursor.execute(
                            (
                                "INSERT INTO StockBalances (ProductID, WarehouseID, Quantity, UpdatedAt, UpdatedBy, Comment) "
                                "VALUES (?, ?, ?, GETDATE(), ?, 'arrival')"
                            ),
                            (product_id, resolved_warehouse_id, float(qty), user_id),
                        )
            except Exception:
                # If balances table or columns differ, skip silently to not break save
                pass

        # persist TotalAmount if such column exists
        try:
            cursor.execute("UPDATE ArrivalDocuments SET TotalAmount = ? WHERE ID = ?", (float(total_gross), doc_id))
        except Exception:
            pass

        db.commit()
        return {"ok": True, "ID": doc_id}
    except pyodbc.Error as db_err:
        try:
            db.rollback()
        except Exception:
            pass
        msg = str(db_err)
        db_name = _get_db_name(db)
        if "FK_Parties_Warehouses" in msg:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Некоректний склад: перевірте, що у вибраному центрі є активний головний склад. "
                    f"DB={db_name} CenterID={center_id} WarehouseID={resolved_warehouse_id}"
                ),
            )
        # For any DB error return 400 + diagnostics to simplify UI debugging
        raise HTTPException(
            status_code=400,
            detail=f"DB error: {msg} | DB={db_name} CenterID={center_id} WarehouseID={resolved_warehouse_id}",
        )
    except Exception as ex:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(ex))


@router.post("")
def create_arrival_document(
    payload: Dict[str, Any],
    debug: bool = Query(False),
    db: pyodbc.Connection = Depends(get_db),
):
    if debug:
        header: Dict[str, Any] = payload.get("Header") or payload
        center_id = int(header.get("CenterID")) if header.get("CenterID") is not None else None
        requested_wh = header.get("WarehouseID")
        db_name = _get_db_name(db)
        resolved_wh = None
        error = None
        try:
            if center_id:
                resolved_wh = _resolve_warehouse_id(db, center_id, requested_wh)
        except HTTPException as ex:
            error = ex.detail
        return {
            "DB": db_name,
            "CenterID": center_id,
            "RequestedWarehouseID": requested_wh,
            "ResolvedWarehouseID": resolved_wh,
            "Error": error,
        }
    return _insert_or_update_document(db, payload, editing_id=None)


@router.put("/{doc_id}")
def update_arrival_document(doc_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    return _insert_or_update_document(db, payload, editing_id=doc_id)


# ---------------------------
# Delete (basic)
# ---------------------------
@router.delete("/{doc_id}")
def delete_arrival_document(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        print(f"[DELETE] Починаємо видалення прибуткового документу {doc_id}")
        
        # Collect PartyIDs linked to this document (before movements are deleted)
        try:
            cursor.execute(
                "SELECT DISTINCT PartyID FROM ArrivalDocumentItems WHERE DocID = ? AND PartyID IS NOT NULL",
                (doc_id,),
            )
            party_ids = [int(r[0]) for r in (cursor.fetchall() or []) if r and r[0] is not None]
            print(f"[DELETE] Знайдено {len(party_ids)} партій для документу {doc_id}")
        except Exception as e:
            print(f"[DELETE] Помилка отримання PartyIDs: {e}")
            party_ids = []

        # Перевіряємо, чи використовуються партії в інших документах
        if party_ids:
            placeholders = ", ".join(["?" for _ in party_ids])
            try:
                # Перевіряємо продажі
                cursor.execute(
                    f"SELECT COUNT(*) FROM PartyMovements WHERE PartyID IN ({placeholders}) AND DocumentType IN ('Sale', 'SALE', 'Продаж')",
                    tuple(party_ids),
                )
                sale_count = cursor.fetchone()[0] or 0
                
                # Перевіряємо переміщення
                cursor.execute(
                    f"SELECT COUNT(*) FROM PartyMovements WHERE PartyID IN ({placeholders}) AND DocumentType IN ('Transfer', 'TRANSFER', 'Переміщення')",
                    tuple(party_ids),
                )
                transfer_count = cursor.fetchone()[0] or 0
                
                # Перевіряємо інші документи (крім прибуткових)
                cursor.execute(
                    f"SELECT COUNT(*) FROM PartyMovements WHERE PartyID IN ({placeholders}) AND DocumentType NOT IN ('Arrival', 'ARRIVAL')",
                    tuple(party_ids),
                )
                other_count = cursor.fetchone()[0] or 0
                
                print(f"[DELETE] Партії використовуються в: продажах={sale_count}, переміщеннях={transfer_count}, інших={other_count}")
                
                if sale_count > 0 or transfer_count > 0 or other_count > 0:
                    print(f"[DELETE] ⚠️ УВАГА: Партії використовуються в інших документах! Видалення може порушити цілісність даних.")
            except Exception as e:
                print(f"[DELETE] Помилка перевірки використання партій: {e}")

        # Collect product/warehouse(/company) for potential StockBalances cleanup
        try:
            has_sb_company = _table_has_column(db, "StockBalances", "CompanyID")
            has_party_company = _table_has_column(db, "Parties", "CompanyID")
            triples = []
            pairs = []
            if has_sb_company and has_party_company:
                cursor.execute(
                    (
                        "SELECT p.ProductID, pm.WarehouseID, p.CompanyID "
                        "FROM PartyMovements pm JOIN Parties p ON p.ID = pm.PartyID "
                        "WHERE pm.DocumentType='Arrival' AND pm.DocumentID = ? "
                        "GROUP BY p.ProductID, pm.WarehouseID, p.CompanyID"
                    ),
                    (doc_id,),
                )
                triples = [
                    (int(r[0]), int(r[1]), None if r[2] is None else int(r[2]))
                    for r in (cursor.fetchall() or [])
                ]
            else:
                cursor.execute(
                    (
                        "SELECT p.ProductID, pm.WarehouseID "
                        "FROM PartyMovements pm JOIN Parties p ON p.ID = pm.PartyID "
                        "WHERE pm.DocumentType='Arrival' AND pm.DocumentID = ? "
                        "GROUP BY p.ProductID, pm.WarehouseID"
                    ),
                    (doc_id,),
                )
                pairs = [(int(r[0]), int(r[1])) for r in (cursor.fetchall() or [])]
            
            print(f"[DELETE] Знайдено {len(triples) if triples else len(pairs)} комбінацій ProductID+WarehouseID для очищення")
        except Exception as e:
            print(f"[DELETE] Помилка збору даних для очищення: {e}")
            triples = []
            pairs = []

        # Rollback balances first (decrement quantities that were added by this document) and delete movements
        print(f"[DELETE] Відкатуємо залишки та рухи...")
        _rollback_balances_for_document(db, doc_id)

        # Remove postings
        print(f"[DELETE] Видаляємо проводки...")
        try:
            cursor.execute("DELETE FROM DocumentPostings WHERE DocumentType='ARRIVAL' AND DocumentID=?", (doc_id,))
            deleted_postings = cursor.rowcount
            print(f"[DELETE] Видалено {deleted_postings} проводок")
        except Exception as e:
            print(f"[DELETE] Помилка видалення проводок (ARRIVAL): {e}")
            try:
                cursor.execute("DELETE FROM DocumentPostings WHERE DocumentType='Arrival' AND DocumentID=?", (doc_id,))
                deleted_postings = cursor.rowcount
                print(f"[DELETE] Видалено {deleted_postings} проводок (Arrival)")
            except Exception as e2:
                print(f"[DELETE] Помилка видалення проводок (Arrival): {e2}")

        # Remove movements linked to this document (in case schema differs and rollback did not cover)
        print(f"[DELETE] Видаляємо рухи партій...")
        try:
            cursor.execute("DELETE FROM PartyMovements WHERE DocumentType = 'Arrival' AND DocumentID = ?", (doc_id,))
            deleted_movements = cursor.rowcount
            print(f"[DELETE] Видалено {deleted_movements} рухів партій")
        except Exception as e:
            print(f"[DELETE] Помилка видалення рухів: {e}")

        # Remove cost calculations for parties of this document
        print(f"[DELETE] Видаляємо розрахунки собівартості...")
        try:
            if party_ids:
                placeholders = ", ".join(["?" for _ in party_ids])
                cursor.execute(
                    f"DELETE FROM CostCalculations WHERE PartyID IN ({placeholders})",
                    tuple(party_ids),
                )
                deleted_costs = cursor.rowcount
                print(f"[DELETE] Видалено {deleted_costs} розрахунків собівартості")
        except Exception as e:
            print(f"[DELETE] Помилка видалення розрахунків собівартості: {e}")

        # Remove Parties created for this document if they have no other movements left
        print(f"[DELETE] Видаляємо партії без рухів...")
        try:
            if party_ids:
                placeholders = ", ".join(["?" for _ in party_ids])
                cursor.execute(
                    (
                        f"DELETE FROM Parties WHERE ID IN ({placeholders}) "
                        "AND NOT EXISTS (SELECT 1 FROM PartyMovements x WHERE x.PartyID = Parties.ID)"
                    ),
                    tuple(party_ids),
                )
                deleted_parties = cursor.rowcount
                print(f"[DELETE] Видалено {deleted_parties} партій (без рухів)")
        except Exception as e:
            print(f"[DELETE] Помилка видалення партій: {e}")

        # Remove document items and header
        print(f"[DELETE] Видаляємо позиції та заголовок документа...")
        cursor.execute("DELETE FROM ArrivalDocumentItems WHERE DocID = ?", (doc_id,))
        deleted_items = cursor.rowcount
        cursor.execute("DELETE FROM ArrivalDocuments WHERE ID = ?", (doc_id,))
        print(f"[DELETE] Видалено {deleted_items} позицій та заголовок документа")

        # Cleanup StockBalances rows that became zero and have no related movements anymore
        print(f"[DELETE] Очищаємо нульові залишки...")
        deleted_balances = 0
        try:
            if triples:
                for prod_id, wh_id, comp_id in triples:
                    if comp_id is None:
                        continue
                    try:
                        cursor.execute(
                            (
                                "DELETE FROM StockBalances WHERE ProductID=? AND WarehouseID=? AND CompanyID=? "
                                "AND (Quantity IS NULL OR Quantity<=0) AND NOT EXISTS ("
                                "  SELECT 1 FROM PartyMovements pm JOIN Parties p ON p.ID=pm.PartyID "
                                "  WHERE p.ProductID=? AND pm.WarehouseID=? AND p.CompanyID=?"
                                ")"
                            ),
                            (prod_id, wh_id, comp_id, prod_id, wh_id, comp_id),
                        )
                        deleted_balances += cursor.rowcount
                    except Exception as e:
                        print(f"[DELETE] Помилка очищення StockBalances для {prod_id}/{wh_id}/{comp_id}: {e}")
            elif pairs:
                for prod_id, wh_id in pairs:
                    try:
                        cursor.execute(
                            (
                                "DELETE FROM StockBalances WHERE ProductID=? AND WarehouseID=? AND (Quantity IS NULL OR Quantity<=0) "
                                "AND NOT EXISTS ("
                                "  SELECT 1 FROM PartyMovements pm JOIN Parties p ON p.ID=pm.PartyID "
                                "  WHERE p.ProductID=? AND pm.WarehouseID=?"
                                ")"
                            ),
                            (prod_id, wh_id, prod_id, wh_id),
                        )
                        deleted_balances += cursor.rowcount
                    except Exception as e:
                        print(f"[DELETE] Помилка очищення StockBalances для {prod_id}/{wh_id}: {e}")
        except Exception as e:
            print(f"[DELETE] Помилка очищення StockBalances: {e}")
        
        print(f"[DELETE] Видалено {deleted_balances} нульових залишків")
        
        # Фінальна перевірка цілісності
        print(f"[DELETE] Перевіряємо цілісність після видалення...")
        try:
            # Перевіряємо, чи залишилися рухи для цього документа
            remaining_movements = cursor.execute(
                "SELECT COUNT(*) FROM PartyMovements WHERE DocumentType IN ('Arrival', 'ARRIVAL') AND DocumentID = ?",
                (doc_id,)
            ).fetchone()[0] or 0
            
            # Перевіряємо, чи залишилися проводки
            remaining_postings = cursor.execute(
                "SELECT COUNT(*) FROM DocumentPostings WHERE DocumentType IN ('Arrival', 'ARRIVAL') AND DocumentID = ?",
                (doc_id,)
            ).fetchone()[0] or 0
            
            # Перевіряємо, чи залишилися позиції
            remaining_items = cursor.execute(
                "SELECT COUNT(*) FROM ArrivalDocumentItems WHERE DocID = ?",
                (doc_id,)
            ).fetchone()[0] or 0
            
            print(f"[DELETE] Перевірка цілісності: рухи={remaining_movements}, проводки={remaining_postings}, позиції={remaining_items}")
            
            if remaining_movements > 0 or remaining_postings > 0 or remaining_items > 0:
                print(f"[DELETE] ⚠️ УВАГА: Залишилися дані після видалення!")
        except Exception as e:
            print(f"[DELETE] Помилка перевірки цілісності: {e}")
        
        db.commit()
        print(f"[DELETE] ✅ Прибутковий документ {doc_id} успішно видалено")
        return {"ok": True, "deleted_items": deleted_items, "deleted_parties": deleted_parties, "deleted_balances": deleted_balances}
    except Exception as e:
        print(f"[DELETE] ❌ Помилка видалення документу {doc_id}: {e}")
        try:
            db.rollback()
            print(f"[DELETE] Відкат транзакції виконано")
        except Exception as rollback_error:
            print(f"[DELETE] Помилка відкату транзакції: {rollback_error}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------
# Postings (generate)
# ---------------------------
def _get_default_vat_rate(db: pyodbc.Connection) -> Decimal:
    row = _fetch_one(db, "SELECT TOP 1 TaxRate FROM Taxes WHERE IsDefault=1 AND IsFixed=0 ORDER BY ID")
    if not row or row[0] is None:
        return Decimal("20")
    return Decimal(str(row[0]))

def _get_tax_rate_by_id(db: pyodbc.Connection, tax_id: int) -> Optional[Decimal]:
    try:
        row = _fetch_one(db, "SELECT TaxRate FROM Taxes WHERE ID = ?", (tax_id,))
        if not row or row[0] is None:
            return None
        return Decimal(str(row[0]))
    except Exception:
        return None

def _get_account_tax_rate(db: pyodbc.Connection, account_id: Optional[int], on_date: str) -> Optional[Decimal]:
    if not account_id:
        return None
    row = _fetch_one(
        db,
        (
            "SELECT TOP 1 Rate FROM AccountTaxRates "
            "WHERE AccountID = ? AND (DateFrom IS NULL OR DateFrom <= ?) AND (DateTo IS NULL OR DateTo >= ?) "
            "ORDER BY DateFrom DESC, ID DESC"
        ),
        (account_id, on_date, on_date),
    )
    if not row or row[0] is None:
        return None
    return Decimal(str(row[0]))


@router.post("/{doc_id}/postings")
def generate_postings(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    # Load document (flat)
    doc = get_arrival_document(doc_id, db)

    # Compute totals from items (saved prices are gross if PricesIncludeVAT=False during input)
    items = doc.get("Items", [])
    total_items_gross = Decimal("0")
    for it in items:
        qty = Decimal(str(it.get("Quantity") or 0))
        price = Decimal(str(it.get("Price") or 0))
        total_items_gross += (qty * price)

    vat_rate = _get_default_vat_rate(db)
    if doc.get("PricesIncludeVAT"):
        base = (total_items_gross / (Decimal("1") + vat_rate/Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        vat = (total_items_gross - base).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        gross = total_items_gross
    else:
        # Items are already grossed on save, so treat them as gross here for consistency
        base = (total_items_gross / (Decimal("1") + vat_rate/Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        vat = (total_items_gross - base).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        gross = total_items_gross

    # Clear old postings
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM DocumentPostings WHERE DocumentID=? AND DocumentType='ARRIVAL'", (doc_id,))
    except Exception:
        # Fallback to legacy table name if exists
        try:
            cursor.execute("DELETE FROM DocumentPostings WHERE DocumentID=? AND DocumentType='Arrival'", (doc_id,))
        except Exception:
            pass

    # Load operation lines
    op_id = doc.get("TypicalOperationID")
    if not op_id:
        raise HTTPException(status_code=400, detail="Не обрано типову операцію")

    rows = _fetch_all(
        db,
        "SELECT ID, DebitAccountID, CreditAccountID, AmountType, Notes FROM TypicalOperationEntries WHERE OperationID = ? ORDER BY ID",
        (op_id,),
    )

    postings: list[dict[str, Any]] = []
    line_no = 1
    on_date = str(doc.get("Date"))[:10]
    currency_id = doc.get("CurrencyID")
    company_id = doc.get("CompanyID")
    has_company_col = _table_has_column(db, "DocumentPostings", "CompanyID")

    def resolve_amount(amt_type: Optional[str], debit_acc: Optional[int], credit_acc: Optional[int]) -> Decimal:
        t = (amt_type or "").strip().lower()
        if t.endswith('%'):
            try:
                p = Decimal(t.replace('%','').strip())
                return (base * p / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            except Exception:
                return base
        if t in ("vat", "пдв", "tax"):
            return vat
        if t in ("gross", "total"):
            return gross
        # tax:<id>
        if t.startswith('tax:'):
            try:
                tax_id = int(t.split(':', 1)[1])
                rate = _get_tax_rate_by_id(db, tax_id) or _get_default_vat_rate(db)
                return (base * rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            except Exception:
                return vat
        # tax@debit or tax@credit from account mapping
        if t in ("tax@debit", "tax@credit"):
            acc_id = debit_acc if t == "tax@debit" else credit_acc
            rate = _get_account_tax_rate(db, acc_id, on_date) or _get_default_vat_rate(db)
            return (base * rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return base

    for r in rows:
        amount = resolve_amount(r[3], r[1], r[2])
        inserted = False
        try:
            if has_company_col:
                cursor.execute(
                    (
                        "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CurrencyID, CompanyID, CreatedAt, CreatedBy, Comment) "
                        "VALUES (?, 'Arrival', ?, ?, ?, ?, ?, ?, GETDATE(), ?, ?)"
                    ),
                    (doc_id, on_date, r[1], r[2], float(amount), currency_id, company_id, 1, r[4]),
                )
            else:
                cursor.execute(
                    (
                        "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CurrencyID, CreatedAt, CreatedBy, Comment) "
                        "VALUES (?, 'Arrival', ?, ?, ?, ?, ?, GETDATE(), ?, ?)"
                    ),
                    (doc_id, on_date, r[1], r[2], float(amount), currency_id, 1, r[4]),
                )
            inserted = True
        except Exception:
            # Try with lowercase/other spelling of type
            try:
                if has_company_col:
                    cursor.execute(
                        (
                            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CurrencyID, CompanyID, CreatedAt, CreatedBy, Comment) "
                            "VALUES (?, 'ARRIVAL', ?, ?, ?, ?, ?, ?, GETDATE(), ?, ?)"
                        ),
                        (doc_id, on_date, r[1], r[2], float(amount), currency_id, company_id, 1, r[4]),
                    )
                else:
                    cursor.execute(
                        (
                            "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CurrencyID, CreatedAt, CreatedBy, Comment) "
                            "VALUES (?, 'ARRIVAL', ?, ?, ?, ?, ?, GETDATE(), ?, ?)"
                        ),
                        (doc_id, on_date, r[1], r[2], float(amount), currency_id, 1, r[4]),
                    )
                inserted = True
            except Exception:
                # Some schemas might miss CurrencyID/CreatedBy/CreatedAt. Try minimal column set.
                try:
                    if has_company_col:
                        cursor.execute(
                            (
                                "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, CompanyID, Comment) "
                                "VALUES (?, 'Arrival', ?, ?, ?, ?, ?, ?)"
                            ),
                            (doc_id, on_date, r[1], r[2], float(amount), company_id, r[4] or ""),
                        )
                    else:
                        cursor.execute(
                            (
                                "INSERT INTO DocumentPostings (DocumentID, DocumentType, PostingDate, DebitAccountID, CreditAccountID, Amount, Comment) "
                                "VALUES (?, 'Arrival', ?, ?, ?, ?, ?)"
                            ),
                            (doc_id, on_date, r[1], r[2], float(amount), r[4] or ""),
                        )
                    inserted = True
                except Exception:
                    inserted = False
        if not inserted:
            raise HTTPException(status_code=500, detail="Не вдалося записати проводки в DocumentPostings")
        postings.append({
            "LineNo": line_no,
            "DebitAccount": r[1],
            "CreditAccount": r[2],
            "Amount": float(amount),
            "Comment": r[4] or "",
        })
        line_no += 1

    try:
        db.commit()
    except Exception:
        pass
    return {"Postings": postings}


@router.delete("/{doc_id}/postings")
def cancel_postings(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        try:
            cursor.execute("DELETE FROM DocumentPostings WHERE DocumentID=? AND DocumentType='Arrival'", (doc_id,))
        except Exception:
            cursor.execute("DELETE FROM DocumentPostings WHERE DocumentID=? AND DocumentType='ARRIVAL'", (doc_id,))
        try:
            cursor.execute("UPDATE ArrivalDocuments SET Status='draft' WHERE ID=?", (doc_id,))
        except Exception:
            pass
        db.commit()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
