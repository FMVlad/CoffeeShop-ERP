import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const CURRENCY_EMOJI = {
  USD: "🇺🇸", EUR: "🇪🇺", UAH: "🇺🇦", GBP: "🇬🇧", PLN: "🇵🇱", CZK: "🇨🇿", JPY: "🇯🇵", CNY: "🇨🇳"
};
const findById = (arr, id) => arr.find(x => String(x.ID) === String(id));

export default function CurrenciesAdminPage() {
  const [currencies, setCurrencies] = useState([]);
  const [currencyRates, setCurrencyRates] = useState([]);
  const [editCurrency, setEditCurrency] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ CurrencyCode: '', Name: '', Symbol: '', IsActive: true });
  const [newRate, setNewRate] = useState({ CurrencyID: '', Rate: '', RateDate: '' });
  const [filter, setFilter] = useState({ currency_id: '', date_from: '', date_to: '' });
  const navigate = useNavigate();

  useEffect(() => {
    api.getCurrencies().then(data => setCurrencies(Array.isArray(data) ? data : []));
  }, []);
  useEffect(() => {
    let params = [];
    if (filter.currency_id) params.push('currency_id=' + filter.currency_id);
    if (filter.date_from) params.push('date_from=' + filter.date_from);
    if (filter.date_to) params.push('date_to=' + filter.date_to);
    const qs = params.length ? '?' + params.join('&') : '';
    api.getCurrencyRates(qs).then(data => setCurrencyRates(Array.isArray(data) ? data : []));
  }, [filter]);

  const handleAddCurrency = async () => {
    if (!newCurrency.CurrencyCode.trim() || !newCurrency.Name.trim()) return;
    await api.addCurrency(newCurrency);
    setNewCurrency({ CurrencyCode: '', Name: '', Symbol: '', IsActive: true });
    setShowForm(false);
    api.getCurrencies().then(data => setCurrencies(Array.isArray(data) ? data : []));
  };
  const handleEditCurrency = (currency) => {
    setEditCurrency(currency);
    setNewCurrency(currency);
    setShowForm(false);
  };
  const handleUpdateCurrency = async () => {
    await api.updateCurrency(editCurrency.ID, newCurrency);
    setEditCurrency(null);
    setNewCurrency({ CurrencyCode: '', Name: '', Symbol: '', IsActive: true });
    setShowForm(false);
    api.getCurrencies().then(setCurrencies);
  };
  const handleDeleteCurrency = async (id) => {
    if (window.confirm("Видалити валюту?")) {
      await api.deleteCurrency(id);
      api.getCurrencies().then(setCurrencies);
    }
  };

  const handleAddRate = async () => {
    if (!newRate.CurrencyID || !newRate.Rate || !newRate.RateDate) return;
    await api.addCurrencyRate(newRate);
    setNewRate({ CurrencyID: '', Rate: '', RateDate: '' });
    setFilter(f => ({ ...f, currency_id: newRate.CurrencyID }));
    setShowRateForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 flex flex-col">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              💱 Валюти та курси
            </h1>
            <p className="text-2xl text-yellow-100">
              Управління валютами та курсами обміну
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
            onClick={() => { setShowForm(true); setEditCurrency(null); setNewCurrency({ CurrencyCode: '', Name: '', Symbol: '', IsActive: true }); }}
            className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Додати валюту
          </button>
        </div>

        {/* Форма додавання/редагування валюти */}
        {(showForm || editCurrency) && (
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-yellow-200 mb-12 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 px-8 py-6 border-b-2 border-yellow-200">
              <h3 className="text-3xl font-bold text-yellow-800">
                {editCurrency ? '✏️ Редагувати валюту' : '✨ Додати валюту'}
              </h3>
            </div>
            <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Код валюти *
                  </label>
                  <input
                    type="text"
                    value={newCurrency.CurrencyCode}
                    onChange={e => setNewCurrency({ ...newCurrency, CurrencyCode: e.target.value })}
                    className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                    placeholder="USD, EUR, UAH..."
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Назва валюти *
                  </label>
                  <input
                    type="text"
                    value={newCurrency.Name}
                    onChange={e => setNewCurrency({ ...newCurrency, Name: e.target.value })}
                    className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                    placeholder="Долар США, Євро, Гривня..."
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Символ
                  </label>
                  <input
                    type="text"
                    value={newCurrency.Symbol}
                    onChange={e => setNewCurrency({ ...newCurrency, Symbol: e.target.value })}
                    className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                    placeholder="$, €, ₴..."
                  />
                </div>
                <div className="flex items-center gap-4 pt-8">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newCurrency.IsActive}
                    onChange={e => setNewCurrency({ ...newCurrency, IsActive: e.target.checked })}
                    className="w-6 h-6 text-yellow-600 border-2 border-gray-300 rounded-lg focus:ring-yellow-500 focus:ring-2"
                  />
                  <label htmlFor="isActive" className="text-lg font-semibold text-gray-700">
                    Активна валюта
                  </label>
                </div>
              </div>

              {/* Кнопки форми */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end mt-10 pt-8 border-t-2 border-yellow-100">
                <button
                  onClick={() => {
                    setEditCurrency(null);
                    setShowForm(false);
                    setNewCurrency({ CurrencyCode: '', Name: '', Symbol: '', IsActive: true });
                  }}
                  className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  ❌ Скасувати
                </button>
                <button
                  onClick={editCurrency ? handleUpdateCurrency : handleAddCurrency}
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  💾 {editCurrency ? 'Зберегти' : 'Додати'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблиця валют */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-yellow-200 mb-12 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 px-8 py-6 border-b-2 border-yellow-200">
            <h3 className="text-2xl font-bold text-yellow-800">
              📋 Список валют ({currencies.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-yellow-100 to-amber-100">
                <tr>
                  <th className="px-8 py-4 text-left text-lg font-bold text-yellow-800">Код</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-yellow-800">Назва</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-yellow-800">Символ</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-yellow-800">Статус</th>
                  <th className="px-8 py-4 text-center text-lg font-bold text-yellow-800">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-yellow-50">
                {currencies.map((currency) => (
                  <tr key={currency.ID} className="hover:bg-yellow-50 transition-colors duration-200">
                    <td className="px-8 py-4 text-lg font-semibold text-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{CURRENCY_EMOJI[currency.CurrencyCode] || '💱'}</span>
                        <span className="font-mono">{currency.CurrencyCode}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-lg text-gray-600">
                      {currency.Name}
                    </td>
                    <td className="px-8 py-4 text-lg text-gray-600 font-mono">
                      {currency.Symbol || '-'}
                    </td>
                    <td className="px-8 py-4 text-lg">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        currency.IsActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {currency.IsActive ? '✅ Активна' : '❌ Неактивна'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleEditCurrency(currency)}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCurrency(currency.ID)}
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

        {/* Форма додавання курсу валют */}
        {showRateForm && (
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-yellow-200 mb-12 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 px-8 py-6 border-b-2 border-yellow-200">
              <h3 className="text-3xl font-bold text-yellow-800">
                📈 Додати курс валют
              </h3>
            </div>
            <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Валюта *
                  </label>
                  <select
                    value={newRate.CurrencyID}
                    onChange={e => setNewRate({ ...newRate, CurrencyID: e.target.value })}
                    className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                  >
                    <option value="">Виберіть валюту</option>
                    {currencies.map(c => (
                      <option key={c.ID} value={c.ID}>
                        {CURRENCY_EMOJI[c.CurrencyCode] || '💱'} {c.CurrencyCode} - {c.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Курс *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newRate.Rate}
                    onChange={e => setNewRate({ ...newRate, Rate: e.target.value })}
                    className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Дата курсу *
                  </label>
                  <input
                    type="date"
                    value={newRate.RateDate}
                    onChange={e => setNewRate({ ...newRate, RateDate: e.target.value })}
                    className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                  />
                </div>
              </div>

              {/* Кнопка додавання курсу */}
              <div className="flex gap-4 justify-end mt-8">
                <button
                  onClick={() => {
                    setShowRateForm(false);
                    setNewRate({ CurrencyID: '', Rate: '', RateDate: '' });
                  }}
                  className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-6 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  ❌ Скасувати
                </button>
                <button
                  onClick={handleAddRate}
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  💾 Додати курс
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблиця курсів валют */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-yellow-200 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 px-8 py-6 border-b-2 border-yellow-200">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-yellow-800">
                📊 Курси валют ({currencyRates.length})
              </h3>
              <button
                onClick={() => { setShowRateForm(true); setNewRate({ CurrencyID: '', Rate: '', RateDate: '' }); }}
                className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-3 rounded-xl font-bold text-base hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
              >
                📈 + Додати курс
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-yellow-100 to-amber-100">
                <tr>
                  <th className="px-8 py-4 text-left text-lg font-bold text-yellow-800">Валюта</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-yellow-800">Курс</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-yellow-800">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-yellow-50">
                {currencyRates.map((rate) => {
                  const currency = findById(currencies, rate.CurrencyID);
                  return (
                    <tr key={rate.ID} className="hover:bg-yellow-50 transition-colors duration-200">
                      <td className="px-8 py-4 text-lg font-semibold text-gray-800">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {currency ? CURRENCY_EMOJI[currency.CurrencyCode] || '💱' : '💱'}
                          </span>
                          <span className="font-mono">
                            {currency ? `${currency.CurrencyCode} - ${currency.Name}` : 'Невідома валюта'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-lg text-gray-600 font-mono">
                        {rate.Rate}
                      </td>
                      <td className="px-8 py-4 text-lg text-gray-600">
                        {new Date(rate.RateDate).toLocaleDateString('uk-UA')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Футер */}
      <footer className="mt-auto border-t-2 border-yellow-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-center gap-6">
          <div className="text-center">
            <span className="text-2xl font-bold text-yellow-800 tracking-wide">
              💱 Валюти VYSHNIA
            </span>
            <p className="text-yellow-600 text-base mt-1">
              Система управління валютами та курсами
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
