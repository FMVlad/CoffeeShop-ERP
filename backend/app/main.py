from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routes import menu
from app.routes.categories import router as categories_router
from app.routes.price_categories import router as price_categories_router
from app.routes.product_prices import router as product_prices_router
from app.routes.products_new import router as products_router
from app.routes.system_parameters import router as system_parameters_router
from app.routes.programm_parameters import router as programm_parameters_router
from app.routes.manufacturers import router as manufacturers_router
from app.routes.units import router as units_router
from app.routes.currencies import router as currencies_router
from app.routes.settlement_accounts import router as settlement_accounts_router
from app.routes.companies import router as companies_router
from app.routes.chart_of_accounts import router as chart_of_accounts_router
from app.routes.account_tax_rates import router as account_tax_rates_router
from app.routes.typical_operations import router as typical_operations_router
from app.routes.typical_operation_entries import router as typical_operation_entries_router
from app.routes.product_card_templates import router as product_card_templates_router
from app.routes.product_card_template_fields import router as product_card_template_fields_router
from app.routes import product_name_rules
from app.routes.product_full_name_fields import router as product_full_name_fields_router

import os

app = FastAPI(
    title="CoffeeBot API",
    description="API для управління меню кав'ярні",
    version="1.0.0"
)

# РОЗШИРЕНИЙ CORS - дозволяємо ВСЕ
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Дозволяємо всі домени
    allow_credentials=True,
    allow_methods=["*"],  # Всі HTTP методи
    allow_headers=["*"],  # Всі заголовки
)

# React build
current_dir = os.path.dirname(os.path.abspath(__file__))
build_dir = os.path.join(current_dir, "..", "..", "frontend", "webapp", "build")
print("Build dir:", build_dir)

# Uploads directory - виправляємо шлях до app/uploads
uploads_dir = os.path.join(current_dir, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
print("Uploads dir:", uploads_dir)

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
app.mount("/webapp", StaticFiles(directory=build_dir, html=True), name="webapp")

app.include_router(menu.router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(price_categories_router, prefix="/api")
app.include_router(product_prices_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(system_parameters_router, prefix="/api")
app.include_router(programm_parameters_router, prefix="/api")
app.include_router(manufacturers_router, prefix="/api")
app.include_router(units_router, prefix="/api")
app.include_router(currencies_router, prefix="/api")
app.include_router(companies_router, prefix="/api")
app.include_router(settlement_accounts_router, prefix="/api")
app.include_router(chart_of_accounts_router, prefix="/api")
app.include_router(account_tax_rates_router, prefix="/api")
app.include_router(typical_operations_router, prefix="/api")
app.include_router(typical_operation_entries_router, prefix="/api")
app.include_router(product_card_templates_router, prefix="/api")
app.include_router(product_card_template_fields_router, prefix="/api")
app.include_router(product_name_rules.router)
app.include_router(product_full_name_fields_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to CoffeeBot API!"}
 