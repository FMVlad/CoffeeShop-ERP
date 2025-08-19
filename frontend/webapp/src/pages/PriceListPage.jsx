import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function PriceListPage() {
  const [products, setProducts] = useState([]);
  const [priceCategories, setPriceCategories] = useState([]);
  const [prices, setPrices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [rounding, setRounding] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [selectAll, setSelectAll] = useState(false);
  const roundingOptions = [0.05, 0.25, 0.5, 1, 5, 10];

  useEffect(() => {
    api.getPriceCategories().then(setPriceCategories);
    api.getCategories().then((arr) => setCategories(Array.isArray(arr) ? arr : []));
    api.getCenters().then((arr) => setCenters(Array.isArray(arr) ? arr : []));
    // initial load
    reloadProducts();
    reloadPrices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // on center change reload prices (affects selection of center-specific prices)
    reloadPrices();
    // do not auto-reload products on center change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const reloadProducts = async () => {
    if (!api.getProducts) return;
    const data = await api.getProducts(search, categoryId);
    setProducts(Array.isArray(data) ? data : []);
  };

  const reloadPrices = async () => {
    // враховуємо центр (для by_center моделі), якщо не вибрано — тягнемо глобальні
    const q = {};
    if (centerId !== '') q.center_id = Number(centerId) || 0;
    const data = await api.get('/product-prices', q);
    setPrices(Array.isArray(data) ? data : []);
  };

  const getPrice = (productId, priceCategoryId) => {
    // кандидати по товару та категорії і центру (спочатку вибраний центр, далі глобальні 0/NULL)
    const candidates = prices.filter(p =>
      p.ProductID === productId && p.PriceCategoryID === priceCategoryId &&
      (centerId === ''
        ? true // коли центр не обрано — показуємо будь-яку (потім виберемо найновішу)
        : (Number(p.CenterID || 0) === Number(centerId) || Number(p.CenterID || 0) === 0)
      )
    );
    if (!candidates.length) return '';
    // сортуємо: спочатку за пріоритетом центру (точний центр > глобальна), потім за датою початку, потім за ID
    const sorted = candidates.sort((a, b) => {
      const aCenterPriority = Number(centerId || 0) === Number(a.CenterID || 0) ? 1 : 0;
      const bCenterPriority = Number(centerId || 0) === Number(b.CenterID || 0) ? 1 : 0;
      if (aCenterPriority !== bCenterPriority) return bCenterPriority - aCenterPriority;
      const ad = a.DateStart ? new Date(a.DateStart).getTime() : 0;
      const bd = b.DateStart ? new Date(b.DateStart).getTime() : 0;
      if (ad !== bd) return bd - ad;
      return (b.ID || 0) - (a.ID || 0);
    });
    return sorted[0]?.Price ?? '';
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
          <div style={{ display:'flex', gap: 10, alignItems:'center', flexWrap:'wrap' }}>
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
                  if (centerId !== '') payload.center_id = Number(centerId) || 0;
                  if (!selectAll && selected.size) {
                    payload.product_ids = Array.from(selected);
                  }
                  const res = await api.post('/product-prices/generate', null, payload);
                  alert(`Згенеровано: ${res.generated}`);
                  await reloadPrices();
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
          <CategorySelectStyles />
          {/* Фільтри над таблицею (як у стані складу) */}
          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 2fr 1fr 1fr 1fr 140px', gap: 10, marginBottom: 16, alignItems:'center' }}>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              onKeyDown={(e)=>{ if (e.key === 'Enter') { reloadProducts(); reloadPrices(); } }}
              placeholder="Пошук: назва / ШК / артикул"
              style={{ padding:'10px 12px', borderRadius:8 }}
            />
            <div>
              <CategorySelectTree categories={categories} value={categoryId} onChange={setCategoryId} />
            </div>
            <select value={centerId} onChange={e=>setCenterId(e.target.value)} style={{ padding:'10px 12px', borderRadius:8 }}>
              <option value="">Центр обліку (усі/глобальні)</option>
              {centers.map(c => (
                <option key={c.ID} value={c.ID}>{c.Name}</option>
              ))}
            </select>
            <select value={selectedCatId} onChange={e=>setSelectedCatId(e.target.value)} style={{ padding:'10px 12px', borderRadius:8 }}>
              <option value="">Категорія цін…</option>
              {priceCategories.map(pc => <option key={pc.ID} value={pc.ID}>{pc.CategoryName}</option>)}
            </select>
            <select value={rounding} onChange={e=>setRounding(Number(e.target.value))} style={{ padding:'10px 12px', borderRadius:8 }}>
              {roundingOptions.map(r => <option key={r} value={r}>Заокруглення: {r}</option>)}
            </select>
            <button
              onClick={async ()=>{ await reloadProducts(); await reloadPrices(); }}
              style={{
                background: '#00b894',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 18px',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(0,0,0,0.12)'
              }}
            >🔄 Оновити</button>
          </div>
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

// Компонент вибору категорії як у стані складу
function CategorySelectTree({ categories, value, onChange }) {
  const flat = React.useMemo(() => {
    const result = [];
    const children = new Map();
    (categories||[]).forEach(c => {
      const pid = c.ParentID == null ? null : c.ParentID;
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid).push(c);
    });
    for (const arr of children.values()) arr.sort((a,b)=>String(a.CategoryName||a.Name||'').localeCompare(String(b.CategoryName||b.Name||'')));
    const walk = (pid, level) => {
      (children.get(pid) || []).forEach(c => {
        result.push({ ...c, _level: level });
        walk(c.ID, level + 1);
      });
    };
    walk(null, 0);
    if (children.has(0)) children.get(0).forEach(c => result.push({ ...c, _level: 0 }));
    return result;
  }, [categories]);

  return (
    <select value={value} onChange={e=>onChange(e.target.value)} className="category-select">
      <option value="">Всі категорії</option>
      {flat.map(c => (
        <option key={c.ID} value={c.ID}>{`${'— '.repeat(c._level||0)}${c._level>0?'▶ ':''}${c.CategoryName||c.Name}`}</option>
      ))}
    </select>
  );
}

function CategorySelectStyles(){
  return (
    <style>{`
      .category-select { padding: 10px 12px; border-radius: 8px; border: 1px solid #ddd; width: 100%; }
      .category-select option { padding: 6px 8px; }
    `}</style>
  );
}
