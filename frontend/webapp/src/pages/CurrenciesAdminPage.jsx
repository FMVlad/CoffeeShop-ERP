import React, { useEffect, useState } from 'react';
import { api } from '../api';

const CURRENCY_EMOJI = {
  USD: "🇺🇸", EUR: "🇪🇺", UAH: "🇺🇦", GBP: "🇬🇧", PLN: "🇵🇱", CZK: "🇨🇿", JPY: "🇯🇵", CNY: "🇨🇳"
};
const findById = (arr, id) => arr.find(x => String(x.ID) === String(id));

export default function CurrenciesAdminPage() {
  const [currencies, setCurrencies] = useState([]);
  const [currencyRates, setCurrencyRates] = useState([]);
  const [editCurrency, setEditCurrency] = useState(null);
  const [editRate, setEditRate] = useState(null);
  const [newCurrency, setNewCurrency] = useState({ CurrencyCode: '', Name: '', Symbol: '', IsActive: true });
  const [newRate, setNewRate] = useState({ CurrencyID: '', Rate: '', RateDate: '' });
  const [filter, setFilter] = useState({ currency_id: '', date_from: '', date_to: '' });

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
    api.getCurrencies().then(data => setCurrencies(Array.isArray(data) ? data : []));
  };
  const handleEditCurrency = (currency) => {
    setEditCurrency(currency);
    setNewCurrency(currency);
  };
  const handleUpdateCurrency = async () => {
    await api.updateCurrency(editCurrency.ID, newCurrency);
    setEditCurrency(null);
    setNewCurrency({ CurrencyCode: '', Name: '', Symbol: '', IsActive: true });
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
  };

  // Тут можна додати editRate / deleteRate так само як для валют

  return (
    <div style={{marginLeft: 240, padding: 32, maxWidth: 900}}>
      <h2 style={{fontSize: 24, marginBottom: 24}}>Валюти та курси</h2>

      {/* --- Валюти --- */}
      <div style={{marginBottom: 36, background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 1px 8px #eee'}}>
        <h3 style={{marginBottom: 8}}>Довідник валют</h3>
        <div style={{display: 'flex', gap: 12, marginBottom: 10}}>
          <input value={newCurrency.CurrencyCode} placeholder="Код" style={{width: 70, padding: 8}}
                 onChange={e => setNewCurrency({...newCurrency, CurrencyCode: e.target.value.toUpperCase()})} />
          <input value={newCurrency.Name} placeholder="Назва" style={{width: 120, padding: 8}}
                 onChange={e => setNewCurrency({...newCurrency, Name: e.target.value})} />
          <input value={newCurrency.Symbol} placeholder="Символ" style={{width: 60, padding: 8}}
                 onChange={e => setNewCurrency({...newCurrency, Symbol: e.target.value})} />
          <label style={{marginLeft: 8}}>
            <input type="checkbox" checked={newCurrency.IsActive} onChange={e => setNewCurrency({...newCurrency, IsActive: e.target.checked})}/>
            Активна
          </label>
          {editCurrency
            ? <>
                <button onClick={handleUpdateCurrency} style={{padding: '8px 18px', borderRadius: 8, background: '#b58900', color: '#fff'}}>Оновити</button>
                <button onClick={() => { setEditCurrency(null); setNewCurrency({ CurrencyCode: '', Name: '', Symbol: '', IsActive: true }); }} style={{marginLeft: 6}}>Скасувати</button>
              </>
            : <button onClick={handleAddCurrency} style={{padding: '8px 18px', borderRadius: 8, background: '#5ea97e', color: '#fff'}}>Додати валюту</button>
          }
        </div>
        <table style={{width: '100%', marginTop: 8, fontSize: 16, borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: '#f3f3f3'}}>
              <th>Емодзі</th>
              <th>Код</th><th>Назва</th><th>Символ</th><th>Активна</th><th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map(c => (
              <tr key={c.ID}>
                <td style={{ fontSize: 24 }}>{CURRENCY_EMOJI[c.CurrencyCode] || "💰"}</td>
                <td>{c.CurrencyCode}</td>
                <td>{c.Name}</td>
                <td>{c.Symbol}</td>
                <td>{c.IsActive ? "✅" : "❌"}</td>
                <td>
                  <button onClick={() => handleEditCurrency(c)} style={{marginRight: 8}}>✏️</button>
                  <button onClick={() => handleDeleteCurrency(c.ID)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Курси валют --- */}
      <div style={{background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 1px 8px #eee'}}>
        <h3 style={{marginBottom: 8}}>Курси валют</h3>
        <div style={{display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10}}>
          <select value={filter.currency_id} style={{padding: 8}} onChange={e => setFilter(f => ({ ...f, currency_id: e.target.value }))}>
            <option value="">Всі валюти</option>
            {currencies.map(c => <option key={c.ID} value={c.ID}>{c.CurrencyCode} — {c.Name}</option>)}
          </select>
          <input type="date" value={filter.date_from} onChange={e => setFilter(f => ({ ...f, date_from: e.target.value }))} style={{padding: 8}} />
          <input type="date" value={filter.date_to} onChange={e => setFilter(f => ({ ...f, date_to: e.target.value }))} style={{padding: 8}} />
        </div>
        <div style={{display: 'flex', gap: 12, marginBottom: 14}}>
          <select value={newRate.CurrencyID} style={{padding: 8}}
                  onChange={e => setNewRate(r => ({ ...r, CurrencyID: e.target.value }))}>
            <option value="">Валюта</option>
            {currencies.map(c => <option key={c.ID} value={c.ID}>{c.CurrencyCode}</option>)}
          </select>
          <input type="number" value={newRate.Rate} min={0} step="0.0001" placeholder="Курс" style={{padding: 8, width: 120}}
                 onChange={e => setNewRate(r => ({ ...r, Rate: e.target.value }))} />
          <input type="date" value={newRate.RateDate} style={{padding: 8}}
                 onChange={e => setNewRate(r => ({ ...r, RateDate: e.target.value }))} />
          <button onClick={handleAddRate} style={{padding: '8px 18px', borderRadius: 8, background: '#5ea97e', color: '#fff'}}>Додати курс</button>
        </div>
        <table style={{width: '100%', marginTop: 8, fontSize: 16, borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: '#f3f3f3'}}>
              <th>Валюта</th><th>Курс</th><th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {currencyRates.map(r => (
              <tr key={r.ID}>
                <td>{findById(currencies, r.CurrencyID)?.CurrencyCode || r.CurrencyID}</td>
                <td>{r.Rate}</td>
                <td>{r.RateDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
