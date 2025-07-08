const API_BASE = 'http://localhost:8000/api';

// --- Категорії ---
export const getCategories = () => fetch(`${API_BASE}/categories`).then(r => r.json());
export const addCategory = (data) =>
  fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateCategory = (id, data) =>
  fetch(`${API_BASE}/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteCategory = (id) =>
  fetch(`${API_BASE}/categories/${id}`, { method: "DELETE" }).then(r => r.json());

// --- Одиниці виміру ---
export const getUnits = () => fetch(`${API_BASE}/units`).then(r => r.json());

// --- Виробники ---
export const getManufacturers = () =>
  fetch(`${API_BASE}/manufacturers`).then(r => r.json());
export const addManufacturer = (data) =>
  fetch(`${API_BASE}/manufacturers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateManufacturer = (id, data) =>
  fetch(`${API_BASE}/manufacturers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteManufacturer = (id) =>
  fetch(`${API_BASE}/manufacturers/${id}`, { method: 'DELETE' }).then(r => r.json());

// --- Валюти ---
export const getCurrencies = () =>
  fetch(`${API_BASE}/currencies`).then(r => r.json());
export const addCurrency = (data) =>
  fetch(`${API_BASE}/currencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateCurrency = (id, data) =>
  fetch(`${API_BASE}/currencies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteCurrency = (id) =>
  fetch(`${API_BASE}/currencies/${id}`, { method: 'DELETE' }).then(r => r.json());

// --- Курси валют ---
export const getCurrencyRates = (query = "") =>
  fetch(`${API_BASE}/currency-rates${query}`).then(r => r.json());
export const addCurrencyRate = (data) =>
  fetch(`${API_BASE}/currency-rates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());

// --- Націнки по категоріях (Category Margins) ---
export const getCategoryMargins = () =>
  fetch(`${API_BASE}/category-margins`).then(r => r.json());
export const addCategoryMargin = (data) =>
  fetch(`${API_BASE}/category-margins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateCategoryMargin = (id, data) =>
  fetch(`${API_BASE}/category-margins/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteCategoryMargin = (id) =>
  fetch(`${API_BASE}/category-margins/${id}`, { method: "DELETE" }).then(r => r.json());

// --- Прайс-лист (Product Prices) ---
export const getProductPrices = () =>
  fetch(`${API_BASE}/product-prices`).then(r => r.json());
export const addProductPrice = (data) =>
  fetch(`${API_BASE}/product-prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateProductPrice = (id, data) =>
  fetch(`${API_BASE}/product-prices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteProductPrice = (id) =>
  fetch(`${API_BASE}/product-prices/${id}`, { method: "DELETE" }).then(r => r.json());

// --- Категорії цін ---
export const getPriceCategories = () => fetch(`${API_BASE}/price-categories`).then(r => r.json());
export const addPriceCategory = (data) =>
  fetch(`${API_BASE}/price-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updatePriceCategory = (id, data) =>
  fetch(`${API_BASE}/price-categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deletePriceCategory = (id) =>
  fetch(`${API_BASE}/price-categories/${id}`, { method: 'DELETE' }).then(r => r.json());

// --- Шаблони карток ---
export const getProductCardTemplates = () =>
  fetch(`${API_BASE}/product-card-templates`).then(r => r.json());
export const addProductCardTemplate = (data) =>
  fetch(`${API_BASE}/product-card-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateProductCardTemplate = (id, data) =>
  fetch(`${API_BASE}/product-card-templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteProductCardTemplate = (id) =>
  fetch(`${API_BASE}/product-card-templates/${id}`, { method: "DELETE" }).then(r => r.json());
export const getProductCardTemplateById = (id) =>
  fetch(`${API_BASE}/product-card-templates/${id}`).then(r => r.json());

// --- Поля шаблону картки ---
export const getProductCardTemplateFields = (templateId) =>
  fetch(`${API_BASE}/product-card-template-fields?template_id=${templateId}`).then(r => r.json());
export const addProductCardTemplateField = (data) =>
  fetch(`${API_BASE}/product-card-template-fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateProductCardTemplateField = (id, data) =>
  fetch(`${API_BASE}/product-card-template-fields/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteProductCardTemplateField = (id) =>
  fetch(`${API_BASE}/product-card-template-fields/${id}`, { method: "DELETE" }).then(r => r.json());

// --- Повне ім'я товару ---
export const getProductFullNameFields = () => fetch(`${API_BASE}/product-full-name-fields`).then(r => r.json());
export const saveProductFullNameFields = (fields) =>
  fetch(`${API_BASE}/product-full-name-fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields)
  }).then(r => r.json());

// --- Розрахункові рахунки ---
export const getSettlementAccounts = () => fetch(`${API_BASE}/settlement-accounts`).then(r => r.json());
export const addSettlementAccount = (data) =>
  fetch(`${API_BASE}/settlement-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateSettlementAccount = (id, data) =>
  fetch(`${API_BASE}/settlement-accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteSettlementAccount = (id) =>
  fetch(`${API_BASE}/settlement-accounts/${id}`, { method: "DELETE" }).then(r => r.json());

// --- Системні параметри ---
export const getSystemParameters = () => fetch(`${API_BASE}/system-parameters`).then(r => r.json());
export const addSystemParameter = (data) =>
  fetch(`${API_BASE}/system-parameters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateSystemParameter = (id, data) =>
  fetch(`${API_BASE}/system-parameters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteSystemParameter = (id) =>
  fetch(`${API_BASE}/system-parameters/${id}`, { method: "DELETE" }).then(r => r.json());

// --- Назви за правилами ---
export const getProductNameRules = () => fetch(`${API_BASE}/product-name-rules`).then(r => r.json());
export const addProductNameRule = (data) =>
  fetch(`${API_BASE}/product-name-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateProductNameRule = (id, data) =>
  fetch(`${API_BASE}/product-name-rules/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteProductNameRule = (id) =>
  fetch(`${API_BASE}/product-name-rules/${id}`, { method: "DELETE" }).then(r => r.json());
export const getProductNameRuleById = (id) =>
  fetch(`${API_BASE}/product-name-rules/${id}`).then(r => r.json());
export const getProductCardTemplateVars = () =>
  fetch(`${API_BASE}/product-name-rule-vars`).then(r => r.json());
export const generateProductFullName = (data) =>
  fetch(`${API_BASE}/product-full-name/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());

// --- План рахунків (Chart of Accounts) ---
export const getChartOfAccounts = () =>
  fetch(`${API_BASE}/chart-of-accounts`).then(r => r.json());
export const addChartOfAccount = (data) =>
  fetch(`${API_BASE}/chart-of-accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateChartOfAccount = (id, data) =>
  fetch(`${API_BASE}/chart-of-accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteChartOfAccount = (id) =>
  fetch(`${API_BASE}/chart-of-accounts/${id}`, { method: "DELETE" }).then(r => r.json());

// --- Ставки податків ---
export const getAccountTaxRates = () =>
  fetch(`${API_BASE}/account-tax-rates`).then(r => r.json());

// --- Типові операції ---
export const getTypicalOperations = () =>
  fetch(`${API_BASE}/typical-operations`).then(r => r.json());

// --- Товари ---
export const getProducts = (search = "", category = "") => {
  let params = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (category) params.push(`category=${encodeURIComponent(category)}`);
  let url = `${API_BASE}/products${params.length ? '?' + params.join('&') : ''}`;
  return fetch(url).then(r => r.json());
};
export const addProduct = (data) =>
  fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateProduct = (id, data) =>
  fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteProduct = (id) =>
  fetch(`${API_BASE}/products/${id}`, { method: "DELETE" }).then(r => r.json());

// --- Фото товару ---
export const uploadProductPhoto = async (productId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await fetch(`${API_BASE}/products/${productId}/upload-photo`, {
    method: "POST",
    body: formData
  });
  if (!resp.ok) {
    throw new Error("Помилка завантаження фото");
  }
  return await resp.json();
};

// --- Атрибути товару ---
export const getProductAttributes = (productId) => fetch(`${API_BASE}/products/${productId}/attributes`).then(r => r.json());
export const saveProductAttributes = (productId, attributes) =>
  fetch(`${API_BASE}/products/${productId}/attributes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attributes)
  }).then(r => r.json());

// --- Компанії ---
export const getCompanies = () => fetch(`${API_BASE}/companies`).then(r => r.json());
export const addCompany = (data) =>
  fetch(`${API_BASE}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const updateCompany = (id, data) =>
  fetch(`${API_BASE}/companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());
export const deleteCompany = (id) =>
  fetch(`${API_BASE}/companies/${id}`, { method: 'DELETE' }).then(r => r.json());

// --- Повна назва товару ---
export const getProductFullName = (productId) => fetch(`${API_BASE}/products/${productId}/fullname`).then(r => r.json());

// --- Глобальний експорт всіх функцій ---
export const api = {
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
  getTypicalOperations,
  // Товари
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductPhoto,
  getProductAttributes,
  saveProductAttributes,
  getProductFullName,
  getCompanies,
  addCompany,
  updateCompany,
  deleteCompany,
  // Категорії цін
  getPriceCategories,
  addPriceCategory,
  updatePriceCategory,
  deletePriceCategory,
  // Прайс-лист
  getProductPrices,
  addProductPrice,
  updateProductPrice,
  deleteProductPrice,
  // Категорії націнки
  getCategoryMargins,
  addCategoryMargin,
  updateCategoryMargin,
  deleteCategoryMargin,
};
