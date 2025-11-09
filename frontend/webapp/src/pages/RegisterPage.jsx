import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Тут буде API виклик для завантаження документів
      setDocuments([]);
    } catch (error) {
      console.error('Помилка завантаження документів:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-3xl shadow-2xl p-8 mb-12 w-full">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              📊 Реєстр прибуткових накладних
            </h1>
            <p className="text-2xl text-purple-100">
              Перегляд та аналіз всіх документів закупівель
            </p>
          </div>
        </div>

        {/* Кнопки управління */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/purchases')}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              ← Назад до закупівель
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              🏠 На головну
            </button>
          </div>
        </div>

        {/* Фільтри */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-8 py-6 border-b-2 border-purple-200">
            <h3 className="text-2xl font-bold text-purple-800 mb-4">
              🔍 Фільтри пошуку
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Період
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Постачальник
                </label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="">Всі постачальники</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Статус
                </label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="">Всі статуси</option>
                  <option value="draft">Чернетка</option>
                  <option value="posted">Проведено</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Таблиця документів */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-8 py-6 border-b-2 border-purple-200">
            <h3 className="text-2xl font-bold text-purple-800">
              📋 Список документів
            </h3>
          </div>
          
          <div className="p-8">
            {loading ? (
              <div className="text-center text-gray-500 text-lg py-12">
                ⏳ Завантаження...
              </div>
            ) : (
              <div className="text-center text-gray-500 text-lg py-12">
                🚧 Сторінка в розробці
                <br />
                <span className="text-sm">Тут буде таблиця документів</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
