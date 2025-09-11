import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SalesRegisterPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-sky-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-extrabold text-sky-700">📋 Реєстр продаж</h1>
            <div className="flex gap-3">
              <button onClick={()=>navigate('/sales')} className="px-5 py-3 bg-sky-100 text-sky-800 rounded-xl font-bold">← Назад</button>
              <button onClick={()=>navigate('/')} className="px-5 py-3 bg-sky-600 text-white rounded-xl font-bold">🏠 Додому</button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-gray-600">Журнал документів продажу (у розробці)</div>
        </div>
      </div>
    </div>
  );
}



