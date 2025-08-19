import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { setSelection } from "../utils/selectionBridge";
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

  // Table prefs per employee (порядок і видимість колонок)
  const PREF_KEY = 'stock_state_table';
  const DEFAULT_COLUMNS = [
    { key: 'photo', label: 'Фото', visible: true },
    { key: 'name', label: 'Товар', visible: true },
    { key: 'barcode', label: 'Штрихкод', visible: true },
    { key: 'article', label: 'Артикул', visible: true },
    { key: 'qty', label: 'К-сть', visible: true },
    { key: 'price', label: 'Ціна', visible: true },
    { key: 'avgcost', label: 'Сер.собівартість', visible: true },
    { key: 'amount', label: 'Сума', visible: true },
  ];
  const [availableFields, setAvailableFields] = useState({ standard: [], custom: [] });
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);

  // Похідні: впорядковані та видимі колонки
  const orderedVisibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);
  // Завантаження доступних полів та префів користувача
  useEffect(() => {
    (async () => {
      try {
        // 1) Завантажуємо доступні поля
        let standard = [];
        let custom = [];
        try {
          const af = await api.get('/stock/state/available-fields');
          standard = Array.isArray(af?.standard) ? af.standard : [];
          custom = Array.isArray(af?.custom) ? af.custom : [];
          setAvailableFields({ standard, custom });
        } catch {}

        // Базовий список колонок: стандартні + кастомні (кастомні приховані за замовчуванням)
        const baseColumns = [
          ...DEFAULT_COLUMNS.map(c => ({ ...c })),
          ...custom.map(c => ({ key: c.key, label: c.label || c.key, visible: false })),
        ];

        // 2) Преференси користувача і мердж
        let nextColumns = baseColumns;
        try {
          if (employee?.ID) {
            const pref = await api.getUserTablePrefs(employee.ID, PREF_KEY);
            if (pref?.PrefJson) {
              const parsed = JSON.parse(pref.PrefJson);
              if (parsed && Array.isArray(parsed.order) && parsed.visible && typeof parsed.visible === 'object') {
                const byKey = new Map(baseColumns.map(c => [c.key, { ...c }]));
                const ordered = parsed.order
                  .filter(k => byKey.has(k))
                  .map(k => ({ ...byKey.get(k), visible: parsed.visible[k] !== false }));
                // Додаємо відсутні ключі (нові поля)
                baseColumns.forEach(c => {
                  if (!ordered.find(x => x.key === c.key)) ordered.push({ ...c, visible: parsed.visible[c.key] !== false });
                });
                nextColumns = ordered;
              } else if (parsed && typeof parsed === 'object') {
                nextColumns = baseColumns.map(c => ({ ...c, visible: parsed[c.key] !== false }));
              }
            }
          }
        } catch {}

        setColumns(nextColumns);
      } catch {}
    })();
  }, [employee?.ID]);

  async function savePrefsStructure(nextColumns) {
    try {
      if (!employee?.ID) return;
      const payload = {
        order: nextColumns.map(c => c.key),
        visible: nextColumns.reduce((acc, c) => ({ ...acc, [c.key]: !!c.visible }), {}),
      };
      await api.upsertUserTablePref(employee.ID, PREF_KEY, JSON.stringify(payload));
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
        price_category_id: priceCategoryId ? Number(priceCategoryId) : undefined,
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
  // Перезавантажувати при зміні вибраної категорії цін
  useEffect(() => { load(); }, [priceCategoryId]);

  const totalQty = useMemo(() => rows.reduce((s,r)=>s + Number(r.Qty||0), 0), [rows]);
  const totalAmount = useMemo(() => rows.reduce((s,r)=>s + Number(r.Amount||0), 0), [rows]);

  const [showConfig, setShowConfig] = useState(false);

  // --- Select mode support ---
  const isSelectMode = (typeof window !== 'undefined') && new URLSearchParams(window.location.search).get('select') === '1';
  const backUrl = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search).get('back') : null;
  const [checked, setChecked] = useState({}); // { [productId]: { qty } }
  function addSelectedToInvoice(){
    const byId = new Map((rows||[]).map(r => [Number(r.ProductID), r]));
    const items = Object.entries(checked)
      .filter(([, v]) => v && Number(v.qty) > 0)
      .map(([pid, v]) => {
        const idNum = Number(pid);
        const row = byId.get(idNum);
        return {
          id: idNum,
          qty: Number(v.qty),
          name: row?.FullName || row?.Name || row?.ProductName || ""
        };
      });
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key') || 'arrival';
    setSelection(key, { items, meta: { source: 'stock', centerId, warehouseId, priceCategoryId, date } });
    if (backUrl) window.location.assign(backUrl);
  }

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
        {!isSelectMode && (
          <button
            onClick={()=>setShowConfig(true)}
            style={{
              background:'#7b6eea', color:'#fff', border:'none', borderRadius:12,
              padding:'14px 20px', fontWeight:800, fontSize:16, boxShadow:'0 4px 14px rgba(0,0,0,0.15)', cursor:'pointer'
            }}
          >⚙️ Налаштувати…</button>
        )}
        {isSelectMode && (
          <button
            onClick={addSelectedToInvoice}
            style={{ background:'#00b894', color:'#fff', border:'none', borderRadius:12, padding:'14px 20px', fontWeight:800, fontSize:16, boxShadow:'0 4px 14px rgba(0,0,0,0.15)', cursor:'pointer' }}
          >Додати в накладну</button>
        )}
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
        {showConfig && (
          <ColumnsConfigModal
            columns={columns}
            onClose={()=>setShowConfig(false)}
            onSave={(nextCols)=>{ setColumns(nextCols); savePrefsStructure(nextCols); setShowConfig(false); }}
          />
        )}
        <table className="min-w-full bg-white border rounded">
          <thead>
            <tr className="bg-gray-100">
              {isSelectMode && <th className="p-2 border w-12">✓</th>}
              {orderedVisibleColumns.map(c => (
                <th key={c.key} className="p-2 border" style={{
                  width: c.key === 'photo' ? 80 : (c.key === 'barcode' ? 128 : (c.key === 'article' ? 112 : (c.key === 'qty' ? 80 : (c.key === 'price' ? 112 : (c.key === 'avgcost' ? 144 : (c.key === 'amount' ? 144 : undefined))))) )
                }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {isSelectMode && (
                  <td className="p-2 border" style={{ width: 60 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <input type="checkbox" checked={!!checked[r.ProductID]} onChange={e=>{
                        const v = e.target.checked;
                        setChecked(prev => {
                          const next = { ...prev };
                          if (v) next[r.ProductID] = { qty: 1 };
                          else delete next[r.ProductID];
                          return next;
                        });
                      }} />
                      {!!checked[r.ProductID] && (
                        <input type="number" min={0.001} step={0.001} value={checked[r.ProductID]?.qty || 1}
                          onChange={e=>{
                            const q = e.target.value;
                            setChecked(prev => ({ ...prev, [r.ProductID]: { qty: q } }));
                          }}
                          style={{ width:80 }}
                        />
                      )}
                    </div>
                  </td>
                )}
                {orderedVisibleColumns.map(col => {
                  if (col.key === 'photo') {
                    return (
                      <td key={col.key} className="p-2 border" style={{ textAlign:'center' }}>
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
                    );
                  }
                  if (col.key === 'name') return <td key={col.key} className="p-2 border">{r.FullName}</td>;
                  if (col.key === 'barcode') return <td key={col.key} className="p-2 border" style={{ fontFamily:'monospace' }}>{r.Barcode||''}</td>;
                  if (col.key === 'article') return <td key={col.key} className="p-2 border" style={{ fontFamily:'monospace' }}>{r.Article||''}</td>;
                  if (col.key === 'qty') return <td key={col.key} className="p-2 border text-right">{Number(r.Qty||0).toFixed(3)}</td>;
                  if (col.key === 'price') return <td key={col.key} className="p-2 border text-right">{Number(r.Price||0).toFixed(2)}</td>;
                  if (col.key === 'avgcost') return <td key={col.key} className="p-2 border text-right">{Number(r.AvgCost||0).toFixed(2)}</td>;
                  if (col.key === 'amount') return <td key={col.key} className="p-2 border text-right">{Number(r.Amount||0).toFixed(2)}</td>;
                  // Кастомні поля: очікуємо ключі custom_<sql>
                  if (col.key && col.key.startsWith('custom_')) {
                    return <td key={col.key} className="p-2 border">{r[col.key] != null ? String(r[col.key]) : '—'}</td>;
                  }
                  return <td key={col.key} className="p-2 border">—</td>;
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={(orderedVisibleColumns.length + (isSelectMode ? 1 : 0)) || 1} className="p-3 text-center text-gray-500 border">Немає даних</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              {(() => {
                // Формуємо футер динамічно: у першій клітинці до колонки 'qty' пишемо "Разом:";
                const tds = [];
                if (isSelectMode) tds.push(<td key={`f-sel`} className="p-2 border" />);
                let beforeQty = true;
                orderedVisibleColumns.forEach((c, idx) => {
                  if (beforeQty && c.key !== 'qty') {
                    // перші комірки до qty: зливаємо у першу
                    if (idx === 0) tds.push(<td key={`f-${c.key}`} className="p-2 border" colSpan={1}>Разом:</td>);
                    else {
                      const last = tds[tds.length - 1];
                      if (last && last.props && last.props.colSpan) {
                        // збільшуємо colSpan останньої клітинки "Разом:" замість додавання нової
                        const newColSpan = last.props.colSpan + 1;
                        tds[tds.length - 1] = React.cloneElement(last, { colSpan: newColSpan });
                      } else {
                        // гарантія на випадок нештатного порядку
                        tds.push(<td key={`f-pad-${idx}`} className="p-2 border" />);
                      }
                    }
                  } else if (c.key === 'qty') {
                    beforeQty = false;
                    tds.push(<td key={`f-qty`} className="p-2 border text-right">{totalQty.toFixed(3)}</td>);
                  } else if (c.key === 'amount') {
                    tds.push(<td key={`f-amount`} className="p-2 border text-right">{totalAmount.toFixed(2)}</td>);
                  } else {
                    tds.push(<td key={`f-${c.key}`} className="p-2 border" />);
                  }
                });
                return tds;
              })()}
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

function ColumnsConfigModal({ columns, onClose, onSave }){
  const [localCols, setLocalCols] = React.useState(columns);

  // Drag and drop
  const dragIndexRef = React.useRef(null);
  function onDragStart(idx){ dragIndexRef.current = idx; }
  function onDragOver(e){ e.preventDefault(); }
  function onDrop(idx){
    const from = dragIndexRef.current;
    if (from == null || from === idx) return;
    setLocalCols(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
  }

  function toggleVisible(k){
    setLocalCols(prev => prev.map(c => c.key === k ? { ...c, visible: !c.visible } : c));
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'min(700px, 95vw)', background:'#fff', borderRadius:16, boxShadow:'0 10px 40px rgba(0,0,0,0.3)', padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:18, fontWeight:800 }}>Налаштування колонок</div>
          <button onClick={onClose} style={{ border:'none', background:'transparent', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize:12, color:'#6c757d', marginBottom:10 }}>Перетягніть рядки мишкою або використайте стрілки ▲▼ справа, щоб змінити порядок.</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
          {localCols.map((c, idx) => (
            <div
              key={c.key}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(idx)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 10px', border:'1px solid #f1f1f1', borderRadius:10, background:'#fafafa', cursor:'grab' }}
              title="Перетягніть, щоб змінити порядок"
            >
              <span style={{ fontSize:18, lineHeight:1 }}>☰</span>
              <label style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
                <input type="checkbox" checked={!!c.visible} onChange={() => toggleVisible(c.key)} />
                <span>{c.label}</span>
              </label>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>{
                  setLocalCols(prev => {
                    const next = [...prev];
                    if (idx === 0) return next;
                    const [m] = next.splice(idx, 1);
                    next.splice(idx-1, 0, m);
                    return next;
                  });
                }} disabled={idx===0} title="Вгору" style={{ padding:'4px 8px', borderRadius:6, border:'1px solid #ddd', background:'#fff', cursor: idx===0 ? 'not-allowed' : 'pointer' }}>▲</button>
                <button onClick={()=>{
                  setLocalCols(prev => {
                    const next = [...prev];
                    if (idx === next.length-1) return next;
                    const [m] = next.splice(idx, 1);
                    next.splice(idx+1, 0, m);
                    return next;
                  });
                }} disabled={idx===localCols.length-1} title="Вниз" style={{ padding:'4px 8px', borderRadius:6, border:'1px solid #ddd', background:'#fff', cursor: idx===localCols.length-1 ? 'not-allowed' : 'pointer' }}>▼</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
          <button onClick={onClose} style={{ background:'#6c757d', color:'#fff', border:'none', borderRadius:8, padding:'10px 16px', fontWeight:700, cursor:'pointer' }}>Скасувати</button>
          <button onClick={()=>onSave(localCols)} style={{ background:'#28a745', color:'#fff', border:'none', borderRadius:8, padding:'10px 16px', fontWeight:700, cursor:'pointer' }}>Зберегти</button>
        </div>
      </div>
    </div>
  );
}


