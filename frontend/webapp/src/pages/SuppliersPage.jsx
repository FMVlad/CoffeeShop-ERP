import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

const emptySupplier = {
  Name: "",
  Barcode: "",   // Штрихкод
  BankAccount: "",
  BankName: "",
  MFO: "",
  Code: "",
  Address: "",
  Phone: "",
  Email: "",
  IsVATPayer: false,
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupplier);
  const navigate = useNavigate();

  useEffect(() => {
    loadSuppliers();
  }, []);

  function loadSuppliers() {
    api.getSuppliers().then(data => setSuppliers(Array.isArray(data) ? data : []));
  }

  const startAdd = () => {
    setForm(emptySupplier);
    setEditing(null);
    setShowForm(true);
  };

  const startEdit = (s) => {
    setForm(s);
    setEditing(s.ID);
    setShowForm(true);
  };

  const handleFormChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.Name.trim()) return;
    if (editing) {
      await api.updateSupplier(editing, form);
    } else {
      await api.addSupplier(form);
    }
    setShowForm(false);
    setEditing(null);
    loadSuppliers();
  };

  const handleDelete = (id) => {
    if (window.confirm("Видалити постачальника?")) {
      api.deleteSupplier(id).then(loadSuppliers);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-100 flex flex-col">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              🚚 Постачальники
            </h1>
            <p className="text-2xl text-orange-100">
              Управління постачальниками та партнерами
            </p>
          </div>
        </div>
        {/* Кнопки управління */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/dictionaries")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              ← Назад до довідників
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              🏠 На головну
            </button>
          </div>
          <button
            onClick={startAdd}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Додати постачальника
          </button>
        </div>

        {/* Форма додавання/редагування */}
        {showForm && (
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-orange-200 mb-12 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-8 py-6 border-b-2 border-orange-200">
              <h3 className="text-3xl font-bold text-orange-800">
                {editing ? '✏️ Редагувати постачальника' : '✨ Додати постачальника'}
              </h3>
            </div>
            <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Основна інформація */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Назва постачальника *
                    </label>
                    <input
                      type="text"
                      value={form.Name}
                      onChange={(e) => handleFormChange("Name", e.target.value)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                      placeholder="Введіть назву постачальника"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Код
                    </label>
                    <input
                      type="text"
                      value={form.Code}
                      onChange={(e) => handleFormChange("Code", e.target.value)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                      placeholder="Введіть код"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Штрихкод
                    </label>
                    <input
                      type="text"
                      value={form.Barcode}
                      onChange={(e) => handleFormChange("Barcode", e.target.value)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                      placeholder="Введіть штрихкод"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Адреса
                    </label>
                    <textarea
                      value={form.Address}
                      onChange={(e) => handleFormChange("Address", e.target.value)}
                      rows="3"
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50 hover:bg-white resize-none"
                      placeholder="Введіть адресу"
                    />
                  </div>
                </div>

                {/* Контактна інформація */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Телефон
                    </label>
                    <input
                      type="tel"
                      value={form.Phone}
                      onChange={(e) => handleFormChange("Phone", e.target.value)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                      placeholder="+380"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.Email}
                      onChange={(e) => handleFormChange("Email", e.target.value)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                      placeholder="example@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Банк
                    </label>
                    <input
                      type="text"
                      value={form.BankName}
                      onChange={(e) => handleFormChange("BankName", e.target.value)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                      placeholder="Назва банку"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-lg font-semibold text-gray-700 mb-3">
                        МФО
                      </label>
                      <input
                        type="text"
                        value={form.MFO}
                        onChange={(e) => handleFormChange("MFO", e.target.value)}
                        className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                        placeholder="МФО"
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-semibold text-gray-700 mb-3">
                        Р/р
                      </label>
                      <input
                        type="text"
                        value={form.BankAccount}
                        onChange={(e) => handleFormChange("BankAccount", e.target.value)}
                        className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                        placeholder="Рахунок"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <input
                      type="checkbox"
                      id="vatPayer"
                      checked={form.IsVATPayer}
                      onChange={(e) => handleFormChange("IsVATPayer", e.target.checked)}
                      className="w-6 h-6 text-orange-600 border-2 border-gray-300 rounded-lg focus:ring-orange-500 focus:ring-2"
                    />
                    <label htmlFor="vatPayer" className="text-lg font-semibold text-gray-700">
                      Платник ПДВ
                    </label>
                  </div>
                </div>
              </div>

              {/* Кнопки форми */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end mt-10 pt-8 border-t-2 border-orange-100">
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  ❌ Скасувати
                </button>
                <button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  💾 Зберегти
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблиця постачальників */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-orange-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-8 py-6 border-b-2 border-orange-200">
            <h3 className="text-2xl font-bold text-orange-800">
              📋 Список постачальників ({suppliers.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-100 to-yellow-100">
                <tr>
                  <th className="px-8 py-4 text-left text-lg font-bold text-orange-800">Назва</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-orange-800">Код</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-orange-800">Телефон</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-orange-800">Email</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-orange-800">ПДВ</th>
                  <th className="px-8 py-4 text-center text-lg font-bold text-orange-800">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-orange-50">
                {suppliers.map((supplier) => (
                  <tr key={supplier.ID} className="hover:bg-orange-50 transition-colors duration-200">
                    <td className="px-8 py-4 text-lg font-semibold text-gray-800">{supplier.Name}</td>
                    <td className="px-8 py-4 text-lg text-gray-600">{supplier.Code || '-'}</td>
                    <td className="px-8 py-4 text-lg text-gray-600">{supplier.Phone || '-'}</td>
                    <td className="px-8 py-4 text-lg text-gray-600">{supplier.Email || '-'}</td>
                    <td className="px-8 py-4 text-lg">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        supplier.IsVATPayer 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.IsVATPayer ? '✅ Так' : '❌ Ні'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => startEdit(supplier)}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.ID)}
                          className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Футер */}
      <footer className="mt-auto border-t-2 border-orange-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-center gap-6">
          <div className="text-center">
            <span className="text-2xl font-bold text-orange-800 tracking-wide">
              🚚 Постачальники VYSHNIA
            </span>
            <p className="text-orange-600 text-base mt-1">
              Система управління постачальниками
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
