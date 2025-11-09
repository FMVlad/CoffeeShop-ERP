import React, { useEffect, useState } from "react";
import { api } from '../api';

// --- Єдина допоміжна функція для побудови ієрархічного списку рахунків з сортуванням по AccountCode ---
function getIndentedAccounts(accounts, parentId = null, level = 0, excludeId = null) {
  let result = [];
  accounts
    .filter(a => a.ParentID === parentId && a.ID !== excludeId)
    .sort((a, b) =>
      String(a.AccountCode).localeCompare(String(b.AccountCode), 'uk', { numeric: true })
    )
    .forEach(a => {
      result.push({ ...a, _level: level });
      result = result.concat(getIndentedAccounts(accounts, a.ID, level + 1, excludeId));
    });
  return result;
}

export default function TaxRatesTab() {
  const [taxRates, setTaxRates] = useState([]);
  const [taxLoading, setTaxLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [editingTax, setEditingTax] = useState(null);
  const [showTaxForm, setShowTaxForm] = useState(false);

  // Для додавання типу податку (довідник)
  const [showTaxDictForm, setShowTaxDictForm] = useState(false);
  const [newTaxDict, setNewTaxDict] = useState({ Name: "", TaxRate: "" });

  const emptyTaxRate = {
    AccountID: "",
    TaxID: "",
    Rate: "",
    DateFrom: "",
    DateTo: "",
    IsFixed: false,
    CurrencyID: "",
  };
  const [newTax, setNewTax] = useState(emptyTaxRate);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    setTaxLoading(true);
    Promise.all([
      api.getAccountTaxRates().then(setTaxRates),
      api.getChartOfAccounts().then(setAccounts),
      api.getTaxes().then(setTaxes),
      api.getCurrencies().then(setCurrencies),
    ]).finally(() => setTaxLoading(false));
  };

  // --- Довідник податків (типи) ---
  const handleTaxDictSubmit = async () => {
    await api.addTax(newTaxDict);
    setShowTaxDictForm(false);
    setNewTaxDict({ Name: "", TaxRate: "" });
    api.getTaxes().then(setTaxes); // Оновити список податків
  };

  // --- CRUD ставки податку ---
  const handleTaxFormChange = (key, value) => {
    if (editingTax) {
      setEditingTax({ ...editingTax, [key]: value });
    } else {
      setNewTax({ ...newTax, [key]: value });
    }
  };

  const handleTaxAdd = () => {
    setEditingTax(null);
    setNewTax(emptyTaxRate);
    setShowTaxForm(true);
  };

  const handleTaxEdit = (item) => {
    setEditingTax(item);
    setShowTaxForm(true);
  };

  const handleTaxDelete = async (id) => {
    if (window.confirm("Видалити ставку податку?")) {
      await api.deleteAccountTaxRate(id);
      fetchAll();
    }
  };

  const handleTaxSubmit = async () => {
    if (editingTax) {
      await api.updateAccountTaxRate(editingTax.ID, editingTax);
    } else {
      await api.addAccountTaxRate(newTax);
    }
    setShowTaxForm(false);
    setEditingTax(null);
    fetchAll();
  };

  return (
    <div>
      {/* --- Кнопка ДОДАТИ ПОДАТОК (довідник) --- */}
      <button
        onClick={() => setShowTaxDictForm(true)}
        className="bg-blue-700 text-white px-6 py-2 rounded-lg text-lg font-bold mb-3 shadow hover:bg-blue-800 transition-all mr-4"
      >
        + Додати податок
      </button>
      {/* --- Форма додавання типу податку --- */}
      {showTaxDictForm && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-xl mx-auto">
          <h3 className="mb-4 font-bold text-xl">Додати податок</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="font-medium block mb-1">Назва податку:</label>
              <input
                value={newTaxDict.Name}
                onChange={e => setNewTaxDict({ ...newTaxDict, Name: e.target.value })}
                className="w-full p-2 rounded border border-gray-300 text-base"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Ставка:</label>
              <input
                value={newTaxDict.TaxRate}
                onChange={e => setNewTaxDict({ ...newTaxDict, TaxRate: e.target.value })}
                type="number"
                className="w-full p-2 rounded border border-gray-300 text-base"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleTaxDictSubmit}
              className="bg-green-700 text-white rounded px-8 py-3 font-semibold text-base mr-4 hover:bg-green-800 transition-all"
            >Додати</button>
            <button
              onClick={() => setShowTaxDictForm(false)}
              className="bg-gray-500 text-white rounded px-8 py-3 font-semibold text-base hover:bg-gray-700 transition-all"
            >Відміна</button>
          </div>
        </div>
      )}

      {/* --- Кнопка додати ставку --- */}
      <button
        onClick={handleTaxAdd}
        className="bg-green-700 text-white px-6 py-2 rounded-lg text-lg font-bold mb-3 shadow hover:bg-green-800 transition-all"
      >
        + Додати ставку
      </button>

      {/* --- Форма додавання/редагування ставки податку --- */}
      {(showTaxForm || editingTax) && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-xl mx-auto">
          <h3 className="mb-4 font-bold text-xl">
            {editingTax ? 'Редагувати ставку податку' : 'Додати ставку податку'}
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="font-medium block mb-1">Рахунок:</label>
              <select
                value={(editingTax ? editingTax.AccountID : newTax.AccountID) || ""}
                onChange={e => handleTaxFormChange('AccountID', e.target.value)}
                className="w-full p-2 rounded border border-gray-300 text-base"
              >
                <option value="">Оберіть рахунок</option>
                {getIndentedAccounts(accounts).map(acc => (
                  <option key={acc.ID} value={acc.ID}>
                    {acc._level > 0 ? "— ".repeat(acc._level) + "▶ " : ""}
                    {acc.AccountCode ? `${acc.AccountCode} — ` : ""}
                    {acc.Name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Податок:</label>
              <select
                value={(editingTax ? editingTax.TaxID : newTax.TaxID) || ""}
                onChange={e => {
                  const selectedTaxId = e.target.value;
                  // Автоматично підтягуємо ставку
                  const foundTax = taxes.find(t => t.ID === selectedTaxId);
                  if (!editingTax && foundTax) {
                    setNewTax(nt => ({
                      ...nt,
                      TaxID: selectedTaxId,
                      Rate: foundTax.TaxRate
                    }));
                  } else if (editingTax && foundTax) {
                    setEditingTax(et => ({
                      ...et,
                      TaxID: selectedTaxId,
                      Rate: foundTax.TaxRate
                    }));
                  } else {
                    handleTaxFormChange('TaxID', selectedTaxId);
                  }
                }}
                className="w-full p-2 rounded border border-gray-300 text-base"
              >
                <option value="">Оберіть податок</option>
                {taxes.map(t => (
                  <option key={t.ID} value={t.ID}>
                    {t.Name} ({t.TaxRate}{t.IsFixed ? " ₴" : "%"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Ставка:</label>
              <input
                value={(editingTax ? editingTax.Rate : newTax.Rate) || ""}
                onChange={e => handleTaxFormChange('Rate', e.target.value)}
                className="w-full p-2 rounded border border-gray-300 text-base"
                type="number"
              />
            </div>
            <div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={!!(editingTax ? editingTax.IsFixed : newTax.IsFixed)}
                  onChange={e => handleTaxFormChange('IsFixed', e.target.checked)}
                  className="w-5 h-5 mr-2"
                />
                Фіксована сума
              </label>
            </div>
            {(editingTax?.IsFixed || newTax.IsFixed) && (
              <div>
                <label className="font-medium block mb-1">Валюта:</label>
                <select
                  value={(editingTax ? editingTax.CurrencyID : newTax.CurrencyID) || ""}
                  onChange={e => handleTaxFormChange('CurrencyID', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 text-base"
                >
                  <option value="">Оберіть валюту</option>
                  {currencies.map(cur => (
                    <option key={cur.ID} value={cur.ID}>{cur.Name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="font-medium block mb-1">Дата початку:</label>
                <input value={(editingTax ? editingTax.DateFrom : newTax.DateFrom) || ""}
                  onChange={e => handleTaxFormChange('DateFrom', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 text-base"
                  type="date" />
              </div>
              <div className="flex-1">
                <label className="font-medium block mb-1">Дата завершення:</label>
                <input value={(editingTax ? editingTax.DateTo : newTax.DateTo) || ""}
                  onChange={e => handleTaxFormChange('DateTo', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 text-base"
                  type="date" />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={handleTaxSubmit}
              className="bg-red-700 text-white rounded px-8 py-3 font-semibold text-base mr-4 hover:bg-red-800 transition-all">
              {editingTax ? 'Зберегти' : 'Додати'}
            </button>
            <button onClick={() => { setEditingTax(null); setShowTaxForm(false); }}
              className="bg-gray-500 text-white rounded px-8 py-3 font-semibold text-base hover:bg-gray-700 transition-all">
              Відміна
            </button>
          </div>
        </div>
      )}

      {/* --- Таблиця ставок --- */}
      {taxLoading ? <div>Завантаження...</div> :
        <table className="w-full bg-white rounded-xl border-separate border-spacing-0 mt-5 border-2 border-black shadow">
          <thead>
            <tr>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Рахунок</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Податок</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Ставка</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Фіксована</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Валюта</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Період дії</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-center">Дії</th>
            </tr>
          </thead>
          <tbody>
            {taxRates.map(tax => {
              const acc = accounts.find(a => a.ID === tax.AccountID);
              const taxObj = taxes.find(t => t.ID === tax.TaxID);
              const cur = currencies.find(c => c.ID === tax.CurrencyID);
              return (
                <tr key={tax.ID}>
                  <td className="border-2 border-black py-3 px-4">{acc ? `${acc.Name} (${acc.AccountCode})` : tax.AccountID}</td>
                  <td className="border-2 border-black py-3 px-4">{taxObj ? taxObj.Name : tax.TaxID}</td>
                  <td className="border-2 border-black py-3 px-4">{tax.Rate}{tax.IsFixed ? (cur ? ` ${cur.Name}` : " ₴") : "%"}</td>
                  <td className="border-2 border-black py-3 px-4">{tax.IsFixed ? "Так" : "Ні"}</td>
                  <td className="border-2 border-black py-3 px-4">{cur ? cur.Name : (tax.IsFixed ? "₴" : "")}</td>
                  <td className="border-2 border-black py-3 px-4">
                    {tax.DateFrom ? new Date(tax.DateFrom).toLocaleDateString() : ""}
                    {tax.DateTo ? ` — ${new Date(tax.DateTo).toLocaleDateString()}` : ""}
                  </td>
                  <td className="border-2 border-black py-3 px-4 text-center">
                    <button onClick={() => handleTaxEdit(tax)}
                      className="bg-yellow-200 border-2 border-yellow-400 rounded-md px-3 py-2 font-bold text-xl mr-2 hover:bg-yellow-300 transition-all">✏️</button>
                    <button onClick={() => handleTaxDelete(tax.ID)}
                      className="bg-red-100 border-2 border-red-400 rounded-md px-3 py-2 font-bold text-xl hover:bg-red-200 transition-all">🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      }
    </div>
  );
}
