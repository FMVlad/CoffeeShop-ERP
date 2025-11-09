// src/pages/ChartOfAccountsPage.jsx

import React, { useState } from "react";
import AccountsTab from "./AccountsTab";
import TaxRatesTab from "./TaxRatesTab";
import OperationsTab from "./OperationsTab";

export default function ChartOfAccountsPage() {
  const [tab, setTab] = useState("accounts");

  // Tailwind стиль для активної/неактивної кнопки
  const tabBtn = (active) =>
    `px-7 py-2.5 rounded-lg text-lg font-bold transition-colors
     ${active ? "bg-purple-700 text-white shadow" : "bg-gray-200 text-gray-700 hover:bg-purple-100"}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="mb-8 font-extrabold text-4xl text-purple-900">План рахунків / Ставки податків / Типові операції</h2>
      <div className="flex gap-4 mb-8">
        <button className={tabBtn(tab === "accounts")} onClick={() => setTab("accounts")}>
          Рахунки
        </button>
        <button className={tabBtn(tab === "tax")} onClick={() => setTab("tax")}>
          Ставки податків
        </button>
        <button className={tabBtn(tab === "ops")} onClick={() => setTab("ops")}>
          Типові операції
        </button>
      </div>
      <div>
        {tab === "accounts" && <AccountsTab />}
        {tab === "tax" && <TaxRatesTab />}
        {tab === "ops" && <OperationsTab />}
      </div>
    </div>
  );
}
