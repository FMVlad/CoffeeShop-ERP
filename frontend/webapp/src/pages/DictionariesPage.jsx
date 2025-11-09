import React from 'react';
import MenuCard from '../components/MenuCard';

export default function DictionariesPage() {

  const menu = [
    {
      key: "back-to-main",
      title: "Повернутися до головного меню",
      route: "/",
      icon: "🏠",
      hint: "Назад до головного меню системи VYSHNIA",
      buttonColor: "from-gray-500 to-slate-600"
    },
    {
      key: "categories",
      title: "Категорії товару",
      route: "/dictionaries/categories",
      icon: "📂",
      hint: "Управління категоріями та групами товарів",
      buttonColor: "from-blue-500 to-indigo-600"
    },
    {
      key: "manufacturers",
      title: "Виробники",
      route: "/dictionaries/manufacturers",
      icon: "🏭",
      hint: "База даних виробників та брендів",
      buttonColor: "from-green-500 to-emerald-600"
    },
    {
      key: "suppliers",
      title: "Постачальники",
      route: "/dictionaries/suppliers",
      icon: "🚚",
      hint: "Управління постачальниками та партнерами",
      buttonColor: "from-orange-500 to-amber-600"
    },
    {
      key: "products",
      title: "Товари",
      route: "/dictionaries/products",
      icon: "📦",
      hint: "Каталог товарів з характеристиками та цінами",
      buttonColor: "from-purple-500 to-indigo-600"
    },
    {
      key: "currencies",
      title: "Валюти та курси",
      route: "/dictionaries/currencies",
      icon: "💱",
      hint: "Управління валютами та курсами обміну",
      buttonColor: "from-yellow-500 to-amber-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex flex-col">
      {/* Header з градієнтом */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="text-center">
            <h1 className="text-7xl font-bold mb-6 animate-pulse">
              📚 Довідники VYSHNIA
            </h1>
            <p className="text-3xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
              Централізоване управління всіма довідниками системи
            </p>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-7xl mx-auto px-8 py-16 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-16">
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
          <h3 className="text-3xl font-bold text-blue-800 mb-6">
            🎯 Центр довідників VYSHNIA
          </h3>
          <p className="text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto">
            Оберіть потрібний довідник для управління категоріями, виробниками, товарами та іншими справочними даними. 
            Кожен довідник містить повний набір функцій для створення, редагування та видалення записів.
          </p>
        </div>
      </div>

      {/* Футер */}
      <footer className="mt-auto border-t-2 border-blue-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-center gap-6">
          <div className="text-center">
            <span className="text-2xl font-bold text-gray-800 tracking-wide">
              📚 Довідники VYSHNIA
            </span>
            <p className="text-gray-600 text-base mt-1">
              Система управління довідниками
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}


