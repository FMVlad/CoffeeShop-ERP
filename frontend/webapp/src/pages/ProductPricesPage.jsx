import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ProductPricesPage() {
  const navigate = useNavigate();
  const [prices, setPrices] = useState([]);
  const [newPrice, setNewPrice] = useState({ ProductID: '', PriceCategoryID: '', Price: '' });

  useEffect(() => {
    api.getProductPrices().then(setPrices);
  }, []);

  const addPrice = async () => {
    if (!newPrice.ProductID || !newPrice.PriceCategoryID || !newPrice.Price) return;
    await api.addProductPrice({
      ProductID: Number(newPrice.ProductID),
      PriceCategoryID: Number(newPrice.PriceCategoryID),
      Price: Number(newPrice.Price)
    });
    setNewPrice({ ProductID: '', PriceCategoryID: '', Price: '' });
    api.getProductPrices().then(setPrices);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              💹 Переоцінка товарів
            </h1>
            <p className="text-2xl text-rose-100">
              Управління цінами товарів по категоріях
            </p>
          </div>
        </div>

        {/* Кнопки управління */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/stock")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              ← Назад до складів
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              🏠 На головну
            </button>
          </div>
        </div>

        {/* Форма додавання ціни */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Додати нову ціну</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">ID товару</label>
              <input 
                value={newPrice.ProductID} 
                onChange={e => setNewPrice(p => ({...p, ProductID: e.target.value}))} 
                placeholder="ID товару" 
                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-rose-500 focus:outline-none transition-colors duration-300"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">ID категорії цін</label>
              <input 
                value={newPrice.PriceCategoryID} 
                onChange={e => setNewPrice(p => ({...p, PriceCategoryID: e.target.value}))} 
                placeholder="ID категорії цін" 
                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-rose-500 focus:outline-none transition-colors duration-300"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">Ціна</label>
              <input 
                value={newPrice.Price} 
                onChange={e => setNewPrice(p => ({...p, Price: e.target.value}))} 
                placeholder="Ціна" 
                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-rose-500 focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>
          <div className="text-center">
            <button 
              onClick={addPrice} 
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-12 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              ✨ Додати ціну
            </button>
          </div>
        </div>

        {/* Список цін */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Поточні ціни</h2>
          {prices.length > 0 ? (
            <div className="space-y-4">
              {prices.map(price => (
                <div key={price.ID} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                  <div className="text-xl font-semibold text-gray-800">
                    Товар #{price.ProductID}, Категорія цін #{price.PriceCategoryID}: <span className="text-rose-600">{price.Price} ₴</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 text-xl py-12">
              Ціни ще не додано
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 