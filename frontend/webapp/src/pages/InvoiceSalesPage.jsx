import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function InvoiceSalesPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-amber-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-extrabold text-amber-700">📄 Торгівля з рахунками</h1>
            <div className="flex gap-3">
              <button onClick={()=>navigate('/sales')} className="px-5 py-3 bg-amber-100 text-amber-800 rounded-xl font-bold">← Назад</button>
              <button onClick={()=>navigate('/')} className="px-5 py-3 bg-amber-600 text-white rounded-xl font-bold">🏠 Додому</button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-gray-600">Сторінка під замовлення та рахунки-фактури (у розробці)</div>
        </div>
      </div>
    </div>
  );
}



