from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

@router.get("/employees")
def get_employees(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT e.ID, e.LastName, e.FirstName, e.MiddleName, e.Phone, e.Email, e.Position, e.HireDate, e.DismissDate, e.Barcode
        FROM Employees e
        ORDER BY e.ID
    """)
    columns = [col[0] for col in cursor.description]
    employees = [dict(zip(columns, row)) for row in cursor.fetchall()]

    for emp in employees:
        cursor.execute("""
            SELECT
                cr.CenterID, c.Name as CenterName,
                cr.CashboxID, cb.Name as CashboxName,
                cr.RoleID, r.RoleName
            FROM EmployeeCashboxRoles cr
            JOIN CentersOfAccounting c ON cr.CenterID = c.ID
            JOIN Cashboxes cb ON cb.ID = cr.CashboxID
            JOIN Roles r ON r.ID = cr.RoleID
            WHERE cr.EmployeeID = ?
            ORDER BY cr.CenterID, cr.CashboxID, cr.RoleID
        """, (emp["ID"],))
        rows = cursor.fetchall()
        emp["CentersRoles"] = [
            {
                "CenterID": r[0],
                "CenterName": r[1],
                "CashboxID": r[2],
                "CashboxName": r[3],
                "RoleID": r[4],
                "RoleName": r[5],
            }
            for r in rows
        ]
        # Додаємо унікальний список назв центрів для швидкого фронта
        emp["CentersNames"] = list({r[1] for r in rows if r[1]})

    return employees

@router.get("/employees/{id}")
def get_employee(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, LastName, FirstName, MiddleName, Phone, Email, Position, HireDate, DismissDate, Barcode, Notes
        FROM Employees WHERE ID=?
    """, (id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(404, "Employee not found")
    columns = [col[0] for col in cursor.description]
    emp = dict(zip(columns, row))

    cursor.execute("""
        SELECT
            cr.ID, cr.CenterID, c.Name as CenterName,
            cr.CashboxID, cb.Name as CashboxName,
            cr.RoleID, r.RoleName
        FROM EmployeeCashboxRoles cr
            JOIN CentersOfAccounting c ON c.ID = cr.CenterID
            JOIN Cashboxes cb ON cb.ID = cr.CashboxID
            JOIN Roles r ON r.ID = cr.RoleID
        WHERE cr.EmployeeID=?
        ORDER BY cr.CenterID, cr.CashboxID, cr.RoleID
    """, (id,))
    rows = cursor.fetchall()
    emp["CashboxRoles"] = [
        {
            "ID": r[0],
            "CenterID": r[1],
            "CenterName": r[2],
            "CashboxID": r[3],
            "CashboxName": r[4],
            "RoleID": r[5],
            "RoleName": r[6]
        }
        for r in rows
    ]
    emp["CentersNames"] = list({r[2] for r in rows if r[2]})

    return emp

@router.post("/employees")
def create_employee(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    # Валідація: унікальний email/телефон
    email = data.get("Email")
    phone = data.get("Phone")
    cursor.execute("SELECT COUNT(*) FROM Employees WHERE Email=? OR Phone=?", (email, phone))
    if cursor.fetchone()[0] > 0:
        raise HTTPException(400, "Employee з таким email або телефоном вже існує!")

    cursor.execute("""
        INSERT INTO Employees (LastName, FirstName, MiddleName, Phone, Email, Position, HireDate, DismissDate, Barcode, Notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("LastName"),
        data.get("FirstName"),
        data.get("MiddleName"),
        phone,
        email,
        data.get("Position"),
        data.get("HireDate"),
        data.get("DismissDate"),
        data.get("Barcode"),
        data.get("Notes"),
    ))
    cursor.execute("SELECT SCOPE_IDENTITY()")
    employee_id = cursor.fetchone()[0]

    for row in data.get("CashboxRoles", []):
        cursor.execute("""
            INSERT INTO EmployeeCashboxRoles (EmployeeID, CenterID, CashboxID, RoleID)
            VALUES (?, ?, ?, ?)
        """, (
            employee_id,
            row["CenterID"],
            row["CashboxID"],
            row["RoleID"]
        ))

    db.commit()
    return {"success": True, "employee_id": employee_id}

@router.put("/employees/{id}")
def update_employee(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Employees
        SET LastName=?, FirstName=?, MiddleName=?, Phone=?, Email=?, Position=?, HireDate=?, DismissDate=?, Barcode=?, Notes=?
        WHERE ID=?
    """, (
        data.get("LastName"),
        data.get("FirstName"),
        data.get("MiddleName"),
        data.get("Phone"),
        data.get("Email"),
        data.get("Position"),
        data.get("HireDate"),
        data.get("DismissDate"),
        data.get("Barcode"),
        data.get("Notes"),
        id
    ))

    cursor.execute("DELETE FROM EmployeeCashboxRoles WHERE EmployeeID=?", (id,))

    for row in data.get("CashboxRoles", []):
        cursor.execute("""
            INSERT INTO EmployeeCashboxRoles (EmployeeID, CenterID, CashboxID, RoleID)
            VALUES (?, ?, ?, ?)
        """, (
            id,
            row["CenterID"],
            row["CashboxID"],
            row["RoleID"]
        ))

    db.commit()
    return {"success": True}

@router.delete("/employees/{id}")
def delete_employee(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM EmployeeCashboxRoles WHERE EmployeeID=?", (id,))
    cursor.execute("DELETE FROM Employees WHERE ID=?", (id,))
    db.commit()
    return {"success": True}
