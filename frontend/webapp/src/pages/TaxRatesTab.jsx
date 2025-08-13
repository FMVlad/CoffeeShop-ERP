// src/components/TaxRatesTab.jsx

import React, { useEffect, useState } from "react";
import { api } from '../api';

export default function TaxRatesTab() {
  const [taxRates, setTaxRates] = useState([]);
  const [taxLoading, setTaxLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [editingTax, setEditingTax] = useState(null);
  const [showTaxForm, setShowTaxForm] = useState(false);
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

  // --- CRUD --- //
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
      <button onClick={handleTaxAdd} style={addBtnStyle}>+ Додати ставку</button>
      {(showTaxForm || editingTax) && (
        <div style={{
          background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001',
          padding: 32, marginBottom: 32, maxWidth: 600
        }}>
          <h3 style={{ marginBottom: 18, fontWeight: 700 }}>
            {editingTax ? 'Редагувати ставку податку' : 'Додати ставку податку'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontWeight: 500 }}>Рахунок:</label>
              <select
                value={(editingTax ? editingTax.AccountID : newTax.AccountID) || ""}
                onChange={e => handleTaxFormChange('AccountID', e.target.value)}
                style={inputStyle}
              >
                <option value="">Оберіть рахунок</option>
                {accounts.map(acc => (
                  <option key={acc.ID} value={acc.ID}>
                    {acc.Name} ({acc.AccountCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 500 }}>Податок:</label>
              <select
                value={(editingTax ? editingTax.TaxID : newTax.TaxID) || ""}
                onChange={e => {
                  const selectedTaxId = e.target.value;
                  // Автоматично підтягуємо ставку
                  const foundTax = taxes.find(t => t.ID == selectedTaxId);
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
                style={inputStyle}
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
              <label style={{ fontWeight: 500 }}>Ставка:</label>
              <input
                value={(editingTax ? editingTax.Rate : newTax.Rate) || ""}
                onChange={e => handleTaxFormChange('Rate', e.target.value)}
                style={inputStyle}
                type="number"
              />
            </div>
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={!!(editingTax ? editingTax.IsFixed : newTax.IsFixed)}
                  onChange={e => handleTaxFormChange('IsFixed', e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Фіксована сума
              </label>
            </div>
            {(editingTax?.IsFixed || newTax.IsFixed) && (
              <div>
                <label style={{ fontWeight: 500 }}>Валюта:</label>
                <select
                  value={(editingTax ? editingTax.CurrencyID : newTax.CurrencyID) || ""}
                  onChange={e => handleTaxFormChange('CurrencyID', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Оберіть валюту</option>
                  {currencies.map(cur => (
                    <option key={cur.ID} value={cur.ID}>{cur.Name}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500 }}>Дата початку:</label>
                <input value={(editingTax ? editingTax.DateFrom : newTax.DateFrom) || ""}
                  onChange={e => handleTaxFormChange('DateFrom', e.target.value)}
                  style={inputStyle} type="date" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500 }}>Дата завершення:</label>
                <input value={(editingTax ? editingTax.DateTo : newTax.DateTo) || ""}
                  onChange={e => handleTaxFormChange('DateTo', e.target.value)}
                  style={inputStyle} type="date" />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={handleTaxSubmit}
              style={formBtnStyle}>
              {editingTax ? 'Зберегти' : 'Додати'}
            </button>
            <button onClick={() => { setEditingTax(null); setShowTaxForm(false); }}
              style={cancelBtnStyle}>
              Відміна
            </button>
          </div>
        </div>
      )}
      {taxLoading ? <div>Завантаження...</div> :
        <table style={{
          width: "100%",
          background: "#fff",
          borderRadius: 14,
          borderCollapse: "separate",
          borderSpacing: 0,
          marginTop: 18,
          border: "2px solid #000"
        }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Рахунок</th>
              <th style={headerCellStyle}>Податок</th>
              <th style={headerCellStyle}>Ставка</th>
              <th style={headerCellStyle}>Фіксована</th>
              <th style={headerCellStyle}>Валюта</th>
              <th style={headerCellStyle}>Період дії</th>
              <th style={headerCellStyle}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {taxRates.map(tax => {
              const acc = accounts.find(a => a.ID === tax.AccountID);
              const taxObj = taxes.find(t => t.ID === tax.TaxID);
              const cur = currencies.find(c => c.ID === tax.CurrencyID);
              return (
                <tr key={tax.ID}>
                  <td style={cellStyle}>{acc ? `${acc.Name} (${acc.AccountCode})` : tax.AccountID}</td>
                  <td style={cellStyle}>{taxObj ? taxObj.Name : tax.TaxID}</td>
                  <td style={cellStyle}>{tax.Rate}{tax.IsFixed ? (cur ? ` ${cur.Name}` : " ₴") : "%"}</td>
                  <td style={cellStyle}>{tax.IsFixed ? "Так" : "Ні"}</td>
                  <td style={cellStyle}>{cur ? cur.Name : (tax.IsFixed ? "₴" : "")}</td>
                  <td style={cellStyle}>
                    {tax.DateFrom ? new Date(tax.DateFrom).toLocaleDateString() : ""}
                    {tax.DateTo ? ` — ${new Date(tax.DateTo).toLocaleDateString()}` : ""}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    <button onClick={() => handleTaxEdit(tax)} style={editBtnStyle}>✏️</button>
                    <button onClick={() => handleTaxDelete(tax.ID)} style={deleteBtnStyle}>🗑️</button>
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

// --- СТИЛІ --- //
const headerCellStyle = {
  background: "#e6d7fa",
  color: "#22105a",
  fontWeight: 700,
  fontSize: 17,
  padding: "14px 18px",
  border: "2px solid #000",
  textAlign: "left"
};
const cellStyle = {
  padding: "12px 18px",
  border: "2px solid #000",
  fontSize: 15,
  color: "#22105a",
  background: "#fff"
};
const inputStyle = {
  width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 16
};
const addBtnStyle = {
  background: "#208f41", color: "#fff", padding: "10px 28px",
  borderRadius: 10, fontSize: 18, border: "none", fontWeight: 700, cursor: "pointer",
  marginBottom: 12, boxShadow: "0 2px 8px #0001"
};
const editBtnStyle = {
  background: "#fff8c5",
  border: "2px solid #c0b31c",
  borderRadius: 8,
  color: "#856800",
  fontWeight: 700,
  padding: "6px 11px",
  marginRight: 8,
  fontSize: 19,
  cursor: "pointer"
};
const deleteBtnStyle = {
  background: "#ffe3e3",
  border: "2px solid #d64040",
  borderRadius: 8,
  color: "#d64040",
  fontWeight: 700,
  padding: "6px 11px",
  fontSize: 19,
  cursor: "pointer"
};
const formBtnStyle = {
  background: "#c4282d", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontWeight: 600, fontSize: 16
};
const cancelBtnStyle = {
  background: "#6c757d", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontWeight: 600, fontSize: 16, marginLeft: 12
};
