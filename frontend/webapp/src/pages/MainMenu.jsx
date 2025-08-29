import React from "react";
import { useNavigate } from "react-router-dom";
import MenuCard from "../components/MenuCard";

const menu = [
  { key: "admin", title: "Адмін", icon: "🧭", route: "/admin", hint: "Панель адміністратора", buttonColor: "from-red-500 to-pink-500" },
  { key: "dictionaries", title: "Довідники", icon: "📚", route: "/dictionaries", hint: "Категорії, виробники, товари…", buttonColor: "from-blue-500 to-indigo-500" },
  { key: "purchases", title: "Закупівлі", icon: "🛒", route: "/purchases", hint: "Накладні, замовлення, повернення", buttonColor: "from-green-500 to-emerald-500" },
  { key: "sales", title: "Продажі", icon: "📄", route: "/sales", hint: "Чеки, замовлення, реалізація", buttonColor: "from-purple-500 to-indigo-500" },
  { key: "warehouses", title: "Склади", icon: "🏭", route: "/stock", hint: "Залишки, переміщення", buttonColor: "from-teal-500 to-cyan-500" },
  { key: "finance", title: "Фінанси", icon: "💰", route: "/finance", hint: "Каси, рахунки, платежі", buttonColor: "from-lime-500 to-green-500" },
  { key: "accounting", title: "Бухоблік", icon: "📒", route: "/accounting", hint: "Проводки, ОСВ, ПДВ", buttonColor: "from-amber-500 to-orange-500" },
  { key: "reports", title: "Звіти", icon: "📈", route: "/reports", hint: "Продажі, запаси, фінанси", buttonColor: "from-indigo-500 to-purple-500" },
  { key: "analytics", title: "Аналітика", icon: "📊", route: "/analytics", hint: "KPI, ABC/XYZ", buttonColor: "from-rose-500 to-pink-500" },
  { key: "marketing", title: "Маркетинг", icon: "🎯", route: "/marketing", hint: "Клієнти, акції, лояльність", buttonColor: "from-violet-500 to-purple-500" },
  { key: "directions", title: "Напрями діяльності", icon: "🧩", route: "/directions", hint: "Кав'ярня, виробництво, СТО…", buttonColor: "from-sky-500 to-blue-500" },
  { key: "settings", title: "Параметри програми", icon: "⚙️", route: "/programm-parameters", hint: "Параметри системи", buttonColor: "from-gray-500 to-slate-500" },
  { key: "help", title: "Допомога", icon: "❓", route: "/help", hint: "Довідка та підтримка", buttonColor: "from-emerald-500 to-teal-500" }
];

export default function MainMenu() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex flex-col">
      {/* Header світлий */}
      <div className="bg-white border-b-2 border-blue-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img
                src="/webapp/vyshnia_logo.png"
                alt="VYSHNIA"
                className="h-16 w-auto drop-shadow-md select-none"
                draggable="false"
              />
              <span className="text-4xl md:text-5xl font-bold tracking-wide text-gray-800">VYSHNIA</span>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Центр управління всіма модулями системи VYSHNIA
            </p>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-7xl mx-auto px-8 py-20 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16">
          {menu.map((item) => (
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

        {/* Інструкція */}
        <div className="bg-white rounded-4xl shadow-4xl border-2 border-blue-200 p-12 text-center">
          <h3 className="text-3xl font-bold text-blue-800 mb-6 flex items-center justify-center gap-3">
            <span>Ласкаво просимо до системи</span>
            <img src="/webapp/vyshnia_logo.png" alt="VYSHNIA" className="h-7 w-auto select-none" draggable="false" />
            <span>VYSHNIA!</span>
          </h3>
          <p className="text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto">
            Оберіть потрібний модуль з карток вище для початку роботи. 
            Кожен модуль містить повний набір функцій для управління відповідною частиною бізнесу.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/arrivals")}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-md w-full sm:w-auto"
            >
              Прибуткові накладні
            </button>
            <button
              onClick={() => navigate("/sales/retail")}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-md w-full sm:w-auto"
            >
              Роздрібна торгівля
            </button>
            <button
              onClick={() => navigate("/stock/state")}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-md w-full sm:w-auto"
            >
              Стан складу
            </button>
          </div>
        </div>
      </div>

      {/* Футер */}
      <footer className="mt-auto border-t-2 border-blue-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-center gap-4">
          <img
            src="/webapp/vyshnia_logo.png"
            alt="VYSHNIA"
            className="h-20 md:h-24 w-auto select-none drop-shadow-lg"
            draggable="false"
          />
          <span className="text-3xl md:text-4xl font-bold text-gray-800 tracking-wide">
            VYSHNIA
          </span>
        </div>
      </footer>
    </div>
  );
}
