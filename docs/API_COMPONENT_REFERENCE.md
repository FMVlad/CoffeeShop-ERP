# CoffeeBot API, Function & Component Documentation

_Last updated: 28 Nov 2025_

This document consolidates every public-facing surface in CoffeeBot: FastAPI endpoints, helper scripts, the Telegram bot, the React API client, and UI components. It is meant for full-stack contributors who need a single place to understand how data flows across the project.

---

## 1. Runtime & Base URLs

- **FastAPI host**: `http://localhost:8000`
  - `/api/**` – primary REST surface (most routers mounted here)
  - `/product-name-rules/**` & `/product-full-name/generate` – mounted without `/api` prefix (see §2.7)
  - `/uploads/<filename>` – static product images served from `backend/app/uploads`
  - `/webapp` – compiled React UI (served through `StaticFiles`)
  - `/docs` – auto-generated Swagger UI (FastAPI)
- **Authentication**: none; all endpoints are open and CORS is wide (`allow_origins=["*"]`).
- **Error format**: standard FastAPI JSON (`{"detail": "message"}`) or raw `{ "error": "..." }` for manual errors.
- **Pagination defaults**: nearly every list endpoint uses `skip` & `limit` with defaults `0` & `100`.
- **Date/time format**: SQL Server expected ISO strings (e.g., `2024-10-15`).

---

## 2. Backend REST APIs (FastAPI)

Each subsection names the router file, the methods, query/body contracts, and runnable cURL examples. Replace `localhost` & IDs with the values for your environment.

### 2.1 Categories & Services (`backend/app/routes/categories.py`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/categories` | Paginated product categories with optional `search` |
| POST | `/api/categories` | Create a category |
| PUT | `/api/categories/{id}` | Update by numeric ID |
| DELETE | `/api/categories/{id}` | Delete category |
| GET | `/api/services` | Same schema, filtered to `ProductType='Service'` |
| CRUD | `/api/services{/{id}}` | Identical contract but `ProductType` forced to `Service` |

**Body fields**: `CategoryName` (required), `ProductType`, `UnitID`, `IsVAT`, `IsExcise`, `ParentID`, `DisplayOrder`, `CategoryCode`, `ProductCardTemplateID`.

**Example – search & create**
```bash
curl "http://localhost:8000/api/categories?search=latte&skip=0&limit=25"

curl -X POST http://localhost:8000/api/categories \
  -H 'Content-Type: application/json' \
  -d '{
        "CategoryName": "Холодні напої",
        "ProductType": "Розливний",
        "UnitID": 2,
        "IsVAT": true,
        "CategoryCode": "COLD-DRINKS",
        "ProductCardTemplateID": 3
      }'
```

### 2.2 Product Catalog (`backend/app/routes/products_new.py`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/products` | Returns every column from `Products` (descending by `ID`) |
| GET | `/api/products/{id}` | Single product or 404 |
| POST | `/api/products` | Dynamic insert; auto-generates EAN13 barcode when `Barcode` empty (uses `SystemParameters.BarcodePrefix` + `BarcodeNum`) |
| PUT | `/api/products/{id}` | Updates arbitrary fields; will re-generate barcode if missing |
| DELETE | `/api/products/{id}` | Hard delete |
| POST | `/api/upload-image` | Raw image upload (multipart `file`) saved under `backend/app/uploads` with UUID name |
| POST | `/api/products/{id}/upload-photo` | Multipart upload to system `PhotoPath`/`PreviewPath`, generates preview via Pillow |
| GET | `/api/products/{id}/attributes` | Lightweight `{ FieldID, Value }[]` |
| POST | `/api/products/{id}/attributes` | Bulk upsert attribute/value pairs |
| GET | `/api/products/{id}/fullname` | Dynamically composes full display name via `ProductFullNameFields` |
| POST | `/api/products/refresh-fullnames` | Batch recompute `FullName` across all rows |
| GET | `/api/manufacturers` | Minimal `{ID, ManufacturerName}` list for dropdowns |

**Image upload usage**
```bash
# Generic upload (pre-creation)
curl -X POST http://localhost:8000/api/upload-image \
  -F "file=@/path/to/photo.jpg"

# Photo bound to product ID 42
curl -X POST http://localhost:8000/api/products/42/upload-photo \
  -F "file=@/path/to/photo.jpg"
```

**Attribute persistence example**
```bash
curl -X POST http://localhost:8000/api/products/42/attributes \
  -H 'Content-Type: application/json' \
  -d '[{"FieldID":101, "Value":"500 мл"}, {"FieldID": 102, "Value": "150 кКал"}]'
```

### 2.3 Product Templates & Dynamic Fields

#### Template headers (`backend/app/routes/product_card_templates.py`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/product-card-templates` | Lists `ProductCardTemplateHeaders` |
| GET | `/api/product-card-templates/{id}` | Fetch single template, 404 on miss |
| POST | `/api/product-card-templates` | Requires `Name`; optional `Description` |
| PUT | `/api/product-card-templates/{id}` | Same body as POST |
| DELETE | `/api/product-card-templates/{id}` | Fails if template still has fields |

#### Template fields & base schema (`backend/app/routes/product_card_template_fields.py`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/product-card-template-fields?template_id=<id>` | Returns static `BASE_FIELDS` + custom fields for template |
| POST | `/api/product-card-template-fields` | Validates uniqueness of `SqlName` vs base and template |
| PUT | `/api/product-card-template-fields/{id}` | Update presentation metadata |
| DELETE | `/api/product-card-template-fields/{id}` | Remove field |
| POST | `/api/product-attributes/refresh-all` | Appends empty attribute rows for every product missing `field_id` |

Body contract for POST/PUT: `TemplateID`, `DisplayName`, `SqlName`, `FieldType`, `MaxLength`, `Precision`, `IsRequired`, `IsVisible`, `DisplayOrder`, `Description`.

#### Attribute CRUD (`backend/app/routes/product_attributes.py`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/product-attributes?product_id=<id>` | Joins template metadata for display |
| POST | `/api/product-attributes` | Body requires `ProductID`, `FieldID`, `AttrValue` |
| PUT | `/api/product-attributes/{id}` | Updates only `AttrValue` |
| DELETE | `/api/product-attributes/{id}` | Removes attribute row |

#### Full-name configuration (`backend/app/routes/product_full_name_fields.py`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/product-full-name-fields` | Returns `[ {ID, SqlName, DisplayName, DisplayOrder, IsEnabled} ]` |
| POST | `/api/product-full-name-fields` | Accepts entire array, wipes table before inserting enabled fields |

Body example:
```json
[
  {"SqlName": "Name", "DisplayName": "Назва", "DisplayOrder": 1, "IsEnabled": true},
  {"SqlName": "ManufacturerID", "DisplayName": "Виробник", "DisplayOrder": 2, "IsEnabled": true}
]
```

#### Naming rules & generators (`backend/app/routes/product_name_rules.py`)

⚠️ This router is mounted **without** `/api`, so the full URLs are `http://localhost:8000/product-name-rules` etc.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/product-name-rules` | All templated naming rules |
| GET | `/product-name-rules/{id}` | Single rule |
| POST | `/product-name-rules` | Body: `{ "CategoryID": int|null, "Rule": "Назва {Name} {Size}" }` |
| PUT | `/product-name-rules/{id}` | Update |
| DELETE | `/product-name-rules/{id}` | Remove rule |
| GET | `/product-name-rule-vars` | Static list of allowed placeholders |
| POST | `/product-full-name/generate` | Body `{ "rule": "{Name} ({Barcode})", "values": { ... } }`, returns `{ "full_name": "..." }` |

### 2.4 Pricing (`backend/app/routes/price_categories.py`, `product_prices.py`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/price-categories` | Optional `search`, `skip`, `limit` |
| POST | `/api/price-categories` | `{ "CategoryName": "HoReCa" }` |
| PUT | `/api/price-categories/{id}` | Same body |
| DELETE | `/api/price-categories/{id}` | Remove |
| GET | `/api/product-prices` | Filter by `product_id`, `price_category_id`, `min_price`, `max_price` |
| POST | `/api/product-prices` | Requires `ProductID`, `PriceCategoryID`, `Price` |
| PUT | `/api/product-prices/{id}` | Same body |
| DELETE | `/api/product-prices/{id}` | Remove |

### 2.5 Reference Dictionaries

#### Units (`backend/app/routes/units.py`)
- `GET /api/units` – returns `{ID, UnitName, ShortName}` sorted by name.

#### Manufacturers (`backend/app/routes/manufacturers.py` & `products_new.py`)
- `GET /api/manufacturers2` – rich set with `Country` (used by UI dropdowns).
- `GET /api/manufacturers` – simplified `(ID, Name)` exposed from `products_new.py`.
- `POST /api/manufacturers` – body accepts either `Name` or `ManufacturerName`.
- `PUT /api/manufacturers/{id}` & `DELETE /api/manufacturers/{id}` – standard CRUD.

#### Currencies & Rates (`backend/app/routes/currencies.py`)

| Method | Path | Notes |
| --- | --- | --- |
| CRUD | `/api/currencies{/{id}}` | Manage `{CurrencyCode, Name, Symbol, IsActive}` |
| GET | `/api/currency-rates` | Filter by `currency_id`, `date_from`, `date_to` (ISO) |
| POST | `/api/currency-rates` | `{CurrencyID, Rate, RateDate}` |
| PUT/DELETE | `/api/currency-rates/{id}` | Update/remove specific rate |

### 2.6 Accounting & Finance

| Router | Methods | Key fields |
| --- | --- | --- |
| `chart_of_accounts.py` | CRUD `/api/accounts{/{id}}` | `AccountCode`, `Name`, `ParentID`, `AccountType`, `CurrencyID`, `IsActive`, `IsSystem`, `Notes` |
| `account_tax_rates.py` | CRUD `/api/account-tax-rates{/{id}}` | Filter by `account_id` query; fields `AccountID`, `TaxType`, `Rate`, `DateFrom`, `DateTo` |
| `typical_operations.py` | CRUD `/api/typical-operations{/{id}}` | `OperationCode`, `Name`, `Description`, `IsActive` |
| `typical_operation_entries.py` | CRUD `/api/typical-operation-entries{/{id}}` | `OperationID`, `DebitAccountID`, `CreditAccountID`, `AmountType`, `Notes` |
| `settlement_accounts.py` | GET/POST/DELETE `/api/settlement-accounts{/{id}}` | `AccountName`, `AccountNumber`, `BankName`, `BankCity`, `MFO`, `IsActive` |
| `companies.py` | GET/POST/DELETE `/api/companies{/{id}}` | `Name`, `ShortName`, `EDRPOU`, `INN`, `Address`, `RegistrationInfo`, `TaxInfo`, `MainAccountID` |

Example – insert chart account:
```bash
curl -X POST http://localhost:8000/api/accounts \
  -H 'Content-Type: application/json' \
  -d '{
        "AccountCode": "301",
        "Name": "Каса",
        "AccountType": "Asset",
        "AccountPurpose": "Cash on hand",
        "CurrencyID": 1,
        "IsActive": true,
        "IsSystem": false
      }'
```

### 2.7 System & Program Settings

| Router | Method | Path | Notes |
| --- | --- | --- | --- |
| `system_parameters.py` | CRUD | `/api/system-parameters{/{id}}` | Generic key/value storage |
|  | GET | `/api/photo/{filename}` | Streams original photo from `PhotoPath` or `uploads` fallback |
|  | GET | `/api/preview/{filename}` | Streams preview; falls back to original photo |
| `programm_parameters.py` | GET | `/api/programm-parameters` | Dump of `ProgrammParameters` table |
|  | PUT | `/api/programm-parameters/{id}` | Body `{ "ParamValue": "..." }` |

**Example – update system parameter**
```bash
curl -X PUT http://localhost:8000/api/system-parameters/7 \
  -H 'Content-Type: application/json' \
  -d '{"ParamKey": "BarcodePrefix", "ParamValue": "482123"}'
```

### 2.8 Menu endpoints (`backend/app/routes/menu.py`)

Simple CRUD used by the Telegram bot and the legacy admin UI.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/menu` | Returns all Products rows |
| GET | `/api/menu/{id}` | Single product; 404 if missing |
| POST | `/api/menu` | Body includes `Name`, `Description`, `Barcode`, `Photo`, `CategoryID` |
| PUT | `/api/menu/{id}` | Update same fields |
| DELETE | `/api/menu/{id}` | Hard delete |

### 2.9 Static routes

- `GET /` – health probe returning `{ "message": "Welcome to CoffeeBot API!" }`.
- `GET /webapp/*` – served React build (refresh-safe).
- `GET /uploads/<filename>` – direct access to files saved via `/api/upload-image`.

---

## 3. Backend Utilities & Scripts

### 3.1 Database connection helper (`backend/app/db_connection.py`)

```python
from app.db_connection import get_db

@router.get("/example")
def handler(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT 1")
    return cursor.fetchone()[0]
```

- Uses `ODBC Driver 18` with credentials pulled from `backend/app/AD.ini` (server/db) and hard-coded user `rad`/`20Artbi$19`.
- `get_db()` yields a connection and closes it automatically – always use via FastAPI `Depends`.

### 3.2 Helper functions inside `products_new.py`

- `generate_ean13_barcode(db, barcode_prefix)` – increments `SystemParameters.BarcodeNum`, ensures uniqueness, logs to stdout.
- `create_preview(image_path, preview_path, size=(200, 200))` – uses Pillow to create a letterboxed thumbnail for product images.

Both functions are internal but can be reused by importing from `app.routes.products_new` if needed.

### 3.3 `check_photo_params.py` (root)

Standalone diagnostic script for Windows environments. It:
1. Connects to `CoffeeBotDB` using trusted auth.
2. Checks for `SystemParameters` rows `PhotoPath` & `PreviewPath`.
3. Automatically creates directories and inserts missing parameters pointing to `Photos/` & `Photos/Preview/` under `C:\Users\Vlad\PycharmProjects\ReactBotCoffee`.

Run it manually when syncing photo folder settings on a fresh database.

### 3.4 Telegram bot (`backend/bot/bot.py`)

- Uses `python-telegram-bot` to expose `/start` and `/menu` commands.
- `TELEGRAM_TOKEN` read from env var (falls back to hard-coded token—replace before production).
- `/menu` handler hits `http://localhost:8000/menu` (not `/api/menu`); adjust if you only expose the `/api` prefixed route.
- Run via `python backend/bot/bot.py`. Requires dependencies from `backend/bot/requirements.txt`.

---

## 4. React API Helper (`frontend/webapp/src/api.js`)

All helpers share the pattern `fetch(`${API_BASE}/resource`)` where `API_BASE = 'http://localhost:8000/api'`. Returned values are `Promise<JSON>`. Missing helpers are noted with ⚠️.

### 4.1 Catalog & Templates

| Function | HTTP call | Notes |
| --- | --- | --- |
| `getCategories()` | `GET /api/categories` | No args |
| `addCategory(data)` | `POST /api/categories` | Body mirrors backend contract |
| `updateCategory(id,data)` | `PUT /api/categories/{id}` | — |
| `deleteCategory(id)` | `DELETE /api/categories/{id}` | — |
| `getProductCardTemplates()` | `GET /api/product-card-templates` | — |
| `addProductCardTemplate(data)` | `POST /api/product-card-templates` | — |
| `updateProductCardTemplate(id,data)` | `PUT /api/product-card-templates/{id}` | — |
| `deleteProductCardTemplate(id)` | `DELETE /api/product-card-templates/{id}` | — |
| `getProductCardTemplateById(id)` | `GET /api/product-card-templates/{id}` | — |
| `getProductCardTemplateFields(templateId)` | `GET /api/product-card-template-fields?template_id=...` | — |
| `addProductCardTemplateField(data)` | `POST /api/product-card-template-fields` | — |
| `updateProductCardTemplateField(id,data)` | `PUT .../{id}` | — |
| `deleteProductCardTemplateField(id)` | `DELETE .../{id}` | — |
| `getProductFullNameFields()` / `saveProductFullNameFields(fields)` | `/api/product-full-name-fields` | Mirror backend array contract |
| `getProductNameRules()` etc. | **Warning:** Backend routes live at `/product-name-rules`, but helper points to `/api/product-name-rules` (call will 404 until router prefix is aligned). |

### 4.2 Products & Pricing

| Function | Path |
| --- | --- |
| `getProducts()`, `addProduct(data)` | `/api/products` |
| `getProductPrices()`, `addProductPrice(data)` | `/api/product-prices` |
| `getPriceCategories()`, `addPriceCategory(data)` | `/api/price-categories` |
| `getProductAttributes(productId)` / `saveProductAttributes(productId, attributes)` | `/api/products/{id}/attributes` |
| `getProductFullName(productId)` | `/api/products/{id}/fullname` |

### 4.3 Settings & Accounting

| Function | HTTP | Notes |
| --- | --- | --- |
| `getSystemParameters()`, `addSystemParameter`, `updateSystemParameter`, `deleteSystemParameter` | `/api/system-parameters` | `update` requires ID |
| `getProgrammParameters()`, `updateProgrammParameter` | `/api/programm-parameters` |
| `getChartOfAccounts()`, `addChartOfAccount`, `updateChartOfAccount`, `deleteChartOfAccount` | `/api/accounts` |
| `getAccountTaxRates(accountId?)`, `addAccountTaxRate`, `updateAccountTaxRate`, `deleteAccountTaxRate` | `/api/account-tax-rates` |
| `getTypicalOperations()`, `addTypicalOperation`, `updateTypicalOperation`, `deleteTypicalOperation` | `/api/typical-operations` |
| `getTypicalOperationEntries(operationId?)`, CR*UD | `/api/typical-operation-entries` |
| `getManufacturers()`, `addManufacturer`, `deleteManufacturer` | `/api/manufacturers2` (GET) & `/api/manufacturers` (write) |
| `getUnits()` | `/api/units` |
| `getCurrencies()`, `addCurrency`, `getCurrencyRates(params)`, `addCurrencyRate` | `/api/currencies` & `/api/currency-rates` |
| `getSettlementAccounts()`, `addSettlementAccount`, `deleteSettlementAccount` | `/api/settlement-accounts` |
| `getCompanies()`, `addCompany`, `deleteCompany` | `/api/companies` |

⚠️ **Missing helpers**: `updateCompany`, `updateSettlementAccount`, `updateCurrency`, `deleteCurrency`, `updateManufacturer`, etc., are used by pages but not implemented in `api.js`. Add them to prevent runtime errors.

### 4.4 Usage pattern

```javascript
import { api } from '../api';

async function loadCategories() {
  const data = await api.getCategories();
  setCategories(Array.isArray(data) ? data : []);
}
```

---

## 5. React Components & Pages

### 5.1 Routing (`frontend/webapp/src/App.js`)

- Wraps the SPA in `<BrowserRouter basename="/webapp">` so deep links remain valid when served by FastAPI.
- Routes `/` → `MainMenu`, `/categories` → `CategoriesPage`, etc.
- To add a page simply import it and add a `<Route path="/foo" element={<FooPage />} />` row.

### 5.2 Shared Components

#### `MainMenu` (`pages/MainMenu.jsx`)
- Displays high-level modules + submenus.
- Uses `useNavigate` for client-side routing.
- `mainMenu` data structure drives cards and dropdowns; extend it to add modules.

#### `ProductCard` (`components/ProductCard.jsx`)
Props:
- `templateId` (number) – template whose fields to render (default `3`).
- `productId` (nullable) – edit mode when set.
- `onSave(result)` / `onCancel()` – callbacks for parent.

Features:
- Fetches template fields, categories, manufacturers.
- Tabs for "Основні дані", "Додаткові поля", "Ціни".
- Handles photo uploads (new vs edit) and attribute persistence.

Usage:
```jsx
<ProductCard
  templateId={templateId}
  productId={editingId}
  onSave={() => { setShow(false); reload(); }}
  onCancel={() => setShow(false)}
/>
```

#### `Menu` (`frontend/webapp/src/components/Menu.jsx`)
- Rich admin table for menu items with search, category filter, modal CRUD.
- Internally defines its own `api` wrapper hitting `/api/menu` and `/api/categories`.

#### `Sidebar` (`components/Sidebar.jsx`)
- Static nav list (currently unused; kept for future layout).

#### Legacy CRA sample `Menu` (`frontend/src/components/Menu.jsx`)
- Minimal, dark-themed showcase component (static array). Safe to remove if not used.

### 5.3 Pages (alphabetical)

| Component | Purpose | Key interactions |
| --- | --- | --- |
| `AccountCentersSettings` | Placeholder | Display-only string |
| `CashiersSettings` | Placeholder | — |
| `CategoriesPage` | Full CRUD UI for categories | Loads categories/units/templates; inline edit modal |
| `ChartOfAccountsPage` | Tabbed view for accounts, tax rates, typical operations | Relies heavily on missing API helpers (`update...`) |
| `CompaniesPage` | Manage legal entities | Needs `api.updateCompany` (not yet implemented) |
| `CurrenciesAdminPage` | Manage currencies & rates | Expects `api.updateCurrency/deleteCurrency` |
| `EmployeesSettings` | Placeholder | — |
| `MainProgramSettings` | Local-state form for base currency/company name | No persistence yet |
| `ManufacturersPage` | CRUD for manufacturers | Uses `api.getManufacturers` etc.; `saveEdit` currently incorrectly calls `api.addManufacturer` (should call update) |
| `PriceCategoriesPage` | Minimal add/list view | Uses `api.get/addPriceCategory` |
| `PriceListPage` | Matrix of products vs price categories | Reads products, categories, prices; no editing |
| `ProductCardTemplateFields` | Standalone field manager (templateId hard-coded to 3) | Makes raw fetch calls (not `api.js`) |
| `ProductCardTemplatesPage` | List + edit of template headers | Renders `ProductCardTemplateFields` when template selected |
| `ProductNameRulesPage` | Drag/drop style field selection for full-name generation | Uses mix of direct fetch and `api` helpers; note route prefix mismatch |
| `ProductPricesPage` | Simple list & add form | Uses `api.get/addProductPrice` |
| `ProductsPage` | Product catalog grid with detail drawer (`ProductCard`) | Loads products + categories + full name; triggers modal editing |
| `ProgrammParametersPage` | Container featuring left nav & embedded sub-pages | Renders many of the above modules inline |
| `SettlementAccountsPage` | CRUD for bank accounts | Requires missing `api.updateSettlementAccount` |
| `SystemParametersPage` | Editable table for key/value settings | Uses toasts + inline save/delete |

When wiring a new feature, follow the same pattern: add API helper → build page → register route.

### 5.4 Styling assets

- Tailwind config lives in `frontend/webapp/tailwind.config.js`.
- Global styles: `App.css`, `index.css`, plus component-level inline styles.

---

## 6. Known Gaps & Implementation Notes

1. **Router prefix mismatch** – `product_name_rules` is mounted without `/api`. Either update `main.py` to `app.include_router(product_name_rules.router, prefix="/api")` or change the frontend `API_BASE` usage for those calls.
2. **Missing API helpers** – several pages call `api.updateCompany`, `api.updateSettlementAccount`, `api.updateCurrency`, `api.deleteCurrency`, etc., but the functions don’t exist. Add them to avoid `TypeError: api.updateCompany is not a function`.
3. **Manufacturer update** – `ManufacturersPage.saveEdit` currently calls `api.addManufacturer` with an `ID`. Implement `api.updateManufacturer` and swap it in.
4. **Telegram bot endpoint** – the bot hits `/menu`, but the FastAPI router is mounted at `/api/menu`. Either add a non-prefixed include or change `API_URL` to `http://localhost:8000/api/menu`.
5. **Hard-coded credentials** – both `db_connection.py` and `check_photo_params.py` contain usernames/passwords. Swap them for secrets or env vars before deploying.
6. **Static templateId (3)** – `ProductCardTemplateFields` hard-codes template `3`. Expose a selector or prop to make it reusable.

---

## 7. Examples Cheat-Sheet

### Create a product with dynamic attributes
```bash
# 1) Upload hero image
PHOTO=$(curl -s -X POST http://localhost:8000/api/upload-image -F "file=@/tmp/latte.jpg" | jq -r '.filename')

# 2) Create product (standard fields only)
PRODUCT_ID=$(curl -s -X POST http://localhost:8000/api/products \
  -H 'Content-Type: application/json' \
  -d "{\"Name\":\"Лате карамельний\",\"CategoryID\":5,\"Photo\":\"$PHOTO\"}" | jq -r '.id')

# 3) Save dynamic attributes
curl -X POST http://localhost:8000/api/products/$PRODUCT_ID/attributes \
  -H 'Content-Type: application/json' \
  -d '[{"FieldID":201,"Value":"500 мл"},{"FieldID":202,"Value":"Сироп карамель"}]'
```

### Render the catalog in React
```jsx
import { useEffect, useState } from 'react';
import { api } from '../api';

export function CatalogList() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.getProducts().then((rows) => setItems(Array.isArray(rows) ? rows : []));
  }, []);

  return (
    <ul>
      {items.map((p) => (
        <li key={p.ID}>{p.FullName ?? p.Name}</li>
      ))}
    </ul>
  );
}
```

---

Need something that is not listed? Generate new entries here and keep this file as the single source of truth. Contributions welcome!
