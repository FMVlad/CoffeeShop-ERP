import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from '../api';

export default function ManufacturersPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getManufacturers().then(setItems);
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    await api.addManufacturer({ Name: name, Country: country });
    setName(""); setCountry("");
    api.getManufacturers().then(setItems);
    setShowForm(false);
  };

  const remove = async (id) => {
    if (window.confirm("Видалити виробника?")) {
    await api.deleteManufacturer(id);
      api.getManufacturers().then(setItems);
    }
  };

  const startEdit = (m) => {
    setEditing({
      ID: m.ID,
      Name: m.ManufacturerName || m.Name || m.name || "",
      Country: m.Country || m.country || ""
    });
    setShowForm(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await api.updateManufacturer(editing.ID, {
      Name: editing.Name,
      Country: editing.Country
    });
    setEditing(null);
    setShowForm(false);
    api.getManufacturers().then(setItems);
  };

  const cancelForm = () => {
    setEditing(null);
    setShowForm(false);
    setName(""); setCountry("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex flex-col">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              🏭 Виробники
            </h1>
            <p className="text-2xl text-green-100">
              База даних виробників та брендів
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
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Додати виробника
          </button>
        </div>

        {/* Форма додавання/редагування */}
        {(showForm || editing) && (
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-green-200 mb-12 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-6 border-b-2 border-green-200">
              <h3 className="text-3xl font-bold text-green-800">
                {editing ? '✏️ Редагувати виробника' : '✨ Додати виробника'}
              </h3>
            </div>
            <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Назва виробника *
                  </label>
                  <input
                    value={editing ? editing.Name : name}
                    onChange={e => editing
                      ? setEditing({...editing, Name: e.target.value})
                      : setName(e.target.value)}
                    placeholder="Введіть назву виробника"
                    className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Країна
                  </label>
                  <input
                    value={editing ? editing.Country : country}
                    onChange={e => editing
                      ? setEditing({...editing, Country: e.target.value})
                      : setCountry(e.target.value)}
                    placeholder="Введіть країну"
                    className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                  />
                </div>
              </div>

              {/* Кнопки форми */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end mt-10 pt-8 border-t-2 border-green-100">
                <button
                  onClick={cancelForm}
                  className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  ❌ Скасувати
                </button>
                <button
                  onClick={editing ? saveEdit : add}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  💾 {editing ? 'Зберегти' : 'Додати'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблиця виробників */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-green-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-6 border-b-2 border-green-200">
            <h3 className="text-2xl font-bold text-green-800">
              📋 Список виробників ({items.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-100 to-emerald-100">
                <tr>
                  <th className="px-8 py-4 text-left text-lg font-bold text-green-800">Назва</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-green-800">Країна</th>
                  <th className="px-8 py-4 text-center text-lg font-bold text-green-800">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-green-50">
                {items.map((item) => (
                  <tr key={item.ID} className="hover:bg-green-50 transition-colors duration-200">
                    <td className="px-8 py-4 text-lg font-semibold text-gray-800">
                      {item.ManufacturerName || item.Name || item.name || ''}
                    </td>
                    <td className="px-8 py-4 text-lg text-gray-600">
                      {item.Country || item.country || '-'}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => startEdit(item)}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => remove(item.ID)}
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
      <footer className="mt-auto border-t-2 border-green-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-center gap-6">
          <div className="text-center">
            <span className="text-2xl font-bold text-green-800 tracking-wide">
              🏭 Виробники VYSHNIA
            </span>
            <p className="text-green-600 text-base mt-1">
              Система управління виробниками
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
