from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Any, Dict, List
import pyodbc

from app.db_connection import get_db


router = APIRouter(prefix="/typical-operation-bindings", tags=["typical-operation-bindings"])


def _fetch_one(db, sql, params=()):
    cur = db.cursor(); cur.execute(sql, params); return cur.fetchone()


@router.get("")
def list_bindings(
    operation_id: Optional[int] = Query(None),
    document_type: Optional[str] = Query(None),
    db: pyodbc.Connection = Depends(get_db)
):
    where: List[str] = []
    p: List[Any] = []
    if operation_id:
        where.append("OperationID=?"); p.append(operation_id)
    if document_type:
        where.append("DocumentType=?"); p.append(document_type)
    sql = "SELECT ID, OperationID, DocumentType, CenterID, CompanyID, IsDefault, Priority, IsActive, CreatedAt FROM TypicalOperationBindings"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY IsActive DESC, IsDefault DESC, Priority, ID DESC"
    cur = db.cursor(); cur.execute(sql, tuple(p))
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


@router.post("")
def upsert_binding(payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    op_id = payload.get("OperationID")
    doc_type = payload.get("DocumentType")
    is_default = 1 if payload.get("IsDefault") else 0
    if not op_id or not doc_type:
        raise HTTPException(400, "OperationID і DocumentType обов'язкові")
    # Проста вставка, якщо хочеш update — передавай ID
    cur = db.cursor()
    if payload.get("ID"):
        cur.execute(
            "UPDATE TypicalOperationBindings SET OperationID=?, DocumentType=?, IsDefault=?, IsActive=1 WHERE ID=?",
            (op_id, doc_type, is_default, payload.get("ID"))
        )
    else:
        cur.execute(
            "INSERT INTO TypicalOperationBindings(OperationID, DocumentType, IsDefault, Priority, IsActive) VALUES (?,?,?,100,1)",
            (op_id, doc_type, is_default)
        )
    db.commit()
    return {"ok": True}


@router.delete("/{binding_id}")
def delete_binding(binding_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); cur.execute("DELETE FROM TypicalOperationBindings WHERE ID=?", (binding_id,)); db.commit(); return {"ok": True}
















