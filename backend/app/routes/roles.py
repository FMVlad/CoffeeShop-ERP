from fastapi import APIRouter, Depends, HTTPException
from app.db_connection import get_db

router = APIRouter()

# === ВСІ ролі ===
@router.get("/roles")
def get_roles(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT ID, RoleName FROM Roles ORDER BY RoleName")
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# === Додати роль ===
@router.post("/roles")
def create_role(data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    role_name = data.get("RoleName")
    if not role_name:
        raise HTTPException(status_code=400, detail="RoleName обовʼязкове")
    cursor.execute("INSERT INTO Roles (RoleName) VALUES (?)", (role_name,))
    db.commit()
    return {"success": True}

# === Редагувати роль ===
@router.put("/roles/{id}")
def update_role(id: int, data: dict, db=Depends(get_db)):
    cursor = db.cursor()
    role_name = data.get("RoleName")
    cursor.execute("UPDATE Roles SET RoleName=? WHERE ID=?", (role_name, id))
    db.commit()
    return {"success": True}

# === Видалити роль ===
@router.delete("/roles/{id}")
def delete_role(id: int, db=Depends(get_db)):
    cursor = db.cursor()
    # ВАЖЛИВО: спочатку прибрати звʼязки з EmployeeRoles і Permissions!
    cursor.execute("DELETE FROM EmployeeRoles WHERE RoleID=?", (id,))
    cursor.execute("DELETE FROM Permissions WHERE RoleID=?", (id,))
    cursor.execute("DELETE FROM Roles WHERE ID=?", (id,))
    db.commit()
    return {"success": True}

# === ВСІ права ролі ===
@router.get("/roles/{role_id}/permissions")
def get_role_permissions(role_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT ID, Resource, CanView, CanEdit, CanDelete, CanCreate
        FROM Permissions
        WHERE RoleID=?
        ORDER BY Resource
    """, (role_id,))
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

# === Оновити права ролі (ресурси і права) ===
@router.post("/roles/{role_id}/permissions")
def update_role_permissions(role_id: int, permissions: list, db=Depends(get_db)):
    cursor = db.cursor()
    # Видаляємо старі права цієї ролі
    cursor.execute("DELETE FROM Permissions WHERE RoleID=?", (role_id,))
    # Додаємо нові
    for perm in permissions:
        cursor.execute("""
            INSERT INTO Permissions (RoleID, Resource, CanView, CanEdit, CanDelete, CanCreate)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            role_id,
            perm["Resource"],
            perm.get("CanView", 0),
            perm.get("CanEdit", 0),
            perm.get("CanDelete", 0),
            perm.get("CanCreate", 0),
        ))
    db.commit()
    return {"success": True}
