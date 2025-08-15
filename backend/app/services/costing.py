# app/services/costing.py
from __future__ import annotations
from typing import List, Dict, Any
import pyodbc
from .utils import money, qty

T_COST = "dbo.CostCalculations"

def allocate_extra_costs(items: List[Dict[str, Any]], total_extra: float) -> List[float]:
    """
    Пропорційний розподіл додаткових витрат між позиціями за нетто-сумою.
    Повертає список сум на кожний рядок (у тій самій послідовності).
    """
    net_sums = [money((i.get("Quantity") or 0) * (i.get("UnitCostNet") or i.get("Price") or 0)) for i in items]
    base = sum(net_sums) or 1.0
    res: List[float] = []
    left = money(total_extra)
    for n in net_sums[:-1]:
        part = money(total_extra * (n / base))
        res.append(part)
        left = money(left - part)
    res.append(left)  # хвіст
    return res

def insert_cost_record(
    conn: pyodbc.Connection,
    *,
    product_id: int,
    party_id: int,
    method: str,
    calculated_cost: float,
    user_id: int | None,
    comment: str | None = None
) -> int:
    sql = f"""
      INSERT INTO {T_COST}
        (ProductID, PartyID, Method, CalculatedCost, CalculationDate, CreatedBy, Comment)
      VALUES (?, ?, ?, ?, GETDATE(), ?, ?)
    """
    cur = conn.cursor()
    cur.execute(sql, (product_id, party_id, method, money(calculated_cost), user_id, comment))
    conn.commit()
    return cur.rowcount
