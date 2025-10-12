import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import MenuCard from "../components/MenuCard";

const cards = [
  { key: "back", title: "🏠 Повернутися до головного меню", icon: "🏠", route: "/", hint: "Назад до основного меню системи", buttonColor: "from-gray-500 to-gray-600", buttonText: "← Назад" },
  { key: "cash-ops", title: "💵 Касові операції", icon: "💵", route: "/finance/cash-ops", hint: "Надходження та видатки по касах", buttonColor: "from-emerald-500 to-green-600" },
  { key: "noncash", title: "🏦 Безготівкові платежі", icon: "🏦", route: "/finance/noncash", hint: "Платежі по банківських рахунках", buttonColor: "from-sky-500 to-blue-600" },
  { key: "balances", title: "📊 Залишки (каси/рахунки)", icon: "📊", route: "/finance/balances", hint: "Сальдо кас та банківських рахунків", buttonColor: "from-amber-500 to-orange-600" },
  { key: "payments", title: "🧾 Платежі / Виписки", icon: "🧾", route: "/finance/payments", hint: "Журнали платежів та банківські виписки", buttonColor: "from-purple-500 to-violet-600" },
  { key: "reports", title: "📈 Звіти по фінансах", icon: "📈", route: "/finance/reports", hint: "Аналіз руху коштів та фінансові звіти", buttonColor: "from-rose-500 to-pink-500" },
  { key: "currencies", title: "💱 Валюти та курси", icon: "💱", route: "/finance/currencies", hint: "Довідник валют та управління курсами", buttonColor: "from-teal-500 to-cyan-600" },
];

export default function FinancePage() {
  const location = useLocation();
  const isBase = location.pathname === "/finance";

  if (!isBase) {
    // Підсторінки фінансів рендеряться тут у спільному контейнері
    return (
      <div className="min-h-screen bg-gradient-to-tr from-amber-50 via-white to-amber-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>
    );
  }

  // Хаб карток для розділу "Фінанси" (уніфікований вигляд як у Склади/Закупівлі)
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex flex-col">
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-14 text-center">
          <h1 className="text-6xl font-bold mb-3">Фінанси</h1>
          <p className="text-2xl text-yellow-100">Оберіть потрібний інструмент для роботи з фінансами</p>
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
              buttonText={item.buttonText}
            />
          ))}
          </div>
        </div>
    </div>
  );
}

