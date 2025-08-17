// === Base URL з .env.local або запасний варіант ===
export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:8000/api";

// --- Опціональні хуки ---
let tokenGetter = null;
let onUnauthorized = null;

export const setAuthTokenGetter = (fn) => {
  tokenGetter = fn;
};
export const setOnUnauthorized = (fn) => {
  onUnauthorized = fn;
};

// --- Діагностика помилок API для зручного копіювання в чат ---
let lastApiDiagText = "";
export const getLastApiDiag = () => lastApiDiagText;
export const copyLastApiDiag = async () => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(lastApiDiagText || "");
    }
  } catch {}
};
if (typeof window !== "undefined") {
  // Швидкий доступ з консолі: window.copyLastApiDiag()
  window.copyLastApiDiag = copyLastApiDiag;
}

// --- Хелпер для побудови query (підтримка масивів) ---
function buildQuery(q) {
  if (!q || !Object.keys(q).length) return "";
  const sp = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((item) => sp.append(k, item));
    else if (v !== undefined && v !== null && v !== "") sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// --- Універсальний fetch з таймаутом і нормальними помилками ---
async function fetchJSON(
  path,
  { method = "GET", data, query, headers = {}, timeoutMs = 15000 } = {}
) {
  const controller = new AbortController();
  const t = setTimeout(
    () => controller.abort(new Error("Request timeout")),
    timeoutMs
  );

  const qs = buildQuery(query);
  const url = `${API_BASE}${path}${qs}`;
  const requestBody = data != null ? JSON.stringify(data) : undefined;

  const token = tokenGetter ? tokenGetter() : null;
  const h = { Accept: "application/json", ...headers };
  if (data != null && !h["Content-Type"]) h["Content-Type"] = "application/json";
  if (token && !h.Authorization) h.Authorization = `Bearer ${token}`;
  // Не прив’язуємо компанію глобально у запитах — визначається бекендом по даних документа

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: h,
      body: requestBody,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(t);
    const diag = [
      "API ERROR (network)",
      `URL: ${url}`,
      `Method: ${method}`,
      `Request headers: ${safeStringify(h)}`,
      `Request body: ${requestBody || "<none>"}`,
      `Message: ${e?.message || "Network error"}`,
    ].join("\n");
    lastApiDiagText = diag;
    if (typeof window !== "undefined") window.__lastApiDiagText = diag;
    try { if (typeof navigator !== "undefined" && navigator.clipboard) await navigator.clipboard.writeText(diag); } catch {}
    throw new Error(e?.message || "Network error");
  } finally {
    clearTimeout(t);
  }

  if (res.status === 401 && typeof onUnauthorized === "function") {
    try {
      onUnauthorized();
    } catch {}
  }

  const text = await res.text();
  const payload = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  if (!res.ok) {
    const msg =
      (payload && typeof payload === "object" && (payload.detail || payload.message)) ||
      (typeof payload === "string" ? payload : `HTTP ${res.status}`);
    const diag = [
      "API ERROR",
      `URL: ${url}`,
      `Method: ${method}`,
      `Status: ${res.status}`,
      `Request headers: ${safeStringify(h)}`,
      `Request body: ${requestBody || "<none>"}`,
      `Response: ${safeStringify(payload)}`,
    ].join("\n");
    lastApiDiagText = diag;
    if (typeof window !== "undefined") window.__lastApiDiagText = diag;
    // Debug log with full context to help diagnose 400s
    console.error("[API ERROR]", { path, method, status: res.status, msg, payload });
    try { if (typeof navigator !== "undefined" && navigator.clipboard) await navigator.clipboard.writeText(diag); } catch {}
    const err = new Error(msg);
    err.status = res.status;
    err.details = payload;
    err.diagText = diag;
    throw err;
  }

  return payload;
}

function safeStringify(value) {
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// Сирий запит (для 404 та FormData)
async function fetchRaw(path, options = {}) {
  const controller = new AbortController();
  const t = setTimeout(
    () => controller.abort(new Error("Request timeout")),
    options.timeoutMs ?? 15000
  );

  const token = tokenGetter ? tokenGetter() : null;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (token && !headers.has("Authorization"))
    headers.set("Authorization", `Bearer ${token}`);
  // Не додаємо X-Company-ID глобально

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
  if (res.status === 401 && typeof onUnauthorized === "function") {
    try {
      onUnauthorized();
    } catch {}
  }
  return res;
}

// --- Авторизація / логін ---
export const loginUser = async (data) => {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Невірний логін або пароль");
  return await response.json();
};

  // --- Категорії ---
export const getCategories = () => fetchJSON("/categories");
export const addCategory = (data) =>
  fetchJSON("/categories", { method: "POST", data });
export const updateCategory = (id, data) =>
  fetchJSON(`/categories/${id}`, { method: "PUT", data });
export const deleteCategory = (id) =>
  fetchJSON(`/categories/${id}`, { method: "DELETE" });

// --- Одиниці виміру ---
export const getUnits = () => fetchJSON("/units");

// --- Виробники ---
export const getManufacturers = () => fetchJSON("/manufacturers");
export const addManufacturer = (data) =>
  fetchJSON("/manufacturers", { method: "POST", data });
export const updateManufacturer = (id, data) =>
  fetchJSON(`/manufacturers/${id}`, { method: "PUT", data });
export const deleteManufacturer = (id) =>
  fetchJSON(`/manufacturers/${id}`, { method: "DELETE" });

// --- Валюти ---
export const getCurrencies = () => fetchJSON("/currencies");
export const addCurrency = (data) =>
  fetchJSON("/currencies", { method: "POST", data });
export const updateCurrency = (id, data) =>
  fetchJSON(`/currencies/${id}`, { method: "PUT", data });
export const deleteCurrency = (id) =>
  fetchJSON(`/currencies/${id}`, { method: "DELETE" });

// --- Курси валют ---
export const getCurrencyRates = (query = {}) =>
  fetchJSON("/currency-rates", { query });
export const addCurrencyRate = (data) =>
  fetchJSON("/currency-rates", { method: "POST", data });
export const getCurrencyRate = (currencyId) =>
  fetchJSON(`/currency-rates/${currencyId}`);

// --- Націнки по категоріях ---
export const getCategoryMargins = () => fetchJSON("/category-margins");
export const addCategoryMargin = (data) =>
  fetchJSON("/category-margins", { method: "POST", data });
export const updateCategoryMargin = (id, data) =>
  fetchJSON(`/category-margins/${id}`, { method: "PUT", data });
export const deleteCategoryMargin = (id) =>
  fetchJSON(`/category-margins/${id}`, { method: "DELETE" });

// --- Прайс-лист ---
export const getProductPrices = () => fetchJSON("/product-prices");
export const addProductPrice = (data) =>
  fetchJSON("/product-prices", { method: "POST", data });
export const updateProductPrice = (id, data) =>
  fetchJSON(`/product-prices/${id}`, { method: "PUT", data });
export const deleteProductPrice = (id) =>
  fetchJSON(`/product-prices/${id}`, { method: "DELETE" });

// --- Категорії цін ---
export const getPriceCategories = () => fetchJSON("/price-categories");
export const addPriceCategory = (data) =>
  fetchJSON("/price-categories", { method: "POST", data });
export const updatePriceCategory = (id, data) =>
  fetchJSON(`/price-categories/${id}`, { method: "PUT", data });
export const deletePriceCategory = (id) =>
  fetchJSON(`/price-categories/${id}`, { method: "DELETE" });

// --- Шаблони карток ---
export const getProductCardTemplates = () => fetchJSON("/product-card-templates");
export const addProductCardTemplate = (data) =>
  fetchJSON("/product-card-templates", { method: "POST", data });
export const updateProductCardTemplate = (id, data) =>
  fetchJSON(`/product-card-templates/${id}`, { method: "PUT", data });
export const deleteProductCardTemplate = (id) =>
  fetchJSON(`/product-card-templates/${id}`, { method: "DELETE" });
export const getProductCardTemplateById = (id) =>
  fetchJSON(`/product-card-templates/${id}`);

// --- Поля шаблону картки ---
export const getProductCardTemplateFields = (templateId) =>
  fetchJSON("/product-card-template-fields", {
    query: { template_id: templateId },
  });
export const addProductCardTemplateField = (data) =>
  fetchJSON("/product-card-template-fields", { method: "POST", data });
export const updateProductCardTemplateField = (id, data) =>
  fetchJSON(`/product-card-template-fields/${id}`, { method: "PUT", data });
export const deleteProductCardTemplateField = (id) =>
  fetchJSON(`/product-card-template-fields/${id}`, { method: "DELETE" });

// --- Повне ім'я товару (по шаблону) ---
export const getProductFullNameFields = (templateId) =>
  fetchJSON("/product-full-name-fields", {
    query: { template_id: templateId },
  });
export const saveProductFullNameFields = (templateId, fields) =>
  fetchJSON("/product-full-name-fields", {
    method: "POST",
    data: { template_id: templateId, fields },
  });

// --- Розрахункові рахунки ---
export const getSettlementAccounts = () => fetchJSON("/settlement-accounts");
export const addSettlementAccount = (data) =>
  fetchJSON("/settlement-accounts", { method: "POST", data });
export const updateSettlementAccount = (id, data) =>
  fetchJSON(`/settlement-accounts/${id}`, { method: "PUT", data });
export const deleteSettlementAccount = (id) =>
  fetchJSON(`/settlement-accounts/${id}`, { method: "DELETE" });

// --- Системні параметри ---
export const getSystemParameters = () => fetchJSON("/system-parameters");
export const addSystemParameter = (data) =>
  fetchJSON("/system-parameters", { method: "POST", data });
export const updateSystemParameter = (id, data) =>
  fetchJSON(`/system-parameters/${id}`, { method: "PUT", data });
export const deleteSystemParameter = (id) =>
  fetchJSON(`/system-parameters/${id}`, { method: "DELETE" });

// --- Назви за правилами ---
export const getProductNameRules = () => fetchJSON("/product-name-rules");
export const addProductNameRule = (data) =>
  fetchJSON("/product-name-rules", { method: "POST", data });
export const updateProductNameRule = (id, data) =>
  fetchJSON(`/product-name-rules/${id}`, { method: "PUT", data });
export const deleteProductNameRule = (id) =>
  fetchJSON(`/product-name-rules/${id}`, { method: "DELETE" });
export const getProductNameRuleById = (id) =>
  fetchJSON(`/product-name-rules/${id}`);
export const getProductCardTemplateVars = () =>
  fetchJSON("/product-name-rule-vars");
export const generateProductFullName = (data) =>
  fetchJSON("/product-full-name/generate", { method: "POST", data });

// --- План рахунків ---
export const getChartOfAccounts = () => fetchJSON("/chart-of-accounts");
export const addChartOfAccount = (data) =>
  fetchJSON("/chart-of-accounts", { method: "POST", data });
export const updateChartOfAccount = (id, data) =>
  fetchJSON(`/chart-of-accounts/${id}`, { method: "PUT", data });
export const deleteChartOfAccount = (id) =>
  fetchJSON(`/chart-of-accounts/${id}`, { method: "DELETE" });

// --- Ставки податків на рахунках ---
export const getAccountTaxRates = () => fetchJSON("/account-tax-rates");
export const addAccountTaxRate = (data) =>
  fetchJSON("/account-tax-rates", { method: "POST", data });
export const updateAccountTaxRate = (id, data) =>
  fetchJSON(`/account-tax-rates/${id}`, { method: "PUT", data });
export const deleteAccountTaxRate = (id) =>
  fetchJSON(`/account-tax-rates/${id}`, { method: "DELETE" });

// --- Довідник податків (ставки ПДВ тощо) ---
export const getTaxes = () => fetchJSON("/taxes");
export const addTax = (data) => fetchJSON("/taxes", { method: "POST", data });
export const updateTax = (id, data) =>
  fetchJSON(`/taxes/${id}`, { method: "PUT", data });
export const deleteTax = (id) =>
  fetchJSON(`/taxes/${id}`, { method: "DELETE" });

// --- Типові операції ---
export const getTypicalOperations = () => fetchJSON("/typical-operations");
export const addTypicalOperation = (data) =>
  fetchJSON("/typical-operations", { method: "POST", data });
export const updateTypicalOperation = (id, data) =>
  fetchJSON(`/typical-operations/${id}`, { method: "PUT", data });
export const deleteTypicalOperation = (id) =>
  fetchJSON(`/typical-operations/${id}`, { method: "DELETE" });
export const getTypicalOperationEntries = (operationId) =>
  fetchJSON(`/typical-operations/${operationId}/entries`);
export const saveTypicalOperationEntries = (operationId, entries) =>
  fetchJSON(`/typical-operations/${operationId}/entries`, {
      method: "POST",
    data: entries,
  });

// --- Товари ---
export const getProducts = (search = "", category = "") => {
  const query = {};
  if (search) query.search = search;
  if (category) query.category = category;
  return fetchJSON("/products", { query });
};
export const addProduct = (data) =>
  fetchJSON("/products", { method: "POST", data });
export const updateProduct = (id, data) =>
  fetchJSON(`/products/${id}`, { method: "PUT", data });
export const deleteProduct = (id) =>
  fetchJSON(`/products/${id}`, { method: "DELETE" });

// Фото товару (FormData)
export const uploadProductPhoto = async (productId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const token = tokenGetter ? tokenGetter() : null;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetchRaw(`/products/${productId}/upload-photo`, {
      method: "POST",
    body: formData,
    headers,
  });

  if (!resp.ok) throw new Error("Помилка завантаження фото");
  return await resp.json();
};

// Атрибути товару
export const getProductAttributes = (productId) =>
  fetchJSON(`/products/${productId}/attributes`);
export const saveProductAttributes = (productId, attributes) =>
  fetchJSON(`/products/${productId}/attributes`, {
    method: "POST",
    data: attributes,
  });

// --- Компанії ---
export const getCompanies = () => fetchJSON("/companies");
export const addCompany = (data) =>
  fetchJSON("/companies", { method: "POST", data });
export const updateCompany = (id, data) =>
  fetchJSON(`/companies/${id}`, { method: "PUT", data });
export const deleteCompany = (id) =>
  fetchJSON(`/companies/${id}`, { method: "DELETE" });

// --- Повна назва товару ---
export const getProductFullName = (productId) =>
  fetchJSON(`/products/${productId}/fullname`);

// --- Центри обліку ---
export const getCenters = () => fetchJSON("/centers-of-accounting");
export const addCenter = (data) =>
  fetchJSON("/centers-of-accounting", { method: "POST", data });
export const updateCenter = (id, data) =>
  fetchJSON(`/centers-of-accounting/${id}`, { method: "PUT", data });
export const deleteCenter = (id) =>
  fetchJSON(`/centers-of-accounting/${id}`, { method: "DELETE" });

// --- Склади ---
export const getWarehouses = (centerId) =>
  fetchJSON("/warehouses", { query: { center_id: centerId } });
export const addWarehouse = (data) =>
  fetchJSON("/warehouses", { method: "POST", data });
export const updateWarehouse = (id, data) =>
  fetchJSON(`/warehouses/${id}`, { method: "PUT", data });
export const deleteWarehouse = (id) =>
  fetchJSON(`/warehouses/${id}`, { method: "DELETE" });

// --- Каси (Cashboxes) ---
export const getCashboxes = async (centerId = null) => {
  const result = await fetchJSON("/cashboxes", {
    query: centerId ? { center_id: centerId } : {},
  });
  return Array.isArray(result) ? result : result ? [result] : [];
};
export const addCashbox = (data) =>
  fetchJSON("/cashboxes", { method: "POST", data });
export const updateCashbox = (id, data) =>
  fetchJSON(`/cashboxes/${id}`, { method: "PUT", data });
export const deleteCashbox = (id) =>
  fetchJSON(`/cashboxes/${id}`, { method: "DELETE" });

export const getCenterCompanies = (centerId) =>
  fetchJSON("/center-companies", { query: { center_id: centerId } });
export const addCompanyToCenter = (centerId, companyId) =>
  fetchJSON("/center-companies", {
    method: "POST",
    data: { center_id: centerId, company_id: companyId },
  });
export const removeCompanyFromCenter = (centerId, companyId) =>
  fetchJSON("/center-companies", {
    method: "DELETE",
    query: { center_id: centerId, company_id: companyId },
  });

// --- Користувачі ---
export const getCentersOfAccounting = () => fetchJSON("/centers-of-accounting");
export const getUsers = () => fetchJSON("/users");
export const createUser = (data) => fetchJSON("/users", { method: "POST", data });
export const updateUser = (id, data) =>
  fetchJSON(`/users/${id}`, { method: "PUT", data });
export const deleteUser = (id) =>
  fetchJSON(`/users/${id}`, { method: "DELETE" });

// --- Ролі ---
export const getRoles = () => fetchJSON("/roles");
export const addRole = (data) => fetchJSON("/roles", { method: "POST", data });
export const updateRole = (id, data) =>
  fetchJSON(`/roles/${id}`, { method: "PUT", data });
export const deleteRole = (id) => fetchJSON(`/roles/${id}`, { method: "DELETE" });

// --- Права ролі ---
export const getRolePermissions = (roleId) =>
  fetchJSON(`/roles/${roleId}/permissions`);
export const updateRolePermissions = (roleId, permissions) =>
  fetchJSON(`/roles/${roleId}/permissions`, { method: "POST", data: permissions });

// --- Співробітники ---
export const getEmployees = () => fetchJSON("/employees");
export const getEmployeeById = (id) => fetchJSON(`/employees/${id}`);
export const addEmployee = (data) =>
  fetchJSON("/employees", { method: "POST", data });
export const updateEmployee = (id, data) =>
  fetchJSON(`/employees/${id}`, { method: "PUT", data });
export const deleteEmployee = (id) =>
  fetchJSON(`/employees/${id}`, { method: "DELETE" });

// --- Постачальники ---
export const getSuppliers = () => fetchJSON("/suppliers");
export const addSupplier = (data) =>
  fetchJSON("/suppliers", { method: "POST", data });
export const updateSupplier = (id, data) =>
  fetchJSON(`/suppliers/${id}`, { method: "PUT", data });
export const deleteSupplier = (id) =>
  fetchJSON(`/suppliers/${id}`, { method: "DELETE" });

// --- Пошук товарів ---
export const searchProducts = async (q) => {
  const s = (q || "").trim();
  if (s.length < 3) return [];
  try {
    const raw = await fetchJSON("/products/search", { query: { q: s } });
    const arr = Array.isArray(raw) ? raw : [];
    const normalized = arr.map((p) => ({
      ...p,
      ID: p.ID ?? p.Id ?? p.ProductID ?? p.productId ?? p.id,
      FullName: p.FullName ?? p.fullName ?? p.ProductName ?? p.Name ?? p.name ?? "",
      Name: p.Name ?? p.name ?? p.ProductName ?? p.FullName ?? "",
      Barcode: p.Barcode ?? p.barcode ?? "",
      Sku: p.Sku ?? p.sku ?? "",
      Article: p.Article ?? p.article ?? "",
    }));
    // Пріоритезуємо точні збіги: спочатку штрихкод, потім артикул (SKU)
    const exactBarcodeIdx = normalized.findIndex(
      (x) => String(x.Barcode || "").trim() === s
    );
    const exactSkuIdx = normalized.findIndex(
      (x) => String(x.Sku || "").trim() === s || String(x.Article || "").trim() === s
    );
    if (exactBarcodeIdx > 0) {
      const [hit] = normalized.splice(exactBarcodeIdx, 1);
      normalized.unshift(hit);
    } else if (exactBarcodeIdx === -1 && exactSkuIdx > 0) {
      const [hit] = normalized.splice(exactSkuIdx, 1);
      normalized.unshift(hit);
    }
    return normalized;
  } catch (e) {
    if (e.status === 422 || e.status === 400) return [];
    throw e;
  }
};

export const getProductByBarcode = async (barcode) => {
  const s = (barcode || "").trim();
  if (!s) return null;

  // 1) основний ендпоїнт (може дати 404 — це ок)
  const res = await fetchRaw(`/products/by-barcode/${encodeURIComponent(s)}`, { method: "GET" });

  if (res.ok) {
    const p = await res.json();
    return {
      ...p,
      ID: p.ID ?? p.Id ?? p.ProductID ?? p.productId ?? p.id,
      FullName: p.FullName ?? p.fullName ?? p.ProductName ?? p.Name ?? p.name ?? "",
      Name: p.Name ?? p.name ?? p.ProductName ?? p.FullName ?? "",
      Barcode: p.Barcode ?? p.barcode ?? s,
      Sku: p.Sku ?? p.sku ?? "",
    };
  }

  if (res.status !== 404) throw new Error(`HTTP ${res.status}`);

  // 2) Резерв: шукаємо через /products/search
  try {
    const found = await searchProducts(s);
    const exact =
      found.find((x) => String(x.Barcode || "").trim() === s) ||
      found.find((x) => String(x.Sku || "").trim() === s) ||
      found[0] ||
      null;
    return exact || null;
  } catch {
    return null;
  }
};


// --- Прибуткова накладна ---
export const getArrivalDocs = (params = {}) =>
  fetchJSON("/arrival-documents", { query: params });
export const getArrivalDoc = (id) => fetchJSON(`/arrival-documents/${id}`);
export const addArrivalDoc = (data) =>
  fetchJSON("/arrival-documents", { method: "POST", data });
export const updateArrivalDoc = (id, data) =>
  fetchJSON(`/arrival-documents/${id}`, { method: "PUT", data });
export const deleteArrivalDoc = (id) =>
  fetchJSON(`/arrival-documents/${id}`, { method: "DELETE" });
export const getArrivalDocItems = (docId) =>
  fetchJSON(`/arrival-documents/${docId}/items`);
export const addArrivalDocItem = (docId, data) =>
  fetchJSON(`/arrival-documents/${docId}/items`, { method: "POST", data });
export const updateArrivalDocItem = (docId, itemId, data) =>
  fetchJSON(`/arrival-documents/${docId}/items/${itemId}`, {
    method: "PUT",
    data,
  });
export const deleteArrivalDocItem = (docId, itemId) =>
  fetchJSON(`/arrival-documents/${docId}/items/${itemId}`, {
    method: "DELETE",
  });

 export const postArrivalDocPostings = (id) =>
  fetchJSON(`/arrival-documents/${id}/postings`, { method: 'POST' });

// Скасувати проведення прибуткової
export const cancelArrivalDocPostings = (id) =>
  fetchJSON(`/arrival-documents/${id}/postings`, { method: 'DELETE' });

// --- Глобальний експорт ---
export const api = {
  // Глобальні методи для ручних викликів
  async get(path, query) { return fetchJSON(path, { method: "GET", query }); },
  async post(path, query, data) { return fetchJSON(path, { method: "POST", query, data }); },

  // Сервісні задачі (планувальник)
  getServiceTasks: () => fetchJSON("/service-tasks"),
  getServiceTask: (key) => fetchJSON(`/service-tasks/${key}`),
  upsertServiceTask: (key, data) => fetchJSON(`/service-tasks/${key}`, { method: "POST", data }),
  runServiceTaskNow: (key) => fetchJSON(`/service-tasks/${key}/run-now`, { method: "POST" }),

  // Категорії
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  // Одиниці
  getUnits,
  // Виробники
  getManufacturers,
  addManufacturer,
  updateManufacturer,
  deleteManufacturer,
  // Валюти та курси
  getCurrencies,
  addCurrency,
  updateCurrency,
  deleteCurrency,
  getCurrencyRates,
  addCurrencyRate,
  getCurrencyRate,
  // Картки та шаблони
  getProductCardTemplates,
  addProductCardTemplate,
  updateProductCardTemplate,
  deleteProductCardTemplate,
  getProductCardTemplateById,
  getProductCardTemplateFields,
  addProductCardTemplateField,
  updateProductCardTemplateField,
  deleteProductCardTemplateField,
  // Повні імена товару
  getProductFullNameFields,
  saveProductFullNameFields,
  // Розрахункові рахунки
  getSettlementAccounts,
  addSettlementAccount,
  updateSettlementAccount,
  deleteSettlementAccount,
  // Системні параметри
  getSystemParameters,
  addSystemParameter,
  updateSystemParameter,
  deleteSystemParameter,
  // Назви за правилами
  getProductNameRules,
  addProductNameRule,
  updateProductNameRule,
  deleteProductNameRule,
  getProductNameRuleById,
  getProductCardTemplateVars,
  generateProductFullName,
  // План рахунків та бухгалтерія
  getChartOfAccounts,
  addChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  getAccountTaxRates,
  addAccountTaxRate,
  updateAccountTaxRate,
  deleteAccountTaxRate,
  // Податки
  getTaxes,
  addTax,
  updateTax,
  deleteTax,
  // Типові операції
  getTypicalOperations,
  addTypicalOperation,
  updateTypicalOperation,
  deleteTypicalOperation,
  getTypicalOperationEntries,
  saveTypicalOperationEntries,
  // Товари
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductPhoto,
  getProductAttributes,
  saveProductAttributes,
  getProductFullName,
  // Пошук
  searchProducts,
  getProductByBarcode,
  // Компанії
  getCompanies,
  addCompany,
  updateCompany,
  deleteCompany,
  // Категорії цін
  getPriceCategories,
  addPriceCategory,
  updatePriceCategory,
  deletePriceCategory,
  // Прайс
  getProductPrices,
  addProductPrice,
  updateProductPrice,
  deleteProductPrice,
  // Націнки
  getCategoryMargins,
  addCategoryMargin,
  updateCategoryMargin,
  deleteCategoryMargin,
  // Центри/склади
  getCenters,
  addCenter,
  updateCenter,
  deleteCenter,
  getWarehouses,
  addWarehouse,
  updateWarehouse,
  deleteWarehouse,
  // Каси і зв’язки
  getCashboxes,
  addCashbox,
  updateCashbox,
  deleteCashbox,
  getCenterCompanies,
  addCompanyToCenter,
  removeCompanyFromCenter,
  // Користувачі/Ролі/Права
  getCentersOfAccounting,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  addRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
  // Співробітники
  getEmployees,
  getEmployeeById,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  // Постачальники
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  // Логін
  loginUser,
  // Прибуткова
  getArrivalDocs,
  getArrivalDoc,
  addArrivalDoc,
  updateArrivalDoc,
  deleteArrivalDoc,
  getArrivalDocItems,
  addArrivalDocItem,
  updateArrivalDocItem,
  deleteArrivalDocItem,
  postArrivalDocPostings,
  cancelArrivalDocPostings,

};
