import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// вже є у тебе
import ArrivalDocumentsPage from "./ArrivalDocumentsPage.jsx";

// TODO: коли з’являться інші документи — підключимо тут
// import IssueDocumentsPage from "./IssueDocumentsPage.jsx";
// import TransferDocumentsPage from "./TransferDocumentsPage.jsx";
// import InventoryDocumentsPage from "./InventoryDocumentsPage.jsx";

const menu = [
  { key: "issues",   label: "Видаткові накладні" },
  { key: "moves",    label: "Переміщення" },
  { key: "inventory",label: "Інвентаризації" },
  // додавай нові пункти тут
];

export default function DocumentsPage() {
  const [section, setSection] = useState("issues");
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(120deg,#f8efe4 0%,#faf7f2 100%)"
    }}>
      {/* Ліве меню */}
      <nav style={{
        width: 240,
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

      {/* Вміст */}
      <main style={{ flex: 1, padding: 24 }}>
        {section === "arrivals"   && <ArrivalDocumentsPage />}
        {section === "issues"     && <div>Видаткові (скоро)</div>}
        {section === "moves"      && <div>Переміщення (скоро)</div>}
        {section === "inventory"  && <div>Інвентаризації (скоро)</div>}
      </main>
    </div>
  );
}
