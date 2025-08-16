import React from "react";
import { useNavigate } from "react-router-dom";

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
  { key: "sales", title: "Продажі", icon: "🧾", route: "/sales", hint: "Чеки, замовлення" },
  {
    key: "purchases",
    title: "Закупівлі",
    icon: "🛒",
    hint: "Накладні, замовлення, повернення",
    submenu: [
      { key: "purch-arrivals", title: "Прибуткові накладні", icon: "📥", route: "/purchases/arrivals" },
      { key: "purch-orders", title: "Замовлення постачальнику", icon: "🧾", route: "/purchases/orders" },
      { key: "purch-returns", title: "Повернення постачальнику", icon: "♻️", route: "/purchases/returns" },
      { key: "purch-register", title: "Реєстр прибуткових накладних", icon: "📚", route: "/purchases/register" },
    ],
  },
  { key: "stock", title: "Склади", icon: "🏬", route: "/stock", hint: "Залишки, переміщення" },
  { key: "finance", title: "Фінанси", icon: "💰", route: "/finance", hint: "Каси, рахунки, платежі" },
  { key: "accounting", title: "Бухоблік", icon: "📒", route: "/accounting", hint: "Проводки, ОСВ, ПДВ" },
  { key: "reports", title: "Звіти", icon: "📈", route: "/reports", hint: "Продажі, запаси, фінанси" },
  { key: "analytics", title: "Аналітика", icon: "📊", route: "/analytics", hint: "KPI, ABC/XYZ" },
  {
    key: "marketing",
    title: "Маркетинг",
    icon: "🎯",
    hint: "Клієнти, акції, лояльність",
    submenu: [
      { key: "clients", title: "Клієнти", icon: "👥", route: "/marketing/clients" },
      { key: "promotions", title: "Акції та знижки", icon: "🏷️", route: "/marketing/promotions" },
      { key: "loyalty", title: "Програма лояльності", icon: "⭐", route: "/marketing/loyalty" },
      { key: "coupons", title: "Сертифікати і купони", icon: "🎟️", route: "/marketing/coupons" },
    ],
  },
  { key: "directions", title: "Напрями діяльності", icon: "🧩", route: "/directions", hint: "Кав’ярня, виробництво, СТО…" },
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
    <div className="min-h-screen bg-gradient-to-tr from-coffee-50 via-white to-coffee-100 flex flex-col">
      {/* Контент */}
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
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
              <div className="p-5 flex items-start gap-4">
                <div className="text-3xl leading-none select-none">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-coffee-900 truncate">{item.title}</h2>
                  {item.hint && <p className="text-sm text-coffee-500 mt-1 line-clamp-2">{item.hint}</p>}
                </div>
                {item.submenu && <div className="ml-2 text-coffee-400 group-hover:text-coffee-600">▾</div>}
              </div>

              {!item.submenu && (
                <div className="px-5 pb-5">
                  <button className="w-full rounded-xl border border-coffee-200 py-2 text-sm text-coffee-700 hover:bg-coffee-50">
                    Перейти
                  </button>
                </div>
              )}

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

      {/* Футер з логотипом — ЗБІЛЬШЕНО */}
      <footer className="mt-auto border-t border-coffee-100 bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center gap-4">
        <img
  src="/webapp/logo.png"
            alt="VISHNIA"
            className="h-18 md:h-20 w-auto select-none"
            draggable="false"
          />
          <span className="text-base md:text-lg font-medium text-coffee-700 tracking-wide">
            VISHNIA
          </span>
      </div>
      </footer>
    </div>
  );
}
