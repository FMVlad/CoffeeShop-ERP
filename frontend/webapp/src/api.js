const API_BASE = 'http://localhost:8000/api'; // ← СТАНДАРТ ДЛЯ ВСІХ!

export const api = {
  // --- Категорії ---
  getCategories: () => fetch(`${API_BASE}/categories`).then(r => r.json()),
  addCategory: (data) =>
    fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateCategory: (id, data) =>
    fetch(`${API_BASE}/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteCategory: (id) =>
    fetch(`${API_BASE}/categories/${id}`, { method: "DELETE" }).then(r => r.json()),

  // --- Шаблони карток (шапки) ---
  getProductCardTemplates: () =>
    fetch(`${API_BASE}/product-card-templates`).then(r => r.json()),
  addProductCardTemplate: (data) =>
    fetch(`${API_BASE}/product-card-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateProductCardTemplate: (id, data) =>
    fetch(`${API_BASE}/product-card-templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteProductCardTemplate: (id) =>
    fetch(`${API_BASE}/product-card-templates/${id}`, { method: "DELETE" }).then(r => r.json()),
  getProductCardTemplateById: (id) =>
    fetch(`${API_BASE}/product-card-templates/${id}`).then(r => r.json()),

  // --- Поля шаблону картки (fields) ---
  getProductCardTemplateFields: (templateId) =>
    fetch(`${API_BASE}/product-card-template-fields?template_id=${templateId}`).then(r => r.json()),
  addProductCardTemplateField: (data) =>
    fetch(`${API_BASE}/product-card-template-fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateProductCardTemplateField: (id, data) =>
    fetch(`${API_BASE}/product-card-template-fields/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteProductCardTemplateField: (id) =>
    fetch(`${API_BASE}/product-card-template-fields/${id}`, { method: "DELETE" }).then(r => r.json()),

  getProductFullNameFields: () => fetch(`${API_BASE}/product-full-name-fields`).then(r => r.json()),
  saveProductFullNameFields: (fields) =>
    fetch(`${API_BASE}/product-full-name-fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields)
    }).then(r => r.json()),


  // --- Шаблони повної назви товару (ProductNameRules) ---
  getProductNameRules: () =>
    fetch(`${API_BASE}/product-name-rules`).then(r => r.json()),
  addProductNameRule: (data) =>
    fetch(`${API_BASE}/product-name-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateProductNameRule: (id, data) =>
    fetch(`${API_BASE}/product-name-rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteProductNameRule: (id) =>
    fetch(`${API_BASE}/product-name-rules/${id}`, { method: "DELETE" }).then(r => r.json()),
  getProductNameRuleById: (id) =>
    fetch(`${API_BASE}/product-name-rules/${id}`).then(r => r.json()),
  getProductCardTemplateVars: () =>
    fetch(`${API_BASE}/product-name-rule-vars`).then(r => r.json()),
  generateProductFullName: (data) =>
    fetch(`${API_BASE}/product-full-name/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // --- ВСІ інші методи стандартно ---
  getPriceCategories: () => fetch(`${API_BASE}/price-categories`).then(r => r.json()),
  addPriceCategory: (data) =>
    fetch(`${API_BASE}/price-categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  getProductPrices: () => fetch(`${API_BASE}/product-prices`).then(r => r.json()),
  addProductPrice: (data) =>
    fetch(`${API_BASE}/product-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  getProducts: () => fetch(`${API_BASE}/products`).then(r => r.json()),
  addProduct: (data) =>
    fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // --- СИСТЕМНІ НАЛАШТУВАННЯ ---
  getSystemParameters: () => fetch(`${API_BASE}/system-parameters`).then(r => r.json()),
  addSystemParameter: (data) =>
    fetch(`${API_BASE}/system-parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateSystemParameter: (id, data) =>
    fetch(`${API_BASE}/system-parameters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteSystemParameter: (id) =>
    fetch(`${API_BASE}/system-parameters/${id}`, { method: "DELETE" }).then(r => r.json()),

  // --- ПЛАН РАХУНКІВ ---
  getChartOfAccounts: () => fetch(`${API_BASE}/accounts`).then(r => r.json()),
  addChartOfAccount: (data) =>
    fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateChartOfAccount: (id, data) =>
    fetch(`${API_BASE}/accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteChartOfAccount: (id) =>
    fetch(`${API_BASE}/accounts/${id}`, { method: "DELETE" }).then(r => r.json()),

  // --- СТАВКИ ПОДАТКІВ ---
  getAccountTaxRates: (accountId = null) =>
    fetch(`${API_BASE}/account-tax-rates${accountId ? `?account_id=${accountId}` : ""}`).then(r => r.json()),
  addAccountTaxRate: (data) =>
    fetch(`${API_BASE}/account-tax-rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateAccountTaxRate: (id, data) =>
    fetch(`${API_BASE}/account-tax-rates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteAccountTaxRate: (id) =>
    fetch(`${API_BASE}/account-tax-rates/${id}`, { method: "DELETE" }).then(r => r.json()),

  // --- ТИПОВІ ОПЕРАЦІЇ ---
  getTypicalOperations: () => fetch(`${API_BASE}/typical-operations`).then(r => r.json()),
  addTypicalOperation: (data) =>
    fetch(`${API_BASE}/typical-operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateTypicalOperation: (id, data) =>
    fetch(`${API_BASE}/typical-operations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteTypicalOperation: (id) =>
    fetch(`${API_BASE}/typical-operations/${id}`, { method: "DELETE" }).then(r => r.json()),

  getTypicalOperationEntries: (operationId = null) =>
    fetch(`${API_BASE}/typical-operation-entries${operationId ? `?operation_id=${operationId}` : ""}`).then(r => r.json()),
  addTypicalOperationEntry: (data) =>
    fetch(`${API_BASE}/typical-operation-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateTypicalOperationEntry: (id, data) =>
    fetch(`${API_BASE}/typical-operation-entries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteTypicalOperationEntry: (id) =>
    fetch(`${API_BASE}/typical-operation-entries/${id}`, { method: "DELETE" }).then(r => r.json()),

  // --- ВИРОБНИКИ ---
  getManufacturers: () => fetch(`${API_BASE}/manufacturers2`).then(r => r.json()),
  addManufacturer: (data) =>
    fetch(`${API_BASE}/manufacturers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteManufacturer: (id) =>
    fetch(`${API_BASE}/manufacturers/${id}`, { method: 'DELETE' }).then(r => r.json()),

  getUnits: () => fetch(`${API_BASE}/units`).then(r => r.json()),

  getCurrencies: () => fetch(`${API_BASE}/currencies`).then(r => r.json()),
  addCurrency: (data) => fetch(`${API_BASE}/currencies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  getCurrencyRates: (params = "") => fetch(`${API_BASE}/currency-rates${params}`).then(r => r.json()),
  addCurrencyRate: (data) => fetch(`${API_BASE}/currency-rates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  getProgrammParameters: () => fetch(`${API_BASE}/programm-parameters`).then(r => r.json()),
  updateProgrammParameter: (id, data) =>
    fetch(`${API_BASE}/programm-parameters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  getSettlementAccounts: () => fetch(`${API_BASE}/settlement-accounts`).then(r => r.json()),
  addSettlementAccount: (data) =>
    fetch(`${API_BASE}/settlement-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteSettlementAccount: (id) =>
    fetch(`${API_BASE}/settlement-accounts/${id}`, { method: 'DELETE' }).then(r => r.json()),

  getCompanies: () => fetch(`${API_BASE}/companies`).then(r => r.json()),
  addCompany: (data) =>
    fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  deleteCompany: (id) =>
    fetch(`${API_BASE}/companies/${id}`, { method: 'DELETE' }).then(r => r.json()),

  getProductAttributes: (productId) => fetch(`${API_BASE}/products/${productId}/attributes`).then(r => r.json()),
  saveProductAttributes: (productId, attributes) => fetch(`${API_BASE}/products/${productId}/attributes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attributes)
  }).then(r => r.json()),

  getProductFullName: (productId) => fetch(`${API_BASE}/products/${productId}/fullname`).then(r => r.json()),

};
