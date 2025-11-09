from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List
import pyodbc

from app.db_connection import get_db

router = APIRouter(prefix="/payment-defaults", tags=["payment-defaults"])


def _ensure_table(db: pyodbc.Connection) -> None:
    """Перевіряємо наявність таблиці EmployeeSettlementDefaults."""
    try:
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT 1
            FROM sys.objects
            WHERE object_id = OBJECT_ID('dbo.EmployeeSettlementDefaults')
              AND type in ('U')
            """
        )
        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Таблиця dbo.EmployeeSettlementDefaults відсутня. "
                    "Створіть її в базі даних перед роботою з налаштуваннями. "
                    "Приклад SQL дивись у документації або звернись до розробника."
                )
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(500, "Не вдалося перевірити наявність таблиці EmployeeSettlementDefaults")


def _validate_positive_int(value: Any, field_name: str) -> int:
    try:
        intval = int(value)
        if intval <= 0:
            raise ValueError
        return intval
    except (TypeError, ValueError):
        raise HTTPException(400, f"{field_name} повинен бути додатним цілим числом")


@router.get("/settlement", response_model=List[Dict[str, Any]])
def list_settlement_defaults(
    employee_id: int = Query(..., description="ID співробітника"),
    center_id: int = Query(..., description="ID центру обліку"),
    db: pyodbc.Connection = Depends(get_db)
):
    """Повертає список прив'язок підприємство → розрахунковий рахунок за замовчуванням."""
    _ensure_table(db)
    employee_id = _validate_positive_int(employee_id, "employee_id")
    center_id = _validate_positive_int(center_id, "center_id")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT CompanyID, SettlementAccountID, UpdatedAt, UpdatedBy
        FROM dbo.EmployeeSettlementDefaults
        WHERE EmployeeID = ? AND CenterID = ?
        ORDER BY CompanyID
        """,
        (employee_id, center_id)
    )
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


@router.post("/settlement")
def upsert_settlement_default(data: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    """Створює або оновлює налаштування рахунку за замовчуванням для пари співробітник+центр+підприємство."""
    _ensure_table(db)

    employee_id = _validate_positive_int(data.get("EmployeeID"), "EmployeeID")
    center_id = _validate_positive_int(data.get("CenterID"), "CenterID")
    company_id = _validate_positive_int(data.get("CompanyID"), "CompanyID")
    account_id = _validate_positive_int(data.get("SettlementAccountID"), "SettlementAccountID")
    updated_by = data.get("UpdatedBy")

    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE dbo.EmployeeSettlementDefaults
        SET SettlementAccountID = ?, UpdatedAt = GETDATE(), UpdatedBy = ?
        WHERE EmployeeID = ? AND CenterID = ? AND CompanyID = ?
        """,
        (account_id, updated_by, employee_id, center_id, company_id)
    )
    if cursor.rowcount == 0:
        cursor.execute(
            """
            INSERT INTO dbo.EmployeeSettlementDefaults
            (EmployeeID, CenterID, CompanyID, SettlementAccountID, UpdatedAt, UpdatedBy)
            VALUES (?, ?, ?, ?, GETDATE(), ?)
            """,
            (employee_id, center_id, company_id, account_id, updated_by)
        )
    db.commit()
    return {"ok": True}


@router.delete("/settlement")
def delete_settlement_default(
    employee_id: int = Query(...),
    center_id: int = Query(...),
    company_id: int = Query(...),
    db: pyodbc.Connection = Depends(get_db)
):
    """Видаляє налаштування рахунку за замовчуванням."""
    _ensure_table(db)
    employee_id = _validate_positive_int(employee_id, "employee_id")
    center_id = _validate_positive_int(center_id, "center_id")
    company_id = _validate_positive_int(company_id, "company_id")

    cursor = db.cursor()
    cursor.execute(
        """
        DELETE FROM dbo.EmployeeSettlementDefaults
        WHERE EmployeeID = ? AND CenterID = ? AND CompanyID = ?
        """,
        (employee_id, center_id, company_id)
    )
    db.commit()
    return {"ok": True, "deleted": cursor.rowcount}

