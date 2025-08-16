import React from "react";
import { useNavigate } from "react-router-dom";

// Конфіг головного меню (можеш редагувати і розширювати)
const mainMenu = [
  { key: "admin", title: "Адмін", icon: "🧭", route: "/admin", hint: "Панель адміністратора" },
  {
    key: "dictionaries",
    title: "Довідники",
    icon: "📚",
    hint: "Категорії, виробники, товари…",
    submenu: [
      { key: "categories", title: "Категорії товару", icon: "📦", route: "/categories" },
      { key: "manufacturers", title: "Виробники", icon: "🏭", route: "/manufacturers" },
      { key: "suppliers", title: "Постачальники", icon: "🚚", route: "/suppliers" },
      { key: "products", title: "Товари", icon: "🥤", route: "/products" },
      { key: "currencies", title: "Валюти та курси", icon: "💴", route: "/currencies" },
      { key: "price-categories", title: "Цінові категорії", icon: "💸", route: "/price-categories" },
      { key: "price-list", title: "Прайс-листи", icon: "💰", route: "/price-list" },
    ],
  },
  { key: "docs", title: "Документи", icon: "📑", route: "/docs", hint: "Прибуткові, видаткові…" },
  { key: "fin", title: "Фінанси", icon: "💰", route: "/finances", hint: "Розрахункові рахунки, каси" },
  { key: "stock", title: "Склади", icon: "🏬", route: "/stock", hint: "Залишки, переміщення" },
  { key: "marketing", title: "Маркетинг", icon: "🎯", route: "/marketing", hint: "Акції, ціни" },
  {
    key: "settings",
    title: "Налаштування",
    icon: "⚙️",
    hint: "Параметри системи",
    submenu: [
      { key: "programm-parameters", title: "Програмні параметри", icon: "🧩", route: "/programm-parameters" },
    ],
  },
  { key: "help", title: "Допомога", icon: "❓", route: "/help", hint: "Довідка та підтримка" },
];

export default function MainMenuCards() {
  const navigate = useNavigate();
  const [openKey, setOpenKey] = React.useState(null);

  const onCardActivate = (item) => {
    if (item.submenu) setOpenKey(openKey === item.key ? null : item.key);
    else if (item.route) navigate(item.route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-coffee-50 via-white to-coffee-100">
      {/* Top bar (необов'язково) */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-coffee-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <img src="/webapp/logo.png" alt="VISHNIA" className="h-8 w-auto" />
            <span className="text-coffee-700 font-semibold">VISHNIA</span>
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-coffee-800 mb-6">Головне меню</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mainMenu.map((item) => (
            <article
              key={item.key}
              tabIndex={0}
              role="button"
              aria-haspopup={item.submenu ? "true" : undefined}
              aria-expanded={openKey === item.key}
              onClick={() => onCardActivate(item)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onCardActivate(item)}
              className={[
                "group relative rounded-2xl border border-coffee-100 bg-white shadow-sm",
                "hover:shadow-lg hover:-translate-y-0.5 transition-all",
                "focus:outline-none focus:ring-2 focus:ring-rose-300",
                openKey === item.key ? "ring-1 ring-rose-300" : "",
              ].join(" ")}
            >
              {/* Карточка: шапка */}
              <div className="p-5 flex items-start gap-4">
                <div className="text-3xl leading-none select-none">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-coffee-900 truncate">{item.title}</h2>
                  {item.hint && (
                    <p className="text-sm text-coffee-500 mt-1 line-clamp-2">{item.hint}</p>
                  )}
                </div>
                {item.submenu && (
                  <div className="ml-2 text-coffee-400 group-hover:text-coffee-600">▾</div>
                )}
              </div>

              {/* Плашка з діями (видима на hover) */}
              {!item.submenu && (
                <div className="px-5 pb-5">
                  <button
                    className="w-full rounded-xl border border-coffee-200 py-2 text-sm text-coffee-700 hover:bg-coffee-50"
                  >
                    Перейти
                  </button>
                </div>
              )}

              {/* Вкладка з підменю (розкривна) */}
              {item.submenu && openKey === item.key && (
                <div className="px-5 pb-5">
                  <div className="grid grid-cols-1 gap-2">
                    {item.submenu.map((sub) => (
                      <button
                        key={sub.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(sub.route);
                          setOpenKey(null);
                        }}
                        className="flex items-center gap-3 rounded-xl border border-coffee-200 px-4 py-2 text-left hover:bg-coffee-50"
                      >
                        <span className="text-xl">{sub.icon}</span>
                        <span className="text-sm text-coffee-800">{sub.title}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      className="text-sm text-coffee-500 hover:text-coffee-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenKey(null);
                      }}
                    >
                      Закрити
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
