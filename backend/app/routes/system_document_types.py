from fastapi import APIRouter, Depends
import pyodbc
from app.db_connection import get_db


router = APIRouter(prefix="/system-document-types", tags=["system-document-types"])


@router.get("")
def get_doc_types(db: pyodbc.Connection = Depends(get_db)):
    cur = db.cursor()
    try:
        cur.execute("SELECT Code, Name, IsActive FROM SystemDocumentTypes WHERE IsActive=1 ORDER BY Name")
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]
    except Exception:
        # Якщо таблиці немає — повертаємо базовий перелік у пам'яті
        base = [
            {"Code": "ARRIVAL", "Name": "Прибуткова накладна", "IsActive": 1},
            {"Code": "SALE", "Name": "Продаж", "IsActive": 1},
            {"Code": "SALE_RETAIL", "Name": "Продаж (роздріб)", "IsActive": 1},
            {"Code": "SALE_INVOICE", "Name": "Продаж (рахунок)", "IsActive": 1},
            {"Code": "RCPT_ORDER", "Name": "Прибутковий касовий ордер", "IsActive": 1},
            {"Code": "PMT_ORDER", "Name": "Видатковий касовий ордер", "IsActive": 1},
            {"Code": "BANK_IN", "Name": "Платіжне доручення вхідне", "IsActive": 1},
            {"Code": "BANK_OUT", "Name": "Платіжне доручення вихідне", "IsActive": 1},
        ]
        return base
















