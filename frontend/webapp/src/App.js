import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import MainMenu from './pages/MainMenu';
import UserLoginPage from "./pages/UserLoginPage.jsx";
import EmployeeSelectPage from "./pages/EmployeeSelectPage.jsx";

import CategoriesPage from './pages/CategoriesPage';
import PriceCategoriesPage from './pages/PriceCategoriesPage';
import ProductPricesPage from './pages/ProductPricesPage';
import PriceListPage from './pages/PriceListPage';
import ProductsPage from './pages/ProductsPage';

import SystemParametersPage from './pages/SystemParametersPage';
import ProgrammParametersPage from './pages/ProgrammParametersPage';

import ManufacturersPage from './pages/ManufacturersPage';
import CurrenciesAdminPage from './pages/CurrenciesAdminPage';
import SettlementAccountsPage from './pages/SettlementAccountsPage';
import CompaniesPage from './pages/CompaniesPage';
import ChartOfAccountsPage from "./pages/ChartOfAccountsPage";

import ProductCardTemplatesPage from "./pages/ProductCardTemplatesPage";
import ProductFullNameFieldsPage from "./pages/ProductNameRulesPage";
import ProductCardTemplateFields from "./pages/ProductCardTemplateFields";

import SuppliersPage from "./pages/SuppliersPage";

// НОВЕ: документи
import DocumentsPage from "./pages/DocumentsPage.jsx";
import ArrivalDocumentsPage from "./pages/ArrivalDocumentsPage.jsx";

import { UserProvider, useUser } from './UserContext';
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
  const { employee, centersRoles, centerId, setCenterId } = useUser();
  const hideBar = location.pathname === "/login" || location.pathname === "/employee-select";

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

                  {/* Довідники */}
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/price-categories" element={<PriceCategoriesPage />} />
                  <Route path="/product-prices" element={<ProductPricesPage />} />
                  <Route path="/price-list" element={<PriceListPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/manufacturers" element={<ManufacturersPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/currencies" element={<CurrenciesAdminPage />} />

                  {/* Налаштування */}
                  <Route path="/system-parameters" element={<SystemParametersPage />} />
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
