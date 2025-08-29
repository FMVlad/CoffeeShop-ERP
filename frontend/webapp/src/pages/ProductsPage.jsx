import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import Barcode from 'react-barcode';
import { useNavigate } from 'react-router-dom';
import { setSelection } from '../utils/selectionBridge';

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
    const back = params.get('back');
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
      if (back) sessionStorage.setItem('arrival_back_path', back);
    }
  }, []);

  // Одноразова підказка після перенаправлення зі сканера
  useEffect(() => {
    try {
      const shouldNotify = localStorage.getItem("__notify_add_product") === "true";
      if (shouldNotify) {
        localStorage.removeItem("__notify_add_product");
        // Показуємо ненав'язливий банер підказки у верхній частині
        const hint = document.createElement('div');
        hint.textContent = 'Штрихкод не знайдено. Натисніть "+ Додати", щоб створити товар.';
        hint.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#fff3cd;color:#856404;border:1px solid #ffeeba;padding:10px 14px;border-radius:8px;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-weight:600';
        document.body.appendChild(hint);
        setTimeout(() => { try { document.body.removeChild(hint); } catch {} }, 3000);
      }
    } catch {}
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
              if (back) window.location.assign(decodeURIComponent(back));
              else window.history.back();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 flex flex-col">
      {/* Header з градієнтом */}
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              📦 Товари
            </h1>
            <p className="text-2xl text-purple-100">
              Каталог товарів з характеристиками та цінами
            </p>
          </div>
        </div>
        {/* Кнопки управління */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dictionaries")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-base hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              ← Назад до довідників
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-6 py-3 rounded-xl font-bold text-base hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              🏠 На головну
            </button>
          </div>
          <button
            onClick={() => {
              setEditingProductId(null);
              setShowProductCard(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-violet-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Додати товар
          </button>
        </div>

        {/* Фільтри та пошук */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 mb-12 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-8 py-6 border-b-2 border-purple-200">
            <h3 className="text-2xl font-bold text-purple-800">
              🔍 Пошук та фільтрація
            </h3>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Пошук товару
                </label>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Введіть назву або штрихкод..."
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                />
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Категорія
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                >
                  <option value="">Усі категорії</option>
                  {getIndentedCategories(categories).map(cat => (
                    <option key={cat.ID} value={cat.ID}>
                      {cat._level > 0 ? "— ".repeat(cat._level) + "▶ " : ""}
                      {cat.CategoryName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => { setSearch(''); setCategory(''); }}
                  className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-6 py-3 rounded-xl font-bold text-base hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  🔄 Скинути
                </button>
                <div className="flex gap-2">
                  <span className="text-base font-semibold text-gray-700 self-center">Вигляд:</span>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-4 py-3 rounded-xl font-bold text-base transition-all duration-300 ${
                      viewMode === 'cards' 
                        ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    🎴 Картки
                  </button>
                  <button
                    onClick={() => setViewMode('rows')}
                    className={`px-4 py-3 rounded-xl font-bold text-base transition-all duration-300 ${
                      viewMode === 'rows' 
                        ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    📋 Рядки
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Список товарів */}
        {loading ? (
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 p-16 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <div className="text-2xl font-bold text-purple-800 mb-2">Завантаження...</div>
            <div className="text-lg text-gray-600">Будь ласка, зачекайте</div>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map(product => {
              const categoryObj = categories.find(c => c.ID === product.CategoryID);
              return (
                <div
                  key={product.ID}
                  className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 overflow-hidden hover:shadow-3xl hover:-translate-y-2 transition-all duration-500 cursor-pointer"
                  onClick={() => {
                    setEditingProductId(product.ID);
                    setShowProductCard(true);
                  }}
                >
                  {/* Фото товару */}
                  <div className="relative h-48 w-full bg-gradient-to-br from-purple-50 to-violet-50 p-6">
                    {product.Photo ? (
                      <img
                        src={`http://localhost:8000/api/preview/${product.Photo}`}
                        alt={product.Name}
                        className="w-full h-full object-contain rounded-2xl"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl flex items-center justify-center">
                        <div className="text-6xl text-purple-300">📷</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Інформація про товар */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                      {product.FullName || product.Name}
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-purple-600">Категорія:</span>
                        <span className="text-sm text-gray-600">
                          {categoryObj?.CategoryName || 'Не вказана'}
                        </span>
                      </div>
                      {product.Barcode && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-purple-600">Штрихкод:</span>
                          <span className="text-sm text-gray-600 font-mono">{product.Barcode}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Кнопки дій */}
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProductId(product.ID);
                          setShowProductCard(true);
                        }}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-2xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                      >
                        ✏️ Редагувати
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelection([product]);
                          navigate('/');
                        }}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-2xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                      >
                        ✅ Вибрати
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-8 py-6 border-b-2 border-purple-200">
              <h3 className="text-2xl font-bold text-purple-800">
                📋 Список товарів ({products.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-100 to-violet-100">
                  <tr>
                    <th className="px-8 py-4 text-left text-lg font-bold text-purple-800">Назва</th>
                    <th className="px-8 py-4 text-left text-lg font-bold text-purple-800">Категорія</th>
                    <th className="px-8 py-4 text-left text-lg font-bold text-purple-800">Штрихкод</th>
                    <th className="px-8 py-4 text-center text-lg font-bold text-purple-800">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-purple-50">
                  {products.map((product) => {
                    const categoryObj = categories.find(c => c.ID === product.CategoryID);
                    return (
                      <tr key={product.ID} className="hover:bg-purple-50 transition-colors duration-200">
                        <td className="px-8 py-4 text-lg font-semibold text-gray-800">
                          {product.FullName || product.Name}
                        </td>
                        <td className="px-8 py-4 text-lg text-gray-600">
                          {categoryObj?.CategoryName || '-'}
                        </td>
                        <td className="px-8 py-4 text-lg text-gray-600 font-mono">
                          {product.Barcode || '-'}
                        </td>
                        <td className="px-8 py-4 text-center">
                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={() => {
                                setEditingProductId(product.ID);
                                setShowProductCard(true);
                              }}
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => {
                                setSelection([product]);
                                navigate('/');
                              }}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                            >
                              ✅
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Футер */}
      <footer className="mt-auto border-t-2 border-purple-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-center gap-6">
          <div className="text-center">
            <span className="text-2xl font-bold text-purple-800 tracking-wide">
              📦 Товари VYSHNIA
            </span>
            <p className="text-purple-600 text-base mt-1">
              Система управління товарами
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
