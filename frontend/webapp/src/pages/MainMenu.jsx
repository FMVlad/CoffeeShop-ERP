import React from "react";
import { useNavigate } from "react-router-dom";

const mainMenu = [
  { key: "admin", title: "Адмін", icon: "🏠", route: "/admin" },
  {
    key: "dictionaries",
    title: "Довідники",
    icon: "📚",
    submenu: [
      { key: "categories", title: "Категорії товару", icon: "📦", route: "/categories" },
      { key: "manufacturers", title: "Виробники", icon: "🏭", route: "/manufacturers" },
      { key: "products", title: "Товари", icon: "🥤", route: "/products" },
      { key: "units", title: "Валюти та курси", icon: "💴", route: "/currencies" },
      { key: "price-categories", title: "Цінові категорії", icon: "💸", route: "/price-categories" },
      { key: "product-prices", title: "Прайс-листи", icon: "💰", route: "/price-list" },
      // Додавай нові довідники тут!
    ],
  },
  { key: "docs", title: "Документи", icon: "📑", route: "/docs" },
  { key: "fin", title: "Фінанси", icon: "💰", route: "/finances" },
  { key: "stock", title: "Товари та залишки", icon: "📦", route: "/stock" },
  { key: "marketing", title: "Маркетинг і клієнти", icon: "🎯", route: "/marketing" },
  {
    key: "settings",
    title: "Налаштування",
    icon: "⚙️",
    submenu: [
      { key: "system-parameters", title: "Системні параметри", icon: "🛠️", route: "/system-parameters" },
      { key: "programm-parameters", title: "Програмні параметри", icon: "🧩", route: "/programm-parameters" },
            // Додавай інші налаштування тут!
    ],
  },
  { key: "help", title: "Допомога", icon: "❓", route: "/help" },
];

export default function MainMenu() {
  const navigate = useNavigate();
  const [openSubmenu, setOpenSubmenu] = React.useState(null);

  const handleCardClick = (item) => {
    if (item.submenu) {
      setOpenSubmenu(item.key === openSubmenu ? null : item.key);
    } else if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-tr from-coffee-50 via-white to-coffee-100">
      {/* Горизонтальна панель з кнопками */}
      <div className="flex flex-wrap justify-center gap-6 p-4 shadow-md bg-white z-10">
        {mainMenu.map((item) => (
          <div key={item.key} className="relative">
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-lg shadow bg-white hover:bg-rose-50 border border-coffee-100 transition"
              onClick={() => handleCardClick(item)}
            >
              <span className="text-2xl">{item.icon}</span>
              <span>{item.title}</span>
              {item.submenu && (
                <span className="ml-2 text-coffee-500 text-lg pointer-events-none">▼</span>
              )}
            </button>
            {/* Випадаюче підменю для Довідники або Налаштування */}
            {item.submenu && openSubmenu === item.key && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-coffee-200 rounded-xl shadow-xl z-20">
                <div className="flex flex-col divide-y">
                  {item.submenu.map((sub) => (
                    <button
                      key={sub.key}
                      className="flex items-center gap-3 py-3 px-6 text-left hover:bg-coffee-50 transition"
                      onClick={() => {
                        navigate(sub.route);
                        setOpenSubmenu(null);
                      }}
                    >
                      <span className="text-2xl">{sub.icon}</span>
                      <span className="text-base">{sub.title}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end p-2">
                  <button
                    className="text-coffee-500 hover:text-coffee-800 text-sm"
                    onClick={() => setOpenSubmenu(null)}
                  >
                    Закрити
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Центр сторінки — лого */}
      <div className="flex-grow flex flex-col items-center justify-center">
        <img
  src="/webapp/logo.png"
  alt="VISHNIA Logo"
  className="w-[420px] max-w-full select-none mb-4"
  style={{ pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
}
