import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import MainMenu from './pages/MainMenu.jsx';
import UserLoginPage from "./pages/UserLoginPage.jsx";
import EmployeeSelectPage from "./pages/EmployeeSelectPage.jsx";

import CategoriesPage from './pages/CategoriesPage.jsx';
import PriceCategoriesPage from './pages/PriceCategoriesPage.jsx';
import ProductPricesPage from './pages/ProductPricesPage.jsx';
import PriceListPage from './pages/PriceListPage.jsx';
import StockPage from './pages/StockPage.jsx';
import StockTransferPage from './pages/StockTransferPage.jsx';

import DiscountDocumentsPage from './pages/DiscountDocumentsPage.jsx';
import StockStatePage from './pages/StockStatePage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import SelectProductsPage from './pages/SelectProductsPage.jsx';

import ProgrammParametersPage from './pages/ProgrammParametersPage.jsx';

import ManufacturersPage from './pages/ManufacturersPage.jsx';
import CurrenciesAdminPage from './pages/CurrenciesAdminPage.jsx';
import SettlementAccountsPage from './pages/SettlementAccountsPage.jsx';
import CompaniesPage from './pages/CompaniesPage.jsx';
import ChartOfAccountsPage from "./pages/ChartOfAccountsPage.jsx";

import ProductCardTemplatesPage from "./pages/ProductCardTemplatesPage.jsx";
import ProductFullNameFieldsPage from "./pages/ProductNameRulesPage.jsx";
import ProductCardTemplateFields from "./pages/ProductCardTemplateFields.js";

import SuppliersPage from "./pages/SuppliersPage.jsx";

// НОВЕ: документи
import DocumentsPage from "./pages/DocumentsPage.jsx";
import PurchasesPage from "./pages/PurchasesPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import ReturnsPage from "./pages/ReturnsPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ArrivalDocumentsPage from "./pages/ArrivalDocumentsPage.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import AdminServicePage from "./pages/AdminServicePage.jsx";
import AdminSystemParameters from "./pages/AdminSystemParameters.jsx";
import AdminBackupPage from "./pages/AdminBackupPage.jsx";
import MarketingPage from "./pages/MarketingPage.jsx";
import ClientsPage from "./pages/ClientsPage.jsx";
import SalesPage from "./pages/SalesPage.jsx";
import RetailSalesPage from "./pages/RetailSalesPage.jsx";
import SalesRegisterPage from "./pages/SalesRegisterPage.jsx";
import AccountingPage from "./pages/AccountingPage.jsx";
import DictionariesPage from "./pages/DictionariesPage.jsx";
import FinancePage from "./pages/FinancePage.jsx";
import CashOpsPage from "./pages/CashOpsPage.jsx";
import NonCashPage from "./pages/NonCashPage.jsx";

import { UserProvider, useUser } from './UserContext';
// companyId більше не передаємо глобально з UI
import StatusBar from "./components/StatusBar";
import 'react-toastify/dist/ReactToastify.css';

// --- Protected Route: лише для авторизованого користувача
function RequireAuth({ children }) {
  const { user } = useUser();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// --- Protected Route: лише для вибраного співробітника
function RequireEmployee({ children }) {
  const { employee } = useUser();
  const location = useLocation();
  if (!employee) {
    return <Navigate to="/employee-select" state={{ from: location }} replace />;
  }
  return children;
}

// --- Layout із StatusBar ---
function AppLayout({ children }) {
  const location = useLocation();
  const { employee, centersRoles, centerId, setCenterId, companyId } = useUser();
  const hideBar = location.pathname === "/login" || location.pathname === "/employee-select";

  // Компанію не фіксуємо глобально в UI — визначаємо на бекенді по партіях/документах

  return (
    <div className="app-layout">
      {!hideBar && (
        <StatusBar
          employee={employee}
          centersRoles={centersRoles}
          centerId={centerId}
          setCenterId={setCenterId}
        />
      )}
      <div>{children}</div>
    </div>
  );
}

// --- Всі маршрути ---
function AppRoutes() {
  return (
    <Routes>
      {/* Доступна всім */}
      <Route path="/login" element={<UserLoginPage />} />

      {/* Доступно тільки після логіну */}
      <Route
        path="/employee-select"
        element={
          <RequireAuth>
            <EmployeeSelectPage />
          </RequireAuth>
        }
      />

      {/* Всі інші — тільки після логіну і вибору співробітника */}
      <Route
        path="*"
        element={
          <RequireAuth>
            <RequireEmployee>
              <AppLayout>
      <Routes>
        <Route path="/" element={<MainMenu />} />

                  {/* Довідники - окремі сторінки */}
                  <Route path="/dictionaries" element={<DictionariesPage />} />
                  <Route path="/dictionaries/categories" element={<CategoriesPage />} />
                  <Route path="/dictionaries/manufacturers" element={<ManufacturersPage />} />
                  <Route path="/dictionaries/suppliers" element={<SuppliersPage />} />
                  <Route path="/dictionaries/products" element={<ProductsPage />} />
                  <Route path="/dictionaries/currencies" element={<CurrenciesAdminPage />} />
                  
                  {/* редиректи зі старих коротких шляхів */}
                  <Route path="/categories" element={<Navigate to="/dictionaries/categories" replace />} />
                  <Route path="/products" element={<Navigate to="/dictionaries/products" replace />} />
                  <Route path="/manufacturers" element={<Navigate to="/dictionaries/manufacturers" replace />} />
                  <Route path="/suppliers" element={<Navigate to="/dictionaries/suppliers" replace />} />
                  <Route path="/currencies" element={<Navigate to="/finance/currencies" replace />} />
                  {/* Перенесено до Складів */}
                  <Route path="/price-categories" element={<Navigate to="/stock/price-categories" replace />} />
                  <Route path="/product-prices" element={<Navigate to="/stock/revaluation" replace />} />
                  <Route path="/price-list" element={<Navigate to="/stock/price-list" replace />} />

                  {/* Продажі */}
                  <Route path="/sales" element={<SalesPage />} />
                  <Route path="/sales/retail" element={<RetailSalesPage />} />
                  <Route path="/sales/register" element={<SalesRegisterPage />} />
                  {/* Закупівлі: меню з картками */}
                  <Route path="/purchases" element={<PurchasesPage />} />
                  <Route path="/arrivals" element={<ArrivalDocumentsPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/returns" element={<ReturnsPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/finance" element={<FinancePage />}>
                    <Route index element={<div>Касові операції — у розробці</div>} />
                    <Route path="cash-ops" element={<CashOpsPage />} />
                    <Route path="noncash" element={<NonCashPage />} />
                    <Route path="balances" element={<div>Залишки по касах/рахунках — у розробці</div>} />
                    <Route path="payments" element={<div>Платежі / Виписки — у розробці</div>} />
                    <Route path="reports" element={<div>Звіти по фінансах — у розробці</div>} />
                    <Route path="currencies" element={<CurrenciesAdminPage />} />
                  </Route>
                  <Route path="/accounting" element={<AccountingPage />}>
                    <Route index element={<div>Проводки та журнали — у розробці</div>} />
                    <Route path="postings" element={<div>Проводки та журнали — у розробці</div>} />
                    <Route path="osv" element={<div>Оборотно-сальдова відомість — у розробці</div>} />
                    <Route path="vat" element={<div>ПДВ — у розробці</div>} />
                    <Route path="chart" element={<ChartOfAccountsPage />} />
                  </Route>
                  <Route path="/reports" element={<div style={{padding:20}}>Звіти — у розробці</div>} />
                  <Route path="/analytics" element={<div style={{padding:20}}>Аналітика — у розробці</div>} />
                  {/* Склади з лівим меню */}
                  <Route path="/stock" element={<StockPage />}>
                    <Route index element={<StockStatePage />} />
                    <Route path="state" element={<StockStatePage />} />
                    <Route path="price-categories" element={<PriceCategoriesPage />} />
                    <Route path="price-list" element={<PriceListPage />} />
                    <Route path="revaluation" element={<ProductPricesPage />} />
                    <Route path="transfer" element={<StockTransferPage />} />
            
                    <Route path="discounts" element={<DiscountDocumentsPage />} />
                  </Route>
                  <Route path="/directions" element={<div style={{padding:20}}>Напрями діяльності — у розробці</div>} />
                  <Route path="/marketing" element={<MarketingPage />}>
                    <Route index element={<ClientsPage />} />
                    <Route path="clients" element={<ClientsPage />} />
                    <Route path="promotions" element={<div>Акції та знижки — у розробці</div>} />
                    <Route path="loyalty" element={<div>Програма лояльності — у розробці</div>} />
                    <Route path="coupons" element={<div>Сертифікати і купони — у розробці</div>} />
                  </Route>

                  {/* Налаштування */}
                  <Route path="/system-parameters" element={<Navigate to="/admin/system" replace />} />
        <Route path="/programm-parameters" element={<ProgrammParametersPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />
                  <Route path="/settlement-accounts" element={<SettlementAccountsPage />} />
        <Route path="/product-card-templates" element={<ProductCardTemplatesPage />} />
        <Route path="/product-card-template-fields" element={<ProductCardTemplateFields />} />
        <Route path="/product-name-rules" element={<ProductFullNameFieldsPage />} />

                  {/* Документи */}
                  <Route path="/docs" element={<DocumentsPage />} />
                  <Route path="/docs/arrivals" element={<ArrivalDocumentsPage />} />
                  <Route path="/select-products" element={<SelectProductsPage />} />
                  <Route path="/admin" element={<AdminLayout />} >
                    <Route index element={<AdminServicePage />} />
                    <Route path="system" element={<AdminSystemParameters />} />
                    <Route path="backup" element={<AdminBackupPage />} />
                  </Route>

                  {/* можна додати інші документи тут пізніше */}
                </Routes>
              </AppLayout>
            </RequireEmployee>
          </RequireAuth>
        }
      />
      </Routes>
  );
}

// --- Основний App ---
export default function App() {
  return (
    <UserProvider>
      <BrowserRouter basename="/webapp">
        <AppRoutes />
    </BrowserRouter>
    </UserProvider>
  );
}
