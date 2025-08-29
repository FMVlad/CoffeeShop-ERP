import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useUser } from "../UserContext";
import TableSettings from "../components/TableSettings";
import "../styles/TableStyles.css";

export default function StockStatePage() {
  const navigate = useNavigate();
  const { employee, centerId: userCenterId } = useUser();
  
  console.log('🔍 StockStatePage: employee:', employee);
  console.log('🔍 StockStatePage: userCenterId (з UserContext):', userCenterId);
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [priceCategories, setPriceCategories] = useState([]);
  const [priceCategoryId, setPriceCategoryId] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [qtyFilter, setQtyFilter] = useState("");
  const [onlyWeight, setOnlyWeight] = useState(false);
  const [onlyPiece, setOnlyPiece] = useState(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [discountFilter, setDiscountFilter] = useState("");
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [tableColumns, setTableColumns] = useState([
    { key: 'photo', title: 'Фото', description: 'Зображення товару', visible: true },
    { key: 'product', title: 'Товар', description: 'Назва товару', visible: true },
    { key: 'barcode', title: 'Штрихкод', description: 'Штрихкод товару', visible: true },
    { key: 'article', title: 'Артикул', description: 'Артикул товару', visible: true },
    { key: 'quantity', title: 'К-сть', description: 'Кількість на складі', visible: true },
    { key: 'warehouse', title: 'Склад', description: 'Назва складу', visible: false },
    { key: 'costPrice', title: 'Собівартість', description: 'Собівартість товару', visible: true },
    { key: 'retailPrice', title: 'Роздрібна ціна', description: 'Роздрібна ціна', visible: true },
    { key: 'retailWithDiscount', title: 'Роздрібна (зі знижкою)', description: 'Роздрібна ціна зі знижкою', visible: true },
    { key: 'discountPrice', title: 'Уцінена ціна', description: 'Уцінена ціна', visible: true },
    { key: 'amount', title: 'Сума', description: 'Загальна сума', visible: true },
    { key: 'category', title: 'Категорія', description: 'Категорія товару', visible: false },
    { key: 'manufacturer', title: 'Виробник', description: 'Назва виробника', visible: false },
    { key: 'unit', title: 'Одиниця', description: 'Одиниця виміру', visible: false },
    { key: 'vat', title: 'ПДВ', description: 'Ставка ПДВ', visible: false },
    { key: 'lastUpdate', title: 'Оновлено', description: 'Дата останнього оновлення', visible: false }
  ]);

  // Функції для роботи з налаштуваннями таблиці
  const handleSaveTableSettings = (newColumns) => {
    console.log('🔍 Зберігаємо налаштування таблиці:', newColumns);
    setTableColumns(newColumns);
    localStorage.setItem('stockStateTableSettings', JSON.stringify(newColumns));
    console.log('✅ Налаштування таблиці збережено в localStorage');
  };

  const visibleColumns = useMemo(() => {
    const visible = tableColumns.filter(col => col.visible);
    console.log('🔍 Видимі колонки таблиці:', visible.map(col => col.title));
    return visible;
  }, [tableColumns]);

  // Функція для рендерингу значень комірок таблиці
  const renderCellValue = (row, columnKey) => {
    switch (columnKey) {
      case 'photo':
        return row.Photo ? (
          <img
            src={`http://localhost:8000/api/preview/${row.Photo}`}
            alt="Фото товару"
            className="w-16 h-16 object-cover rounded-xl cursor-pointer hover:scale-110 transition-transform duration-200"
            onClick={() => setPreviewSrc(`http://localhost:8000/api/preview/${row.Photo}`)}
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
            —
          </div>
        );
      
      case 'product':
        return (
          <div className="font-semibold text-gray-800">
            {row.FullName || row.Name || row.ProductName || `Товар #${row.ProductID}`}
          </div>
        );
      
      case 'barcode':
        return (
          <div className="font-mono text-gray-600">
            {row.Barcode || row.BarCode || '—'}
          </div>
        );
      
      case 'article':
        return (
          <div className="text-gray-700">
            {row.Article || row.ArticleCode || '—'}
          </div>
        );
      
      case 'quantity':
        return (
          <div className="text-right font-mono">
            <span className={`font-bold ${Number(row.Qty || row.Quantity || 0) > 0 ? 'text-green-600' : Number(row.Qty || row.Quantity || 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {Number(row.Qty || row.Quantity || 0).toFixed(2)}
            </span>
          </div>
        );
      
      case 'warehouse':
        return (
          <div className="text-gray-700">
            {warehouses.find(w => w.ID === warehouseId)?.Name || '—'}
          </div>
        );
      
      case 'costPrice':
        return (
          <div className="text-right font-mono">
            {Number(row.AvgCost || 0).toFixed(2)}
          </div>
        );
      
      case 'retailPrice':
        return (
          <div className="text-right font-mono">
            {Number(row.Price || 0).toFixed(2)}
          </div>
        );
      
      case 'retailWithDiscount':
        return (
          <div className="text-right font-mono text-green-600 font-bold">
            {Number(row.PriceWithDiscount || row.Price || 0).toFixed(2)}
          </div>
        );
      
      case 'discountPrice':
        return (
          <div className="text-right font-mono text-red-600 font-bold">
            {Number(row.PriceWithDiscount || row.Price || 0).toFixed(2)}
          </div>
        );
      
      case 'amount':
        return (
          <div className="text-right font-mono font-bold">
            {(Number(row.Price || 0) * Number(row.Qty || row.Quantity || 0)).toFixed(2)}
          </div>
        );
      
      case 'category':
        return (
          <div className="text-gray-700">
            {categories.find(c => c.ID === row.CategoryID)?.Name || '—'}
          </div>
        );
      
      case 'manufacturer':
        return (
          <div className="text-gray-700">
            {row.Manufacturer || '—'}
          </div>
        );
      
      case 'unit':
        return (
          <div className="text-gray-700">
            {row.Unit || '—'}
          </div>
        );
      
      case 'vat':
        return (
          <div className="text-gray-700">
            {row.IsVAT ? 'Так' : 'Ні'}
          </div>
        );
      
      case 'lastUpdate':
        return (
          <div className="text-gray-700">
            {row.LastUpdate ? new Date(row.LastUpdate).toLocaleDateString('uk-UA') : '—'}
          </div>
        );
      
      default:
        return <div className="text-gray-500">—</div>;
    }
  };

  // Визначаємо, чи це режим вибору для документа уцінки
  const isDiscountDocMode = (typeof window !== 'undefined') &&
    new URLSearchParams(window.location.search).get('key') === 'discount_doc';

  // Завантаження даних
  useEffect(() => {
    console.log('🔍 StockStatePage: Початкове завантаження даних, employee:', employee);
    (async () => {
      try {
        const [centersData, categoriesData, priceCategoriesData] = await Promise.all([
          api.getCenters().catch(() => []),
          api.getCategories().catch(() => []),
          api.getPriceCategories().catch(() => [])
        ]);

        console.log('🔍 StockStatePage: Отримані центри:', centersData);
        console.log('🔍 StockStatePage: Активні центри:', centersData?.filter(c => c.IsActive));
        console.log('🔍 StockStatePage: Всі центри (детально):', centersData?.map(c => ({ ID: c.ID, Name: c.Name, IsActive: c.IsActive })));
        setCenters(Array.isArray(centersData) ? centersData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);

        if (Array.isArray(priceCategoriesData)) {
          setPriceCategories(priceCategoriesData);
        } else if (priceCategoriesData?.categories && Array.isArray(priceCategoriesData.categories)) {
          setPriceCategories(priceCategoriesData.categories);
        } else {
          setPriceCategories([]);
        }
        
        // Автоматично вибираємо центр зі статусбару (UserContext)
        if (userCenterId) {
          console.log('🔍 StockStatePage: Встановлюємо центр зі статусбару (UserContext):', userCenterId);
          setCenterId(userCenterId);
        } else if (centersData && centersData.length > 0) {
          // Fallback - якщо немає центру в UserContext, беремо перший активний
          const activeCenter = centersData.find(c => c.IsActive) || centersData[0];
          console.log('🔍 StockStatePage: Fallback - встановлюємо перший активний центр:', activeCenter.ID);
          setCenterId(activeCenter.ID);
        }
      } catch (error) {
        console.error('Помилка завантаження даних:', error);
      }
    })();
  }, [employee]);

  // Завантаження збережених налаштувань таблиці
  useEffect(() => {
    const savedSettings = localStorage.getItem('stockStateTableSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        console.log('🔍 Завантажено збережені налаштування таблиці:', parsedSettings);
        setTableColumns(parsedSettings);
      } catch (error) {
        console.error('Помилка завантаження налаштувань таблиці:', error);
      }
    } else {
      console.log('🔍 Використовуємо стандартні налаштування таблиці');
    }
  }, []);

  // Завантаження стану складу
  const load = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      // Логіка для warehouse_id залежно від фільтра
      let warehouse_id;
      if (discountFilter === "with_discount") {
        // Для товарів з уцінкою - передаємо конкретний склад уцінки
        warehouse_id = warehouseId ? Number(warehouseId) : undefined;
      } else if (discountFilter === "without_discount") {
        // Для товарів без уцінки - передаємо конкретний склад (не уцінка)
        warehouse_id = warehouseId ? Number(warehouseId) : undefined;
      } else {
        // Для "Всі товари" - НЕ передаємо warehouse_id, щоб показати всі склади
        warehouse_id = undefined;
      }

      const params = {
        search: search.trim(),
        center_id: centerId ? Number(centerId) : undefined,
        warehouse_id: warehouse_id,
        on_date: date, // Backend очікує on_date
        price_category_id: priceCategoryId ? Number(priceCategoryId) : undefined,
        category_id: categoryId ? Number(categoryId) : undefined,
        qty_filter: qtyFilter || undefined,
        only_weight: onlyWeight || undefined,
        only_piece: onlyPiece || undefined,
        only_discounted: onlyDiscounted || undefined,
        discount_filter: discountFilter || undefined,
        page,
        page_size: pageSize,
        sort_by: sortBy || undefined,
        sort_dir: sortDir || undefined,
      };

      console.log('🔍 StockStatePage: Логіка warehouse_id:');
      console.log('🔍 StockStatePage: - discountFilter:', discountFilter);
      console.log('🔍 StockStatePage: - warehouseId:', warehouseId);
      console.log('🔍 StockStatePage: - warehouse_id (фінальний):', warehouse_id);
      console.log('🔍 StockStatePage: Параметри запиту:', JSON.stringify(params, null, 2));
      const result = await api.get('/stock/state', params);
      console.log('🔍 StockStatePage: Отримана відповідь:', JSON.stringify(result, null, 2));

      if (result && typeof result === 'object') {
        console.log('🔍 StockStatePage: Тип результату - об\'єкт');
        if (Array.isArray(result.items)) {
          console.log('🔍 StockStatePage: result.items є масивом, кількість:', result.items.length);
          setRows(result.items);
          setTotal(result.total || result.items.length);
        } else if (Array.isArray(result.rows)) {
          console.log('🔍 StockStatePage: result.rows є масивом, кількість:', result.rows.length);
          setRows(result.rows);
          setTotal(result.total || result.rows.length);
        } else if (Array.isArray(result)) {
          console.log('🔍 StockStatePage: result є масивом, кількість:', result.length);
          setRows(result);
          setTotal(result.length);
        } else {
          console.log('🔍 StockStatePage: result не є масивом, встановлюємо порожні масиви');
          setRows([]);
          setTotal(0);
        }
      } else {
        console.log('🔍 StockStatePage: result не є об\'єктом, встановлюємо порожні масиви');
        setRows([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Помилка завантаження стану складу:', error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, centerId, warehouseId, date, priceCategoryId, categoryId, qtyFilter, onlyWeight, onlyPiece, onlyDiscounted, discountFilter, page, pageSize, sortBy, sortDir, loading]);

     // Автоматичне завантаження при зміні параметрів
   useEffect(() => {
     console.log('🔍 StockStatePage: useEffect для автоматичного завантаження - warehouseId:', warehouseId, 'centerId:', centerId, 'discountFilter:', discountFilter);
     
     // Завантажуємо товари якщо:
     // 1. Є центр обліку
     // 2. АБО є склад (для конкретних фільтрів)
     // 3. АБО фільтр "Всі товари" (тоді склад не потрібен)
     if (centerId && !loading && rows.length === 0) {
       if (warehouseId || discountFilter === "" || discountFilter === undefined) {
         console.log('🔍 StockStatePage: Автоматично завантажуємо товари');
         load();
       }
     }
   }, [warehouseId, centerId, discountFilter]); // Прибрали load з залежностей

      // Автоматичне оновлення при зміні фільтра товарів
   useEffect(() => {
     console.log('🔍 StockStatePage: Змінився фільтр товарів:', discountFilter);
     
     if (discountFilter && centerId && warehouses.length > 0) {
       
       if (discountFilter === "with_discount") {
         // Для товарів з уцінкою - вибираємо склад "Уцінка" (Type = write_off)
         const discountWarehouse = warehouses.find(w => 
           w.IsActive && w.Type === 'write_off'
         );
         
         if (discountWarehouse && discountWarehouse.ID !== warehouseId) {
           console.log('🔍 StockStatePage: Автоматично переключаємо на склад уцінки:', discountWarehouse);
           setWarehouseId(discountWarehouse.ID);
         }
       } else if (discountFilter === "without_discount") {
         // Для товарів без уцінки - вибираємо головний склад (Type = main)
         const mainWarehouse = warehouses.find(w => 
           w.IsActive && w.Type === 'main'
         );
         
         if (mainWarehouse && mainWarehouse.ID !== warehouseId) {
           console.log('🔍 StockStatePage: Автоматично переключаємо на головний склад:', mainWarehouse);
           setWarehouseId(mainWarehouse.ID);
         }
       } else if (discountFilter === "" || discountFilter === undefined) {
         // Для "Всі товари" - очищаємо warehouseId щоб показати всі склади
         console.log('🔍 StockStatePage: Фільтр "Всі товари" - очищаємо warehouseId для показу всіх складів');
         setWarehouseId("");
       }
     }
   }, [discountFilter, centerId, warehouses, warehouseId]);

  // Завантаження складів при зміні центру
  useEffect(() => {
    if (centerId) {
      console.log('🔍 StockStatePage: Завантаження складів для центру:', centerId);
      api.getWarehouses(centerId).then(data => {
        console.log('🔍 StockStatePage: Отримані склади:', data);
        const warehousesData = Array.isArray(data) ? data : [];
        setWarehouses(warehousesData);
        
                          // Автоматично вибираємо склад залежно від фільтра
         if (warehousesData.length > 0 && !warehouseId) {
           if (discountFilter === "with_discount") {
             // Для товарів з уцінкою - вибираємо склад "Уцінка" (Type = write_off)
             const discountWarehouse = warehousesData.find(w => 
               w.IsActive && w.Type === 'write_off'
             );
             
             if (discountWarehouse) {
               console.log('🔍 StockStatePage: Обрано склад уцінки:', discountWarehouse);
               setWarehouseId(discountWarehouse.ID);
               return;
             }
           } else if (discountFilter === "without_discount") {
             // Для товарів без уцінки - вибираємо головний склад (Type = main)
             const mainWarehouse = warehousesData.find(w => 
               w.IsActive && w.Type === 'main'
             );
             
             if (mainWarehouse) {
               console.log('🔍 StockStatePage: Обрано головний склад:', mainWarehouse);
               setWarehouseId(mainWarehouse.ID);
               return;
             }
           }
           
           // Для "Всі товари" - НЕ вибираємо склад автоматично, залишаємо warehouseId = "" щоб показати всі склади
           console.log('🔍 StockStatePage: Для "Всі товари" не вибираємо склад автоматично');
         }
      }).catch((error) => {
        console.error('🔍 StockStatePage: Помилка завантаження складів:', error);
        setWarehouses([]);
      });
    }
  }, [centerId]); // Прибрали warehouseId з залежностей

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              📦 Стан складу
            </h1>
            <p className="text-2xl text-blue-100">
              Актуальні залишки товарів та управління запасами
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
          
          {/* Перемикач вигляду */}
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold text-gray-700">Вигляд:</span>
            <div className="flex bg-white rounded-2xl p-1 shadow-lg">
              <button
                onClick={() => setViewMode("table")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  viewMode === "table" 
                    ? "bg-blue-500 text-white shadow-lg" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                📊 Таблиця
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  viewMode === "cards" 
                    ? "bg-blue-500 text-white shadow-lg" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                🃏 Картки
              </button>
            </div>
            
            {/* Кнопка налаштувань таблиці */}
            {viewMode === "table" && (
              <button
                onClick={() => setShowTableSettings(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
              >
                ⚙️ Налаштування таблиці {visibleColumns.length}/{tableColumns.length}
              </button>
            )}
          </div>
        </div>

        {/* Фільтри та пошук */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">Пошук</label>
              <input
                placeholder="Штрихкод / назва / артикул"
                value={search}
                onChange={(e) => {
                  console.log('🔍 Зміна пошукового запиту:', e.target.value);
                  setSearch(e.target.value);
                }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') {
                    console.log('🔍 Пошук по Enter, поточний запит:', search);
                    load(); 
                  }
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-blue-500 focus:outline-none transition-colors duration-300"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">Центр</label>
              <select
                value={centerId}
                onChange={(e) => {
                  console.log('🔍 Зміна центру обліку:', e.target.value);
                  setCenterId(e.target.value);
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-blue-500 focus:outline-none transition-colors duration-300"
              >
                <option value="">Всі центри</option>
                {centers.map(c => <option key={c.ID} value={c.ID}>{c.Name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">Склад</label>
              <select
                value={warehouseId}
                onChange={(e) => {
                  console.log('🔍 Зміна складу:', e.target.value);
                  setWarehouseId(e.target.value);
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-blue-500 focus:outline-none transition-colors duration-300"
              >
                <option value="">Всі склади</option>
                {warehouses.map(w => (
                  <option key={w.ID} value={w.ID}>{w.Name || w.ID}</option>
                ))}
              </select>
            </div>
                         <div>
               <label className="block text-lg font-semibold text-gray-700 mb-3">Дата</label>
               <input
                 type="date"
                 value={date}
                 onChange={e=>setDate(e.target.value)}
                 className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-blue-500 focus:outline-none transition-colors duration-300"
               />
             </div>
             <div>
               <label className="block text-lg font-semibold text-gray-700 mb-3">Фільтр товарів</label>
               <select
                 value={discountFilter}
                 onChange={(e) => {
                   console.log('🔍 Зміна фільтра товарів:', e.target.value);
                   setDiscountFilter(e.target.value);
                 }}
                 className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-blue-500 focus:outline-none transition-colors duration-300"
               >
                 <option value="">Всі товари (всі склади)</option>
                 <option value="with_discount">Товари з уцінкою (склад Уцінка)</option>
                 <option value="without_discount">Товари без уцінки (всі склади крім Уцінка)</option>
               </select>
             </div>
          </div>

          <div className="flex items-end gap-4">
            <button
              onClick={() => {
                console.log('🔍 Натиснуто кнопку "Оновити"');
                console.log('🔍 Поточні фільтри:', { search, centerId, warehouseId, date, discountFilter });
                load();
              }}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Завантаження…' : '🔄 Оновити'}
            </button>
            {!warehouseId && discountFilter !== "" && discountFilter !== undefined && (
              <div className="text-amber-600 text-sm">
                ⚠️ Виберіть склад для завантаження товарів
              </div>
            )}
            {discountFilter === "" || discountFilter === undefined ? (
              <div className="text-blue-600 text-sm">
                ℹ️ Показуємо товари з усіх складів центру обліку
              </div>
            ) : null}
          </div>
        </div>

        {/* Пагінація */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={()=>setPage(p=>Math.max(1,p-1))}
                disabled={page<=1}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                «
              </button>
              <span className="text-lg font-semibold">Сторінка {page}</span>
              <button
                onClick={()=>{ const max = Math.max(1, Math.ceil(total / pageSize)); setPage(p=>Math.min(max, p+1)); }}
                disabled={page * pageSize >= total}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-gray-700">Розмір сторінки:</span>
              <select
                value={pageSize}
                onChange={e=>{ setPageSize(Number(e.target.value)); setPage(1); }}
                className="p-3 border-2 border-gray-200 rounded-xl text-base focus:border-blue-500 focus:outline-none transition-colors duration-300"
              >
                {[25,50,100,200].map(n=> <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-lg font-semibold text-gray-700">Всього: {total}</span>
            </div>
          </div>
        </div>

        {/* Вміст - таблиця або картки */}
        {viewMode === "table" ? (
          /* Таблиця */
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-100 to-indigo-100">
                    {visibleColumns.map((column) => (
                      <th key={column.key} className="p-4 text-left font-bold text-lg border-b-2 border-blue-200">
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.ID || idx} className="hover:bg-blue-50 transition-colors duration-200 border-b border-blue-100">
                      {visibleColumns.map((column) => (
                        <td key={column.key} className="p-4 text-center">
                          {renderCellValue(row, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500 text-xl">
                Товари не знайдено
              </div>
            )}
          </div>
        ) : (
          /* Картки */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rows.map((row, idx) => (
              <div key={row.ID || idx} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                {/* Фото */}
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  {row.Photo ? (
                    <img
                      src={`http://localhost:8000/api/preview/${row.Photo}`}
                      alt="Фото товару"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setPreviewSrc(`http://localhost:8000/api/preview/${row.Photo}`)}
                    />
                  ) : (
                    <div className="text-6xl text-gray-300">📦</div>
                  )}
                </div>
                
                {/* Інформація */}
                <div className="p-6">
                  <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">
                    {row.FullName || row.Name || row.ProductName || `Товар #${row.ProductID}`}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Артикул:</span>
                      <span className="font-mono">{row.Article || row.ArticleCode || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Штрихкод:</span>
                      <span className="font-mono">{row.Barcode || row.BarCode || '—'}</span>
                    </div>
                                         <div className="flex justify-between">
                       <span>Кількість:</span>
                       <span className={`font-bold ${Number(row.Qty || row.Quantity || 0) > 0 ? 'text-green-600' : Number(row.Qty || row.Quantity || 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                         {Number(row.Qty || row.Quantity || 0).toFixed(2)}
                       </span>
                     </div>
                                         <div className="flex justify-between">
                       <span>Собівартість:</span>
                       <span className="font-bold text-gray-600">{Number(row.AvgCost || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Роздрібна ціна:</span>
                       <span className="font-bold">{Number(row.Price || 0).toFixed(2)}</span>
                     </div>
                     {row.PriceWithDiscount && Number(row.PriceWithDiscount) !== Number(row.Price) && (
                       <div className="flex justify-between">
                         <span>Ціна зі знижкою:</span>
                         <span className="font-bold text-green-600">{Number(row.PriceWithDiscount || 0).toFixed(2)}</span>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            ))}
            
            {rows.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-gray-500 text-xl">
                Товари не знайдено
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модальне вікно для перегляду фото */}
      {previewSrc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreviewSrc(null)}
        >
          <img
            src={previewSrc}
            alt="Перегляд фото"
            className="max-w-4xl max-h-4xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Модальне вікно налаштувань таблиці */}
      <TableSettings
        isOpen={showTableSettings}
        onClose={() => setShowTableSettings(false)}
        columns={tableColumns}
        onSave={handleSaveTableSettings}
      />
    </div>
  );
}
