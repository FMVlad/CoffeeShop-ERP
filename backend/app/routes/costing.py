from __future__ import annotations

from typing import Optional, Dict, Any
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
import pyodbc

from app.db_connection import get_db
from app.services.fifo import allocate_fifo_for_range


router = APIRouter(prefix="/costing", tags=["costing"])


@router.post("/run")
def run_costing(
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD; default = yesterday"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD; default = yesterday"),
    product_id: Optional[int] = None,
    center_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: pyodbc.Connection = Depends(get_db),
):
    try:
        if not from_date or not to_date:
            y = date.today() - timedelta(days=1)
            if not from_date:
                from_date = y.strftime("%Y-%m-%d")
            if not to_date:
                to_date = y.strftime("%Y-%m-%d")
        stats = allocate_fifo_for_range(
            db,
            date_from=from_date,
            date_to=to_date,
            product_id=product_id,
            center_id=center_id,
            warehouse_id=warehouse_id,
        )
        return {"ok": True, "range": {"from": from_date, "to": to_date}, "stats": stats}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



