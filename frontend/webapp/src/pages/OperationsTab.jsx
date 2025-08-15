import React, { useEffect, useState } from "react";
import { api } from "../api";

// --- Допоміжна функція для побудови ієрархічного (відступного) списку рахунків з сортуванням по AccountCode ---
function getIndentedAccounts(accounts, parentId = null, level = 0) {
  let result = [];
  accounts
    .filter(a => a.ParentID === parentId)
    .sort((a, b) =>
      String(a.AccountCode).localeCompare(String(b.AccountCode), 'uk', { numeric: true })
    )
    .forEach(a => {
      result.push({
        ...a,
        indent: level
      });
      result = result.concat(getIndentedAccounts(accounts, a.ID, level + 1));
    });
  return result;
}

export default function TypicalOperationsTab() {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOperation, setEditingOperation] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [entries, setEntries] = useState([]);

  const emptyOperation = {
    Name: "",
    Description: "",
    IsActive: true,
  };
  const [newOperation, setNewOperation] = useState(emptyOperation);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.getTypicalOperations().then(setOperations),
      api.getChartOfAccounts().then(setAccounts),
      api.getAccountTaxRates().then(setTaxRates),
    ]).finally(() => setLoading(false));
  };

  // --- Ієрархічний список рахунків для селекторів з правильним сортуванням! ---
  const indentedAccounts = getIndentedAccounts(accounts);

  // CRUD операцій
  const handleAdd = () => {
    setEditingOperation(null);
    setNewOperation(emptyOperation);
    setEntries([]);
    setShowForm(true);
  };

  const handleEdit = (operation) => {
    setEditingOperation(operation);
    setNewOperation(operation);
    api.getTypicalOperationEntries(operation.ID).then(setEntries);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Видалити цю типову операцію?")) {
      await api.deleteTypicalOperation(id);
      fetchAll();
    }
  };

  const handleSubmit = async () => {
    let opId;
    if (editingOperation) {
      await api.updateTypicalOperation(editingOperation.ID, newOperation);
      opId = editingOperation.ID;
    } else {
      const res = await api.addTypicalOperation(newOperation);
      opId = res.id || res.ID;
    }
    await api.saveTypicalOperationEntries(opId, entries);
    setShowForm(false);
    fetchAll();
  };

  // CRUD проводок
  const handleAddEntry = () =>
    setEntries([
      ...entries,
      { CreditAccountID: "", DebitAccountID: "", AmountType: "", Notes: "" }
    ]);

  // === ОСНОВНИЙ ФІКС ===
  const handleEntryChange = (idx, key, val) => {
    setEntries((e) => {
      const copy = [...e];
      copy[idx][key] = val;

      // Автоматично підставляти ставку лише по ДЕБЕТУ (бо в 99% так)
      if (key === "DebitAccountID") {
        const rates = taxRates.filter(tr => String(tr.AccountID) === String(val));
        copy[idx].AmountType = (rates.length === 1) ? (rates[0].Rate + (rates[0].IsFixed ? " ₴" : "%")) : "";
      }
      if (key === "AmountType") {
        copy[idx].AmountType = val;
      }
      return copy;
    });
  };

  const handleEntryDelete = (idx) => setEntries(entries.filter((_, i) => i !== idx));

  // Довідник рахунків (ID → Name/Code)
  const accountName = (id) => {
    const a = accounts.find(acc => String(acc.ID) === String(id));
    return a ? `${a.Name} (${a.AccountCode})` : "";
  };

  return (
    <div>
      <button
        onClick={handleAdd}
        className="bg-purple-700 text-white px-6 py-2 rounded-lg text-lg font-bold mb-3 shadow hover:bg-purple-800 transition-all"
      >
        + Додати операцію
      </button>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-3xl mx-auto">
          <h3 className="mb-4 font-bold text-xl">
            {editingOperation ? "Редагувати операцію" : "Додати типову операцію"}
          </h3>
          <div className="flex flex-col gap-4">
            <input value={newOperation.Name} onChange={e => setNewOperation({ ...newOperation, Name: e.target.value })} placeholder="Назва" className="p-2 rounded border" />
            <input value={newOperation.Description} onChange={e => setNewOperation({ ...newOperation, Description: e.target.value })} placeholder="Опис" className="p-2 rounded border" />
            <label className="inline-flex items-center">
              <input type="checkbox" checked={!!newOperation.IsActive}
                onChange={e => setNewOperation({ ...newOperation, IsActive: e.target.checked })}
                className="w-5 h-5 mr-2" />
              Активна
            </label>
          </div>
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Проводки:</h4>
            {entries.map((entry, idx) => {
              // Ставки лише по ДЕБЕТУ (AccountID === DebitAccountID)
              const debitRates = taxRates.filter(tr => String(tr.AccountID) === String(entry.DebitAccountID));

              return (
                <div key={idx} className="flex gap-2 items-center mb-2">
                  {/* КРЕДИТ → ДЕБЕТ */}
                  <select
                    value={entry.CreditAccountID}
                    onChange={e => handleEntryChange(idx, 'CreditAccountID', e.target.value)}
                    className="p-2 border rounded min-w-[180px]"
                  >
                    <option value="">Кредит</option>
                    {indentedAccounts.map(a => (
                      <option key={a.ID} value={a.ID}>
                        {"\u00A0".repeat(a.indent * 3)}
                        {a.AccountCode} — {a.Name}
                      </option>
                    ))}
                  </select>
                  <span className="font-bold text-xl">→</span>
                  <select
                    value={entry.DebitAccountID}
                    onChange={e => handleEntryChange(idx, 'DebitAccountID', e.target.value)}
                    className="p-2 border rounded min-w-[180px]"
                  >
                    <option value="">Дебет</option>
                    {indentedAccounts.map(a => (
                      <option key={a.ID} value={a.ID}>
                        {"\u00A0".repeat(a.indent * 3)}
                        {a.AccountCode} — {a.Name}
                      </option>
                    ))}
                  </select>
                  {/* Ставка — якщо є хоч одна для дебету */}
                  {debitRates.length > 0 ? (
                    <select
                      value={entry.AmountType}
                      onChange={e => handleEntryChange(idx, 'AmountType', e.target.value)}
                      className="p-2 border rounded w-32"
                    >
                      <option value="">Ставка</option>
                      {debitRates.map(rate => (
                        <option key={rate.ID} value={rate.Rate + (rate.IsFixed ? " ₴" : "%")}>
                          {rate.Rate}{rate.IsFixed ? " ₴" : "%"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={entry.AmountType}
                      onChange={e => handleEntryChange(idx, 'AmountType', e.target.value)}
                      placeholder="Ставка/тип"
                      className="p-2 border rounded w-32"
                    />
                  )}
                  <input value={entry.Notes} onChange={e => handleEntryChange(idx, 'Notes', e.target.value)} placeholder="Примітка" className="p-2 border rounded w-32" />
                  <button onClick={() => handleEntryDelete(idx)} className="bg-red-400 text-white rounded px-2 py-1 ml-2">✕</button>
                </div>
              );
            })}
            <button onClick={handleAddEntry} className="bg-blue-700 text-white rounded px-3 py-1 mt-2">+ Додати проводку</button>
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={handleSubmit}
              className="bg-green-700 text-white rounded px-8 py-3 font-semibold text-base mr-4 hover:bg-green-800 transition-all">
              Зберегти
            </button>
            <button onClick={() => setShowForm(false)}
              className="bg-gray-500 text-white rounded px-8 py-3 font-semibold text-base hover:bg-gray-700 transition-all">
              Відміна
            </button>
          </div>
        </div>
      )}

      {/* Таблиця типових операцій */}
      <div className="overflow-x-auto mt-5">
        <table className="w-full bg-white rounded-xl border-separate border-spacing-0 border-2 border-black shadow">
          <thead>
            <tr>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Назва</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Опис</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Проводки</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-left">Статус</th>
              <th className="bg-[#e6d7fa] text-[#22105a] font-bold text-lg p-4 border-2 border-black text-center">Дії</th>
            </tr>
          </thead>
          <tbody>
            {operations.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-6 text-gray-500 italic border-2 border-black">Операцій ще нема 🫠</td>
              </tr>
            ) : operations.map((op, i) => (
              <tr key={op.ID}>
                <td className="border-2 border-black py-3 px-4">{op.Name}</td>
                <td className="border-2 border-black py-3 px-4">{op.Description}</td>
                <td className="border-2 border-black py-3 px-4">
                  {op.Entries && op.Entries.length > 0 ? op.Entries.map((en, j) => (
                    <div key={j}>
                      {accountName(en.CreditAccountID)} → {accountName(en.DebitAccountID)}
                      {en.AmountType ? ` [${en.AmountType}]` : ""}
                      {en.Notes && ` (${en.Notes})`}
                    </div>
                  )) : "—"}
                </td>
                <td className="border-2 border-black py-3 px-4">{op.IsActive ? "✅" : "❌"}</td>
                <td className="border-2 border-black py-3 px-4 text-center">
                  <button onClick={() => handleEdit(op)}
                    className="bg-yellow-200 border-2 border-yellow-400 rounded-md px-3 py-2 font-bold text-xl mr-2 hover:bg-yellow-300 transition-all">✏️</button>
                  <button onClick={() => handleDelete(op.ID)}
                    className="bg-red-100 border-2 border-red-400 rounded-md px-3 py-2 font-bold text-xl hover:bg-red-200 transition-all">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
