import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function StockStatePage() {
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
        <button onClick={load} disabled={loading} style={{ padding: '8px 12px' }}>{loading? 'Завантаження...' : 'Оновити'}</button>
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
          <input type="checkbox" checked={onlyWeight} onChange={e=>{ setOnlyWeight(e.target.checked); if (e.target.checked) setOnlyPiece(false); }} /> Вагові
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input type="checkbox" checked={onlyPiece} onChange={e=>{ setOnlyPiece(e.target.checked); if (e.target.checked) setOnlyWeight(false); }} /> Штучні
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border w-20">Фото</th>
              <th className="p-2 border">Товар</th>
              <th className="p-2 border w-32">Штрихкод</th>
              <th className="p-2 border w-28">Артикул</th>
              <th className="p-2 border w-20">К-сть</th>
              <th className="p-2 border w-28">Ціна</th>
              <th className="p-2 border w-32">Сер.собівартість</th>
              <th className="p-2 border w-32">Сума</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
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
                <td className="p-2 border">{r.FullName}</td>
                <td className="p-2 border" style={{ fontFamily:'monospace' }}>{r.Barcode||''}</td>
                <td className="p-2 border" style={{ fontFamily:'monospace' }}>{r.Article||''}</td>
                <td className="p-2 border text-right">{Number(r.Qty||0).toFixed(3)}</td>
                <td className="p-2 border text-right">{Number(r.Price||0).toFixed(2)}</td>
                <td className="p-2 border text-right">{Number(r.AvgCost||0).toFixed(2)}</td>
                <td className="p-2 border text-right">{Number(r.Amount||0).toFixed(2)}</td>
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
              <td className="p-2 border text-right">{totalQty.toFixed(3)}</td>
              <td className="p-2 border" />
              <td className="p-2 border" />
              <td className="p-2 border text-right">{totalAmount.toFixed(2)}</td>
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
    // backfill: якщо у когось ParentID=0
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


