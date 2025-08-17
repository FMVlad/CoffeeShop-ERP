import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useUser } from "../UserContext";

export default function StockStatePage() {
  const { employee } = useUser();
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [priceCategories, setPriceCategories] = useState([]);
  const [priceCategoryId, setPriceCategoryId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [qtyFilter, setQtyFilter] = useState(""); // in_stock | negative | zero
  const [onlyWeight, setOnlyWeight] = useState(false);
  const [onlyPiece, setOnlyPiece] = useState(false);

  // Table prefs per employee
  const PREF_KEY = 'stock_state_table';
  const [visibleCols, setVisibleCols] = useState({
    photo: true, name: true, barcode: true, article: true, qty: true, price: true, avgcost: true, amount: true,
  });
  useEffect(() => {
    (async () => {
      try {
        if (!employee?.ID) return;
        const pref = await api.getUserTablePrefs(employee.ID, PREF_KEY);
        if (pref?.PrefJson) {
          const parsed = JSON.parse(pref.PrefJson);
          if (parsed && typeof parsed === 'object') setVisibleCols(v => ({ ...v, ...parsed }));
        }
      } catch {}
    })();
  }, [employee?.ID]);
  async function savePrefs(next) {
    try {
      if (!employee?.ID) return;
      await api.upsertUserTablePref(employee.ID, PREF_KEY, JSON.stringify(next));
    } catch {}
  }

  useEffect(() => {
    api.getCenters().then(setCenters);
    api.getPriceCategories && api.getPriceCategories().then(setPriceCategories).catch(()=>{});
    api.getCategories && api.getCategories().then(setCategories).catch(()=>{});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get("/stock/state", {
        center_id: centerId || undefined,
        warehouse_id: warehouseId || undefined,
        on_date: date,
        price_category_id: priceCategoryId || undefined,
        search: search || undefined,
        category_id: categoryId || undefined,
        qty_filter: qtyFilter || undefined,
        only_weight: onlyWeight || undefined,
        only_piece: onlyPiece || undefined,
      });
      setRows((data && data.items) || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalQty = useMemo(() => rows.reduce((s,r)=>s + Number(r.Qty||0), 0), [rows]);
  const totalAmount = useMemo(() => rows.reduce((s,r)=>s + Number(r.Amount||0), 0), [rows]);

  const [showConfig, setShowConfig] = useState(false);

  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Стан складу</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr 140px', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Пошук: штрихкод / назва / артикул"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          onKeyDown={(e)=>{ if (e.key === 'Enter') load(); }}
          style={{ padding: 8, borderRadius: 6 }}
        />
        <select value={centerId} onChange={e=>setCenterId(e.target.value)}>
          <option value="">Всі центри</option>
          {centers.map(c => <option key={c.ID} value={c.ID}>{c.Name}</option>)}
        </select>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        <select value={priceCategoryId} onChange={e=>setPriceCategoryId(e.target.value)}>
          <option value="">Категорія цін (за замовчуванням)</option>
          {(priceCategories||[]).map(pc => <option key={pc.ID} value={pc.ID}>{pc.Name||pc.CategoryName||pc.ID}</option>)}
        </select>
        <div>
          <CategorySelectTree categories={categories} value={categoryId} onChange={setCategoryId} />
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Оновити стан складу"
          style={{
            background: loading ? '#e9ecef' : '#00b894',
            color: loading ? '#6c757d' : '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '14px 28px',
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: 0.3,
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >{loading ? 'Завантаження…' : '🔄 Оновити'}</button>
      </div>

      <div style={{ display:'flex', gap:12, marginBottom: 10, alignItems:'center' }}>
        <label>Фільтр по кількості:</label>
        <select value={qtyFilter} onChange={e=>setQtyFilter(e.target.value)}>
          <option value="">Всі</option>
          <option value="in_stock">В наявності (&gt; 0)</option>
          <option value="zero">Нульовий залишок (= 0)</option>
          <option value="negative">Відʼємний залишок (&lt; 0)</option>
        </select>
        <label style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input type="checkbox" checked={onlyWeight} onChange={e=>{ const v = e.target.checked; setOnlyWeight(v); if (v) setOnlyPiece(false); }} /> Вагові
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input type="checkbox" checked={onlyPiece} onChange={e=>{ const v = e.target.checked; setOnlyPiece(v); if (v) setOnlyWeight(false); }} /> Штучні
        </label>
      </div>

      <div className="overflow-x-auto">
        <div style={{ display:'flex', gap:10, marginBottom:8, alignItems:'center' }}>
          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={visibleCols.photo} onChange={e=>{ const v={...visibleCols, photo:e.target.checked}; setVisibleCols(v); savePrefs(v);} }/> Фото</label>
          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={visibleCols.name} onChange={e=>{ const v={...visibleCols, name:e.target.checked}; setVisibleCols(v); savePrefs(v);} }/> Товар</label>
          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={visibleCols.barcode} onChange={e=>{ const v={...visibleCols, barcode:e.target.checked}; setVisibleCols(v); savePrefs(v);} }/> Штрихкод</label>
          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={visibleCols.article} onChange={e=>{ const v={...visibleCols, article:e.target.checked}; setVisibleCols(v); savePrefs(v);} }/> Артикул</label>
          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={visibleCols.qty} onChange={e=>{ const v={...visibleCols, qty:e.target.checked}; setVisibleCols(v); savePrefs(v);} }/> К-сть</label>
          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={visibleCols.price} onChange={e=>{ const v={...visibleCols, price:e.target.checked}; setVisibleCols(v); savePrefs(v);} }/> Ціна</label>
          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={visibleCols.avgcost} onChange={e=>{ const v={...visibleCols, avgcost:e.target.checked}; setVisibleCols(v); savePrefs(v);} }/> Сер.собівартість</label>
          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={visibleCols.amount} onChange={e=>{ const v={...visibleCols, amount:e.target.checked}; setVisibleCols(v); savePrefs(v);} }/> Сума</label>
          <button onClick={()=>setShowConfig(true)} style={{ marginLeft:'auto', background:'#7b6eea', color:'#fff', border:'none', borderRadius:8, padding:'10px 14px', fontWeight:700, cursor:'pointer' }}>⚙️ Налаштувати…</button>
        </div>
        {showConfig && (
          <ColumnsConfigModal
            visible={visibleCols}
            onClose={()=>setShowConfig(false)}
            onSave={(nextVisible)=>{ setVisibleCols(nextVisible); savePrefs(nextVisible); setShowConfig(false); }}
          />
        )}
        <table className="min-w-full bg-white border rounded">
          <thead>
            <tr className="bg-gray-100">
              {visibleCols.photo && <th className="p-2 border w-20">Фото</th>}
              {visibleCols.name && <th className="p-2 border">Товар</th>}
              {visibleCols.barcode && <th className="p-2 border w-32">Штрихкод</th>}
              {visibleCols.article && <th className="p-2 border w-28">Артикул</th>}
              {visibleCols.qty && <th className="p-2 border w-20">К-сть</th>}
              {visibleCols.price && <th className="p-2 border w-28">Ціна</th>}
              {visibleCols.avgcost && <th className="p-2 border w-32">Сер.собівартість</th>}
              {visibleCols.amount && <th className="p-2 border w-32">Сума</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {visibleCols.photo && (
                  <td className="p-2 border" style={{ textAlign:'center' }}>
                    {r.Photo ? (
                      <div
                        title="Клік для превʼю"
                        style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#f8f9fa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}
                        onClick={() => setPreviewSrc(`http://localhost:8000/api/preview/${r.Photo}`)}
                      >
                        <img alt="p" src={`http://localhost:8000/api/preview/${r.Photo}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : '—'}
                  </td>
                )}
                {visibleCols.name && <td className="p-2 border">{r.FullName}</td>}
                {visibleCols.barcode && <td className="p-2 border" style={{ fontFamily:'monospace' }}>{r.Barcode||''}</td>}
                {visibleCols.article && <td className="p-2 border" style={{ fontFamily:'monospace' }}>{r.Article||''}</td>}
                {visibleCols.qty && <td className="p-2 border text-right">{Number(r.Qty||0).toFixed(3)}</td>}
                {visibleCols.price && <td className="p-2 border text-right">{Number(r.Price||0).toFixed(2)}</td>}
                {visibleCols.avgcost && <td className="p-2 border text-right">{Number(r.AvgCost||0).toFixed(2)}</td>}
                {visibleCols.amount && <td className="p-2 border text-right">{Number(r.Amount||0).toFixed(2)}</td>}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3 text-center text-gray-500 border">Немає даних</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="p-2 border" colSpan={4}>Разом:</td>
              {visibleCols.qty && <td className="p-2 border text-right">{totalQty.toFixed(3)}</td>}
              {visibleCols.price && <td className="p-2 border" />}
              {visibleCols.avgcost && <td className="p-2 border" />}
              {visibleCols.amount && <td className="p-2 border text-right">{totalAmount.toFixed(2)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
      {previewSrc && (
        <div
          onClick={() => setPreviewSrc(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
        >
          <img src={previewSrc} alt="preview" style={{ maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:8, boxShadow:'0 10px 30px rgba(0,0,0,0.4)' }} />
        </div>
      )}
      <CategorySelectStyles />
    </div>
  );
}

// Маленький компонент-дерево вибору категорій із плоского списку {ID, CategoryName, ParentID}
function CategorySelectTree({ categories, value, onChange }) {
  const flat = React.useMemo(() => {
    const result = [];
    const children = new Map();
    (categories||[]).forEach(c => {
      const pid = c.ParentID == null ? null : c.ParentID;
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid).push(c);
    });
    for (const arr of children.values()) arr.sort((a,b)=>String(a.CategoryName||'').localeCompare(String(b.CategoryName||'')));
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
        <option key={c.ID} value={c.ID}>{`${'— '.repeat(c._level||0)}${c._level>0?'▶ ':''}${c.CategoryName}`}</option>
      ))}
    </select>
  );
}

function CategorySelectStyles(){
  return (
    <style>{`
      .category-select { padding: 10px 12px; border-radius: 8px; border: 1px solid #ddd; }
      .category-select option { padding: 6px 8px; }
    `}</style>
  );
}

function ColumnsConfigModal({ visible, onClose, onSave }){
  const FIELDS = [
    { key:'photo', label:'Фото' },
    { key:'name', label:'Товар' },
    { key:'barcode', label:'Штрихкод' },
    { key:'article', label:'Артикул' },
    { key:'qty', label:'К-сть' },
    { key:'price', label:'Ціна' },
    { key:'avgcost', label:'Сер.собівартість' },
    { key:'amount', label:'Сума' },
  ];
  const [local, setLocal] = React.useState({ ...visible });
  function toggle(k){ setLocal(v => ({ ...v, [k]: !v[k] })); }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'min(640px, 95vw)', background:'#fff', borderRadius:16, boxShadow:'0 10px 40px rgba(0,0,0,0.3)', padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:18, fontWeight:800 }}>Налаштування колонок</div>
          <button onClick={onClose} style={{ border:'none', background:'transparent', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {FIELDS.map(f => (
            <label key={f.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 6px', border:'1px solid #f1f1f1', borderRadius:8 }}>
              <input type="checkbox" checked={!!local[f.key]} onChange={()=>toggle(f.key)} />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
          <button onClick={onClose} style={{ background:'#6c757d', color:'#fff', border:'none', borderRadius:8, padding:'10px 16px', fontWeight:700, cursor:'pointer' }}>Скасувати</button>
          <button onClick={()=>onSave(local)} style={{ background:'#28a745', color:'#fff', border:'none', borderRadius:8, padding:'10px 16px', fontWeight:700, cursor:'pointer' }}>Зберегти</button>
        </div>
      </div>
    </div>
  );
}


