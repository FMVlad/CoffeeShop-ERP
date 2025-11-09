import React, { useEffect, useState } from "react";
import { api } from '../api';

// --- Допоміжна функція для побудови відступного (плоского) списку рахунків з сортуванням по AccountCode ---
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

export default function AccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const emptyAccount = {
    AccountCode: "",
    Name: "",
    ParentID: null,
    AccountType: "",
    AccountPurpose: "",
    CurrencyID: null,
    IsActive: true,
    IsSystem: false,
    Notes: "",
  };
  const [newAccount, setNewAccount] = useState(emptyAccount);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = () => {
    setLoading(true);
    api.getChartOfAccounts().then(data => {
      setAccounts(data);
      setLoading(false);
    });
  };

  const handleFormChange = (key, value) => {
    if (editing) {
      setEditing({ ...editing, [key]: value });
    } else {
      setNewAccount({ ...newAccount, [key]: value });
    }
  };

  const handleAdd = (parentID = null) => {
    setEditing(null);
    setNewAccount({ ...emptyAccount, ParentID: parentID });
    setShowForm(true);
  };

  const handleEdit = (account) => {
    setEditing(account);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Видалити рахунок?")) {
      await api.deleteChartOfAccount(id);
      fetchAccounts();
    }
  };

  const handleSubmit = async () => {
    if (editing) {
      await api.updateChartOfAccount(editing.ID, editing);
    } else {
      await api.addChartOfAccount(newAccount);
    }
    setEditing(null);
    setShowForm(false);
    fetchAccounts();
  };

  // Плоский ієрархічний масив для select і для таблиці (відсортовано!)
  const indentedAccounts = getIndentedAccounts(accounts);

  // --- Рендер таблиці з відступами (без дерева!) ---
  function renderAccountsList() {
    if (indentedAccounts.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="text-center p-6 text-gray-500 italic border-2 border-black">
            Рахунків ще нема 🫠
          </td>
        </tr>
      );
    }
    return indentedAccounts.map(acc => (
      <tr key={acc.ID}>
        <td
          className="border-2 border-black py-3 px-4"
          style={{ paddingLeft: `${24 + acc._level * 28}px` }}
        >
          {acc._level > 0 ? "— ".repeat(acc._level) + "▶ " : ""}
          {acc.Name}
        </td>
        <td className="border-2 border-black py-3 px-4">{acc.AccountCode}</td>
        <td className="border-2 border-black py-3 px-4">{acc.AccountType}</td>
        <td className="border-2 border-black py-3 px-4">{acc.AccountPurpose}</td>
        <td className="border-2 border-black py-3 px-4">{acc.Notes}</td>
        <td className="border-2 border-black py-3 px-4 text-center">{acc.IsActive ? '✅' : ''}</td>
        <td className="border-2 border-black py-3 px-4 text-center">
          <button onClick={() => handleEdit(acc)} className="bg-yellow-200 border-2 border-yellow-400 rounded-md px-3 py-2 font-bold text-xl mr-2 hover:bg-yellow-300 transition-all">✏️</button>
          <button onClick={() => handleAdd(acc.ID)} className="bg-yellow-200 border-2 border-yellow-400 rounded-md px-3 py-2 font-bold text-xl mr-2 hover:bg-yellow-300 transition-all">➕</button>
          <button onClick={() => handleDelete(acc.ID)} className="bg-red-100 border-2 border-red-400 rounded-md px-3 py-2 font-bold text-xl hover:bg-red-200 transition-all">🗑️</button>
        </td>
      </tr>
    ));
  }

  return (
    <div>
      <button
        onClick={() => handleAdd(null)}
        className="bg-green-700 text-white px-6 py-2 rounded-lg text-lg font-bold mb-3 shadow hover:bg-green-800 transition-all"
      >
        + Додати рахунок
      </button>
      {(showForm || editing) && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-2xl mx-auto">
          <h3 className="mb-4 font-bold text-xl">{editing ? 'Редагувати рахунок' : 'Додати рахунок'}</h3>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="font-medium block mb-1">Назва рахунку:</label>
                <input value={(editing ? editing.Name : newAccount.Name) || ""}
                  onChange={e => handleFormChange('Name', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 text-base"
                />
              </div>
              <div className="flex-1">
                <label className="font-medium block mb-1">Код рахунку:</label>
                <input value={(editing ? editing.AccountCode : newAccount.AccountCode) || ""}
                  onChange={e => handleFormChange('AccountCode', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 text-base"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="font-medium block mb-1">Тип:</label>
                <input value={(editing ? editing.AccountType : newAccount.AccountType) || ""}
                  onChange={e => handleFormChange('AccountType', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 text-base"
                />
              </div>
              <div className="flex-1">
                <label className="font-medium block mb-1">Мета:</label>
                <input value={(editing ? editing.AccountPurpose : newAccount.AccountPurpose) || ""}
                  onChange={e => handleFormChange('AccountPurpose', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 text-base"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="font-medium block mb-1">Примітки:</label>
                <input value={(editing ? editing.Notes : newAccount.Notes) || ""}
                  onChange={e => handleFormChange('Notes', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 text-base"
                />
              </div>
            </div>
            <div className="flex items-center gap-6 mt-4 mb-2 flex-wrap">
              <span className="font-medium min-w-[90px]">Активний:</span>
              <input
                type="checkbox"
                checked={!!(editing ? editing.IsActive : newAccount.IsActive)}
                onChange={e => handleFormChange('IsActive', e.target.checked)}
                className="w-6 h-6 mr-2"
              />
              <span className="font-medium min-w-[120px]">Системний:</span>
              <input
                type="checkbox"
                checked={!!(editing ? editing.IsSystem : newAccount.IsSystem)}
                onChange={e => handleFormChange('IsSystem', e.target.checked)}
                className="w-6 h-6 mr-2"
              />
              <span className="font-medium min-w-[170px]">Батьківський рахунок:</span>
              {/* --- Ієрархічний селектор рахунків --- */}
              <select
                value={(editing ? editing.ParentID : newAccount.ParentID) ?? ""}
                onChange={e => handleFormChange('ParentID', e.target.value ? Number(e.target.value) : null)}
                className="min-w-[160px] max-w-[280px] w-full p-2 rounded border border-gray-300 text-base"
              >
                <option value="">Без батьківського рахунку</option>
                {getIndentedAccounts(
                  accounts,
                  null,
                  0,
                  editing ? editing.ID : null
                ).map(acc => (
                  <option key={acc.ID} value={acc.ID}>
                    {acc._level > 0 ? "— ".repeat(acc._level) + "▶ " : ""}
                    {acc.AccountCode ? `${acc.AccountCode} — ` : ""}
                    {acc.Name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={handleSubmit}
              className="bg-red-700 text-white rounded px-8 py-3 font-semibold text-base mr-4 hover:bg-red-800 transition-all">
              {editing ? 'Зберегти' : 'Додати'}
            </button>
            <button onClick={() => { setEditing(null); setShowForm(false); }}
              className="bg-gray-500 text-white rounded px-8 py-3 font-semibold text-base hover:bg-gray-700 transition-all">
              Відміна
            </button>
          </div>
        </div>
      )}
      {loading ? <div>Завантаження...</div> : (
        <table className="w-full border-separate border-spacing-0 bg-white rounded-xl shadow-lg mt-3 border-2 border-black">
          <thead>
            <tr>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Назва</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Код</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Тип</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Мета</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Примітки</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-center w-[110px]">Активний</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-center w-[170px]">Дії</th>
            </tr>
          </thead>
          <tbody>
            {renderAccountsList()}
          </tbody>
        </table>
      )}
    </div>
  );
}
