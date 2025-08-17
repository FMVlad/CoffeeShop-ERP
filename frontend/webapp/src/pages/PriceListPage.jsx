import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

export default function PriceListPage() {
  const [products, setProducts] = useState([]);
  const [priceCategories, setPriceCategories] = useState([]);
  const [prices, setPrices] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [rounding, setRounding] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [selectAll, setSelectAll] = useState(false);
  const roundingOptions = [0.05, 0.25, 0.5, 1, 5, 10];

  useEffect(() => {
    api.getProducts && api.getProducts().then(data => {
      setProducts(Array.isArray(data) ? data : []);
    });
    api.getPriceCategories().then(setPriceCategories);
    api.getProductPrices().then(setPrices);
  }, []);

  const getPrice = (productId, priceCategoryId) => {
    const found = prices.find(p => p.ProductID === productId && p.PriceCategoryID === priceCategoryId);
    return found ? found.Price : '';
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',
      minHeight: '100vh',
      width: '100vw',
      padding: '32px 0'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Шапка */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg,#a78bfa 0%,#7b6eea 80%,#bfa463 100%)',
          borderRadius: 18,
          padding: '18px 32px',
          marginBottom: 32,
          boxShadow: '0 2px 12px #0001'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 32 }}>💰</span>
            <span style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 0.5
            }}>
              Прайс-лист
            </span>
          </div>
          <div style={{ display:'flex', gap: 10, alignItems:'center' }}>
            <select value={selectedCatId} onChange={e=>setSelectedCatId(e.target.value)} style={{ padding:'10px 12px', borderRadius:8 }}>
              <option value="">Категорія цін…</option>
              {priceCategories.map(pc => <option key={pc.ID} value={pc.ID}>{pc.CategoryName}</option>)}
            </select>
            <select value={rounding} onChange={e=>setRounding(Number(e.target.value))} style={{ padding:'10px 12px', borderRadius:8 }}>
              {roundingOptions.map(r => <option key={r} value={r}>Заокруглення: {r}</option>)}
            </select>
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
            <button
              onClick={async () => {
                try {
                  const priceCategoryId = Number(selectedCatId || (priceCategories[0]?.ID || 0));
                  if (!priceCategoryId) return alert('Оберіть категорію цін');
                  const payload = { price_category_id: priceCategoryId, rounding };
                  if (!selectAll && selected.size) {
                    payload.product_ids = Array.from(selected);
                  }
                  const res = await api.post('/product-prices/generate', null, payload);
                  alert(`Згенеровано: ${res.generated}`);
                  api.getProductPrices().then(setPrices);
                } catch (e) {
                  alert('Помилка генерації цін');
                }
              }}
              style={{
                background: '#00b894', color:'#fff', border:'none', borderRadius: 10,
                padding:'12px 20px', fontWeight:700, fontSize:16, cursor:'pointer', boxShadow:'0 2px 8px #0002'
              }}
            >Згенерувати ціни</button>
          </div>
        </div>
        {/* Таблиця */}
        <div style={{
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 4px 24px #0001',
          padding: 32
        }}>
          <div style={{ marginBottom: 10, display:'flex', alignItems:'center', gap: 12 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
              <input type="checkbox" checked={selectAll} onChange={e=>{ setSelectAll(e.target.checked); if (e.target.checked) setSelected(new Set()); }} />
              <span>Усі товари</span>
            </label>
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: 17,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#fff',
            boxShadow: '0 2px 12px #0001'
          }}>
            <thead>
              <tr style={{ background: '#ede7fb' }}>
                <th style={{ width: 40, textAlign:'center', borderBottom: '2.5px solid #a78bfa' }}>✓</th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderBottom: '2.5px solid #a78bfa',
                  fontWeight: 700,
                  fontSize: 18,
                  borderRight: '2px solid #a78bfa'
                }}>Назва товару</th>
                {priceCategories.map((cat, idx) => (
                  <th key={cat.ID} style={{
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderBottom: '2.5px solid #a78bfa',
                    fontWeight: 700,
                    fontSize: 18,
                    borderRight: (idx < priceCategories.length - 1) ? '2px solid #a78bfa' : 'none'
                  }}>{cat.CategoryName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(prod => {
                const checked = selectAll ? true : selected.has(prod.ID);
                return (
                <tr key={prod.ID} style={{ borderBottom: '1.7px solid #ede7fb' }}>
                  <td style={{ textAlign:'center', borderBottom: '1.7px solid #ede7fb' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e=>{
                        const c = e.target.checked;
                        setSelected(prev => {
                          const next = new Set(prev);
                          if (c) next.add(prod.ID); else next.delete(prod.ID);
                          return next;
                        })
                      }}
                      disabled={selectAll}
                    />
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    borderBottom: '1.7px solid #ede7fb',
                    minWidth: 220,
                    fontWeight: 500,
                    color: '#34395d',
                    borderRight: '2px solid #ede7fb'
                  }}>{prod.FullName || prod.Name}</td>
                  {priceCategories.map((cat, idx) => (
                    <td key={cat.ID} style={{
                      textAlign: 'center',
                      padding: '12px 16px',
                      borderBottom: '1.7px solid #ede7fb',
                      borderRight: (idx < priceCategories.length - 1) ? '2px solid #ede7fb' : 'none'
                    }}>
                      {getPrice(prod.ID, cat.ID)}
                    </td>
                  ))}
                </tr>
              )})}
              {!products.length && (
                <tr>
                  <td colSpan={1 + priceCategories.length} style={{ textAlign: 'center', padding: 30, color: '#bbb', fontSize: 18 }}>
                    Жодного товару ще не додано.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
