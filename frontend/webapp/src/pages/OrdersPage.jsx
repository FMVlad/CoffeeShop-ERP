import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await api.getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Помилка завантаження постачальників:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl shadow-2xl p-8 mb-12 w-full">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              📋 Замовлення постачальнику
            </h1>
            <p className="text-2xl text-green-100">
              Формування та управління замовленнями
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
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Додати замовлення
          </button>
        </div>

        {/* Таблиця замовлень */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-green-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-6 border-b-2 border-green-200">
            <h3 className="text-2xl font-bold text-green-800">
              📋 Список замовлень
            </h3>
          </div>
          
          <div className="p-8">
            <div className="text-center text-gray-500 text-lg py-12">
              🚧 Сторінка в розробці
              <br />
              <span className="text-sm">Тут буде таблиця замовлень</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
