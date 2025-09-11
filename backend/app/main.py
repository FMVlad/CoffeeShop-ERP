from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# ====== ROUTERS ======
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
from app.routes.center_companies import router as center_companies_router
from app.routes.cashboxes_router import router as cashboxes_router
from app.routes.centers_of_accounting_router import router as centers_of_accounting_router
from app.routes.warehouses_router import router as warehouses_router
from app.routes import users
from app.routes.employees import router as employees_router
from app.routes.roles import router as roles_router
from app.routes.suppliers_router import router as suppliers_router
from app.routes.auth import router as auth_router
from app.routes import arrival_documents
from app.routes import stock_state as stock_state_router
from app.routes import costing as costing_router
from app.routes import service_tasks as service_tasks_router
from app.routes import discount_documents as discount_documents_router
from app.routes import movements as movements_router
from app.routes import user_prefs as user_prefs_router
from app.routes import sales_documents as sales_documents_router
from app.routes.clients_router import router as clients_router

app = FastAPI(
    title="VYSHNIA API",
    description="API для управління підприємством",
    version="1.0.0"
)

# ===== CORS (dev) =====
# Для локальної розробки простіше дозволити все. Коли підеш у прод — звузь до конкретних origin-ів.
app.add_middleware(
    CORSMiddleware,
    # Дозволяємо будь-яке походження у дев-середовищі
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==== Static directories ====
current_dir = os.path.dirname(os.path.abspath(__file__))
build_dir = os.path.join(current_dir, "..", "..", "frontend", "webapp", "build")
uploads_dir = os.path.join(current_dir, "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
app.mount("/webapp", StaticFiles(directory=build_dir, html=True), name="webapp")

# ===== API ROUTERS =====
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
app.include_router(product_name_rules.router, prefix="/api")
app.include_router(product_full_name_fields_router, prefix="/api")
app.include_router(center_companies_router, prefix="/api")
app.include_router(cashboxes_router, prefix="/api")
app.include_router(centers_of_accounting_router, prefix="/api")
app.include_router(warehouses_router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(employees_router, prefix="/api")
app.include_router(roles_router, prefix="/api")
app.include_router(suppliers_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(arrival_documents.router, prefix="/api")
app.include_router(stock_state_router.router, prefix="/api")
app.include_router(costing_router.router, prefix="/api")
app.include_router(service_tasks_router.router, prefix="/api")
app.include_router(user_prefs_router.router, prefix="/api")
app.include_router(discount_documents_router.router, prefix="/api")
app.include_router(movements_router.router, prefix="/api")
app.include_router(sales_documents_router.router, prefix="/api")
app.include_router(clients_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to VYSHNIA API!"}
