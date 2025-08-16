import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const menu = [
  { key: "arrivals", label: "Прибуткові накладні", route: "/purchases/arrivals" },
  { key: "orders", label: "Замовлення постачальнику", route: "/purchases/orders" },
  { key: "returns", label: "Повернення постачальнику", route: "/purchases/returns" },
  { key: "register", label: "Реєстр прибуткових накладних", route: "/purchases/register" },
];

export default function PurchasesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = menu.find(m => location.pathname.endsWith(m.key))?.key || "arrivals";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(120deg,#f8efe4 0%,#faf7f2 100%)"
    }}>
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
            onClick={() => navigate(m.route)}
            style={{
              background: current === m.key ? "#fff" : "none",
              color: current === m.key ? "#a64b1a" : "#333",
              fontWeight: current === m.key ? "bold" : "normal",
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

      <main style={{ flex: 1, padding: 24 }}>
        {/* Контент сторінок віддаємо маршрутам App.js */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 4px 24px #0001",
          padding: 20
        }}>
          Виберіть пункт зліва.
        </div>
      </main>
    </div>
  );
}


