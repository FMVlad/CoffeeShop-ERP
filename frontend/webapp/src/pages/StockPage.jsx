import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import MenuCard from "../components/MenuCard";

const cards = [
  { key: "back", title: "← На головну", icon: "🏠", route: "/", hint: "Повернутись до головного меню", buttonColor: "from-slate-500 to-slate-600" },
  { key: "state", title: "Стан складу", icon: "📦", route: "/stock/state", hint: "Залишки, фільтри, пошук", buttonColor: "from-teal-500 to-cyan-500" },
  { key: "price-categories", title: "Категорії цін", icon: "🏷️", route: "/stock/price-categories", hint: "Категорії, націнки, округлення", buttonColor: "from-amber-500 to-orange-600" },
  { key: "price-list", title: "Прайс-листи", icon: "🧾", route: "/stock/price-list", hint: "Експорт та друк прайсу", buttonColor: "from-indigo-500 to-purple-600" },
  { key: "revaluation", title: "Переоцінка", icon: "💹", route: "/stock/revaluation", hint: "Зміна цін по категоріях", buttonColor: "from-rose-500 to-pink-500" },
  { key: "transfer", title: "Переміщення", icon: "🔁", route: "/stock/transfer", hint: "Переміщення між складами", buttonColor: "from-green-500 to-emerald-600" },
  { key: "discounts", title: "Документи уцінки", icon: "📝", route: "/stock/discounts", hint: "Створення та облік уцінок", buttonColor: "from-violet-500 to-purple-600" },
];

export default function StockPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isBase = location.pathname === "/stock";

  if (!isBase) {
    // Підсторінки складів рендеряться тут
    return (
      <div className="min-h-screen bg-gradient-to-tr from-coffee-50 via-white to-coffee-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>
    );
  }

  // Хаб карток для розділу "Склади"
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100 flex flex-col">
      <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-14 text-center">
          <h1 className="text-6xl font-bold mb-3">Склади</h1>
          <p className="text-2xl text-sky-100">Оберіть потрібний інструмент для роботи зі складом</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {cards.map((item) => (
            <MenuCard
              key={item.key}
              title={item.title}
              icon={item.icon}
              hint={item.hint}
              route={item.route}
              buttonColor={item.buttonColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


