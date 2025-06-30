import React, { useEffect, useState } from "react";
import { api } from '../api'

export default function ChartOfAccountsPage() {
  const [tab, setTab] = useState("accounts");

  // План рахунків
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ставки податків
  const [taxRates, setTaxRates] = useState([]);
  const [taxLoading, setTaxLoading] = useState(true);

  // Типові операції
  const [typicalOps, setTypicalOps] = useState([]);
  const [opsLoading, setOpsLoading] = useState(true);

  useEffect(() => {
    if (tab === "accounts") {
      setLoading(true);
      api.getChartOfAccounts().then(data => {
        setAccounts(data);
        setLoading(false);
      });
    } else if (tab === "tax") {
      setTaxLoading(true);
      api.getAccountTaxRates().then(data => {
        setTaxRates(data);
        setTaxLoading(false);
      });
    } else if (tab === "ops") {
      setOpsLoading(true);
      api.getTypicalOperations().then(data => {
        setTypicalOps(data);
        setOpsLoading(false);
      });
    }
  }, [tab]);

  return (
    <div style={{ padding: 40 }}>
      <h2>План рахунків / Ставки податків / Типові операції</h2>
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setTab("accounts")}
          style={{
            background: tab === "accounts" ? "#6046b6" : "#eee",
            color: tab === "accounts" ? "#fff" : "#333",
            marginRight: 10,
            border: "none",
            borderRadius: 5,
            padding: "8px 20px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Рахунки
        </button>
        <button
          onClick={() => setTab("tax")}
          style={{
            background: tab === "tax" ? "#6046b6" : "#eee",
            color: tab === "tax" ? "#fff" : "#333",
            marginRight: 10,
            border: "none",
            borderRadius: 5,
            padding: "8px 20px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Ставки податків
        </button>
        <button
          onClick={() => setTab("ops")}
          style={{
            background: tab === "ops" ? "#6046b6" : "#eee",
            color: tab === "ops" ? "#fff" : "#333",
            border: "none",
            borderRadius: 5,
            padding: "8px 20px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Типові операції
        </button>
      </div>
      {/* ТАБ 1: План рахунків */}
      {tab === "accounts" && (
        loading ? <div>Завантаження...</div> :
        <table style={{ width: "100%", background: "#fff", borderRadius: 8, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Код</th>
              <th>Назва</th>
              <th>Тип</th>
              <th>Мета</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => (
              <tr key={acc.ID}>
                <td>{acc.ID}</td>
                <td>{acc.AccountCode}</td>
                <td>{acc.Name}</td>
                <td>{acc.AccountType}</td>
                <td>{acc.AccountPurpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ТАБ 2: Ставки податків */}
      {tab === "tax" && (
        taxLoading ? <div>Завантаження...</div> :
        <table style={{ width: "100%", background: "#fff", borderRadius: 8, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>AccountID</th>
              <th>TaxType</th>
              <th>Rate</th>
              <th>DateFrom</th>
              <th>DateTo</th>
            </tr>
          </thead>
          <tbody>
            {taxRates.map(tax => (
              <tr key={tax.ID}>
                <td>{tax.ID}</td>
                <td>{tax.AccountID}</td>
                <td>{tax.TaxType}</td>
                <td>{tax.Rate}</td>
                <td>{tax.DateFrom}</td>
                <td>{tax.DateTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ТАБ 3: Типові операції */}
      {tab === "ops" && (
        opsLoading ? <div>Завантаження...</div> :
        <table style={{ width: "100%", background: "#fff", borderRadius: 8, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Назва</th>
              <th>Тип операції</th>
              <th>Опис</th>
            </tr>
          </thead>
          <tbody>
            {typicalOps.map(op => (
              <tr key={op.ID}>
                <td>{op.ID}</td>
                <td>{op.Name}</td>
                <td>{op.OperationType}</td>
                <td>{op.Notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
