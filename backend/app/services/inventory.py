# app/services/inventory.py

from __future__ import annotations

from typing import Dict, Any, List, Iterable

import pyodbc

from .utils import money, qty, now



T_PARTIES   = "dbo.Parties"

T_MOVES     = "dbo.PartyMovements"

T_STOCK     = "dbo.StockBalances"



def create_party(

    conn: pyodbc.Connection,

    *,

    product_id: int,

    warehouse_id: int,

    quantity: float,

    purchase_price: float,

    supplier_id: int | None,

    company_id: int | None,

    date_received,           # datetime/date

    comment: str | None,

    user_id: int | None,

) -> int:

    """

    Створює партію + повертає її ID.

    """

    sql = f"""

      INSERT INTO {T_PARTIES}

        (ProductID, WarehouseID, Quantity, PurchasePrice,

         SupplierID, DateReceived, Status, Comment, CreatedAt, CreatedBy, CompanyID)

      OUTPUT INSERTED.ID

      VALUES (?, ?, ?, ?, ?, ?, 'in_stock', ?, GETDATE(), ?, ?)

    """

    cur = conn.cursor()

    cur.execute(sql, (product_id, warehouse_id, qty(quantity), money(purchase_price),

                      supplier_id, date_received, comment, user_id, company_id))

    pid = cur.fetchone()[0]

    conn.commit()

    return pid



def add_party_movement(

    conn: pyodbc.Connection,

    *,

    party_id: int,

    document_id: int,

    document_type: str,

    movement_type: str,          # 'in' | 'out' | 'reserve' etc

    quantity: float,

    warehouse_id: int,

    comment: str | None,

    user_id: int | None,

    date

) -> int:

    """

    Додає рух по партії (вхід/вихід/резерв).

    """

    sql = f"""

      INSERT INTO {T_MOVES}

        (PartyID, MovementType, Quantity, Date, DocumentID, DocumentType,

         WarehouseID, Comment, CreatedAt, CreatedBy)

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), ?)

    """

    cur = conn.cursor()

    cur.execute(sql, (party_id, movement_type, qty(quantity), date, document_id,

                      document_type, warehouse_id, comment, user_id))

    conn.commit()

    return cur.rowcount



def upsert_stock_balance(

    conn: pyodbc.Connection,

    *,

    product_id: int,

    warehouse_id: int,

    delta_qty: float,

    parent_id: int | None = None,

    comment: str | None = None,

    user_id: int | None = None,

) -> None:

    """

    Збільшує/зменшує залишок у dbo.StockBalances (або створює новий запис).

    """

    # пробуємо оновити

    upd = f"""

      UPDATE {T_STOCK}

         SET Quantity = Quantity + ?,

             UpdatedAt = GETDATE(),

             UpdatedBy = ?

       WHERE ProductID = ? AND WarehouseID = ?

    """

    cur = conn.cursor()

    cur.execute(upd, (qty(delta_qty), user_id, product_id, warehouse_id))

    if cur.rowcount == 0:

        ins = f"""

          INSERT INTO {T_STOCK}

            (ProductID, WarehouseID, Quantity, UpdatedAt, UpdatedBy, Comment, ParentID)

          VALUES (?, ?, ?, GETDATE(), ?, ?, ?)

        """

        cur.execute(ins, (product_id, warehouse_id, qty(delta_qty), user_id, comment, parent_id))

    conn.commit()



def receipt_item(

    conn: pyodbc.Connection,

    *,

    document_id: int,

    document_type: str,

    warehouse_id: int,

    supplier_id: int | None,

    company_id: int | None,

    date,

    user_id: int | None,

    product_id: int,

    quantity: float,

    unit_cost: float,

    comment: str | None = None

) -> int:

    """

    Повний цикл для позиції приходу:

      - створює партію

      - рух 'in'

      - оновлює залишок

    Повертає PartyID.

    """

    party_id = create_party(

        conn,

        product_id=product_id,

        warehouse_id=warehouse_id,

        quantity=quantity,

        purchase_price=unit_cost,

        supplier_id=supplier_id,

        company_id=company_id,

        date_received=date,

        comment=comment,

        user_id=user_id,

    )

    add_party_movement(

        conn,

        party_id=party_id,

        document_id=document_id,

        document_type=document_type,

        movement_type="in",

        quantity=quantity,

        warehouse_id=warehouse_id,

        comment=comment,

        user_id=user_id,

        date=date,

    )

    upsert_stock_balance(

        conn,

        product_id=product_id,

        warehouse_id=warehouse_id,

        delta_qty=quantity,

        parent_id=party_id,

        comment=f"ARRIVAL #{document_id}",

        user_id=user_id,

    )

    return party_id


def upsert_stock_balance(
    conn: pyodbc.Connection,
    *,
    product_id: int,
    warehouse_id: int,
    delta_qty: float,
    user_id: int = 1,
    comment: str | None = None,
    parent_id: int | None = None,
    company_id: int | None = None,
) -> None:
    """
    Збільшує/зменшує залишок у dbo.StockBalances (або створює новий запис).
    Підтримує опційний CompanyID (додається в таблицю, якщо відсутній).
    """

    cur = conn.cursor()

    # ensure CompanyID column exists (best-effort)
    try:
        cur.execute(
            "IF COL_LENGTH('dbo.StockBalances','CompanyID') IS NULL ALTER TABLE dbo.StockBalances ADD CompanyID INT NULL;"
        )
        conn.commit()
    except Exception:
        pass

    # пробуємо оновити з CompanyID
    try:
        upd = f"""
          UPDATE {T_STOCK}
             SET Quantity = Quantity + ?,
                 UpdatedAt = GETDATE(),
                 UpdatedBy = ?
           WHERE ProductID = ? AND WarehouseID = ? AND ISNULL(CompanyID,0)=ISNULL(?,0)
        """
        cur.execute(upd, (qty(delta_qty), user_id, product_id, warehouse_id, company_id or 0))
    except Exception:
        # fallback без CompanyID
        upd = f"""
          UPDATE {T_STOCK}
             SET Quantity = Quantity + ?,
                 UpdatedAt = GETDATE(),
                 UpdatedBy = ?
           WHERE ProductID = ? AND WarehouseID = ?
        """
        cur.execute(upd, (qty(delta_qty), user_id, product_id, warehouse_id))

    if cur.rowcount == 0:
        # вставка з CompanyID (якщо колонка є)
        try:
            ins = f"""
              INSERT INTO {T_STOCK}
                (ProductID, WarehouseID, Quantity, UpdatedAt, UpdatedBy, Comment, ParentID, CompanyID)
              VALUES (?, ?, ?, GETDATE(), ?, ?, ?, ?)
            """
            cur.execute(ins, (product_id, warehouse_id, qty(delta_qty), user_id, comment, parent_id, company_id))
        except Exception:
            ins = f"""
              INSERT INTO {T_STOCK}
                (ProductID, WarehouseID, Quantity, UpdatedAt, UpdatedBy, Comment, ParentID)
              VALUES (?, ?, ?, GETDATE(), ?, ?, ?)
            """
            cur.execute(ins, (product_id, warehouse_id, qty(delta_qty), user_id, comment, parent_id))

    conn.commit()



def receipt_item(

    conn: pyodbc.Connection,

    *,

    document_id: int,

    document_type: str,

    warehouse_id: int,

    supplier_id: int | None,

    company_id: int | None,

    date,

    user_id: int | None,

    product_id: int,

    quantity: float,

    unit_cost: float,

    comment: str | None = None

) -> int:

    """

    Повний цикл для позиції приходу:

      - створює партію

      - рух 'in'

      - оновлює залишок

    Повертає PartyID.

    """

    party_id = create_party(

        conn,

        product_id=product_id,

        warehouse_id=warehouse_id,

        quantity=quantity,

        purchase_price=unit_cost,

        supplier_id=supplier_id,

        company_id=company_id,

        date_received=date,

        comment=comment,

        user_id=user_id,

    )

    add_party_movement(

        conn,

        party_id=party_id,

        document_id=document_id,

        document_type=document_type,

        movement_type="in",

        quantity=quantity,

        warehouse_id=warehouse_id,

        comment=comment,

        user_id=user_id,

        date=date,

    )

    upsert_stock_balance(

        conn,

        product_id=product_id,

        warehouse_id=warehouse_id,

        delta_qty=quantity,

        parent_id=party_id,

        comment=f"ARRIVAL #{document_id}",

        user_id=user_id,

    )

    return party_id

