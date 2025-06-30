import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import Sidebar from './components/Sidebar';
import MainMenu from './pages/MainMenu'; // ДОДАЙ!
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
import ProductCard from './components/ProductCard';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <BrowserRouter basename="/webapp">
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/price-categories" element={<PriceCategoriesPage />} />
        <Route path="/product-prices" element={<ProductPricesPage />} />
        <Route path="/price-list" element={<PriceListPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/system-parameters" element={<SystemParametersPage />} />
        <Route path="/programm-parameters" element={<ProgrammParametersPage />} />
        <Route path="/manufacturers" element={<ManufacturersPage />} />
        <Route path="/currencies" element={<CurrenciesAdminPage />} />
        <Route path="/settlement-accounts" element={<SettlementAccountsPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />
        <Route path="/product-card-templates" element={<ProductCardTemplatesPage />} />
        <Route path="/product-card-template-fields" element={<ProductCardTemplateFields />} />
        <Route path="/product-name-rules" element={<ProductFullNameFieldsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;

