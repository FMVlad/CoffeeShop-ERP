# app/routes/arrival_documents.py
from __future__ import annotations
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
import pyodbc

from app.db_connection import get_db  # твій файл
from app.services import arrival_service as svc

router = APIRouter(prefix="/arrival-documents", tags=["arrival-documents"])


# ---------------------------
# List
# ---------------------------
@router.get("")
def list_arrival_documents(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    db: pyodbc.Connection = Depends(get_db),
):
    try:
        return svc.list_documents(db, date_from=date_from, date_to=date_to, supplier_id=supplier_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------
# Get one
# ---------------------------
@router.get("/{doc_id}")
def get_arrival_document(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    try:
        return svc.get_document(db, doc_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Документ не знайдено")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------
# Create
# ---------------------------
@router.post("")
def create_arrival_document(
    payload: Dict[str, Any],
    user_id: Optional[int] = Query(None),
    db: pyodbc.Connection = Depends(get_db),
):
    try:
        if user_id is not None:
            payload = dict(payload)
            payload["UserID"] = user_id
        return svc.save_document(db, payload, editing_id=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Якщо це FK або інша БД-помилка, конвертуємо у 400 з human-readable detail
        msg = str(e)
        if "FK_Parties_Warehouses" in msg:
            # На цей момент в лоґах повинні бути CenterID/WarehouseID
            raise HTTPException(
                status_code=400,
                detail="Некоректний склад: перевірте, що у вибраному центрі є активний головний склад",
            )
        raise HTTPException(status_code=400, detail=msg)


# ---------------------------
# Update
# ---------------------------
@router.put("/{doc_id}")
def update_arrival_document(
    doc_id: int,
    payload: Dict[str, Any],
    user_id: Optional[int] = Query(None),
    db: pyodbc.Connection = Depends(get_db),
):
    try:
        if user_id is not None:
            payload = dict(payload)
            payload["UserID"] = user_id
        return svc.save_document(db, payload, editing_id=doc_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------
# Delete
# ---------------------------
@router.delete("/{doc_id}")
def delete_arrival_document(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    try:
        svc.delete_document(db, doc_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------
# Conduct / Провести
# ---------------------------
@router.post("/{doc_id}/postings")
def conduct_arrival_document(
    doc_id: int,
    user_id: Optional[int] = Query(None),
    db: pyodbc.Connection = Depends(get_db),
):
    try:
        postings = svc.conduct_document(db, doc_id, user_id=user_id)
        return {"ok": True, "Postings": postings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
