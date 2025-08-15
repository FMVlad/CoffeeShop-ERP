# app/services/utils.py
from __future__ import annotations
import datetime as dt
from decimal import Decimal, ROUND_HALF_UP

MONEY_Q = Decimal("0.01")
QTY_Q   = Decimal("0.001")

def money(v) -> float:
    """Банківське округлення до 0.01"""
    return float(Decimal(v or 0).quantize(MONEY_Q, rounding=ROUND_HALF_UP))

def qty(v) -> float:
    """Округлення кількості до 0.001"""
    return float(Decimal(v or 0).quantize(QTY_Q, rounding=ROUND_HALF_UP))

def today() -> dt.date:
    return dt.date.today()

def now() -> dt.datetime:
    return dt.datetime.now()
