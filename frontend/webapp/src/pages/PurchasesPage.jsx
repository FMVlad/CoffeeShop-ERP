import React from 'react';
import MenuCard from '../components/MenuCard';

export default function PurchasesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-amber-800 mb-4">
            🛒 Закупівлі
          </h1>
          <p className="text-2xl text-amber-700">
            Управління закупівлями та постачанням
          </p>
        </div>

        {/* Меню карток */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Повернутися до головного меню */}
          <MenuCard
            title="🏠 Повернутися до головного меню"
            icon="🏠"
            hint="Назад до основного меню системи"
            route="/"
            buttonColor="from-gray-500 to-gray-600"
            buttonText="← Назад"
          />

          {/* Прибуткові накладні */}
          <MenuCard
            title="📦 Прибуткові накладні"
            icon="📦"
            hint="Створення та управління прибутковими накладними"
            route="/arrivals"
            buttonColor="from-blue-500 to-indigo-600"
            buttonText="🚀 Перейти"
          />

          {/* Замовлення постачальнику */}
          <MenuCard
            title="📋 Замовлення постачальнику"
            icon="📋"
            hint="Формування замовлень постачальникам"
            route="/orders"
            buttonColor="from-green-500 to-emerald-600"
            buttonText="🚀 Перейти"
          />

          {/* Повернення постачальнику */}
          <MenuCard
            title="↩️ Повернення постачальнику"
            icon="↩️"
            hint="Оформлення повернень товарів постачальникам"
            route="/returns"
            buttonColor="from-orange-500 to-red-600"
            buttonText="🚀 Перейти"
          />

          {/* Реєстр документів */}
          <MenuCard
            title="📊 Реєстр прибуткових накладних"
            icon="📊"
            hint="Перегляд та аналіз всіх документів закупівель"
            route="/register"
            buttonColor="from-purple-500 to-violet-600"
            buttonText="🚀 Перейти"
          />
        </div>
      </div>
    </div>
  );
}


