from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()


def _has_column(db, table: str, column: str) -> bool:
    cur = db.cursor()
    row = cur.execute(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=? AND COLUMN_NAME=?",
        (table, column),
    ).fetchone()
    return bool(row)


def _ensure_table(db):
    cur = db.cursor()
    cur.execute(
        """
        IF OBJECT_ID('dbo.UserTablePrefs', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.UserTablePrefs (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                EmployeeID INT NULL,
                UserID INT NULL,
                PrefKey NVARCHAR(100) NOT NULL,
                PrefJson NVARCHAR(MAX) NULL,
                UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
            );
            CREATE INDEX IX_UserTablePrefs_Emp ON dbo.UserTablePrefs(EmployeeID);
            CREATE INDEX IX_UserTablePrefs_User ON dbo.UserTablePrefs(UserID);
        END
        """
    )
    db.commit()


def _id_col(db) -> str:
    # Підтримуємо обидва варіанти схеми: EmployeeID або UserID
    if _has_column(db, "UserTablePrefs", "EmployeeID"):
        return "EmployeeID"
    return "UserID"


@router.get("/user-prefs")
def get_user_prefs(employee_id: int | None = None, user_id: int | None = None, pref_key: str | None = None, db=Depends(get_db)):
    _ensure_table(db)
    cur = db.cursor()
    id_value = employee_id or user_id
    col = _id_col(db)
    if not id_value:
        raise HTTPException(400, "employee_id (або user_id) обовʼязковий")
    if pref_key:
        cur.execute(
            f"SELECT PrefJson FROM UserTablePrefs WHERE {col}=? AND PrefKey=?",
            (id_value, pref_key),
        )
        row = cur.fetchone()
        return {"PrefKey": pref_key, "PrefJson": (row[0] if row else None)}
    cur.execute(
        f"SELECT PrefKey, PrefJson FROM UserTablePrefs WHERE {col}=?",
        (id_value,),
    )
    return {r[0]: r[1] for r in cur.fetchall()}


@router.post("/user-prefs")
def upsert_user_pref(data: dict, db=Depends(get_db)):
    _ensure_table(db)
    employee_id = data.get("EmployeeID")
    user_id = data.get("UserID")
    pref_key = data.get("PrefKey")
    pref_json = data.get("PrefJson")
    id_value = employee_id or user_id
    if not id_value or not pref_key:
        raise HTTPException(400, "EmployeeID/UserID та PrefKey обовʼязкові")
    cur = db.cursor()
    col = _id_col(db)
    cur.execute(
        f"SELECT ID FROM UserTablePrefs WHERE {col}=? AND PrefKey=?",
        (id_value, pref_key),
    )
    row = cur.fetchone()
    if row:
        cur.execute(
            "UPDATE UserTablePrefs SET PrefJson=?, UpdatedAt=GETDATE() WHERE ID=?",
            (pref_json, row[0]),
        )
        db.commit()
        return {"updated": True}
    cur.execute(
        f"INSERT INTO UserTablePrefs({col}, PrefKey, PrefJson) VALUES(?, ?, ?)",
        (id_value, pref_key, pref_json),
    )
    db.commit()
    return {"created": True}


