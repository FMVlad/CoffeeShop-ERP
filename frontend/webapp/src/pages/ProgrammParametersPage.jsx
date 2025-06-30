// Всі імпорти тільки тут!
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainProgramSettings from "./MainProgramSettings";
import AccountCentersSettings from './AccountCentersSettings';
import EmployeesSettings from './EmployeesSettings';
import CashiersSettings from "./CashiersSettings";
import PrintFormsSettings from './PrintFormsSettings';
import CompaniesPage from "./CompaniesPage";
import ChartOfAccountsPage from "./ChartOfAccountsPage";
import SettlementAccountsPage from "./SettlementAccountsPage";
import ProductNameRulesPage from "./ProductNameRulesPage";
import ProductCardTemplatesPage from "./ProductCardTemplatesPage";

// ...інші імпорти, якщо треба

const menu = [
  { key: "main", label: "Програмні параметри" },
  { key: "centers", label: "Центри обліку" },
  { key: "employees", label: "Співробітники" },
  { key: "cashiers", label: "Каси та касири" },
  { key: "bank", label: "Розрахункові рахунки" },
  { key: "companies", label: "Підприємства" },
  { key: "productcards", label: "Картки товару" },
  { key: "productnamerules", label: "Формування назви товару" },
  { key: "printforms", label: "Форми для друку" },
  { key: "accounts", label: "План рахунків" },
];

export default function ProgrammParametersPage() {
  const [section, setSection] = useState("main");
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(120deg,#decba4 0%,#a77b5a 100%)"
    }}>
      {/* Ліве меню */}
      <nav style={{
        width: 220,
        background: "#f7e7d3",
        padding: "32px 12px 32px 20px",
        borderRight: "2px solid #cebba2"
      }}>
        <div
          onClick={() => navigate("/")}
          style={{
            fontWeight: "bold",
            fontSize: 20,
            color: "#a64b1a",
            marginBottom: 32,
            cursor: "pointer"
          }}
        >
          ← Головна
        </div>
        {menu.map(m => (
          <div
            key={m.key}
            onClick={() => setSection(m.key)}
            style={{
              background: section === m.key ? "#fff" : "none",
              color: section === m.key ? "#a64b1a" : "#333",
              fontWeight: section === m.key ? "bold" : "normal",
              fontSize: 17,
              borderRadius: 8,
              marginBottom: 6,
              padding: "10px 14px",
              cursor: "pointer",
              transition: "background .12s"
            }}
          >
            {m.label}
          </div>
        ))}
      </nav>

      {/* Вміст — перемикай по ключу свою сторінку */}
      <main style={{ flex: 1, padding: 40 }}>
        {section === "main" && <MainProgramSettings />}
        {section === "centers" && <AccountCentersSettings />}
        {section === "productcards" && <ProductCardTemplatesPage />}
        {section === "productnamerules" && <ProductNameRulesPage />}
        {section === "cashiers" && <CashiersSettings />}
        {section === "employees" && <EmployeesSettings />}
        {section === "printforms" && <PrintFormsSettings />}
        {section === "companies" && <CompaniesPage />}
        {section === "accounts" && <ChartOfAccountsPage />}
        {section === "bank" && <SettlementAccountsPage />}
      </main>
    </div>
  );
}
