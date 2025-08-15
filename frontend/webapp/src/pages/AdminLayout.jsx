import React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { to: "/admin", label: "Сервіс", end: true },
    { to: "/admin/system", label: "Системні параметри" },
    { to: "/admin/backup", label: "Бекап БД" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-tr from-coffee-50 via-white to-coffee-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-semibold text-coffee-800">Адміністративна панель</h1>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg border border-coffee-200 px-3 py-2 text-sm text-coffee-700 hover:bg-coffee-50"
          >
            ← На головну
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="md:col-span-1">
            <nav className="bg-white rounded-2xl shadow border border-coffee-100 p-2">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) => [
                    "flex items-center gap-2 rounded-xl px-4 py-2 mb-1 text-sm",
                    isActive ? "bg-coffee-600 text-white" : "text-coffee-800 hover:bg-coffee-50",
                  ].join(" ")}
                >
                  {t.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="md:col-span-3">
            <div className="bg-white rounded-2xl shadow border border-coffee-100 p-4 md:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


