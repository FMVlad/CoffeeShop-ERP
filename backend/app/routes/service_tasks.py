from __future__ import annotations

from typing import Any, Dict, Optional
from datetime import date, timedelta
import json

import pyodbc
from fastapi import APIRouter, Depends, HTTPException

from app.db_connection import get_db
from .costing import run_costing  # reuse allocation logic


router = APIRouter(prefix="/service-tasks", tags=["service-tasks"])


def _fetch_one(db: pyodbc.Connection, sql: str, params: tuple = ()) -> Optional[pyodbc.Row]:
    cur = db.cursor()
    cur.execute(sql, params)
    return cur.fetchone()


@router.get("")
def list_tasks(db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor()
    try:
        cur.execute(
            "SELECT ID, TaskKey, TaskType, Enabled, DailyTime, RunEveryMin, DaysMask, NextRunAt, LastRunAt, MaxRetries, ParamsJson "
            "FROM dbo.ServiceTasks ORDER BY TaskKey"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    rows = cur.fetchall() or []
    res: list[dict[str, Any]] = []
    for r in rows:
        res.append({
            "ID": int(r[0]),
            "TaskKey": r[1],
            "TaskType": r[2],
            "Enabled": bool(r[3]),
            "DailyTime": r[4],
            "RunEveryMin": r[5],
            "DaysMask": r[6],
            "NextRunAt": r[7],
            "LastRunAt": r[8],
            "MaxRetries": r[9],
            "ParamsJson": r[10],
        })
    return res


@router.get("/{task_key}")
def get_task(task_key: str, db: pyodbc.Connection = Depends(get_db)):
    row = _fetch_one(db, "SELECT ID, TaskKey, TaskType, Enabled, DailyTime, ParamsJson FROM dbo.ServiceTasks WHERE TaskKey=?", (task_key,))
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "ID": int(row[0]),
        "TaskKey": row[1],
        "TaskType": row[2],
        "Enabled": bool(row[3]),
        "DailyTime": row[4],
        "ParamsJson": row[5],
    }


@router.post("/{task_key}")
def upsert_task(task_key: str, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    task_type = payload.get("TaskType") or "costing_fifo"
    enabled = 1 if payload.get("Enabled", False) else 0
    daily_time = payload.get("DailyTime")
    params_json = payload.get("ParamsJson")
    cur = db.cursor()
    try:
        cur.execute("UPDATE dbo.ServiceTasks SET TaskType=?, Enabled=?, DailyTime=?, ParamsJson=? WHERE TaskKey=?",
                    (task_type, enabled, daily_time, params_json, task_key))
        if cur.rowcount == 0:
            cur.execute(
                "INSERT INTO dbo.ServiceTasks (TaskKey, TaskType, Enabled, DailyTime, ParamsJson) VALUES (?, ?, ?, ?, ?)",
                (task_key, task_type, enabled, daily_time, params_json),
            )
        db.commit()
        return {"ok": True, "TaskKey": task_key}
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))


def _resolve_range_from_params(db: pyodbc.Connection, params_json: Optional[str]) -> tuple[str, str]:
    today = date.today()
    y = today - timedelta(days=1)
    default_from = y.strftime("%Y-%m-%d")
    default_to = y.strftime("%Y-%m-%d")

    if not params_json:
        return (default_from, default_to)
    try:
        params = json.loads(params_json)
    except Exception:
        return (default_from, default_to)

    strategy = (params.get("strategy") or "yesterday").lower()
    if strategy == "yesterday":
        return (default_from, default_to)
    if strategy == "range":
        return (params.get("from") or default_from, params.get("to") or default_to)
    if strategy == "dirty_from":
        # take min(dirty_from, provided from) → to = yesterday
        dirty = _fetch_one(db, "SELECT ParamValue FROM dbo.SystemParameters WHERE ParamKey='CostingDirtyFrom'")
        start = (params.get("from") or (dirty[0] if dirty and dirty[0] else default_from))
        return (start, default_to)
    return (default_from, default_to)


@router.post("/{task_key}/run-now")
def run_now(task_key: str, db: pyodbc.Connection = Depends(get_db)):
    row = _fetch_one(db, "SELECT ID, TaskType, ParamsJson FROM dbo.ServiceTasks WHERE TaskKey=?", (task_key,))
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    task_id = int(row[0])
    task_type = row[1]
    params_json = row[2]

    if task_type != "costing_fifo":
        raise HTTPException(status_code=400, detail="Unsupported TaskType for run-now")

    fr, to = _resolve_range_from_params(db, params_json)

    # parse filter params if provided
    prod_id = None
    center_id = None
    wh_id = None
    try:
        p = json.loads(params_json or "{}")
        prod_id = p.get("product_id")
        center_id = p.get("center_id")
        wh_id = p.get("warehouse_id")
    except Exception:
        pass

    # run allocation
    result = run_costing(fr, to, prod_id, center_id, wh_id, db)  # reuse function directly

    # log run
    try:
        cur = db.cursor()
        cur.execute(
            "INSERT INTO dbo.ServiceTaskRuns (TaskID, Status, Message, ResultJson) VALUES (?, 'success', ?, ?)",
            (task_id, f"Run {fr}..{to}", json.dumps(result)),
        )
        cur.execute("UPDATE dbo.ServiceTasks SET LastRunAt=GETDATE() WHERE ID=?", (task_id,))
        db.commit()
    except Exception:
        pass

    return {"ok": True, "range": {"from": fr, "to": to}, "result": result}


