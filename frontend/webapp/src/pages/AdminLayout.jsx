import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const section = location.pathname.startsWith("/admin/system")
    ? "system"
    : location.pathname.startsWith("/admin/backup")
    ? "backup"
    : "service";

  const menu = [
    { key: "service", label: "Сервіс", to: "/admin" },
    { key: "system", label: "Системні параметри", to: "/admin/system" },
    { key: "backup", label: "Бекап БД", to: "/admin/backup" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "linear-gradient(120deg,#decba4 0%,#a77b5a 100%)",
      }}
    >
      {/* Ліва панель у стилі Програмних параметрів */}
      <nav
        style={{
          width: 220,
          background: "#f7e7d3",
          padding: "32px 12px 32px 20px",
          borderRight: "2px solid #cebba2",
        }}
      >
        <div
          onClick={() => navigate("/")}
          style={{
            fontWeight: "bold",
            fontSize: 20,
            color: "#a64b1a",
            marginBottom: 32,
            cursor: "pointer",
          }}
        >
          ← Головна
        </div>
        {menu.map((m) => (
          <div
            key={m.key}
            onClick={() => navigate(m.to)}
            style={{
              background: section === m.key ? "#fff" : "none",
              color: section === m.key ? "#a64b1a" : "#333",
              fontWeight: section === m.key ? "bold" : "normal",
              fontSize: 17,
              borderRadius: 8,
              marginBottom: 6,
              padding: "10px 14px",
              cursor: "pointer",
              transition: "background .12s",
            }}
          >
            {m.label}
          </div>
        ))}
      </nav>

      {/* Контентна частина */}
      <main style={{ flex: 1, padding: 40 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            boxShadow: "0 4px 32px #0001",
            padding: 24,
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}


