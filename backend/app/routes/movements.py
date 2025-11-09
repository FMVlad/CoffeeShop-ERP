from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List, Optional
import pyodbc

from app.db_connection import get_db
from app.services import inventory
from app.services import fifo
import datetime as dt

router = APIRouter()


def _ensure_tables(cur: pyodbc.Cursor) -> None:
    cur.execute(
        """
        IF OBJECT_ID('dbo.MovementDocs','U') IS NULL
        BEGIN
          CREATE TABLE dbo.MovementDocs (
            ID INT IDENTITY(1,1) PRIMARY KEY,
            DocDate DATE NOT NULL DEFAULT GETDATE(),
            FromCenterID INT NOT NULL,
            FromWarehouseID INT NOT NULL,
            ToCenterID INT NOT NULL,
            ToWarehouseID INT NULL,
            IsInTransit BIT NOT NULL DEFAULT 0,
            Comment NVARCHAR(250) NULL,
            Status VARCHAR(16) NOT NULL DEFAULT 'draft',
            CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
            UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
          );
        END;
        IF OBJECT_ID('dbo.MovementItems','U') IS NULL
        BEGIN
          CREATE TABLE dbo.MovementItems (
            ID INT IDENTITY(1,1) PRIMARY KEY,
            DocID INT NOT NULL,
            ProductID INT NOT NULL,
            Quantity DECIMAL(18,6) NOT NULL,
            CompanyIDFrom INT NULL,
            CompanyIDTo INT NULL,
            CONSTRAINT FK_MovementItems_Doc FOREIGN KEY (DocID) REFERENCES dbo.MovementDocs(ID) ON DELETE CASCADE
          );
          CREATE INDEX IX_MovementItems_Doc ON dbo.MovementItems(DocID);
        END
        ELSE
        BEGIN
          IF COL_LENGTH('dbo.MovementItems','Price') IS NULL ALTER TABLE dbo.MovementItems ADD Price DECIMAL(18,4) NULL;
        END
        """
    )


def _get_in_transit_wh(cur: pyodbc.Cursor, center_id: int) -> Optional[int]:
    row = cur.execute(
        "SELECT TOP 1 ID FROM Warehouses WHERE CenterID=? AND Type='in_transit' AND IsActive=1 ORDER BY ID",
        (center_id,),
    ).fetchone()
    return int(row[0]) if row else None


def _get_program_param(cur: pyodbc.Cursor, key: str, default: Optional[str] = None) -> Optional[str]:
    try:
        row = cur.execute("SELECT ParamValue FROM ProgrammParameters WHERE ParamKey=?", (key,)).fetchone()
        return str(row[0]) if row and row[0] is not None else default
    except Exception:
        return default


def _get_default_price_category_id(cur: pyodbc.Cursor) -> Optional[int]:
    """Повертає ID категорії цін за замовчуванням."""
    try:
        v = _get_program_param(cur, "DefaultPriceCategoryID")
        if v:
            r = cur.execute("SELECT ID FROM PriceCategories WHERE ID=?", (int(v),)).fetchone()
            if r:
                return int(v)
    except Exception:
        pass
    try:
        r = cur.execute("SELECT TOP 1 ID FROM PriceCategories WHERE IsDefault=1 ORDER BY ID").fetchone()
        if r:
            return int(r[0])
    except Exception:
        pass
    try:
        r = cur.execute("SELECT TOP 1 ID FROM PriceCategories WHERE CategoryName LIKE N'%роздр%' ORDER BY ID").fetchone()
        if r:
            return int(r[0])
    except Exception:
        pass
    try:
        r = cur.execute("SELECT TOP 1 ID FROM PriceCategories ORDER BY ID").fetchone()
        if r:
            return int(r[0])
    except Exception:
        pass
    return None
def _table_has_column(cur: pyodbc.Cursor, table_name: str, column_name: str) -> bool:
    try:
        r = cur.execute(
            "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=? AND COLUMN_NAME=?",
            (table_name, column_name)
        ).fetchone()
        return bool(r)
    except Exception:
        return False



def _table_exists(cur: pyodbc.Cursor, table_name: str) -> bool:
    try:
        r = cur.execute(
            "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME=?",
            (table_name,)
        ).fetchone()
        return bool(r)
    except Exception:
        return False


def _revert_parties_for_doc(db: pyodbc.Connection, doc_id: int) -> None:
    """Повний відкат партій для документа переміщення:
    - Повертає RemainingQty по всіх 'out' рухах цього документа
    - Видаляє всі PartyMovements цього документа
    - Видаляє створені партії з коментарем MOVE SHIP/RECV
    Безпечна: пропускає, якщо таблиць немає.
    """
    try:
        cur = db.cursor()
        if not _table_exists(cur, 'PartyMovements') or not _table_exists(cur, 'Parties'):
            return
        # Відновити залишок по вихідних рухах
        try:
            rows = cur.execute(
                "SELECT PartyID, SUM(Quantity) FROM PartyMovements WHERE DocumentType='movement' AND DocumentID=? AND MovementType='out' GROUP BY PartyID",
                (doc_id,)
            ).fetchall() or []
            if rows and _table_has_column(cur, 'Parties', 'RemainingQty'):
                for pid, q in rows:
                    if pid is None:
                        continue
                    try:
                        cur.execute("UPDATE Parties SET RemainingQty = RemainingQty + ? WHERE ID=?", (float(q or 0), int(pid)))
                    except Exception:
                        pass
        except Exception:
            pass
        # Видалити рухи цього документа
        try:
            cur.execute("DELETE FROM PartyMovements WHERE DocumentType='movement' AND DocumentID=?", (doc_id,))
        except Exception:
            pass
        # Видалити партії, створені цим документом
        try:
            cur.execute("DELETE FROM Parties WHERE Comment IN (?, ?)", (f"MOVE SHIP #{doc_id}", f"MOVE RECV #{doc_id}"))
        except Exception:
            pass
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass


def _revert_receive_phase_parties(db: pyodbc.Connection, doc_id: int, in_transit_wid: int, main_wid: int) -> None:
    """Частковий відкат партій для скасування прийняття:
    - Повертає RemainingQty по 'out' з in_transit
    - Видаляє PartyMovements цього документа по складах in_transit і main
    - Видаляє партії з коментарем MOVE RECV #doc_id
    """
    try:
        cur = db.cursor()
        if not _table_exists(cur, 'PartyMovements') or not _table_exists(cur, 'Parties'):
            return
        # Відновити залишок з вихідних рухів на in_transit
        try:
            rows = cur.execute(
                "SELECT PartyID, SUM(Quantity) FROM PartyMovements WHERE DocumentType='movement' AND DocumentID=? AND MovementType='out' AND WarehouseID=? GROUP BY PartyID",
                (doc_id, in_transit_wid)
            ).fetchall() or []
            if rows and _table_has_column(cur, 'Parties', 'RemainingQty'):
                for pid, q in rows:
                    if pid is None:
                        continue
                    try:
                        cur.execute("UPDATE Parties SET RemainingQty = RemainingQty + ? WHERE ID=?", (float(q or 0), int(pid)))
                    except Exception:
                        pass
        except Exception:
            pass
        # Видалити рухи по обох складах цієї фази
        try:
            cur.execute(
                "DELETE FROM PartyMovements WHERE DocumentType='movement' AND DocumentID=? AND WarehouseID IN (?, ?)",
                (doc_id, in_transit_wid, main_wid)
            )
        except Exception:
            pass
        # Видалити створені партії цієї фази
        try:
            cur.execute("DELETE FROM Parties WHERE Comment = ?", (f"MOVE RECV #{doc_id}",))
        except Exception:
            pass
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

def _resolve_price_for_center(cur: pyodbc.Cursor, product_id: int, center_id: Optional[int]) -> Optional[float]:
    """Знаходить ціну продажу з урахуванням PriceModel (global/by_center) і категорії за замовчуванням."""
    price_model = (_get_program_param(cur, "PriceModel", "global") or "global").lower()
    price_category_id = _get_default_price_category_id(cur)
    if price_model == "by_center" and center_id:
        parts = ["ProductID=?"]; params: List[Any] = [product_id]
        if price_category_id:
            parts.append("PriceCategoryID=?"); params.append(price_category_id)
        parts.append("ISNULL(CenterID,0)=ISNULL(?,0)"); params.append(center_id)
        sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
        row = cur.execute(sql, tuple(params)).fetchone()
        if row:
            return float(row[0])
        parts = ["ProductID=?"]; params = [product_id]
        if price_category_id:
            parts.append("PriceCategoryID=?"); params.append(price_category_id)
        parts.append("ISNULL(CenterID,0)=0")
        sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
        row = cur.execute(sql, tuple(params)).fetchone()
        if row:
            return float(row[0])
    parts = ["ProductID=?"]; params2: List[Any] = [product_id]
    if price_category_id:
        parts.append("PriceCategoryID=?"); params2.append(price_category_id)
    sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
    row = cur.execute(sql, tuple(params2)).fetchone()
    return float(row[0]) if row else None


from typing import Tuple

def _resolve_price_for_center_with_flag(cur: pyodbc.Cursor, product_id: int, center_id: Optional[int]) -> Tuple[Optional[float], bool]:
    """Повертає (ціну, found_center_specific) для заданого центру з урахуванням PriceModel.
    found_center_specific = True, якщо знайдено запис у ProductPrices з CenterID = center_id.
    Якщо модель не by_center або center_id відсутній — повертає ціну як у _resolve_price_for_center та found_center_specific = False.
    """
    price_model = (_get_program_param(cur, "PriceModel", "global") or "global").lower()
    price_category_id = _get_default_price_category_id(cur)
    found_center_specific = False
    if price_model == "by_center" and center_id:
        parts = ["ProductID=?"]; params: List[Any] = [product_id]
        if price_category_id:
            parts.append("PriceCategoryID=?"); params.append(price_category_id)
        parts.append("ISNULL(CenterID,0)=ISNULL(?,0)"); params.append(center_id)
        sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
        row = cur.execute(sql, tuple(params)).fetchone()
        if row:
            found_center_specific = True
            return float(row[0]), True
        # fallback: глобальна
        parts = ["ProductID=?"]; params = [product_id]
        if price_category_id:
            parts.append("PriceCategoryID=?"); params.append(price_category_id)
        parts.append("ISNULL(CenterID,0)=0")
        sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
        row = cur.execute(sql, tuple(params)).fetchone()
        return (float(row[0]) if row else None), False
    # глобальна модель або без центру
    parts = ["ProductID=?"]; params2: List[Any] = [product_id]
    if price_category_id:
        parts.append("PriceCategoryID=?"); params2.append(price_category_id)
    sql = "SELECT TOP 1 Price FROM ProductPrices WHERE " + " AND ".join(parts) + " ORDER BY DateStart DESC, ID DESC"
    row = cur.execute(sql, tuple(params2)).fetchone()
    return (float(row[0]) if row else None), False


def _default_company_for_center(cur: pyodbc.Cursor, center_id: int) -> Optional[int]:
    """Повертає першу компанію, прив'язану до центру (CompanyCenters)."""
    try:
        r = cur.execute(
            "SELECT TOP 1 CompanyID FROM CompanyCenters WHERE CenterID=? ORDER BY CompanyID",
            (center_id,)
        ).fetchone()
        return int(r[0]) if r else None
    except Exception:
        return None


def _round_value(value: Optional[float], step: Optional[float], mode: Optional[str]) -> Optional[float]:
    """Роундінг за кроком (step) і режимом (nearest|up|down)."""
    try:
        if value is None or step is None or step <= 0:
            return value
        v = float(value); s = float(step)
        if mode == 'up':
            from math import ceil
            return ceil(v / s) * s
        if mode == 'down':
            from math import floor
            return floor(v / s) * s
        # nearest
        from math import floor
        return floor((v / s) + 0.5) * s
    except Exception:
        return value


def _avg_cost_for_product_simple(cur: pyodbc.Cursor, product_id: int) -> Optional[float]:
    """Спрощений розрахунок середньої собівартості по Parties."""
    try:
        row = cur.execute("SELECT AVG(UnitCostNet) FROM Parties WHERE ProductID=?", (product_id,)).fetchone()
        return float(row[0]) if row and row[0] is not None else None
    except Exception:
        return None


@router.get("/movements")
def list_docs(center_id: Optional[int] = None, mode: Optional[str] = None, db: pyodbc.Connection = Depends(get_db)):
    """Список документів переміщення.
    Опційно фільтруємо за center_id:
      - mode='sent'     → FromCenterID = center_id
      - mode='received' → ToCenterID = center_id
      - без mode        → документи, де центр є відправником або отримувачем
    """
    cur = db.cursor(); _ensure_tables(cur)
    sql = "SELECT * FROM dbo.MovementDocs"
    params: List[Any] = []
    if center_id is not None:
        m = (mode or "").lower()
        if m == 'sent':
            sql += " WHERE FromCenterID=?"; params.append(int(center_id))
        elif m == 'received':
            sql += " WHERE ToCenterID=?"; params.append(int(center_id))
        else:
            sql += " WHERE FromCenterID=? OR ToCenterID=?"; params.extend([int(center_id), int(center_id)])
    sql += " ORDER BY ID DESC"
    rows = cur.execute(sql, tuple(params)).fetchall()
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


@router.post("/movements")
def create_doc(payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    fcid = int(payload.get("FromCenterID")); fwid = int(payload.get("FromWarehouseID"))
    tcid = int(payload.get("ToCenterID")); twid = payload.get("ToWarehouseID")
    is_tr = bool(payload.get("IsInTransit", False))
    comment = payload.get("Comment")
    if is_tr:
        twid = twid or _get_in_transit_wh(cur, tcid)
        if not twid:
            raise HTTPException(400, "Не знайдено підсклад 'Товар в дорозі' у центру-отримувача")
    else:
        if not twid:
            row = cur.execute("SELECT TOP 1 ID FROM Warehouses WHERE CenterID=? AND Type='main' AND IsActive=1 ORDER BY ID", (tcid,)).fetchone()
            if not row:
                raise HTTPException(400, "Не знайдено головний склад у центру-отримувача")
            twid = int(row[0])
    cur.execute(
        """
        INSERT INTO dbo.MovementDocs (FromCenterID, FromWarehouseID, ToCenterID, ToWarehouseID, IsInTransit, Comment)
        OUTPUT INSERTED.ID
        VALUES (?,?,?,?,?,?)
        """,
        (fcid, fwid, tcid, twid, 1 if is_tr else 0, comment),
    )
    doc_id = int(cur.fetchone()[0]); db.commit()
    return {"ID": doc_id}


@router.get("/movements/{doc_id}")
def get_doc(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    r = cur.execute("SELECT * FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()
    if not r: raise HTTPException(404, "Документ не знайдено")
    cols = [c[0] for c in cur.description]
    doc = dict(zip(cols, r))
    items = cur.execute(
        """
        SELECT i.ID, i.DocID, i.ProductID, p.FullName AS ProductName, i.Quantity, i.CompanyIDFrom, i.CompanyIDTo, i.Price
        FROM dbo.MovementItems i
        LEFT JOIN dbo.Products p ON p.ID = i.ProductID
        WHERE i.DocID=?
        ORDER BY i.ID
        """,
        (doc_id,),
    ).fetchall()
    cols_i = [c[0] for c in cur.description]
    # enrich with PriceFrom/PriceTo resolved for FromCenterID/ToCenterID
    from_center_id = int(doc.get("FromCenterID")) if doc.get("FromCenterID") is not None else None
    to_center_id = int(doc.get("ToCenterID")) if doc.get("ToCenterID") is not None else None
    # Підтягнемо залишок у центру-отримувача для всіх товарів одним запитом
    qty_to_by_pid: Dict[int, float] = {}
    try:
        pids = [int(r[2]) for r in items]  # ProductID позицій
        if pids and to_center_id is not None:
            placeholders = ",".join(["?"] * len(pids))
            q = (
                "SELECT sb.ProductID, SUM(sb.Quantity) AS Qty "
                "FROM dbo.StockBalances sb "
                "JOIN dbo.Warehouses w ON w.ID = sb.WarehouseID "
                "WHERE w.CenterID = ? AND (w.Type IS NULL OR w.Type <> 'in_transit') "
                f"AND sb.ProductID IN ({placeholders}) "
                "GROUP BY sb.ProductID"
            )
            rows_q = cur.execute(q, (to_center_id, *pids)).fetchall() or []
            for pid, qv in rows_q:
                qty_to_by_pid[int(pid)] = float(qv or 0)
    except Exception:
        qty_to_by_pid = {}
    items_list: List[Dict[str, Any]] = []
    for row in items:
        it = dict(zip(cols_i, row))
        # Розрахунок двох цін
        try:
            price_from = _resolve_price_for_center(cur, int(it["ProductID"]), from_center_id)
        except Exception:
            price_from = None
        try:
            price_to, found_center = _resolve_price_for_center_with_flag(cur, int(it["ProductID"]), to_center_id)
        except Exception:
            price_to, found_center = (None, False)
        it["PriceFrom"] = price_from
        it["PriceTo"] = price_to
        it["PriceToCenterSpecific"] = bool(found_center)
        # Залишок у центру-отримувача
        try:
            it["ToCenterQty"] = qty_to_by_pid.get(int(it["ProductID"]), 0.0)
        except Exception:
            it["ToCenterQty"] = 0.0
        # Якщо базова Price відсутня — підставляємо ціну отримувача
        if it.get("Price") is None:
            it["Price"] = price_to
        items_list.append(it)
    doc["Items"] = items_list
    return doc


@router.put("/movements/{doc_id}")
def update_doc(doc_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    """Оновлення полів документа переміщення: DocDate, ToCenterID, FromWarehouseID, ToWarehouseID, IsInTransit, Comment.
    Лише у статусі 'draft'. Якщо змінюється ToCenterID або IsInTransit і не задано ToWarehouseID — підбираємо склад за замовчуванням
    (in_transit або main для нового центру)."""
    cur = db.cursor(); _ensure_tables(cur)
    r = cur.execute("SELECT Status, ToCenterID, IsInTransit FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()
    if not r:
        raise HTTPException(404, "Документ не знайдено")
    status = str(r[0] or '').lower()
    if status != 'draft':
        raise HTTPException(400, "Редагування дозволено лише у статусі Чернетка")

    current_to_center = int(r[1]) if r[1] is not None else None
    current_is_tr = bool(r[2])

    sets: List[str] = []
    vals: List[Any] = []
    if 'DocDate' in payload and payload.get('DocDate'):
        sets.append("DocDate=?"); vals.append(payload.get('DocDate'))
    # Дозволяємо змінити тільки ToCenterID (джерело не змінюємо тут)
    to_center_override = None
    if 'ToCenterID' in payload and payload.get('ToCenterID') is not None:
        to_center_override = int(payload.get('ToCenterID'))
        sets.append("ToCenterID=?"); vals.append(to_center_override)
    if 'FromWarehouseID' in payload and payload.get('FromWarehouseID') is not None:
        sets.append("FromWarehouseID=?"); vals.append(int(payload.get('FromWarehouseID')))
    to_wh_provided = ('ToWarehouseID' in payload and payload.get('ToWarehouseID') is not None)
    if to_wh_provided:
        sets.append("ToWarehouseID=?"); vals.append(int(payload.get('ToWarehouseID')))
    if 'IsInTransit' in payload and payload.get('IsInTransit') is not None:
        sets.append("IsInTransit=?"); vals.append(1 if bool(payload.get('IsInTransit')) else 0)
    if 'Comment' in payload:
        sets.append("Comment=?"); vals.append(payload.get('Comment'))
    # Якщо ToWarehouseID не задано, але змінюється ToCenterID або IsInTransit — підібрати склад за замовчуванням
    if not to_wh_provided and (to_center_override is not None or 'IsInTransit' in payload):
        tcid = to_center_override if to_center_override is not None else current_to_center
        is_tr = bool(payload.get('IsInTransit')) if 'IsInTransit' in payload else current_is_tr
        if tcid is not None:
            if is_tr:
                twid = _get_in_transit_wh(cur, tcid)
                if not twid:
                    raise HTTPException(400, "Не знайдено підсклад 'Товар в дорозі' для обраного центру")
            else:
                row = cur.execute("SELECT TOP 1 ID FROM Warehouses WHERE CenterID=? AND Type='main' AND IsActive=1 ORDER BY ID", (tcid,)).fetchone()
                if not row:
                    raise HTTPException(400, "Не знайдено головний склад для обраного центру")
                twid = int(row[0])
            sets.append("ToWarehouseID=?"); vals.append(int(twid))
    if not sets:
        return {"ok": True, "updated": 0}
    sets.append("UpdatedAt=GETDATE()")
    cur.execute(f"UPDATE dbo.MovementDocs SET {', '.join(sets)} WHERE ID=?", (*vals, doc_id))
    db.commit();
    return {"ok": True, "updated": 1}

@router.delete("/movements/{doc_id}")
def delete_doc(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    rdoc = cur.execute("SELECT FromCenterID, FromWarehouseID, ToCenterID, ToWarehouseID, IsInTransit, Status FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()
    if not rdoc:
        return {"ok": True, "skipped": True}

    fcid, fwid_doc, tcid, twid, is_tr, status = int(rdoc[0]), int(rdoc[1]), int(rdoc[2]), int(rdoc[3]), bool(rdoc[4]), str(rdoc[5] or '').lower()

    # helpers
    def main_wh(center_id: int) -> Optional[int]:
        row = cur.execute("SELECT TOP 1 ID FROM Warehouses WHERE CenterID=? AND Type='main' AND IsActive=1 ORDER BY ID", (center_id,)).fetchone()
        return int(row[0]) if row else None

    main_from = main_wh(fcid) or fwid_doc
    main_to = main_wh(tcid)

    items = cur.execute("SELECT ProductID, Quantity, CompanyIDFrom, CompanyIDTo FROM dbo.MovementItems WHERE DocID=?", (doc_id,)).fetchall() or []

    if status == 'draft':
        # Ніяких рухів не було — просто видаляємо
        cur.execute("DELETE FROM dbo.MovementDocs WHERE ID=?", (doc_id,))
        db.commit();
        return {"ok": True}

    if status == 'shipped':
        if is_tr:
            # Відкат першої фази: повернути з in_transit на джерело
            for pr, qty, c_from, c_to in items:
                q = abs(float(qty))
                inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=main_from, delta_qty=q, comment=f"MOVE DELETE #{doc_id}", company_id=(int(c_from) if c_from is not None else None))
                inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=twid, delta_qty=-q, comment=f"MOVE DELETE #{doc_id}", company_id=(int(c_to) if c_to is not None else int(c_from) if c_from is not None else None))
        else:
            # Відкат прямого переміщення на головний склад отримувача
            for pr, qty, c_from, c_to in items:
                q = abs(float(qty))
                inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=main_from, delta_qty=q, comment=f"MOVE DELETE #{doc_id}", company_id=(int(c_from) if c_from is not None else None))
                if main_to is not None:
                    inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=main_to, delta_qty=-q, comment=f"MOVE DELETE #{doc_id}", company_id=(int(c_to) if c_to is not None else int(c_from) if c_from is not None else None))

    elif status == 'received':
        # Повний відкат: з головного отримувача назад на джерело
        for pr, qty, c_from, c_to in items:
            q = abs(float(qty))
            if main_to is not None:
                inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=main_to, delta_qty=-q, comment=f"MOVE DELETE #{doc_id}", company_id=(int(c_to) if c_to is not None else None))
            inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=main_from, delta_qty=q, comment=f"MOVE DELETE #{doc_id}", company_id=(int(c_from) if c_from is not None else None))

    # Після відкату – видаляємо документ (каскадом видалить позиції)
    cur.execute("DELETE FROM dbo.MovementDocs WHERE ID=?", (doc_id,))
    db.commit();
    return {"ok": True}


@router.post("/movements/{doc_id}/items")
def add_item(doc_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    pr = int(payload.get("ProductID")); qty = float(payload.get("Quantity") or 0)
    c_from = payload.get("CompanyIDFrom"); c_to = payload.get("CompanyIDTo")
    # Автовизначення компаній: джерело беремо з фактичного залишку на складі-джерелі, якщо є; інакше — за центром
    if c_from is None or c_to is None:
        rdoc = cur.execute("SELECT FromCenterID, ToCenterID, FromWarehouseID FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()
        if rdoc:
            fcid, tcid, fwid = int(rdoc[0]), int(rdoc[1]), int(rdoc[2])
            if c_from is None:
                # Спробуємо знайти компанію з найбільшим залишком для цього товару на складі-джерелі
                try:
                    row_sb = cur.execute(
                        """
                        SELECT TOP 1 CompanyID, SUM(Quantity) AS Qty
                        FROM dbo.StockBalances
                        WHERE WarehouseID=? AND ProductID=?
                        GROUP BY CompanyID
                        ORDER BY SUM(Quantity) DESC
                        """,
                        (fwid, pr)
                    ).fetchone()
                    if row_sb:
                        c_from = int(row_sb[0]) if row_sb[0] is not None else None
                except Exception:
                    c_from = None
                if c_from is None:
                    c_from = _default_company_for_center(cur, fcid)
            if c_to is None:
                c_to = _default_company_for_center(cur, tcid) or c_from
    if qty <= 0: raise HTTPException(400, "Кількість > 0 обов'язкова")
    # Якщо вже є рядок з тим самим товаром та компаніями — об'єднуємо
    row = cur.execute(
        """
        SELECT TOP 1 ID, Quantity
        FROM dbo.MovementItems
        WHERE DocID=? AND ProductID=?
          AND ISNULL(CompanyIDFrom, -1) = ISNULL(?, -1)
          AND ISNULL(CompanyIDTo, -1) = ISNULL(?, -1)
        ORDER BY ID
        """,
        (doc_id, pr, c_from, c_to)
    ).fetchone()
    if row:
        cur.execute("UPDATE dbo.MovementItems SET Quantity = Quantity + ? WHERE ID=?", (qty, int(row[0])))
        # оновимо Price, якщо порожній
        try:
            to_center_id = int(cur.execute("SELECT ToCenterID FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()[0])
            price_val = _resolve_price_for_center(cur, pr, to_center_id)
            cur.execute("UPDATE dbo.MovementItems SET Price = ISNULL(Price, ?) WHERE ID=?", (price_val, int(row[0])))
        except Exception:
            pass
    else:
        # вставимо з ціною
        try:
            to_center_id = int(cur.execute("SELECT ToCenterID FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()[0])
            price_val = _resolve_price_for_center(cur, pr, to_center_id)
        except Exception:
            price_val = None
        cur.execute(
            "INSERT INTO dbo.MovementItems (DocID, ProductID, Quantity, CompanyIDFrom, CompanyIDTo, Price) VALUES (?,?,?,?,?,?)",
            (doc_id, pr, qty, c_from, c_to, price_val),
        )
    db.commit(); return {"ok": True}


@router.put("/movements/{doc_id}/items/{item_id}")
def update_item(doc_id: int, item_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    qty = payload.get("Quantity")
    sets = []; vals: List[Any] = []
    if qty is not None:
        sets.append("Quantity=?"); vals.append(float(qty))
    if not sets:
        return {"ok": True}
    cur.execute(f"UPDATE dbo.MovementItems SET {', '.join(sets)} WHERE ID=? AND DocID=?", (*vals, item_id, doc_id))
    db.commit(); return {"ok": True}


@router.delete("/movements/{doc_id}/items/{item_id}")
def delete_item(doc_id: int, item_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    cur.execute("DELETE FROM dbo.MovementItems WHERE ID=? AND DocID=?", (item_id, doc_id))
    db.commit(); return {"ok": True}


@router.post("/movements/{doc_id}/postings/ship")
def ship(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    rdoc = cur.execute("SELECT FromCenterID, FromWarehouseID, ToCenterID, ToWarehouseID, IsInTransit, DocDate FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()
    if not rdoc: raise HTTPException(404, "Документ не знайдено")
    fcid, doc_fwid, tcid, twid, is_tr = int(rdoc[0]), int(rdoc[1]), int(rdoc[2]), int(rdoc[3]), bool(rdoc[4])
    try:
        doc_date = str(rdoc[5])[:10] if rdoc[5] is not None else None
    except Exception:
        doc_date = None
    # Джерело завжди головний склад центру-джерела. Переобчислюємо на випадок, якщо в документі інше значення
    try:
        row_main = cur.execute("SELECT TOP 1 ID FROM Warehouses WHERE CenterID=? AND Type='main' AND IsActive=1 ORDER BY ID", (fcid,)).fetchone()
        fwid = int(row_main[0]) if row_main else doc_fwid
    except Exception:
        fwid = doc_fwid
    items = cur.execute("SELECT ProductID, Quantity, CompanyIDFrom, CompanyIDTo FROM dbo.MovementItems WHERE DocID=?", (doc_id,)).fetchall()
    # Перевірка та списання з розподілом по компаніях (щоб не падати, якщо CompanyIDFrom задана невірно)
    for pr, qty, c_from, c_to in items:
        pr_id = int(pr); need = float(qty)
        # Отримаємо залишки на складі-джерелі. Якщо у таблиці немає CompanyID — зведемо суму як єдина група
        try:
            if _table_has_column(cur, 'StockBalances', 'CompanyID'):
                rows_bal = cur.execute(
                    "SELECT CompanyID, SUM(Quantity) AS Qty FROM StockBalances WHERE WarehouseID=? AND ProductID=? GROUP BY CompanyID ORDER BY SUM(Quantity) DESC",
                    (fwid, pr_id)
                ).fetchall() or []
                balances: List[Tuple[Optional[int], float]] = [(int(r[0]) if r[0] is not None else None, float(r[1] or 0)) for r in rows_bal]
            else:
                row_one = cur.execute(
                    "SELECT SUM(Quantity) AS Qty FROM StockBalances WHERE WarehouseID=? AND ProductID=?",
                    (fwid, pr_id)
                ).fetchone()
                qty_total = float(row_one[0] or 0)
                balances = [(None, qty_total)]
        except Exception:
            balances = [(None, 0.0)]
        total_avail = sum(q for _cid, q in balances)
        if total_avail + 1e-9 < need:
            raise HTTPException(400, f"Недостатньо залишку на складі-джерелі (товар {pr_id}): є {total_avail}, потрібно {need}")
        # Пріоритезуємо компанію з позиції, якщо задана
        if c_from is not None:
            cid_from = int(c_from)
            # якщо такої компанії нема у списку, додамо з нульовим залишком (розподіл піде по інших)
            balances = [
                (cid_from, next((q for cid, q in balances if (cid or None)==cid_from), 0.0))
            ] + [(cid, q) for cid, q in balances if (cid or None) != cid_from]
        # Розподіляємо списання по компаніях з найбільшим залишком
        remaining = need
        for cid, have in balances:
            if remaining <= 1e-9: break
            take = min(have, remaining)
            if take <= 0: continue
            # списати зі складу-джерела
            inventory.upsert_stock_balance(db, product_id=pr_id, warehouse_id=fwid, delta_qty=-take, comment=f"MOVE SHIP #{doc_id}", company_id=(int(cid) if cid is not None else None))
            # оприбуткувати на склад-отримувач (in_transit або main)
            dest_company = (int(c_to) if c_to is not None else (int(cid) if cid is not None else None))
            inventory.upsert_stock_balance(db, product_id=pr_id, warehouse_id=twid, delta_qty=take, comment=f"MOVE SHIP #{doc_id}", company_id=dest_company)
            # --- Партії та собівартість ---
            try:
                # Отримаємо FIFO партії на складі-джерелі (можемо не мати таблиць — тоді пропустимо)
                parties = fifo._iter_open_parties_fifo(db, product_id=pr_id, warehouse_id=fwid, on_date=doc_date)
                # Якщо доступна CompanyID у Parties і відома компанія джерела — звузимо
                try:
                    has_party_company = _table_has_column(cur, 'Parties', 'CompanyID')
                except Exception:
                    has_party_company = False
                if has_party_company and cid is not None:
                    c2 = db.cursor()
                    cols = "ID, Quantity, PurchasePrice, DateReceived"
                    if _table_has_column(c2, 'Parties', 'NetPurchasePrice'):
                        cols += ", NetPurchasePrice"
                    else:
                        cols += ", NULL AS NetPurchasePrice"
                    if _table_has_column(c2, 'Parties', 'VatRate'):
                        cols += ", VatRate"
                    else:
                        cols += ", NULL AS VatRate"
                    rows = c2.execute(
                        f"SELECT {cols} FROM Parties WHERE ProductID=? AND WarehouseID=? AND ISNULL(CompanyID,0)=? ORDER BY DateReceived, ID",
                        (pr_id, fwid, int(cid) if cid is not None else 0),
                    ).fetchall() or []
                    parts2: List[Dict[str, Any]] = []
                    for r2 in rows:
                        pid = int(r2[0]); qty_total2 = float(r2[1] or 0)
                        price_gross = float(r2[2] or 0)
                        net_val = r2[4] if len(r2) > 4 else None
                        vat_rate = r2[5] if len(r2) > 5 else None
                        try:
                            if _table_has_column(c2, 'Parties', 'RemainingQty'):
                                rem_row = db.cursor().execute("SELECT RemainingQty FROM Parties WHERE ID=?", (pid,)).fetchone()
                                rem = float(rem_row[0] or 0)
                            else:
                                rem = qty_total2
                        except Exception:
                            rem = qty_total2
                        if rem <= 0:
                            continue
                        if net_val is not None:
                            unit_net = float(net_val or 0)
                        else:
                            if price_gross and vat_rate:
                                try:
                                    from decimal import Decimal
                                    unit_net = float(Decimal(str(price_gross)) / (Decimal("1") + Decimal(str(float(vat_rate))) / Decimal("100")))
                                except Exception:
                                    unit_net = price_gross
                            else:
                                unit_net = price_gross
                        parts2.append({'PartyID': pid, 'Remaining': rem, 'UnitCostGross': float(price_gross), 'UnitCostNet': float(unit_net)})
                    if parts2:
                        parties = parts2

                left_qty = take
                for prt in parties:
                    if left_qty <= 1e-9:
                        break
                    available = float(prt.get('Remaining') or 0)
                    if available <= 0:
                        continue
                    use_qty = min(available, left_qty)
                    if use_qty <= 0:
                        continue
                    src_party_id = int(prt.get('PartyID'))
                    unit_cost_gross = float(prt.get('UnitCostGross') or 0)
                    # рух 'out' по джерельній партії
                    try:
                        inventory.add_party_movement(
                            db,
                            party_id=src_party_id,
                            document_id=doc_id,
                            document_type="movement",
                            movement_type="out",
                            quantity=use_qty,
                            warehouse_id=fwid,
                            comment=f"MOVE SHIP #{doc_id}",
                            user_id=1,
                            date=(doc_date or dt.date.today().isoformat()),
                        )
                    except Exception:
                        pass
                    # оновити RemainingQty
                    try:
                        if _table_has_column(cur, 'Parties', 'RemainingQty'):
                            cur2 = db.cursor(); cur2.execute("UPDATE Parties SET RemainingQty = RemainingQty - ? WHERE ID=?", (use_qty, src_party_id)); db.commit()
                    except Exception:
                        pass
                    # створити партію на складі призначення з такою ж ціною
                    try:
                        new_party_id = inventory.create_party(
                            db,
                            product_id=pr_id,
                            warehouse_id=twid,
                            quantity=use_qty,
                            purchase_price=unit_cost_gross,
                            supplier_id=None,
                            company_id=dest_company,
                            date_received=(doc_date or dt.date.today().isoformat()),
                            comment=f"MOVE SHIP #{doc_id}",
                            user_id=1,
                        )
                        try:
                            inventory.add_party_movement(
                                db,
                                party_id=new_party_id,
                                document_id=doc_id,
                                document_type="movement",
                                movement_type="in",
                                quantity=use_qty,
                                warehouse_id=twid,
                                comment=f"MOVE SHIP #{doc_id}",
                                user_id=1,
                                date=(doc_date or dt.date.today().isoformat()),
                            )
                        except Exception:
                            pass
                    except Exception:
                        pass
                    left_qty -= use_qty
            except Exception:
                # Якщо підсистема партій не налаштована — продовжуємо тільки з кількістю
                pass
            remaining -= take
    cur.execute("UPDATE dbo.MovementDocs SET Status='shipped', UpdatedAt=GETDATE() WHERE ID=?", (doc_id,))
    db.commit(); return {"ok": True}


@router.post("/movements/{doc_id}/postings/receive")
def receive(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor(); _ensure_tables(cur)
    rdoc = cur.execute("SELECT ToCenterID, ToWarehouseID, IsInTransit, DocDate FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()
    if not rdoc: raise HTTPException(404, "Документ не знайдено")
    tcid, twid, is_tr = int(rdoc[0]), int(rdoc[1]), bool(rdoc[2])
    try:
        doc_date = str(rdoc[3])[:10] if rdoc[3] is not None else None
    except Exception:
        doc_date = None
    if not is_tr: return {"ok": True, "skipped": True}
    # приймаємо: з in_transit на main
    row = cur.execute("SELECT TOP 1 ID FROM Warehouses WHERE CenterID=? AND Type='main' AND IsActive=1 ORDER BY ID", (tcid,)).fetchone()
    if not row: raise HTTPException(400, "Не знайдено головний склад у центру-отримувача")
    main_wid = int(row[0])
    items = cur.execute("SELECT ProductID, Quantity, CompanyIDTo FROM dbo.MovementItems WHERE DocID=?", (doc_id,)).fetchall()
    for pr, qty, c_to in items:
        pr_id = int(pr); move_qty = abs(float(qty)); inv_company = (int(c_to) if c_to is not None else None)
        # Кількісно з in_transit -> main
        inventory.upsert_stock_balance(db, product_id=pr_id, warehouse_id=twid, delta_qty=-move_qty, comment=f"MOVE RECV #{doc_id}", company_id=inv_company)
        inventory.upsert_stock_balance(db, product_id=pr_id, warehouse_id=main_wid, delta_qty=move_qty, comment=f"MOVE RECV #{doc_id}", company_id=inv_company)

        # Перенесення партій: створюємо партії на main з тією ж собівартістю
        try:
            parties = fifo._iter_open_parties_fifo(db, product_id=pr_id, warehouse_id=twid, on_date=doc_date)
            left = move_qty
            for prt in parties:
                if left <= 1e-9:
                    break
                available = float(prt.get('Remaining') or 0)
                if available <= 0:
                    continue
                take = min(available, left)
                if take <= 0:
                    continue
                src_party_id = int(prt.get('PartyID')) if prt.get('PartyID') is not None else None
                # out з in_transit
                if src_party_id is not None:
                    try:
                        inventory.add_party_movement(
                            db,
                            party_id=src_party_id,
                            document_id=doc_id,
                            document_type="movement",
                            movement_type="out",
                            quantity=take,
                            warehouse_id=twid,
                            comment=f"MOVE RECV #{doc_id}",
                            user_id=1,
                            date=(doc_date or dt.date.today().isoformat()),
                        )
                    except Exception:
                        pass
                    try:
                        if _table_has_column(cur, 'Parties', 'RemainingQty'):
                            cur2 = db.cursor(); cur2.execute("UPDATE Parties SET RemainingQty = RemainingQty - ? WHERE ID=?", (take, src_party_id)); db.commit()
                    except Exception:
                        pass
                # in на main з тією ж собівартістю
                try:
                    unit_cost = float(prt.get('UnitCostGross') or 0)
                    new_party_id = inventory.create_party(
                        db,
                        product_id=pr_id,
                        warehouse_id=main_wid,
                        quantity=take,
                        purchase_price=unit_cost,
                        supplier_id=None,
                        company_id=inv_company,
                        date_received=(doc_date or dt.date.today().isoformat()),
                        comment=f"MOVE RECV #{doc_id}",
                        user_id=1,
                    )
                    try:
                        inventory.add_party_movement(
                            db,
                            party_id=new_party_id,
                            document_id=doc_id,
                            document_type="movement",
                            movement_type="in",
                            quantity=take,
                            warehouse_id=main_wid,
                            comment=f"MOVE RECV #{doc_id}",
                            user_id=1,
                            date=(doc_date or dt.date.today().isoformat()),
                        )
                    except Exception:
                        pass
                except Exception:
                    pass
                left -= take
        except Exception:
            pass
    cur.execute("UPDATE dbo.MovementDocs SET Status='received', UpdatedAt=GETDATE() WHERE ID=?", (doc_id,))
    db.commit(); return {"ok": True}



@router.post("/movements/{doc_id}/postings/cancel-receive")
def cancel_receive(doc_id: int, db: pyodbc.Connection = Depends(get_db)):
    """Скасувати прийняття документа.
    - Якщо документ був "в дорозі" (IsInTransit=1) і статус Received → повертаємо зі складу main отримувача на склад in_transit та ставимо статус Shipped.
    - Якщо документ був без дорозі (IsInTransit=0) і статус Received → повністю відкатуємо відвантаження: з main отримувача на main відправника та ставимо статус Draft.
    """
    cur = db.cursor(); _ensure_tables(cur)
    rdoc = cur.execute("SELECT FromCenterID, FromWarehouseID, ToCenterID, ToWarehouseID, IsInTransit, Status FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()
    if not rdoc: raise HTTPException(404, "Документ не знайдено")
    fcid, fwid_doc, tcid, twid, is_tr, status = int(rdoc[0]), int(rdoc[1]), int(rdoc[2]), int(rdoc[3]), bool(rdoc[4]), str(rdoc[5] or '').lower()
    if status != 'received':
        return {"ok": True, "skipped": True}

    # Обчислити головні склади для обох центрів
    def main_wh(center_id: int) -> Optional[int]:
        row = cur.execute("SELECT TOP 1 ID FROM Warehouses WHERE CenterID=? AND Type='main' AND IsActive=1 ORDER BY ID", (center_id,)).fetchone()
        return int(row[0]) if row else None

    if is_tr:
        # З main отримувача -> in_transit отримувача
        main_wid = main_wh(tcid)
        if not main_wid:
            raise HTTPException(400, "Не знайдено головний склад у центру-отримувача")
        items = cur.execute("SELECT ProductID, Quantity, CompanyIDTo FROM dbo.MovementItems WHERE DocID=?", (doc_id,)).fetchall()
        for pr, qty, c_to in items:
            q = abs(float(qty))
            inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=main_wid, delta_qty=-q, comment=f"MOVE CANCEL RECV #{doc_id}", company_id=(int(c_to) if c_to is not None else None))
            inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=twid, delta_qty=q, comment=f"MOVE CANCEL RECV #{doc_id}", company_id=(int(c_to) if c_to is not None else None))
        cur.execute("UPDATE dbo.MovementDocs SET Status='shipped', UpdatedAt=GETDATE() WHERE ID=?", (doc_id,))
        # Відкат партій на фазі прийняття
        try:
            _revert_receive_phase_parties(db, doc_id, in_transit_wid=twid, main_wid=main_wid)
        except Exception:
            pass
    else:
        # Повний відкат: з main отримувача -> main відправника, статус Draft
        main_from = main_wh(fcid)
        if not main_from:
            main_from = fwid_doc
        items = cur.execute("SELECT ProductID, Quantity, CompanyIDFrom, CompanyIDTo FROM dbo.MovementItems WHERE DocID=?", (doc_id,)).fetchall()
        for pr, qty, c_from, c_to in items:
            q = abs(float(qty))
            inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=twid, delta_qty=-q, comment=f"MOVE CANCEL RECV #{doc_id}", company_id=(int(c_to) if c_to is not None else None))
            inventory.upsert_stock_balance(db, product_id=int(pr), warehouse_id=main_from, delta_qty=q, comment=f"MOVE CANCEL RECV #{doc_id}", company_id=(int(c_from) if c_from is not None else None))
        cur.execute("UPDATE dbo.MovementDocs SET Status='draft', UpdatedAt=GETDATE() WHERE ID=?", (doc_id,))
        # Повний відкат партій (видалити створені і повернути вихідні)
        try:
            _revert_parties_for_doc(db, doc_id)
        except Exception:
            pass

    db.commit();
    return {"ok": True}


@router.post("/movements/{doc_id}/items/bulk-price")
def bulk_set_prices(doc_id: int, payload: Dict[str, Any], db: pyodbc.Connection = Depends(get_db)):
    """
    Масове встановлення цін для вибраних позицій переміщення.
    payload:
      - ids: [int]
      - action: 'take_from_source' | 'recalc_from_cost'
      - rounding_step: number | null
      - rounding_mode: 'nearest' | 'up' | 'down' | null
    """
    cur = db.cursor(); _ensure_tables(cur)
    ids: List[int] = list(map(int, payload.get("ids") or []))
    action = (payload.get("action") or "").strip()
    rounding_step = payload.get("rounding_step")
    rounding_mode = (payload.get("rounding_mode") or None)
    if not ids:
        return {"updated": 0}
    rdoc = cur.execute("SELECT FromCenterID, ToCenterID FROM dbo.MovementDocs WHERE ID=?", (doc_id,)).fetchone()
    if not rdoc:
        raise HTTPException(404, "Документ не знайдено")
    fcid, tcid = int(rdoc[0]), int(rdoc[1])
    placeholders = ",".join(["?"] * len(ids))
    rows = cur.execute(
        f"SELECT ID, ProductID FROM dbo.MovementItems WHERE DocID=? AND ID IN ({placeholders})",
        (doc_id, *ids)
    ).fetchall() or []
    updated = 0
    for rid, pid in rows:
        price_val: Optional[float] = None
        if action == 'take_from_source':
            price_val = _resolve_price_for_center(cur, int(pid), fcid)
        elif action == 'recalc_from_cost':
            avg_cost = _avg_cost_for_product_simple(cur, int(pid)) or 0.0
            margin_percent: Optional[float] = None
            try:
                pcid = _get_default_price_category_id(cur)
                if pcid is not None:
                    r = cur.execute("SELECT TOP 1 MarginPercent FROM CategoryMargins WHERE PriceCategoryID=? ORDER BY ID DESC", (pcid,)).fetchone()
                    if r and r[0] is not None:
                        margin_percent = float(r[0])
            except Exception:
                pass
            if margin_percent is None:
                margin_percent = 0.0
            price_val = avg_cost * (1.0 + margin_percent / 100.0)
        price_val = _round_value(price_val, float(rounding_step) if rounding_step is not None else None, rounding_mode)
        if price_val is not None:
            cur.execute("UPDATE dbo.MovementItems SET Price=? WHERE ID=? AND DocID=?", (float(price_val), int(rid), doc_id))
            updated += 1
    db.commit()
    return {"updated": updated}

