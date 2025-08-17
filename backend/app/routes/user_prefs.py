from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()


def _ensure_table(db):
    cur = db.cursor()
    cur.execute(
        """
        IF OBJECT_ID('dbo.UserTablePrefs', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.UserTablePrefs (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                EmployeeID INT NOT NULL,
                PrefKey NVARCHAR(100) NOT NULL,
                PrefJson NVARCHAR(MAX) NULL,
                UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
            );
            CREATE UNIQUE INDEX UX_UserTablePrefs_Emp_Key ON dbo.UserTablePrefs(EmployeeID, PrefKey);
        END
        """
    )
    db.commit()


@router.get("/user-prefs")
def get_user_prefs(employee_id: int, pref_key: str | None = None, db=Depends(get_db)):
    _ensure_table(db)
    cur = db.cursor()
    if pref_key:
        cur.execute(
            "SELECT PrefJson FROM UserTablePrefs WHERE EmployeeID=? AND PrefKey=?",
            (employee_id, pref_key),
        )
        row = cur.fetchone()
        return {"PrefKey": pref_key, "PrefJson": (row[0] if row else None)}
    cur.execute(
        "SELECT PrefKey, PrefJson FROM UserTablePrefs WHERE EmployeeID=?",
        (employee_id,),
    )
    return {r[0]: r[1] for r in cur.fetchall()}


@router.post("/user-prefs")
def upsert_user_pref(data: dict, db=Depends(get_db)):
    _ensure_table(db)
    employee_id = data.get("EmployeeID")
    pref_key = data.get("PrefKey")
    pref_json = data.get("PrefJson")
    if not employee_id or not pref_key:
        raise HTTPException(400, "EmployeeID and PrefKey are required")
    cur = db.cursor()
    cur.execute(
        "SELECT ID FROM UserTablePrefs WHERE EmployeeID=? AND PrefKey=?",
        (employee_id, pref_key),
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
        "INSERT INTO UserTablePrefs(EmployeeID, PrefKey, PrefJson) VALUES(?, ?, ?)",
        (employee_id, pref_key, pref_json),
    )
    db.commit()
    return {"created": True}


