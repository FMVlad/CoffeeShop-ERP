import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";

export default function SelectProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("rows");
  const [selectedQty, setSelectedQty] = useState(new Map());
  const [submitting, setSubmitting] = useState(false);
  const promptGuardRef = useRef(0);

  useEffect(() => {
    // очищаємо будь-які попередні кеші
    sessionStorage.removeItem("arrival_selected_products");
  }, []);

  useEffect(() => {
    api.getCategories().then((cats) => setCategories(cats || []));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const prods = await api.getProducts(search, category);
        setProducts(Array.isArray(prods) ? prods : []);
      } finally {
        setLoading(false);
      }
    }
    load();
    // якщо відкрито в режимі додавання — покажемо банер і кнопку швидкого переходу в додавання
  }, [search, category]);

  const categoriesById = useMemo(() => {
    const m = new Map();
    (categories || []).forEach((c) => m.set(c.ID, c));
    return m;
  }, [categories]);

  function toggle(id) {
    setSelectedQty((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
      return next;
    });
  }

  function setQty(id, q) {
    const val = Number(String(q).replace(/,/g, "."));
    setSelectedQty((prev) => {
      const next = new Map(prev);
      if (!isFinite(val) || val <= 0) {
        if (next.has(id)) next.set(id, 1);
      } else {
        next.set(id, val);
      }
      return next;
    });
  }

  function addToArrival() {
    setSubmitting(true);
    const selected = products.filter((p) => selectedQty.has(p.ID));
    const payload = selected.map((p) => ({
      ID: p.ID,
      FullName: p.FullName || p.Name || "",
      Name: p.Name || "",
      Barcode: p.Barcode || "",
      Article: p.Article || "",
      Quantity: Number(selectedQty.get(p.ID) || 1),
    }));
    sessionStorage.setItem("arrival_selected_products", JSON.stringify(payload));
    navigate(-1);
  }

  function quickAddProduct() {
    navigate(`/dictionaries/products?mode=add&source=selector`);
  }

  return (
    <div style={{ background: 'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)', minHeight: '100vh', padding: '32px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(90deg,#7c6aea 0%,#a798f6 70%,#b7862b 100%)',
          borderRadius: '20px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🧾</span>
            <span style={{ fontWeight: 700, fontSize: 22 }}>Вибір товарів для документа</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate(-1)} style={{ background: '#f2f2f2', color: '#636e72', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>← Назад</button>
            <button onClick={quickAddProduct} style={{ background: '#00b894', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>+ Додати товар</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук (назва по частинах / штрихкод)"
            style={{ flex: 2, padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
          >
            <option value="">Усі категорії</option>
            {(categories || []).map((c) => (
              <option key={c.ID} value={c.ID}>{c.CategoryName}</option>
            ))}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#4a4a4a', fontWeight: 600 }}>Вигляд:</span>
            <button onClick={() => setViewMode('cards')} style={{ background: viewMode === 'cards' ? '#4c6ef5' : '#f2f2f2', color: viewMode === 'cards' ? '#fff' : '#636e72', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Картки</button>
            <button onClick={() => setViewMode('rows')} style={{ background: viewMode === 'rows' ? '#4c6ef5' : '#f2f2f2', color: viewMode === 'rows' ? '#fff' : '#636e72', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Рядки</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#636e72', fontSize: 22, padding: 80 }}>Завантаження…</div>
        ) : viewMode === 'rows' ? (
          <div>
            <table className="w-full bg-white rounded border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border w-10"></th>
                  <th className="p-2 border w-24">Фото</th>
                  <th className="p-2 border text-left">Повна назва</th>
                  <th className="p-2 border w-40">Штрихкод</th>
                  <th className="p-2 border w-40">Артикул</th>
                  <th className="p-2 border w-28">К-сть</th>
                  <th className="p-2 border w-56">Категорія</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-center text-gray-500">Немає товарів</td></tr>
                ) : products.map((p) => {
                  const img = p.Photo ? `http://localhost:8000/api/preview/${p.Photo}` : null;
                  const catName = categoriesById.get(p.CategoryID)?.CategoryName || '';
                  const checked = selectedQty.has(p.ID);
                  const qty = Number(selectedQty.get(p.ID) || 1);
                  return (
                    <tr key={p.ID} className="hover:bg-gray-50">
                      <td className="p-2 border" style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(p.ID)} />
                      </td>
                      <td className="p-2 border">
                        <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {img ? <img src={img} alt={p.Name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 20, color: '#bbb' }}>📷</span>}
                        </div>
                      </td>
                      <td className="p-2 border" style={{ fontWeight: 600 }}>{p.FullName || p.Name}</td>
                      <td className="p-2 border" style={{ fontFamily: 'monospace' }}>{p.Barcode || ''}</td>
                      <td className="p-2 border" style={{ fontFamily: 'monospace' }}>{p.Article || ''}</td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={qty}
                          disabled={!checked}
                          onChange={(e) => setQty(p.ID, e.target.value)}
                          className="border rounded p-1 w-24 text-right"
                        />
                      </td>
                      <td className="p-2 border">{catName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {products.map((p) => {
              const img = p.Photo ? `http://localhost:8000/api/preview/${p.Photo}` : null;
              const checked = selectedQty.has(p.ID);
              const qty = Number(selectedQty.get(p.ID) || 1);
              return (
                <div key={p.ID} className="border rounded" style={{ background: '#fff', padding: 12 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {img ? <img src={img} alt={p.Name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 22, color: '#bbb' }}>📷</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{p.FullName || p.Name}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#555' }}>ШК: {p.Barcode || '—'} • Арт.: {p.Article || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(p.ID)} />
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={qty}
                        disabled={!checked}
                        onChange={(e) => setQty(p.ID, e.target.value)}
                        className="border rounded p-1 w-24 text-right"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => navigate(-1)} style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>Скасувати</button>
          <button onClick={addToArrival} disabled={selectedQty.size === 0 || submitting} style={{ background: selectedQty.size === 0 || submitting ? '#e9ecef' : '#28a745', color: selectedQty.size === 0 || submitting ? '#6c757d' : '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 700, cursor: selectedQty.size === 0 || submitting ? 'not-allowed' : 'pointer' }}>{submitting ? 'Додаю…' : 'Додати в накладну'}</button>
        </div>
      </div>
    </div>
  );
}


