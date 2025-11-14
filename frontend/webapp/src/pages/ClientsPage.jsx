import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  
  // Форма створення/редагування
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    Name: '',
    Address: '',
    Phone: '',
    Email: '',
    Code: '',
    IsVATPayer: false,
    PriceCategoryID: ''
  });
  
  // Категорії цін
  const [priceCategories, setPriceCategories] = useState([]);

  // Завантаження клієнтів
  const loadClients = async () => {
    setLoading(true);
    try {
      const result = await api.getClients({ q: search });
      const list = Array.isArray(result) ? result : [];
      setClients(list);
      setTotal(list.length);
    } catch (error) {
      console.error('Помилка завантаження клієнтів:', error);
      alert('Помилка завантаження: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Завантаження категорій цін
  const loadPriceCategories = async () => {
    try {
      const result = await api.getPriceCategories();
      const list = Array.isArray(result) ? result : [];
      setPriceCategories(list);
      // Встановлюємо роздрібну категорію за замовчуванням
      const def = list.find(c => c.IsDefault) || list[0];
      if (def && !formData.PriceCategoryID) {
        setFormData(prev => ({ ...prev, PriceCategoryID: def.ID }));
      }
    } catch (error) {
      console.error('Помилка завантаження категорій цін:', error);
    }
  };

  useEffect(() => {
    loadClients();
  }, [search, page, pageSize]);

  useEffect(() => {
    loadPriceCategories();
  }, []);

  // Скидання форми
  const resetForm = () => {
    setFormData({
      Name: '',
      Address: '',
      Phone: '',
      Email: '',
      Code: '',
      IsVATPayer: false,
      PriceCategoryID: priceCategories.find(c => c.IsDefault)?.ID || priceCategories[0]?.ID || ''
    });
    setEditingClient(null);
  };

  // Відкриття форми створення
  const startAdd = () => {
    resetForm();
    setShowForm(true);
  };

  // Відкриття форми редагування
  const startEdit = (client) => {
    setFormData({
      Name: client.Name || '',
      Address: client.Address || '',
      Phone: client.Phone || '',
      Email: client.Email || '',
      Code: client.Code || '',
      IsVATPayer: client.IsVATPayer === 1 || client.IsVATPayer === true,
      PriceCategoryID: client.PriceCategoryID || ''
    });
    setEditingClient(client);
    setShowForm(true);
  };

  // Збереження клієнта
  const saveClient = async () => {
    if (!formData.Name.trim()) {
      alert('Назва клієнта обов\'язкова!');
      return;
    }

    try {
      if (editingClient) {
        await api.updateClient(editingClient.ID, formData);
        alert('Клієнта оновлено!');
      } else {
        await api.createClient(formData);
        alert('Клієнта створено!');
      }
      
      setShowForm(false);
      loadClients();
    } catch (error) {
      console.error('Помилка збереження:', error);
      alert('Помилка збереження: ' + error.message);
    }
  };

  // Видалення клієнта
  const deleteClient = async (client) => {
    if (!window.confirm(`Видалити клієнта "${client.Name}"?`)) return;
    
    try {
      await api.deleteClient(client.ID);
      alert('Клієнта видалено!');
      loadClients();
    } catch (error) {
      console.error('Помилка видалення:', error);
      alert('Помилка видалення: ' + error.message);
    }
  };

  // Закриття форми
  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              👥 Клієнти
            </h1>
            <p className="text-2xl text-blue-100">
              Управління базою клієнтів з автоматичною генерацією штрихкодів та прив'язкою до категорій цін
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
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Додати клієнта
          </button>
        </div>
        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Всього клієнтів</p>
                <p className="text-3xl font-bold text-blue-600">{total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Категорій цін</p>
                <p className="text-3xl font-bold text-green-600">{priceCategories.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">🏷️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Показано</p>
                <p className="text-3xl font-bold text-purple-600">{clients.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Керування та пошук */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Управління клієнтами
              </h2>
              <p className="text-gray-600 text-lg">
                Створюйте, редагуйте та управляйте базою клієнтів
              </p>
            </div>
            
            <button
              onClick={startAdd}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg"
            >
              ➕ Додати клієнта
            </button>
          </div>

          {/* Пошук */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Пошук по назві, телефону, email або штрихкоду..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 pl-12"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <span className="text-2xl">🔍</span>
              </div>
            </div>
          </div>
        </div>

        {/* Таблиця клієнтів */}
        {loading ? (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-xl text-gray-600">Завантаження клієнтів...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      👤 Клієнт
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      🏷️ Штрихкод
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      📞 Контакти
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      💰 Категорія цін
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      🏢 ПДВ
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      ⚙️ Дії
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {clients.map((client) => (
                    <tr key={client.ID} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-8 py-6">
                        <div className="text-lg font-semibold text-gray-900">{client.Name}</div>
                        {client.Address && (
                          <div className="text-sm text-gray-500 mt-1">📍 {client.Address}</div>
                        )}
                        {client.Code && (
                          <div className="text-sm text-gray-500 mt-1">🔢 Код: {client.Code}</div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-mono text-lg bg-gray-50 px-3 py-2 rounded-lg border">
                          {client.Barcode}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-2">
                          {client.Phone && (
                            <div className="text-lg text-gray-900">📞 {client.Phone}</div>
                          )}
                          {client.Email && (
                            <div className="text-lg text-gray-900">📧 {client.Email}</div>
                          )}
                          {!client.Phone && !client.Email && (
                            <div className="text-gray-400">—</div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                          {client.PriceCategoryName || 'Роздрібна'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${
                          (client.IsVATPayer === 1 || client.IsVATPayer === true)
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {(client.IsVATPayer === 1 || client.IsVATPayer === true) ? '✅ Так' : '❌ Ні'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => startEdit(client)}
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 active:scale-95 transition-all duration-300"
                          >
                            ✏️ Редагувати
                          </button>
                          <button
                            onClick={() => deleteClient(client)}
                            className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-pink-600 transform hover:scale-105 active:scale-95 transition-all duration-300"
                          >
                            🗑️ Видалити
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Пагінація - покращена */}
        {total > pageSize && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 mt-8 border border-gray-100">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="text-lg text-gray-700 font-semibold">
                📊 Показано {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} з {total} клієнтів
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  ← Попередня
                </button>
                <span className="bg-blue-100 text-blue-800 px-6 py-3 rounded-xl font-bold text-lg">
                  Сторінка {page}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= total}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  Наступна →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальне вікно форми - покращене */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {editingClient ? '✏️ Редагувати клієнта' : '➕ Новий клієнт'}
                </h2>
                <p className="text-gray-600 text-lg">
                  {editingClient ? 'Оновіть інформацію про клієнта' : 'Створіть нового клієнта з автоматичною генерацією штрихкоду'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    👤 Назва *
                  </label>
                  <input
                    type="text"
                    value={formData.Name}
                    onChange={(e) => setFormData(prev => ({ ...prev, Name: e.target.value }))}
                    className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                    required
                    placeholder="Введіть назву клієнта"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    🔢 Код
                  </label>
                  <input
                    type="text"
                    value={formData.Code}
                    onChange={(e) => setFormData(prev => ({ ...prev, Code: e.target.value }))}
                    className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                    placeholder="Внутрішній код клієнта"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    📍 Адреса
                  </label>
                  <input
                    type="text"
                    value={formData.Address}
                    onChange={(e) => setFormData(prev => ({ ...prev, Address: e.target.value }))}
                    className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                    placeholder="Адреса клієнта"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    📞 Телефон
                  </label>
                  <input
                    type="text"
                    value={formData.Phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, Phone: e.target.value }))}
                    className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                    placeholder="+380 XX XXX XX XX"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    📧 Email
                  </label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData(prev => ({ ...prev, Email: e.target.value }))}
                    className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    💰 Категорія цін
                  </label>
                  <select
                    value={formData.PriceCategoryID}
                    onChange={(e) => setFormData(prev => ({ ...prev, PriceCategoryID: e.target.value }))}
                    className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                  >
                    {priceCategories.map(cat => (
                      <option key={cat.ID} value={cat.ID}>
                        {cat.Name} {cat.IsDefault ? '(за замовчуванням)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="isVATPayer"
                      checked={formData.IsVATPayer}
                      onChange={(e) => setFormData(prev => ({ ...prev, IsVATPayer: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isVATPayer" className="ml-3 text-lg font-semibold text-gray-700">
                      🏢 Платник ПДВ
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={closeForm}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  ❌ Скасувати
                </button>
                <button
                  onClick={saveClient}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg"
                >
                  {editingClient ? '💾 Оновити' : '✅ Створити'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



