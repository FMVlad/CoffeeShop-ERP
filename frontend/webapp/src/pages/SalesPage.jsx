import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SalesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              💰 Продажі
            </h1>
            <p className="text-2xl text-purple-100">
              Оберіть режим торгівлі
            </p>
          </div>
        </div>

        {/* Головні кнопки режимів */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <button
            onClick={() => navigate('/sales/retail')}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-10 rounded-3xl font-extrabold text-3xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-xl"
          >
            🏪 Роздрібна торгівля
            <div className="mt-2 text-base font-semibold text-emerald-100">Повноекранний інтерфейс для ПК</div>
          </button>

          <button
            onClick={() => navigate('/sales/mobile')}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-10 rounded-3xl font-extrabold text-3xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-xl"
          >
            📱 Мобільна торгівля
            <div className="mt-2 text-base font-semibold text-indigo-100">Оптимізовано під планшети</div>
          </button>

          <button
            onClick={() => navigate('/sales/invoices')}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black px-8 py-10 rounded-3xl font-extrabold text-3xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-xl"
          >
            📄 Торгівля з рахунками
            <div className="mt-2 text-base font-semibold text-amber-900/80">Замовлення і рахунки-фактури</div>
          </button>

          <button
            onClick={() => navigate('/sales/register')}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white px-8 py-10 rounded-3xl font-extrabold text-3xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-xl"
          >
            📋 Реєстр продаж
            <div className="mt-2 text-base font-semibold text-sky-100">Журнал і пошук документів</div>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => navigate('/')}
            className="bg-white text-gray-800 px-8 py-4 rounded-2xl font-bold text-lg border-2 border-blue-200 hover:bg-blue-50 transition-colors duration-200 shadow"
          >
            ← На головну
          </button>
        </div>
      </div>
    </div>
  );
}
