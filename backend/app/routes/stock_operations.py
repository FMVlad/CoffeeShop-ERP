from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
import pyodbc

from app.db_connection import get_db

router = APIRouter()


def _get_system_param(cur, key: str, default: Optional[str] = None) -> Optional[str]:
    try:
        cur.execute("SELECT ParamValue FROM SystemParameters WHERE ParamKey=?", (key,))
        row = cur.fetchone()
        return str(row[0]) if row and row[0] is not None else default
    except Exception:
        return default


def _get_warehouse_id(cur, center_id: int, w_type: str) -> Optional[int]:
    row = cur.execute(
        "SELECT TOP 1 ID FROM Warehouses WHERE CenterID=? AND Type=? AND IsActive=1 ORDER BY ID",
        (center_id, w_type),
    ).fetchone()
    return int(row[0]) if row else None


def _ean13_checksum(body12: str) -> str:
    odd_sum = sum(int(body12[i]) for i in range(0, 12, 2))
    even_sum = sum(int(body12[i]) for i in range(1, 12, 2))
    total = odd_sum + even_sum * 3
    return str((10 - (total % 10)) % 10)








@router.post("/stock/transfer")
def transfer_between_centers(payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    """
    Спрощене переміщення між головними складами центрів (без FIFO/партій).
    payload = { from_center_id: int, to_center_id: int, product_id: int, quantity: float, comment?: str }
    """
    from_center = int(payload.get("from_center_id") or 0)
    to_center = int(payload.get("to_center_id") or 0)
    product_id = int(payload.get("product_id") or 0)
    quantity = float(payload.get("quantity") or 0)
    if not from_center or not to_center or not product_id or quantity <= 0:
        raise HTTPException(400, "from_center_id, to_center_id, product_id, quantity обов'язкові")

    cur = db.cursor()
    wh_from = _get_warehouse_id(cur, from_center, "main")
    wh_to = _get_warehouse_id(cur, to_center, "main")
    if not wh_from or not wh_to:
        raise HTTPException(400, "Не знайдено головні склади для центрів")

    from app.services import inventory
    try:
        inventory.upsert_stock_balance(db, product_id=product_id, warehouse_id=wh_from, delta_qty=-abs(quantity), comment="TRANSFER out")
        inventory.upsert_stock_balance(db, product_id=product_id, warehouse_id=wh_to, delta_qty=abs(quantity), comment="TRANSFER in")
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Помилка переміщення: {e}")

    return {"ok": True, "from_warehouse_id": wh_from, "to_warehouse_id": wh_to}


