import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import Barcode from 'react-barcode';
import { useNavigate } from 'react-router-dom';

const headerStyle = {
  background: 'linear-gradient(90deg,#7c6aea 0%,#a798f6 70%,#b7862b 100%)',
  borderRadius: '20px',
  padding: '24px 36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 32,
  minHeight: 60,
  color: '#fff',
  boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
  position: 'relative',
};

// ——— утиліта для ієрархії
function getIndentedCategories(categories, parentId = null, level = 0) {
  let result = [];
  categories
    .filter(c => String(c.ParentID) === String(parentId))
    .forEach(c => {
      result.push({ ...c, _level: level });
      result = result.concat(getIndentedCategories(categories, c.ID, level + 1));
    });
  return result;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showProductCard, setShowProductCard] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'rows'
  const [previewSrc, setPreviewSrc] = useState(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // Prefill для режиму швидкого додавання з вибірника/сканера
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const source = params.get('source');
    const prefill = sessionStorage.getItem('prefill_barcode') || '';
    if (mode === 'add') {
      setEditingProductId(null);
      setShowProductCard(true);
      // Передамо штрихкод у форму картки через sessionStorage
      if (prefill) {
        sessionStorage.setItem('productcard_prefill_barcode', prefill);
        sessionStorage.removeItem('prefill_barcode');
      }
      if (source === 'selector') {
        sessionStorage.setItem('productcard_enable_quick_add', '1');
      } else {
        sessionStorage.removeItem('productcard_enable_quick_add');
      }
    }
  }, []);

  useEffect(() => {
    api.getCategories().then(cats => setCategories(cats || []));
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [search, category]);

  const loadData = async () => {
    setLoading(true);
    try {
      const productsData = await api.getProducts(search, category);
      const productsWithFullName = await Promise.all(
        (Array.isArray(productsData) ? productsData : []).map(async (prod) => {
          try {
            const fullNameResp = await api.getProductFullName(prod.ID);
            return { ...prod, FullName: fullNameResp.FullName };
          } catch {
            return { ...prod, FullName: prod.Name };
          }
        })
      );
      setProducts(productsWithFullName);
    } catch (error) {
      console.error('❌ Помилка завантаження:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (window.confirm('Видалити цей товар?')) {
      await api.deleteProduct(product.ID);
      loadData();
    }
  };

  if (showProductCard) {
    return (
      <div style={{ marginLeft: 240, padding: 20 }}>
        <ProductCard
          productId={editingProductId}
          onSave={() => {
            setShowProductCard(false);
            setEditingProductId(null);
            loadData();
          }}
          onCancel={() => {
            setShowProductCard(false);
            setEditingProductId(null);
            // Якщо прийшли у режимі додавання з накладної — повертаємось назад
            const params = new URLSearchParams(window.location.search);
            if (params.get('mode') === 'add') {
              const back = sessionStorage.getItem('arrival_back_path');
              if (back) window.location.assign(back);
              else window.history.back();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',
      minHeight: '100vh', width: '100vw', padding: '32px 0'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* --- Шапка --- */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 34 }}>📦</span>
            <span style={{ fontWeight: 700, fontSize: 27, letterSpacing: 0.4 }}>Товари</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: '#f2f2f2', color: '#636e72', border: 'none', borderRadius: 8,
                padding: '12px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 16,
                marginRight: 4
              }}
            >← На головну</button>
            <button
              onClick={() => {
                setEditingProductId(null);
                setShowProductCard(true);
              }}
              style={{
                background: '#00b894', color: '#fff', border: 'none', borderRadius: 8,
                padding: '12px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 17,
                boxShadow: '0 2px 6px #b7862b44'
              }}
            >+ Додати</button>
          </div>
        </div>
        {/* --- Фільтри --- */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 26, alignItems: 'center', justifyContent: 'flex-start',
        }}>
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Пошук товару…"
            style={{
              flex: 2, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16,
            }}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
          >
            <option value="">Усі категорії</option>
            {getIndentedCategories(categories).map(cat => (
              <option key={cat.ID} value={cat.ID}>
                {cat._level > 0 ? "— ".repeat(cat._level) + "▶ " : ""}
                {cat.CategoryName}
              </option>
          ))}
        </select>
          <button
            onClick={() => { setSearch(''); setCategory(''); }}
            style={{
              background: '#636e72', color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px 24px', fontWeight: 700, cursor: 'pointer'
            }}
          >Скинути</button>
          {new URLSearchParams(window.location.search).get('mode') === 'add' && (
            <div style={{ marginLeft: 12, color: '#8a6d3b', background: '#fcf8e3', border: '1px solid #faebcc', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
              Відскановано новий штрихкод. Щоб додати товар — натисніть “+ Додати”. Після збереження ви повернетесь у документ для продовження.
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#4a4a4a', fontWeight: 600 }}>Вигляд:</span>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                background: viewMode === 'cards' ? '#4c6ef5' : '#f2f2f2',
                color: viewMode === 'cards' ? '#fff' : '#636e72',
                border: 'none', borderRadius: 8, padding: '10px 14px', fontWeight: 700, cursor: 'pointer'
              }}
            >Картки</button>
            <button
              onClick={() => setViewMode('rows')}
              style={{
                background: viewMode === 'rows' ? '#4c6ef5' : '#f2f2f2',
                color: viewMode === 'rows' ? '#fff' : '#636e72',
                border: 'none', borderRadius: 8, padding: '10px 14px', fontWeight: 700, cursor: 'pointer'
              }}
            >Рядки</button>
          </div>
        </div>
        {/* --- Список товарів --- */}
        {loading ? (
          <div style={{
            textAlign: "center", color: "#636e72", fontSize: 22, padding: 100
          }}>
            Завантаження...
      </div>
        ) : viewMode === 'cards' ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20
          }}>
            {products.map(product => {
              const categoryObj = categories.find(c => c.ID === product.CategoryID);
              return (
                <div
                  key={product.ID}
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    transition: "all 0.3s",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: 420
                  }}
                >
                  <div style={{ position: "relative", height: 120, width: 120, margin: "0 auto" }}>
                    {product.Photo ? (
                      <img
                        src={`http://localhost:8000/api/preview/${product.Photo}`}
                        alt={product.Name}
                      style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          borderRadius: 12,
                          background: "#f8f9fa"
                        }}
                    />
                  ) : (
                      <div style={{
                        width: "100%",
                        height: "100%",
                        background: "#f8f9fa",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12
                      }}>
                        <div style={{ fontSize: 32, color: "#ccc" }}>📷</div>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "20px", flex: 1 }}>
                    <h3 style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#2d3436",
                      margin: "0 0 8px 0",
                      lineHeight: 1.3
                    }}>
                      {product.FullName || product.Name}
                    </h3>
                    <div style={{
                      color: '#c4282d',
                      fontWeight: 600,
                      fontSize: 15,
                      marginBottom: 6,
                      letterSpacing: 0.2,
                      minHeight: 18
                    }}>
                      {categoryObj?.CategoryName || '—'}
                    </div>
                    <div style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <Barcode
                        value={product.Barcode || "0000000000000"}
                        width={2.2}
                        height={40}
                        fontSize={18}
                        displayValue={true}
                        margin={0}
                        background="#fff"
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: "auto", justifyContent: "center", padding: 20 }}>
                    <button
                      onClick={() => {
                        setEditingProductId(product.ID);
                        setShowProductCard(true);
                      }}
                      style={{
                        flex: 1,
                        background: "#3498db",
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        padding: "12px",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer"
                      }}
                    >
                      ✏️ Редагувати
                    </button>
                  <button
                      onClick={() => handleDeleteProduct(product)}
                      style={{
                        flex: 1,
                        background: "#e74c3c",
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        padding: "12px",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer"
                      }}
                    >
                      🗑️ Видалити
                  </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <table className="w-full bg-white rounded border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border w-24">Фото</th>
                  <th className="p-2 border text-left">Повна назва</th>
                  <th className="p-2 border w-40">Штрихкод</th>
                  <th className="p-2 border w-40">Артикул</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">Немає товарів</td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.ID} className="hover:bg-gray-50 cursor-pointer" onDoubleClick={() => { setEditingProductId(p.ID); setShowProductCard(true); }}>
                      <td className="p-2 border">
                        <div
                          title={p.Photo ? 'Клік для превʼю' : ''}
                          style={{ width: 96, height: 96, borderRadius: 8, overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: p.Photo ? 'zoom-in' : 'default' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.Photo) setPreviewSrc(`http://localhost:8000/api/preview/${p.Photo}`);
                          }}
                        >
                          {p.Photo ? (
                            <img
                              src={`http://localhost:8000/api/preview/${p.Photo}`}
                              alt={p.Name}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: 24, color: '#bbb' }}>📷</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 border" style={{ fontWeight: 600, color: '#2d3436' }}>{p.FullName || p.Name}</td>
                      <td className="p-2 border" style={{ fontFamily: 'monospace' }}>{String(p.Barcode || '')}</td>
                      <td className="p-2 border" style={{ fontFamily: 'monospace' }}>{p.Article || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {previewSrc && (
              <div
                onClick={() => setPreviewSrc(null)}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                }}
              >
                <img
                  src={previewSrc}
                  alt="preview"
                  style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
