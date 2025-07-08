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

  return (
    <div style={{
      background: 'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',
      minHeight: '100vh',
      width: '100vw',
      padding: '32px 0'
    }}>
      <div style={{ maxWidth: 950, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg,#7b6eea 0%,#a37c2d 100%)',
          borderRadius: 18,
          padding: '18px 32px',
          marginBottom: 32,
          boxShadow: '0 2px 12px #0001'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 32 }}>💱</span>
            <span style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 0.5
            }}>
              Валюти та курси
            </span>
          </div>
          <button
            onClick={() => window.location.assign('/webapp')}
            style={{
              background: '#e9ecef',
              color: '#333',
              border: 'none',
              borderRadius: 10,
              padding: '12px 32px',
              fontWeight: 700,
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #0002'
            }}
          >
            ← На головну
          </button>
        </div>

        {/* Валюти */}
        <div style={{
          marginBottom: 36,
          background: '#fff',
          padding: 28,
          borderRadius: 16,
          boxShadow: '0 4px 24px #0001'
        }}>
          <h3 style={{marginBottom: 14, fontWeight: 700, fontSize: 21}}>Довідник валют</h3>
          <div style={{display: 'flex', gap: 12, marginBottom: 18, alignItems:'center'}}>
            <input value={newCurrency.CurrencyCode} placeholder="Код" style={{width: 70, padding: 10, fontSize:17}}
                  onChange={e => setNewCurrency({...newCurrency, CurrencyCode: e.target.value.toUpperCase()})} />
            <input value={newCurrency.Name} placeholder="Назва" style={{width: 130, padding: 10, fontSize:17}}
                  onChange={e => setNewCurrency({...newCurrency, Name: e.target.value})} />
            <input value={newCurrency.Symbol} placeholder="Символ" style={{width: 70, padding: 10, fontSize:17}}
                  onChange={e => setNewCurrency({...newCurrency, Symbol: e.target.value})} />
            <label style={{marginLeft: 8, fontSize:16}}>
              <input type="checkbox" checked={newCurrency.IsActive} onChange={e => setNewCurrency({...newCurrency, IsActive: e.target.checked})}/>
              <span style={{marginLeft: 4}}>Активна</span>
            </label>
            {editCurrency
              ? <>
                  <button onClick={handleUpdateCurrency} style={{padding: '10px 20px', borderRadius: 8, background: '#b58900', color: '#fff', fontWeight:700, fontSize:17}}>Оновити</button>
                  <button onClick={() => { setEditCurrency(null); setNewCurrency({ CurrencyCode: '', Name: '', Symbol: '', IsActive: true }); }} style={{marginLeft: 6, fontSize:16}}>Скасувати</button>
                </>
              : <button onClick={handleAddCurrency} style={{padding: '10px 20px', borderRadius: 8, background: '#5ea97e', color: '#fff', fontWeight:700, fontSize:17}}>Додати валюту</button>
            }
          </div>
          <table style={{
            width: '100%',
            fontSize: 18,
            borderCollapse: 'separate',
            borderSpacing: 0,
            marginTop: 8,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 12px #0001'
          }}>
            <thead>
              <tr style={{background: '#ede7fb'}}>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:18}}>Емодзі</th>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:18}}>Код</th>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:18}}>Назва</th>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:18}}>Символ</th>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:18}}>Активна</th>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:18}}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map(c => (
                <tr key={c.ID} style={{background:'#f8f6ff'}}>
                  <td style={{ fontSize: 25, border: '1px solid #d1c4e9', textAlign: 'center' }}>{CURRENCY_EMOJI[c.CurrencyCode] || "💰"}</td>
                  <td style={{border: '1px solid #d1c4e9'}}>{c.CurrencyCode}</td>
                  <td style={{border: '1px solid #d1c4e9'}}>{c.Name}</td>
                  <td style={{border: '1px solid #d1c4e9'}}>{c.Symbol}</td>
                  <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>{c.IsActive ? "✅" : "❌"}</td>
                  <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>
                    <button onClick={() => handleEditCurrency(c)} style={{fontSize:22,marginRight:8}}>✏️</button>
                    <button onClick={() => handleDeleteCurrency(c.ID)} style={{fontSize:22}}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Курси валют */}
        <div style={{
          background: '#fff',
          padding: 28,
          borderRadius: 16,
          marginTop: 0,
          boxShadow: '0 4px 24px #0001'
        }}>
          <h3 style={{marginBottom: 14, fontWeight: 700, fontSize: 21}}>Курси валют</h3>
          <div style={{display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16}}>
            <select value={filter.currency_id} style={{padding: 10, fontSize:16}} onChange={e => setFilter(f => ({ ...f, currency_id: e.target.value }))}>
              <option value="">Всі валюти</option>
              {currencies.map(c => <option key={c.ID} value={c.ID}>{c.CurrencyCode} — {c.Name}</option>)}
            </select>
            <input type="date" value={filter.date_from} onChange={e => setFilter(f => ({ ...f, date_from: e.target.value }))} style={{padding: 10, fontSize:16}} />
            <input type="date" value={filter.date_to} onChange={e => setFilter(f => ({ ...f, date_to: e.target.value }))} style={{padding: 10, fontSize:16}} />
          </div>
          <div style={{display: 'flex', gap: 12, marginBottom: 16, alignItems:'center'}}>
            <select value={newRate.CurrencyID} style={{padding: 10, fontSize:16}}
                    onChange={e => setNewRate(r => ({ ...r, CurrencyID: e.target.value }))}>
              <option value="">Валюта</option>
              {currencies.map(c => <option key={c.ID} value={c.ID}>{c.CurrencyCode}</option>)}
            </select>
            <input type="number" value={newRate.Rate} min={0} step="0.0001" placeholder="Курс" style={{padding: 10, width: 120, fontSize:16}}
                  onChange={e => setNewRate(r => ({ ...r, Rate: e.target.value }))} />
            <input type="date" value={newRate.RateDate} style={{padding: 10, fontSize:16}}
                  onChange={e => setNewRate(r => ({ ...r, RateDate: e.target.value }))} />
            <button onClick={handleAddRate} style={{padding: '10px 20px', borderRadius: 8, background: '#5ea97e', color: '#fff', fontWeight:700, fontSize:17}}>Додати курс</button>
          </div>
          <table style={{
            width: '100%',
            fontSize: 18,
            borderCollapse: 'separate',
            borderSpacing: 0,
            borderRadius: 12,
            overflow: 'hidden',
            marginTop: 8,
            boxShadow: '0 2px 12px #0001'
          }}>
            <thead>
              <tr style={{background: '#ede7fb'}}>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:18}}>Валюта</th>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:18}}>Курс</th>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:18}}>Дата</th>
              </tr>
            </thead>
            <tbody>
              {currencyRates.map(r => (
                <tr key={r.ID} style={{background:'#f8f6ff'}}>
                  <td style={{border: '1px solid #d1c4e9'}}>
                    {findById(currencies, r.CurrencyID)?.CurrencyCode || r.CurrencyID}
                  </td>
                  <td style={{border: '1px solid #d1c4e9'}}>{r.Rate}</td>
                  <td style={{border: '1px solid #d1c4e9'}}>{r.RateDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
