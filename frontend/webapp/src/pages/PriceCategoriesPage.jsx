import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const roundingOptions = [0.05, 0.25, 0.5, 1, 5, 10];

export default function PriceCategoriesPage() {
  const navigate = useNavigate();
  // --- Категорії цін ---
  const [priceCategories, setPriceCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');

  // --- Категорії товару ---
  const [productCategories, setProductCategories] = useState([]);

  // --- Націнки по категоріях ---
  const [margins, setMargins] = useState([]);
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [editMargin, setEditMargin] = useState(null);
  const [marginForm, setMarginForm] = useState({
    CategoryID: '',
    PriceCategoryID: '',
    MarginPercent: '',
    Rounding: 1,
  });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [priceCats, prodCats, marginsData] = await Promise.all([
        api.getPriceCategories(),
        api.getCategories(),
        api.getCategoryMargins(),
      ]);

      console.log('🔍 PriceCategoriesPage: Отримано категорії цін:', priceCats);
      setPriceCategories(Array.isArray(priceCats) ? priceCats : []);

      console.log('🔍 PriceCategoriesPage: Отримано категорії товару:', prodCats);
      setProductCategories(Array.isArray(prodCats) ? prodCats : []);

      console.log('🔍 PriceCategoriesPage: Отримано націнки:', marginsData);
      setMargins(Array.isArray(marginsData) ? marginsData : []);
    } catch (error) {
      console.error('❗ PriceCategoriesPage: Не вдалося завантажити довідники для сторінки категорій цін', error);
      setPriceCategories([]);
      setProductCategories([]);
      setMargins([]);
    }
  }

  // --- Категорії цін (CRUD)
  function openAddCategory() {
    setEditCategory(null);
    setCategoryName('');
    setShowCategoryModal(true);
  }
  function openEditCategory(cat) {
    setEditCategory(cat);
    setCategoryName(cat.Name);
    setShowCategoryModal(true);
  }
  function closeCategoryModal() {
    setEditCategory(null);
    setCategoryName('');
    setShowCategoryModal(false);
  }
  async function handleCategorySubmit(e) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    if (editCategory) {
      await api.updatePriceCategory(editCategory.ID, { CategoryName: categoryName });
    } else {
      await api.addPriceCategory({ CategoryName: categoryName });
    }
    closeCategoryModal();
    await loadAll();
  }
  async function handleDeleteCategory(id) {
    if (window.confirm("Видалити категорію?")) {
      await api.deletePriceCategory(id);
      await loadAll();
    }
  }

  // --- Націнки (CRUD)
  function openAddMargin() {
    setEditMargin(null);
    setMarginForm({ CategoryID: '', PriceCategoryID: '', MarginPercent: '', Rounding: 1 });
    setShowMarginModal(true);
  }
  function openEditMargin(m) {
    setEditMargin(m);
    setMarginForm({
      CategoryID: m.CategoryID,
      PriceCategoryID: m.PriceCategoryID,
      MarginPercent: m.MarginPercent,
      Rounding: m.Rounding,
    });
    setShowMarginModal(true);
  }
  function closeMarginModal() {
    setEditMargin(null);
    setShowMarginModal(false);
  }
  async function handleMarginSubmit(e) {
    e.preventDefault();
    if (!marginForm.CategoryID || !marginForm.PriceCategoryID) return;
    if (editMargin) {
      await api.updateCategoryMargin(editMargin.ID, marginForm);
    } else {
      await api.addCategoryMargin(marginForm);
    }
    closeMarginModal();
    await loadAll();
  }
  async function handleDeleteMargin(id) {
    if (window.confirm("Видалити націнку?")) {
      await api.deleteCategoryMargin(id);
      await loadAll();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              🏷️ Категорії цін
            </h1>
            <p className="text-2xl text-amber-100">
              Управління категоріями цін та націнками
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
              ← Назад до довідників
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              🏠 На головну
            </button>
          </div>
          <button
            onClick={openAddCategory}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Додати категорію
          </button>
        </div>
        <table style={{
          width: '100%',
          background: '#fff',
          marginBottom: 32,
          borderCollapse: 'separate',
          borderSpacing: 0,
          borderRadius: 12,
          boxShadow: '0 2px 12px #0001',
          overflow: 'hidden',
          fontSize: 18
        }}>
          <thead>
            <tr style={{ background: '#ede7fb' }}>
              <th style={{
                textAlign: 'left', padding: '10px 12px',
                border: '1px solid #d1c4e9', fontWeight: 700, fontSize: 18
              }}>Назва</th>
              <th style={{
                textAlign: 'center', border: '1px solid #d1c4e9', fontWeight: 700, fontSize: 18
              }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(priceCategories) && priceCategories.length > 0 ? (
              priceCategories.map(cat => (
                                 <tr key={cat.ID} style={{ background: '#f8f6ff' }}>
                   <td style={{ border: '1px solid #d1c4e9', padding: '10px 12px', minWidth: 220 }}>{cat.Name}</td>
                  <td style={{ textAlign: 'center', border: '1px solid #d1c4e9' }}>
                    <button onClick={() => openEditCategory(cat)} style={{ fontSize: 22, marginRight: 8 }}>✏️</button>
                    <button onClick={() => handleDeleteCategory(cat.ID)} style={{ fontSize: 22 }}>🗑️</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  {Array.isArray(priceCategories) ? 'Категорії цін не знайдено' : 'Завантаження...'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Модалка додавання/редагування категорії */}
        {showCategoryModal && (
          <div style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)', zIndex: 9999,
          }}>
            <form onSubmit={handleCategorySubmit} style={{
              background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px #0002',
              padding: 36, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 320
            }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                {editCategory ? 'Редагувати категорію цін' : 'Нова категорія цін'}
              </div>
              <input
                style={{ border: '1px solid #ccc', borderRadius: 8, padding: '12px 16px', fontSize: 18 }}
                placeholder="Назва категорії цін"
                value={categoryName}
                autoFocus
                onChange={e => setCategoryName(e.target.value)}
                required
                maxLength={60}
              />
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <button type="submit" style={{ background: '#00b894', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 600, fontSize: 16 }}>Зберегти</button>
                <button type="button" style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 600, fontSize: 16 }} onClick={closeCategoryModal}>Скасувати</button>
              </div>
            </form>
          </div>
        )}

        {/* Націнки по категоріях */}
        <div style={{
          background: 'linear-gradient(90deg,#7b6eea 0%,#a37c2d 100%)',
          borderRadius: 18,
          padding: '18px 32px',
          marginBottom: 32,
          marginTop: 24,
          boxShadow: '0 2px 12px #0001',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontWeight: 700, fontSize: 24, color: '#fff' }}>Націнки по категоріях</span>
          <button
            onClick={openAddMargin}
            style={{
              background: '#00b894',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 32px',
              fontWeight: 700,
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #0002'
            }}
          >+ Додати</button>
        </div>
        <table style={{
          width: '100%',
          background: '#fff',
          borderCollapse: 'separate',
          borderSpacing: 0,
          borderRadius: 12,
          boxShadow: '0 2px 12px #0001',
          overflow: 'hidden',
          fontSize: 18
        }}>
          <thead>
            <tr style={{ background: '#ede7fb' }}>
              <th style={{ textAlign: 'left', border: '1px solid #d1c4e9', padding: '10px 12px', fontWeight: 700, fontSize: 18 }}>Категорія товару</th>
              <th style={{ textAlign: 'left', border: '1px solid #d1c4e9', padding: '10px 12px', fontWeight: 700, fontSize: 18 }}>Категорія цін</th>
              <th style={{ textAlign: 'left', border: '1px solid #d1c4e9', padding: '10px 12px', fontWeight: 700, fontSize: 18 }}>Націнка, %</th>
              <th style={{ textAlign: 'left', border: '1px solid #d1c4e9', padding: '10px 12px', fontWeight: 700, fontSize: 18 }}>Заокруглення</th>
              <th style={{ textAlign: 'center', border: '1px solid #d1c4e9', fontWeight: 700, fontSize: 18 }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(margins) && margins.length > 0 ? (
              margins.map(m => (
                <tr key={m.ID} style={{ background: '#f8f6ff' }}>
                  <td style={{ border: '1px solid #d1c4e9', padding: '10px 12px', minWidth: 180 }}>
                    {(productCategories || []).find(c => c.ID === m.CategoryID)?.CategoryName || '—'}
                  </td>
                                     <td style={{ border: '1px solid #d1c4e9', minWidth: 180 }}>
                     {(priceCategories || []).find(pc => pc.ID === m.PriceCategoryID)?.Name || '—'}
                   </td>
                  <td style={{ border: '1px solid #d1c4e9', minWidth: 120 }}>
                    {m.MarginPercent !== null && m.MarginPercent !== undefined
                      ? Number(m.MarginPercent).toLocaleString('uk-UA', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td style={{ border: '1px solid #d1c4e9', minWidth: 120 }}>
                    {m.Rounding ? Number(m.Rounding).toLocaleString('uk-UA', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td style={{ textAlign: 'center', border: '1px solid #d1c4e9' }}>
                    <button onClick={() => openEditMargin(m)} style={{ fontSize: 22, marginRight: 8 }}>✏️</button>
                    <button onClick={() => handleDeleteMargin(m.ID)} style={{ fontSize: 22 }}>🗑️</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  {Array.isArray(margins) ? 'Націнки не знайдено' : 'Завантаження...'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Модалка додавання/редагування націнки */}
        {showMarginModal && (
          <div style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)', zIndex: 9999,
          }}>
            <form onSubmit={handleMarginSubmit} style={{
              background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px #0002',
              padding: 36, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 320
            }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                {editMargin ? 'Редагувати націнку' : 'Нова націнка'}
              </div>
              <select
                value={marginForm.CategoryID}
                onChange={e => setMarginForm(f => ({ ...f, CategoryID: Number(e.target.value) }))}
                required
                style={{ padding: 14, borderRadius: 8, border: '1px solid #ccc', fontSize: 18 }}
              >
                <option value="">Категорія товару</option>
                {productCategories.map(c => (
                  <option key={c.ID} value={c.ID}>{c.CategoryName}</option>
                ))}
              </select>
              <select
                value={marginForm.PriceCategoryID}
                onChange={e => setMarginForm(f => ({ ...f, PriceCategoryID: Number(e.target.value) }))}
                required
                style={{ padding: 14, borderRadius: 8, border: '1px solid #ccc', fontSize: 18 }}
              >
                <option value="">Категорія цін</option>
                {priceCategories.map(pc => (
                  <option key={pc.ID} value={pc.ID}>{pc.Name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Націнка, %"
                value={marginForm.MarginPercent}
                onChange={e => setMarginForm(f => ({ ...f, MarginPercent: e.target.value }))}
                required
                min={0}
                style={{ padding: 14, borderRadius: 8, border: '1px solid #ccc', fontSize: 18 }}
              />
              <select
                value={marginForm.Rounding}
                onChange={e => setMarginForm(f => ({ ...f, Rounding: Number(e.target.value) }))}
                style={{ padding: 14, borderRadius: 8, border: '1px solid #ccc', fontSize: 18 }}
              >
                {roundingOptions.map(val =>
                  <option key={val} value={val}>{val.toLocaleString('uk-UA', { minimumFractionDigits: 2 })}</option>
                )}
              </select>
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <button type="submit" style={{ background: '#00b894', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 600, fontSize: 16 }}>Зберегти</button>
                <button type="button" style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 600, fontSize: 16 }} onClick={closeMarginModal}>Скасувати</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
} 
