import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function ProductDirectoryModal({ isOpen, onClose, onAdd }) {
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (!isOpen) return;
    api.getCategories().then((cats) => setCategories(Array.isArray(cats) ? cats : []));
  }, [isOpen]);

  useEffect(() => {
    let done = false;
    async function run() {
      if (!isOpen) return;
      const s = (search || "").trim();
      if (s.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const arr = await api.searchProducts(s);
        if (done) return;
        setResults(Array.isArray(arr) ? arr : []);
      } finally {
        if (!done) setLoading(false);
      }
    }
    run();
    return () => {
      done = true;
    };
  }, [isOpen, search]);

  const categoriesById = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => map.set(c.ID, c));
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    let arr = Array.isArray(results) ? results : [];
    if (categoryId) arr = arr.filter((p) => String(p.CategoryID) === String(categoryId));
    // Сортування по категоріях, потім по назві
    return arr.slice().sort((a, b) => {
      const ca = categoriesById.get(a.CategoryID)?.CategoryName || "";
      const cb = categoriesById.get(b.CategoryID)?.CategoryName || "";
      if (ca.toLowerCase() < cb.toLowerCase()) return -1;
      if (ca.toLowerCase() > cb.toLowerCase()) return 1;
      const na = (a.FullName || a.Name || "").toLowerCase();
      const nb = (b.FullName || b.Name || "").toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });
  }, [results, categoryId, categoriesById]);

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const selected = filtered.filter((p) => selectedIds.has(p.ID));
    if (selected.length === 0) return;
    onAdd?.(selected);
    setSelectedIds(new Set());
    onClose?.();
  }

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", width: "min(1100px, 95vw)", maxHeight: "90vh", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", gap: 12, alignItems: "center" }}>
          <strong style={{ fontSize: 18 }}>Довідник товарів</strong>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук: повна назва (частинами) або штрихкод"
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ minWidth: 220, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          >
            <option value="">Усі категорії</option>
            {categories.map((c) => (
              <option key={c.ID} value={c.ID}>{c.CategoryName}</option>
            ))}
          </select>
          <button onClick={onClose} style={{ background: "#e9ecef", color: "#333", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>Закрити</button>
        </div>

        <div style={{ padding: 12, overflow: "auto" }}>
          {loading ? (
            <div className="p-3 text-gray-500">Пошук…</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-gray-500">Введіть 2+ символи для пошуку</div>
          ) : (
            <table className="w-full bg-white border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border w-10"></th>
                  <th className="p-2 border w-20">Фото</th>
                  <th className="p-2 border text-left">Назва</th>
                  <th className="p-2 border w-40">Штрихкод</th>
                  <th className="p-2 border w-40">Артикул</th>
                  <th className="p-2 border w-56">Категорія</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const img = p.Photo ? `http://localhost:8000/api/preview/${p.Photo}` : null;
                  const catName = categoriesById.get(p.CategoryID)?.CategoryName || "";
                  return (
                    <tr key={p.ID} className="hover:bg-gray-50">
                      <td className="p-2 border" style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={selectedIds.has(p.ID)} onChange={() => toggle(p.ID)} />
                      </td>
                      <td className="p-2 border">
                        <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {img ? <img src={img} alt={p.Name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 18, color: '#bbb' }}>📷</span>}
                        </div>
                      </td>
                      <td className="p-2 border" style={{ fontWeight: 600 }}>{p.FullName || p.Name}</td>
                      <td className="p-2 border" style={{ fontFamily: 'monospace' }}>{p.Barcode || ''}</td>
                      <td className="p-2 border" style={{ fontFamily: 'monospace' }}>{p.Article || p.Sku || ''}</td>
                      <td className="p-2 border">{catName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>Скасувати</button>
          <button onClick={handleAdd} disabled={selectedIds.size === 0} style={{ background: selectedIds.size === 0 ? '#e9ecef' : '#28a745', color: selectedIds.size === 0 ? '#6c757d' : '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer' }}>Додати в накладну</button>
        </div>
      </div>
    </div>
  );
}


