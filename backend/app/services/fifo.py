from __future__ import annotations

from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal, ROUND_HALF_UP
import datetime as dt

import pyodbc


def _has_table(db: pyodbc.Connection, table_name: str) -> bool:
    try:
        cur = db.cursor()
        cur.execute("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?", (table_name,))
        return cur.fetchone() is not None
    except Exception:
        return False


def _has_column(db: pyodbc.Connection, table_name: str, column_name: str) -> bool:
    try:
        cur = db.cursor()
        cur.execute(
            "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?",
            (table_name, column_name),
        )
        return cur.fetchone() is not None
    except Exception:
        return False


def _money(x: Decimal | float | int) -> float:
    d = Decimal(str(x))
    return float(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _qty(x: Decimal | float | int) -> float:
    d = Decimal(str(x))
    return float(d.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP))


def _get_issue_unallocated(db: pyodbc.Connection, movement_id: int, total_qty: float) -> float:
    cur = db.cursor()
    try:
        cur.execute("SELECT ISNULL(SUM(AllocQty),0) FROM MovementAllocations WHERE MovementID = ?", (movement_id,))
        allocated = float(cur.fetchone()[0] or 0)
    except Exception:
        allocated = 0.0
    left = _qty(float(total_qty) - allocated)
    return max(left, 0.0)


def _iter_open_parties_fifo(
    db: pyodbc.Connection,
    *,
    product_id: int,
    warehouse_id: int,
    on_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Return open parties ordered FIFO with remaining qty and unit costs.

    If `RemainingQty` column exists, use it. Otherwise compute from allocations.
    If `on_date` provided (YYYY-MM-DD), consider allocations only up to that date.
    """
    cur = db.cursor()

    use_remaining = _has_column(db, "Parties", "RemainingQty")
    cols = "ID, Quantity, PurchasePrice, DateReceived"
    if _has_column(db, "Parties", "NetPurchasePrice"):
        cols += ", NetPurchasePrice"
    else:
        cols += ", NULL AS NetPurchasePrice"
    if _has_column(db, "Parties", "VatRate"):
        cols += ", VatRate"
    else:
        cols += ", NULL AS VatRate"

    cur.execute(
        f"SELECT {cols} FROM Parties WHERE ProductID=? AND WarehouseID=? ORDER BY DateReceived, ID",
        (product_id, warehouse_id),
    )
    parties = []
    rows = cur.fetchall() or []
    for r in rows:
        pid = int(r[0])
        qty_total = float(r[1] or 0)
        price_gross = float(r[2] or 0)
        net_val = r[4]
        vat_rate = r[5]
        if vat_rate is None:
            vat_rate = 0.0
        else:
            vat_rate = float(vat_rate)

        if use_remaining:
            # If RemainingQty exists, prefer it
            # But some schemas may not auto-maintain yet; compute if zero
            try:
                c2 = db.cursor()
                c2.execute("SELECT RemainingQty FROM Parties WHERE ID=?", (pid,))
                rem = float(c2.fetchone()[0] or 0)
            except Exception:
                rem = qty_total
        else:
            # Compute remaining as Quantity - allocations
            if on_date:
                c2 = db.cursor()
                c2.execute(
                    (
                        "SELECT ISNULL(SUM(ma.AllocQty),0) FROM MovementAllocations ma "
                        "JOIN PartyMovements pm ON pm.ID = ma.MovementID "
                        "WHERE ma.PartyID = ? AND CONVERT(date, pm.[Date]) <= ?"
                    ),
                    (pid, on_date),
                )
            else:
                c2 = db.cursor()
                c2.execute("SELECT ISNULL(SUM(AllocQty),0) FROM MovementAllocations WHERE PartyID = ?", (pid,))
            allocated = float(c2.fetchone()[0] or 0)
            rem = _qty(qty_total - allocated)

        if rem <= 0:
            continue

        # Determine unit net
        if net_val is not None:
            unit_net = float(net_val or 0)
        else:
            if price_gross and vat_rate:
                unit_net = float(Decimal(str(price_gross)) / (Decimal("1") + Decimal(str(vat_rate)) / Decimal("100")))
                unit_net = _money(unit_net)
            else:
                unit_net = price_gross

        parties.append({
            "PartyID": pid,
            "Remaining": rem,
            "UnitCostGross": _money(price_gross),
            "UnitCostNet": _money(unit_net),
        })

    return parties


def allocate_fifo_for_range(
    db: pyodbc.Connection,
    *,
    date_from: str,
    date_to: str,
    product_id: Optional[int] = None,
    center_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Allocate all issue movements FIFO in the date range. Returns stats."""

    if not _has_table(db, "MovementAllocations"):
        raise ValueError("Table MovementAllocations not found")

    # Select candidate issues
    where = ["pm.MovementType IN ('issue','out','sale','consumption')",
             "CONVERT(date, pm.[Date]) >= ?", "CONVERT(date, pm.[Date]) <= ?"]
    params: List[Any] = [date_from, date_to]
    if warehouse_id:
        where.append("pm.WarehouseID = ?")
        params.append(warehouse_id)
    if product_id:
        where.append("p.ProductID = ?")
        params.append(product_id)
    if center_id:
        where.append("w.CenterID = ?")
        params.append(center_id)

    where_sql = " AND ".join(where)
    sql = (
        "SELECT pm.ID, pm.PartyID, pm.Quantity, pm.[Date], pm.WarehouseID, p.ProductID "
        "FROM PartyMovements pm "
        "JOIN Parties p ON p.ID = pm.PartyID "
        "LEFT JOIN Warehouses w ON w.ID = pm.WarehouseID "
        f"WHERE {where_sql} "
        "ORDER BY pm.[Date], pm.ID"
    )

    cur = db.cursor()
    cur.execute(sql, tuple(params))
    issues = cur.fetchall() or []

    total_alloc_lines = 0
    total_alloc_qty = 0.0

    for row in issues:
        move_id = int(row[0])
        party_id = int(row[1])  # party from which issue was recorded (may be placeholder)
        qty_total = float(row[2] or 0)
        on_date = str(row[3])[:10]
        wh_id = int(row[4]) if row[4] is not None else None
        prod_id = int(row[5])

        unalloc = _get_issue_unallocated(db, move_id, qty_total)
        if unalloc <= 0:
            continue

        # Collect open parties for product/warehouse
        parties = _iter_open_parties_fifo(db, product_id=prod_id, warehouse_id=wh_id, on_date=on_date)
        left = unalloc
        for pr in parties:
            if left <= 0:
                break
            take = min(left, pr["Remaining"])
            if take <= 0:
                continue

            # Insert allocation
            cur2 = db.cursor()
            cur2.execute(
                "INSERT INTO MovementAllocations (MovementID, PartyID, AllocQty, UnitCostNet, UnitCostGross) VALUES (?, ?, ?, ?, ?)",
                (move_id, pr["PartyID"], _qty(take), _money(pr["UnitCostNet"]), _money(pr["UnitCostGross"]))
            )

            # Update party remaining if column exists
            if _has_column(db, "Parties", "RemainingQty"):
                # Close if near zero
                cur2.execute("UPDATE Parties SET RemainingQty = RemainingQty - ? WHERE ID = ?", (_qty(take), pr["PartyID"]))
                if _has_column(db, "Parties", "IsClosed") and _has_column(db, "Parties", "ClosedAt"):
                    # Close if <= 0.000001
                    cur2.execute(
                        "UPDATE Parties SET IsClosed = CASE WHEN RemainingQty <= 0.000001 THEN 1 ELSE IsClosed END, "
                        "ClosedAt = CASE WHEN RemainingQty <= 0.000001 THEN GETDATE() ELSE ClosedAt END WHERE ID = ?",
                        (pr["PartyID"],)
                    )

            left = _qty(left - take)
            total_alloc_lines += 1
            total_alloc_qty += take

        db.commit()

    return {"IssuesProcessed": len(issues), "AllocLines": total_alloc_lines, "AllocQty": _qty(total_alloc_qty)}


