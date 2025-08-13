# app/services/arrival_service.py
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, date as date_cls
import pyodbc

from .utils import money, qty
from . import typical_ops, taxes, inventory, costing, numbering
from . import accounting_ledger as ledger


T_ARR = "dbo.ArrivalDocuments"
T_ITM = "dbo.ArrivalDocumentItems"
T_POST = "dbo.DocumentPostings"


# ---------------------------
# Helpers (SQL mappers)
# ---------------------------
def _row_to_doc_head(r) -> Dict[str, Any]:
    return {
        "ID": r.ID,
        "Number": r.Number or "",
        "Date": r.Date,
        "SupplierID": r.SupplierID,
        "CurrencyID": r.CurrencyID,
        "PricesIncludeVAT": bool(r.PricesIncludeVAT),
        "CompanyID": r.CompanyID,
        "CenterID": r.CenterID,
        "TypicalOperationID": r.TypicalOperationID,
        "TotalExtraCosts": float(r.TotalExtraCosts or 0),
        "ExternalNumber": r.ExternalNumber or "",
        "Comment": r.Comment or "",
        "TotalAmount": float(r.TotalAmount or 0),
        "Status": r.Status or "draft",
    }


def _row_to_item(r) -> Dict[str, Any]:
    return {
        "ID": r.ID,
        "ProductID": r.ProductID,
        "Quantity": float(r.Quantity or 0),
        "Price": float(r.Price or 0),
        "TaxRateID": r.TaxRateID,
        "PartyID": r.PartyID,
        "QtyOrdered": float(r.QtyOrdered or 0) if hasattr(r, "QtyOrdered") else None,
        "QtyInvoiced": float(r.QtyInvoiced or 0) if hasattr(r, "QtyInvoiced") else None,
    }


# ---------------------------
# Queries
# ---------------------------
def list_documents(
    conn: pyodbc.Connection,
    *,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    supplier_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    where = ["1=1"]
    params: List[Any] = []
    if date_from:
        where.append("a.[Date] >= ?")
        params.append(date_from)
    if date_to:
        where.append("a.[Date] <= ?")
        params.append(date_to)
    if supplier_id:
        where.append("a.[SupplierID] = ?")
        params.append(supplier_id)

    sql = f"""
      SELECT a.ID, a.Number, a.Date, a.TotalAmount, a.Status,
             s.Name as SupplierName, c.Name as CenterName, cur.CurrencyCode
      FROM {T_ARR} a
      LEFT JOIN dbo.Suppliers s ON s.ID = a.SupplierID
      LEFT JOIN dbo.CentersOfAccounting c ON c.ID = a.CenterID
      LEFT JOIN dbo.Currencies cur ON cur.ID = a.CurrencyID
      WHERE {" AND ".join(where)}
      ORDER BY a.Date DESC, a.ID DESC
    """
    cur = conn.cursor()
    cur.execute(sql, tuple(params))
    out: List[Dict[str, Any]] = []
    for r in cur.fetchall():
        out.append({
            "ID": r.ID,
            "Number": r.Number or "",
            "Date": r.Date,
            "SupplierName": r.SupplierName or "",
            "CenterName": r.CenterName or "",
            "CurrencyCode": r.CurrencyCode or "",
            "TotalAmount": float(r.TotalAmount or 0),
            "Status": r.Status or "draft",
        })
    return out


def get_document(conn: pyodbc.Connection, doc_id: int) -> Dict[str, Any]:
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {T_ARR} WHERE ID=?", (doc_id,))
    head = cur.fetchone()
    if not head:
        raise ValueError("Документ не знайдено")

    doc = _row_to_doc_head(head)

    cur.execute(
        f"""
        SELECT i.*, p.Name as ProductName, p.FullName as ProductFullName
        FROM {T_ITM} i
        LEFT JOIN dbo.Products p ON p.ID = i.ProductID
        WHERE i.DocID=?
        ORDER BY i.ID
        """,
        (doc_id,),
    )
    items = []
    for r in cur.fetchall():
        it = _row_to_item(r)
        it["ProductName"] = getattr(r, "ProductName", None) or ""
        it["ProductFullName"] = getattr(r, "ProductFullName", None) or it["ProductName"]
        items.append(it)
    doc["Items"] = items

    # Фетчимо поточні проводки (для вкладки «Бухоблік»)
    cur.execute(
        f"""SELECT ID, DebitAccountID, CreditAccountID, Amount, Comment
            FROM {T_POST} WHERE DocumentType='ARRIVAL' AND DocumentID=?
            ORDER BY ID""",
        (doc_id,),
    )
    postings = [{
        "LineNo": i + 1,
        "DebitAccount": str(r.DebitAccountID),
        "CreditAccount": str(r.CreditAccountID),
        "Amount": float(r.Amount or 0),
        "Comment": r.Comment or "",
    } for i, r in enumerate(cur.fetchall())]
    doc["Postings"] = postings

    return doc


# ---------------------------
# Save header & items
# ---------------------------
def _ensure_number(conn: pyodbc.Connection, number: str, date) -> str:
    if (number or "").strip():
        return number
    # Перетворюємо рядок ISO на date
    d: date_cls
    if isinstance(date, str):
        try:
            d = datetime.fromisoformat(date).date()
        except Exception:
            # Спроба обрізати до YYYY-MM-DD
            try:
                d = datetime.strptime(date[:10], "%Y-%m-%d").date()
            except Exception:
                d = datetime.today().date()
    elif isinstance(date, datetime):
        d = date.date()
    else:
        d = date
    return numbering.next_doc_number(conn, for_date=d)


def _insert_header(conn: pyodbc.Connection, payload: Dict[str, Any]) -> int:
    sql = f"""
      INSERT INTO {T_ARR}
        (Number, Date, SupplierID, CurrencyID, PricesIncludeVAT,
         CompanyID, CenterID, TypicalOperationID, TotalExtraCosts,
         ExternalNumber, Comment, TotalAmount, Status, CreatedAt, CreatedBy)
      OUTPUT INSERTED.ID
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', GETDATE(), ?)
    """
    cur = conn.cursor()
    cur.execute(sql, (
        payload["Number"], payload["Date"], payload.get("SupplierID"),
        payload.get("CurrencyID"), 1 if payload.get("PricesIncludeVAT") else 0,
        payload.get("CompanyID"), payload.get("CenterID"),
        payload.get("TypicalOperationID"),
        money(payload.get("TotalExtraCosts", 0)),
        payload.get("ExternalNumber"), payload.get("Comment"),
        money(payload.get("TotalAmount", 0)),
        payload.get("UserID"),
    ))
    doc_id = cur.fetchone()[0]
    conn.commit()
    return doc_id


def _update_header(conn: pyodbc.Connection, doc_id: int, payload: Dict[str, Any]) -> None:
    sql = f"""
      UPDATE {T_ARR}
         SET Number=?,
             Date=?, SupplierID=?, CurrencyID=?, PricesIncludeVAT=?,
             CompanyID=?, CenterID=?, TypicalOperationID=?, TotalExtraCosts=?,
             ExternalNumber=?, Comment=?, TotalAmount=?,
             UpdatedAt=GETDATE(), UpdatedBy=?
       WHERE ID=?
    """
    cur = conn.cursor()
    cur.execute(sql, (
        payload["Number"], payload["Date"], payload.get("SupplierID"),
        payload.get("CurrencyID"), 1 if payload.get("PricesIncludeVAT") else 0,
        payload.get("CompanyID"), payload.get("CenterID"),
        payload.get("TypicalOperationID"),
        money(payload.get("TotalExtraCosts", 0)),
        payload.get("ExternalNumber"), payload.get("Comment"),
        money(payload.get("TotalAmount", 0)),
        payload.get("UserID"), doc_id
    ))
    conn.commit()


def _replace_items(conn: pyodbc.Connection, doc_id: int, items: List[Dict[str, Any]]) -> None:
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {T_ITM} WHERE DocID=?", (doc_id,))
    conn.commit()

    ins = f"""
      INSERT INTO {T_ITM}
        (DocID, ProductID, Quantity, Price, TaxRateID, PartyID, QtyOrdered, QtyInvoiced, CreatedAt, CreatedBy)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, GETDATE(), ?)
    """
    for r in items:
        cur.execute(ins, (
            doc_id, r["ProductID"], qty(r.get("Quantity", 0)), money(r.get("Price", 0)),
            r.get("TaxRateID"),
            r.get("QtyOrdered"), r.get("QtyInvoiced"),
            r.get("UserID", None)
        ))
    conn.commit()


# ---------------------------
# Inventory & costing
# ---------------------------
def _parse_date(d) -> date_cls:
    if isinstance(d, date_cls):
        return d
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, str):
        try:
            return datetime.fromisoformat(d).date()
        except Exception:
            try:
                return datetime.strptime(d[:10], "%Y-%m-%d").date()
            except Exception:
                return datetime.today().date()
    return datetime.today().date()


def _detect_vat_percent_for_doc(
    conn: pyodbc.Connection,
    typical_operation_id: Optional[int],
    *,
    on_date: Optional[date_cls],
) -> float:
    """
    Дістаємо відсоток ПДВ з типової операції (рядок з AmountType='percent').
    Якщо немає — 0.
    """
    if not typical_operation_id:
        return 0.0
    entries = typical_ops.get_operation_entries(conn, typical_operation_id)
    for e in entries:
        if (e.get("AmountType") or "").lower() in ("percent", "pct", "%"):
            # ставка з AccountTaxRates на рахунку Дт цього рядка
            acc_tax = taxes.get_account_tax(conn, e["DebitAccountID"], on_date or datetime.today().date())
            if acc_tax and acc_tax["Rate"] > 0:
                return float(acc_tax["Rate"])
    return 0.0


def _perform_inventory_phase(
    conn: pyodbc.Connection,
    *,
    doc_id: int,
    header: Dict[str, Any],
    items: List[Dict[str, Any]],
    user_id: Optional[int],
) -> List[int]:
    """
    Створюємо партії, рухи і оновлюємо залишки. Повертаємо список PartyID по кожному рядку.
    Для розрахунку нетто-ціни, якщо PricesIncludeVAT=True — відрізаємо ПДВ за ставкою з типової операції.
    """
    doc_date = _parse_date(header.get("Date"))
    vat_percent = _detect_vat_percent_for_doc(
        conn, header.get("TypicalOperationID"), on_date=doc_date
    )

    party_ids: List[int] = []
    vat_total = 0.0
    net_total = 0.0
    for r in items:
        price = float(r.get("Price") or 0)
        qty_val = float(r.get("Quantity") or 0)

        parts = taxes.split_amount_by_vat(
            price,
            prices_include_vat=bool(header.get("PricesIncludeVAT")),
            percent=vat_percent,
        )
        unit_net = parts["net"]
        vat_total += float(parts["vat"]) * qty_val
        net_total += float(unit_net) * qty_val

        pid = inventory.receipt_item(
            conn,
            document_id=doc_id,
            document_type="ARRIVAL",
            warehouse_id=header["WarehouseID"],
            supplier_id=header.get("SupplierID"),
            company_id=header.get("CompanyID"),
            date=header["Date"],
            user_id=user_id,
            product_id=r["ProductID"],
            quantity=qty_val,
            unit_cost=unit_net,
            comment=f"Arrival {doc_id}",
        )
        party_ids.append(pid)

        # оновимо PartyID в рядку документа
        cur = conn.cursor()
        cur.execute(f"UPDATE {T_ITM} SET PartyID=? WHERE DocID=? AND ProductID=? AND PartyID IS NULL",
                    (pid, doc_id, r["ProductID"]))
        conn.commit()

    # розподіл додаткових витрат і запис у dbo.CostCalculations
    if (header.get("TotalExtraCosts") or 0) > 0:
        # готуємо "нетто" суми на позицію
        prepared = []
        for r, pid in zip(items, party_ids):
            price = float(r.get("Price") or 0)
            if header.get("PricesIncludeVAT"):
                parts = taxes.split_amount_by_vat(price, prices_include_vat=True, percent=vat_percent)
                unit_net = parts["net"]
            else:
                unit_net = price
            prepared.append({"Quantity": r["Quantity"], "UnitCostNet": unit_net, "PartyID": pid, "ProductID": r["ProductID"]})

        shares = costing.allocate_extra_costs(prepared, header.get("TotalExtraCosts") or 0)
        for row, add_cost in zip(prepared, shares):
            # фактична собівартість одиниці = нетто + частка/кількість
            if float(row["Quantity"] or 0) > 0 and add_cost:
                unit = money(add_cost / float(row["Quantity"]))
            else:
                unit = 0.0
            costing.insert_cost_record(
                conn,
                product_id=row["ProductID"],
                party_id=row["PartyID"],
                method="arrival_extra",
                calculated_cost=unit,
                user_id=user_id,
                comment=f"Розподіл витрат документа {doc_id}",
            )

    # перезаписати DocumentTaxes для документа (поки що однією сумою ПДВ за документ)
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM dbo.DocumentTaxes WHERE DocumentType=? AND DocumentID=?",
            ("ARRIVAL", doc_id),
        )
        conn.commit()

        # візьмемо перший рядок типової операції, щоб визначити податок і рахунок
        op_entries = typical_ops.get_operation_entries(conn, header.get("TypicalOperationID"))
        if op_entries:
            acc = taxes.get_account_tax(conn, op_entries[0]["DebitAccountID"], on_date=doc_date)
            if acc and float(acc.get("Rate", 0)) > 0 and vat_total > 0:
                # базова сума для податку: нетто по рядках
                base_amount_net = 0.0
                for r in (items or []):
                    price = float(r.get("Price") or 0)
                    q = float(r.get("Quantity") or 0)
                    parts2 = taxes.split_amount_by_vat(
                        price,
                        prices_include_vat=bool(header.get("PricesIncludeVAT")),
                        percent=vat_percent,
                    )
                    base_amount_net += float(parts2["net"]) * q
                taxes.insert_document_tax(
                    conn,
                    document_id=doc_id,
                    document_type="ARRIVAL",
                    tax_id=acc["TaxID"],
                    account_id=acc["AccountID"],
                    base_amount=money(base_amount_net),
                    tax_rate=float(acc["Rate"]),
                    tax_amount=money(vat_total),
                    currency_id=header.get("CurrencyID"),
                    user_id=user_id,
                    comment=f"ПДВ {float(acc['Rate'])}%",
                )
    except Exception:
        # не валимо документ, якщо не вдалося записати податки
        pass

    return party_ids


# ---------------------------
# Public API
# ---------------------------
def _get_default_warehouse_for_center(conn: pyodbc.Connection, center_id: int | None) -> Optional[int]:
    if not center_id:
        return None
    cur = conn.cursor()
    cur.execute(
        """
        SELECT TOP 1 ID
        FROM dbo.Warehouses
        WHERE CenterID = ? AND IsActive = 1
        ORDER BY CASE WHEN ParentID IS NULL THEN 0 ELSE 1 END,
                 CASE WHEN Type='main' THEN 0 ELSE 1 END,
                 ID
        """,
        (center_id,),
    )
    row = cur.fetchone()
    return int(row[0]) if row else None

def _resolve_warehouse_id(
    conn: pyodbc.Connection,
    *,
    center_id: Optional[int],
    warehouse_id: Optional[int | str],
) -> int:
    """Validate or pick a warehouse for the given center. Returns ID or raises ValueError."""
    if not center_id:
        raise ValueError("Вкажіть центр обліку")
    # If provided, verify it exists and belongs to the center
    if warehouse_id not in (None, "", 0, "0"):
        try:
            wid = int(warehouse_id)  # normalize
        except Exception:
            raise ValueError("Некоректний склад")
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM dbo.Warehouses WHERE ID=? AND CenterID=? AND IsActive=1",
            (wid, int(center_id)),
        )
        if cur.fetchone()[0]:
            return wid
        # fallback to default if the passed ID is not valid for this center
    # Pick default for center
    default_wh = _get_default_warehouse_for_center(conn, int(center_id))
    if default_wh is None:
        raise ValueError("Для центру обліку не знайдено доступний склад")
    return default_wh
def save_document(
    conn: pyodbc.Connection,
    payload: Dict[str, Any],
    *,
    editing_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Зберігає документ.
    1) шапка + рядки
    2) фаза складу (партії/рухи/залишки) — одразу при збереженні
    Повертає head + items.
    """
    header = dict(payload)
    header["Number"] = _ensure_number(conn, payload.get("Number", ""), payload["Date"])

    # Валідація шапки
    if not header.get("Date"):
        raise ValueError("Вкажіть дату документа")
    if not header.get("CenterID"):
        raise ValueError("Вкажіть центр обліку")
    # Resolve/validate warehouse against DB (handles missing/invalid)
    header["WarehouseID"] = _resolve_warehouse_id(
        conn,
        center_id=header.get("CenterID"),
        warehouse_id=header.get("WarehouseID"),
    )

    # Простa валідація рядків
    items = payload.get("Items") or []
    if not items:
        raise ValueError("Додайте хоча б один рядок")
    for idx, it in enumerate(items, start=1):
        if not it.get("ProductID"):
            raise ValueError(f"Рядок {idx}: не вказано товар")
        qty_val = it.get("Quantity")
        try:
            qty_num = float(qty_val)
        except Exception:
            raise ValueError(f"Рядок {idx}: некоректна кількість")
        if qty_num <= 0:
            raise ValueError(f"Рядок {idx}: кількість має бути > 0")
        price_val = it.get("Price")
        if price_val is None or (isinstance(price_val, str) and not price_val.strip()):
            raise ValueError(f"Рядок {idx}: вкажіть ціну")
        try:
            price_num = float(price_val)
        except Exception:
            raise ValueError(f"Рядок {idx}: некоректна ціна")
        if price_num < 0:
            raise ValueError(f"Рядок {idx}: ціна не може бути від’ємною")

    if editing_id:
        _update_header(conn, editing_id, header)
        doc_id = editing_id
    else:
        doc_id = _insert_header(conn, header)

    try:
        # рядки
        for r in items:
            r["UserID"] = payload.get("UserID")
        _replace_items(conn, doc_id, items)

        # інвентарна фаза
        _perform_inventory_phase(
            conn,
            doc_id=doc_id,
            header=header,
            items=items,
            user_id=payload.get("UserID"),
        )
    except Exception as e:
        # При помилці під час створення — прибираємо неповний документ
        if not editing_id:
            try:
                delete_document(conn, doc_id)
            except Exception:
                pass
        # Пробуємо повертати контрольовану помилку
        raise ValueError(str(e))

    return get_document(conn, doc_id)


def delete_document(conn: pyodbc.Connection, doc_id: int) -> None:
    # мінімальна перевірка: не видаляти проведені (за потреби)
    cur = conn.cursor()
    # 1) проводки
    cur.execute(f"DELETE FROM {T_POST} WHERE DocumentType='ARRIVAL' AND DocumentID=?", (doc_id,))
    # 2) податки
    cur.execute("DELETE FROM dbo.DocumentTaxes WHERE DocumentType='ARRIVAL' AND DocumentID=?", (doc_id,))
    # 3) пов'язані партії, рухи, залишки, собівартість
    cur.execute("SELECT ID, ProductID, WarehouseID, Quantity FROM dbo.Parties WHERE Comment=?", (f"Arrival {doc_id}",))
    parties = cur.fetchall()
    for p in parties:
        party_id = p.ID
        product_id = p.ProductID
        warehouse_id = p.WarehouseID
        qty_created = float(p.Quantity or 0)
        # рухи
        cur.execute("DELETE FROM dbo.PartyMovements WHERE PartyID=?", (party_id,))
        # відкотити залишок
        inventory.upsert_stock_balance(
            conn,
            product_id=product_id,
            warehouse_id=warehouse_id,
            delta_qty=-qty_created,
            parent_id=None,
            comment=f"ARRIVAL DELETE #{doc_id}",
            user_id=None,
        )
        # собівартість
        cur.execute("DELETE FROM dbo.CostCalculations WHERE PartyID=?", (party_id,))
        # партія
        cur.execute("DELETE FROM dbo.Parties WHERE ID=?", (party_id,))
    # 4) рядки документа та заголовок
    cur.execute(f"DELETE FROM {T_ITM} WHERE DocID=?", (doc_id,))
    cur.execute(f"DELETE FROM {T_ARR} WHERE ID=?", (doc_id,))
    conn.commit()


def conduct_document(conn: pyodbc.Connection, doc_id: int, user_id: Optional[int]) -> List[Dict[str, Any]]:
    """
    Формує та перезаписує проводки згідно з типовою операцією документа.
    Повертає список проводок для UI.
    """
    doc = get_document(conn, doc_id)  # з поточними items
    op_id = doc.get("TypicalOperationID")
    if not op_id:
        return []

    op_entries = typical_ops.get_operation_entries(conn, op_id)

    # базова сума — нетто по рядках (сума Qty*UnitNet). Для %-рядків ledger сам обчислить суму.
    vat_percent = _detect_vat_percent_for_doc(conn, op_id)
    net_total = 0.0
    for r in (doc.get("Items") or []):
        price = float(r.get("Price") or 0)
        if doc.get("PricesIncludeVAT"):
            net_total += taxes.split_amount_by_vat(price, prices_include_vat=True, percent=vat_percent)["net"] * float(r.get("Quantity") or 0)
        else:
            net_total += price * float(r.get("Quantity") or 0)

    # Готуємо проводки із рядків типової операції
    prepared_postings = ledger.postings_from_typical_entries(
        op_entries,
        base_amount=money(net_total),
        tax_percent=vat_percent,
        comment="",
    )

    # Записуємо (видаляємо старі і вставляємо нові)
    ledger.upsert_document_postings(
        conn,
        document_id=doc_id,
        document_type="ARRIVAL",
        postings=prepared_postings,
        currency_id=doc.get("CurrencyID"),
        user_id=user_id,
        comment_prefix=f"Прибуткова {doc.get('Number') or doc_id}",
    )

    # Повертаємо актуальні проводки з БД для UI
    return ledger.get_document_postings(conn, document_id=doc_id, document_type="ARRIVAL")
