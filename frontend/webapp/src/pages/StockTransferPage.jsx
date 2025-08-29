import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function StockTransferPage() {
  const navigate = useNavigate();
  const [centers, setCenters] = useState([]);
  const [fromCenter, setFromCenter] = useState("");
  const [toCenter, setToCenter] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    (async () => {
      try { setCenters(await api.getCenters()); } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              🔁 Переміщення між складами
            </h1>
            <p className="text-2xl text-green-100">
              Переміщення товарів між центрами та складами
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

        {/* Форма переміщення */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">З центру</label>
              <select 
                value={fromCenter} 
                onChange={e => setFromCenter(e.target.value)} 
                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-green-500 focus:outline-none transition-colors duration-300"
              >
                <option value="">— Оберіть —</option>
                {centers.map(c => <option key={c.ID} value={c.ID}>{c.CenterName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">До центру</label>
              <select 
                value={toCenter} 
                onChange={e => setToCenter(e.target.value)} 
                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-green-500 focus:outline-none transition-colors duration-300"
              >
                <option value="">— Оберіть —</option>
                {centers.map(c => <option key={c.ID} value={c.ID}>{c.CenterName}</option>)}
              </select>
            </div>
          </div>
          
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-3">Коментар</label>
            <input 
              type="text" 
              value={comment} 
              onChange={e => setComment(e.target.value)} 
              className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-green-500 focus:outline-none transition-colors duration-300"
              placeholder="Введіть коментар до переміщення..."
            />
          </div>
          
          <div className="text-center">
            <button
              onClick={async () => {
                if (!fromCenter || !toCenter) return alert('Оберіть центри');
                // Мінімальна форма: один товар, кількість 1 — поки як демонстрація
                const productId = Number(prompt('Введіть ID товару для переміщення')) || 0;
                if (!productId) return;
                const qty = Number(prompt('Кількість', '1')) || 1;
                try {
                  await api.post('/stock/transfer', null, {
                    from_center_id: Number(fromCenter),
                    to_center_id: Number(toCenter),
                    product_id: productId,
                    quantity: qty,
                    comment,
                  });
                  alert('Переміщення виконано');
                } catch (e) {
                  alert(e?.message || 'Помилка переміщення');
                }
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              🚀 Виконати переміщення
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
