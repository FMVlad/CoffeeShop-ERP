import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import CategorySelectTree, { CategorySelectStyles } from '../components/CategorySelectTree';

export default function PriceListPage() {
  const navigate = useNavigate();
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
  const [showApplyDiscModal, setShowApplyDiscModal] = useState(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const roundingOptions = [0.05, 0.25, 0.5, 1, 5, 10];

  useEffect(() => {
    api.getPriceCategories().then(data => {
      console.log('🔍 PriceListPage: Отримано категорії цін:', data);
      console.log('🔍 PriceListPage: Тип даних:', typeof data);
      console.log('🔍 PriceListPage: Чи є масивом:', Array.isArray(data));
      // API повертає масив безпосередньо
      setPriceCategories(Array.isArray(data) ? data : []);
    }).catch(error => {
      console.error('❌ PriceListPage: Помилка завантаження категорій цін:', error);
      setPriceCategories([]);
    });
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

  const pickPriceRow = (productId, priceCategoryId) => {
    const candidates = prices.filter(p =>
      p.ProductID === productId && p.PriceCategoryID === priceCategoryId &&
      (centerId === ''
        ? true
        : (Number(p.CenterID || 0) === Number(centerId) || Number(p.CenterID || 0) === 0)
      )
    );
    if (!candidates.length) return null;
    const sorted = candidates.sort((a, b) => {
      const aCenterPriority = Number(centerId || 0) === Number(a.CenterID || 0) ? 1 : 0;
      const bCenterPriority = Number(centerId || 0) === Number(b.CenterID || 0) ? 1 : 0;
      if (aCenterPriority !== bCenterPriority) return bCenterPriority - aCenterPriority;
      const ad = a.DateStart ? new Date(a.DateStart).getTime() : 0;
      const bd = b.DateStart ? new Date(b.DateStart).getTime() : 0;
      if (ad !== bd) return bd - ad;
      return (b.ID || 0) - (a.ID || 0);
    });
    return sorted[0] || null;
  };

  const getPrice = (productId, priceCategoryId) => pickPriceRow(productId, priceCategoryId)?.Price ?? '';
  const getDiscounted = (productId, priceCategoryId) => pickPriceRow(productId, priceCategoryId)?.PriceWithDiscount ?? '';
  const getPriceDateEnd = (productId, priceCategoryId) => pickPriceRow(productId, priceCategoryId)?.DateEnd ?? null;

  const hasDiscountByCategory = (catId) => {
    return prices.some(p => p.PriceCategoryID === catId &&
      (centerId === '' ? true : (Number(p.CenterID||0)===Number(centerId) || Number(p.CenterID||0)===0)) &&
      p.PriceWithDiscount != null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              💰 Прайс-лист
            </h1>
            <p className="text-2xl text-violet-100">
              Управління цінами та знижками товарів
            </p>
          </div>
        </div>

        {/* Кнопки управління */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/stock")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              ← Назад до складів
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              🏠 На головну
            </button>
          </div>
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
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ Згенерувати ціни
          </button>
        </div>
        <CategorySelectStyles />
        {/* Сітка 2x3 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(260px, 1fr))', gap: 10, rowGap: 10, marginBottom: 16, alignItems:'center' }}>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            onKeyDown={(e)=>{ if (e.key === 'Enter') { reloadProducts(); reloadPrices(); } }}
            placeholder="Пошук: назва / ШК / артикул"
            style={{ padding:'10px 12px', borderRadius:8 }}
          />
          <div><CategorySelectTree categories={categories} value={categoryId} onChange={setCategoryId} /></div>
          <select value={centerId} onChange={e=>setCenterId(e.target.value)} style={{ padding:'10px 12px', borderRadius:8, minWidth:220 }}>
            <option value="">Центр обліку (усі/глобальні)</option>
            {centers.map(c => (
              <option key={c.ID} value={c.ID}>{c.Name}</option>
            ))}
          </select>
                      <select value={selectedCatId} onChange={e=>setSelectedCatId(e.target.value)} style={{ padding:'10px 12px', borderRadius:8, minWidth:220 }}>
              <option value="">Категорія цін…</option>
              {priceCategories.map(pc => <option key={pc.ID} value={pc.ID}>{pc.Name}</option>)}
            </select>
          <select value={rounding} onChange={e=>setRounding(Number(e.target.value))} style={{ padding:'10px 12px', borderRadius:8, minWidth:180 }}>
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
          <button
            onClick={()=>setShowApplyDiscModal(true)}
            style={{
              background: '#28a745', color:'#fff', border:'none', borderRadius: 10,
              padding:'12px 18px', fontWeight:800, fontSize:14, cursor:'pointer', boxShadow:'0 3px 10px rgba(0,0,0,0.12)'
            }}
          >Розрахувати і записати знижку</button>
          {!!selected.size && (
            <button
              onClick={async()=>{
                try{
                  const pcid = Number(selectedCatId || (priceCategories[0]?.ID || 0));
                  if (!pcid) return alert('Оберіть категорію цін');
                  const pids = Array.from(selected);
                  const today = new Date().toISOString().slice(0,10);
                  const payload = { price_category_id: pcid, product_ids: pids, active_on: today, date_end: today };
                  if (centerId !== '') payload.center_id = Number(centerId) || 0;
                  const res = await api.clearDiscounts(payload);
                  alert(`Знято знижку у записах: ${res.cleared}`);
                  await reloadPrices();
                }catch(e){ alert('Помилка зняття знижки'); }
              }}
              style={{ background:'#ffc107', border:'none', borderRadius:10, padding:'12px 18px', fontWeight:800, cursor:'pointer' }}
            >Зняти знижку</button>
          )}
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
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }} title="Показувати лише товари, де є активна знижка для вибраної категорії/центру">
              <input type="checkbox" checked={onlyDiscounted} onChange={e=>setOnlyDiscounted(e.target.checked)} />
              <span>Тільки зі знижкою</span>
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
                {priceCategories.map((cat, idx) => {
                  const hasDisc = hasDiscountByCategory(cat.ID);
                  return (
                    <React.Fragment key={cat.ID}>
                      <th style={{
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderBottom: '2.5px solid #a78bfa',
                    fontWeight: 700,
                                          fontSize: 18,
                          borderRight: (idx < priceCategories.length - 1 || hasDisc) ? '2px solid #a78bfa' : 'none'
                       }}>{cat.Name}</th>
                                              {hasDisc && (
                          <th style={{
                            textAlign: 'center', padding:'12px 16px', borderBottom:'2.5px solid #a78bfa', fontWeight:700, fontSize:18,
                      borderRight: (idx < priceCategories.length - 1) ? '2px solid #a78bfa' : 'none'
                         }}>{cat.Name} (зі знижкою)</th>
                        )}
                    </React.Fragment>
                  );
                })}
          </tr>
        </thead>
        <tbody>
              {(function(){
                const currentCatId = Number(selectedCatId || (priceCategories[0]?.ID || 0));
                const list = onlyDiscounted
                  ? products.filter(p => {
                      const base = getPrice(p.ID, currentCatId);
                      const dp = getDiscounted(p.ID, currentCatId);
                      return dp !== '' && Number(dp) !== Number(base);
                    })
                  : products;
                return list;
              })().map(prod => {
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
                    minWidth: 260,
                    borderRight: '2px solid #ede7fb'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div title="Превʼю" style={{ width: 42, height: 42, borderRadius: 8, overflow: 'hidden', background: '#f8f9fa', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {prod.Photo ? (
                          <img alt="p" src={`http://localhost:8000/api/preview/${prod.Photo}`} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                        ) : (
                          <span style={{ fontSize: 12, color:'#bbb' }}>—</span>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column' }}>
                        <div style={{ fontWeight: 600, color:'#34395d' }}>{prod.FullName || prod.Name}</div>
                        <div style={{ fontFamily:'monospace', color:'#6c757d', fontSize: 13 }}>{prod.Barcode || ''}</div>
                      </div>
                    </div>
                  </td>
                  {priceCategories.map((cat, idx) => {
                    const hasDisc = hasDiscountByCategory(cat.ID);
                    const base = getPrice(prod.ID, cat.ID);
                    const dp = hasDisc ? getDiscounted(prod.ID, cat.ID) : '';
                    const until = hasDisc ? getPriceDateEnd(prod.ID, cat.ID) : null;
                    const cells = [(
                      <td key={cat.ID} style={{ textAlign:'center', padding:'12px 16px', borderBottom:'1.7px solid #ede7fb', borderRight:(idx < priceCategories.length - 1 || hasDisc) ? '2px solid #ede7fb' : 'none' }}>
                        {base}
                      </td>
                    )];
                    if (hasDisc) cells.push((
                      <td key={cat.ID+"-disc"} style={{ textAlign:'center', padding:'12px 16px', borderBottom:'1.7px solid #ede7fb', borderRight:(idx < priceCategories.length - 1)?'2px solid #ede7fb':'none', color: dp && Number(dp)!==Number(base) ? '#28a745' : undefined, fontWeight: dp && Number(dp)!==Number(base) ? 700 : undefined }}>
                        <div>{dp || ''}</div>
                        {until ? <div style={{ fontSize:12, color:'#6c757d' }}>До {String(until).slice(0,10)}</div> : null}
                    </td>
                    ));
                    return cells;
                  })}
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
      {showApplyDiscModal && (
        <ApplyDiscountModal
          onClose={()=>setShowApplyDiscModal(false)}
          centers={centers}
          defaultCenterId={centerId}
          priceCategories={priceCategories}
          defaultCategoryId={selectedCatId || (priceCategories[0]?.ID || '')}
          selectedProductIds={selectAll ? [] : Array.from(selected)}
          prices={prices}
          onApplied={async()=>{ await reloadPrices(); }}
          defaultRounding={rounding}
        />
      )}
    </div>
  );
}

// CategorySelectTree винесено у спільний компонент
export function ApplyDiscountModal({ onClose, centers, defaultCenterId, priceCategories, defaultCategoryId, selectedProductIds, prices, onApplied, defaultRounding }){
  const [allCenters, setAllCenters] = React.useState(true);
  const [centerIds, setCenterIds] = React.useState(new Set());
  const [pcid, setPcid] = React.useState(String(defaultCategoryId||''));
  const [dtype, setDtype] = React.useState('percent');
  const [dval, setDval] = React.useState(10);
  const [dateStart, setDateStart] = React.useState(new Date().toISOString().slice(0,10));
  const [dateEnd, setDateEnd] = React.useState('');
  const roundingChoices = React.useMemo(() => [0, 0.05, 0.1, 0.25, 0.5, 1, 5, 10], []);
  const [roundStep, setRoundStep] = React.useState(() => {
    const parsed = Number(defaultRounding);
    return Number.isFinite(parsed) ? parsed : 1;
  });
  const [comment, setComment] = React.useState('');

  const runApply = async () => {
    try {
      const catId = Number(pcid||0);
      if (!catId) return alert('Оберіть категорію цін');
      // Перевірка існуючих знижок: якщо серед вибраних товарів є хоч один з PriceWithDiscount -> попереджаємо
      if (selectedProductIds && selectedProductIds.length) {
        const hasExisting = prices && prices.some(p => selectedProductIds.includes(p.ProductID) && Number(p.PriceCategoryID)===catId && p.PriceWithDiscount!=null);
        if (hasExisting) {
          const ok = window.confirm('Для частини вибраних товарів вже встановлено ціну зі знижкою. Перезаписати?');
          if (!ok) return;
        }
      }
      const targets = (allCenters || !centerIds.size) ? [null] : Array.from(centerIds);
      for (const cid of targets){
        const payload = {
          price_category_id: catId,
          discount_type: dtype,
          discount_value: Number(dval||0),
          rounding_step: Number(roundStep) || 0,
          date_start: dateStart,
          active_on: dateStart,
        };
        if (dateEnd) payload.date_end = dateEnd;
        if (cid != null) payload.center_id = Number(cid);
        if (selectedProductIds && selectedProductIds.length) payload.product_ids = selectedProductIds;
        if (comment.trim()) payload.comment = comment.trim();
        // TODO: можна додати перевірку існуючих discount-цін і підтвердження
        await api.applyDiscounts(payload);
      }
      if (onApplied) await onApplied();
      onClose();
    } catch(e){
      alert('Помилка запису знижок');
    }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:120 }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(640px, 95vw)', background:'#fff', borderRadius:12, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Розрахувати і записати знижку</div>
          <button onClick={onClose} style={{ border:'none', background:'transparent', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <div style={{ fontSize:13, color:'#6c757d', marginBottom:6 }}>Категорія цін</div>
                          <select value={pcid} onChange={e=>setPcid(e.target.value)} style={{ width:'100%', padding:10, borderRadius:8 }}>
                <option value="">Оберіть…</option>
                {(priceCategories||[]).map(pc => <option key={pc.ID} value={pc.ID}>{pc.Name}</option>)}
              </select>
          </div>
          <div>
            <div style={{ fontSize:13, color:'#6c757d', marginBottom:6 }}>Тип знижки</div>
            <select value={dtype} onChange={e=>setDtype(e.target.value)} style={{ width:'100%', padding:10, borderRadius:8 }}>
              <option value="percent">Відсоток (%)</option>
              <option value="amount">Сума</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize:13, color:'#6c757d', marginBottom:6 }}>Значення</div>
            <input type="number" value={dval} onChange={e=>setDval(e.target.value)} style={{ width:'100%', padding:10, borderRadius:8 }} />
          </div>
          <div>
            <div style={{ fontSize:13, color:'#6c757d', marginBottom:6 }}>Заокруглення</div>
            <select value={roundStep} onChange={e=>setRoundStep(Number(e.target.value))} style={{ width:'100%', padding:10, borderRadius:8 }}>
              {roundingChoices.map(opt => (
                <option key={opt} value={opt}>
                  {opt === 0 ? 'Без заокруглення' : `Крок ${opt}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize:13, color:'#6c757d', marginBottom:6 }}>Період дії</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <input type="date" value={dateStart} onChange={e=>setDateStart(e.target.value)} style={{ padding:10, borderRadius:8 }} />
              <input type="date" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} style={{ padding:10, borderRadius:8 }} />
            </div>
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:13, color:'#6c757d', marginBottom:6 }}>Коментар</div>
          <textarea
            value={comment}
            onChange={e=>setComment(e.target.value)}
            rows={2}
            style={{ width:'100%', padding:10, borderRadius:8, resize:'vertical' }}
            placeholder="Опишіть умови знижки (за бажанням)"
          />
        </div>
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:13, color:'#6c757d', marginBottom:6 }}>Центри</div>
          <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <input type="checkbox" checked={allCenters} onChange={e=>{ const v=e.target.checked; setAllCenters(v); if(v) setCenterIds(new Set()); }} /> Усі центри
          </label>
          {!allCenters && (
            <div style={{ maxHeight:170, overflow:'auto', border:'1px solid #f1f1f1', borderRadius:8, padding:8 }}>
              {centers.map(c => (
                <label key={c.ID} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 10px', marginRight:8 }}>
                  <input type="checkbox" checked={centerIds.has(c.ID)} onChange={e=>{ const v=e.target.checked; setCenterIds(prev=>{ const next=new Set(prev); if(v) next.add(c.ID); else next.delete(c.ID); return next;}); }} /> {c.Name}
                </label>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:14 }}>
          <button onClick={onClose} style={{ padding:'10px 14px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer' }}>Скасувати</button>
          <button onClick={runApply} style={{ padding:'10px 14px', borderRadius:8, border:'none', background:'#28a745', color:'#fff', fontWeight:800, cursor:'pointer' }}>Розрахувати і записати</button>
        </div>
      </div>
    </div>
  );
} 
