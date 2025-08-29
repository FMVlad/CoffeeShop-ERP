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
              Управління продажами та клієнтами
            </p>
          </div>
        </div>

        {/* Кнопки управління */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              ← На головну
            </button>
          </div>
        </div>

        {/* Основний контент */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Сторінка продажів
            </h2>
            <p className="text-xl text-gray-600">
              Тут буде функціональність для управління продажами
            </p>
            <div className="mt-8 text-6xl text-gray-300">
              🛒
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
