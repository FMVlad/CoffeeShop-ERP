import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useUser } from '../UserContext';
import StockPickerButton from './StockPickerButton';

export default function CreateReturnForm({ onClose, onSuccess, editingReturn = null }) {
  const { centerId: activeCenterId } = useUser();
  const [suppliers, setSuppliers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [centers, setCenters] = useState([]);
  
  // Відновлюємо форму з sessionStorage або створюємо нову
  const getInitialForm = () => {
    try {
      const saved = sessionStorage.getItem('return_form_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('🔍 CreateReturnForm: Відновлено форму з sessionStorage:', parsed);
        // Переконаємося, що всі поля присутні
        return {
          Number: parsed.Number || '',
          Date: parsed.Date || new Date().toISOString().split('T')[0],
          SupplierID: parsed.SupplierID || '',
          CompanyID: parsed.CompanyID || '',
          CenterID: parsed.CenterID || activeCenterId || '',
          ArrivalPosted: parsed.ArrivalPosted || false,
          WithVAT: parsed.WithVAT || false,
          Comment: parsed.Comment || '',
        };
      }
    } catch (error) {
      console.error('Помилка відновлення форми:', error);
    }
    console.log('🔍 CreateReturnForm: Створено нову форму');
    return {
      Number: '', // Автоматичний
      Date: new Date().toISOString().split('T')[0],
      SupplierID: '',
      CompanyID: '',
      CenterID: activeCenterId || '',
      ArrivalPosted: false, // Прибуткова проведена (по рахункам)
      WithVAT: false, // ПДВ
      Comment: '',
    };
  };
  
  const [form, setForm] = useState(getInitialForm);
  const [isEditing, setIsEditing] = useState(false);
  
  // Завантаження даних для редагування
  useEffect(() => {
    if (editingReturn) {
      setIsEditing(true);
      setForm({
        Number: editingReturn.Number || '',
        Date: editingReturn.Date || new Date().toISOString().split('T')[0],
        SupplierID: editingReturn.SupplierID || '',
        CompanyID: editingReturn.CompanyID || '',
        CenterID: editingReturn.CenterID || activeCenterId || '',
        ArrivalPosted: editingReturn.ArrivalPosted || false,
        WithVAT: editingReturn.PricesIncludeVAT || false,
        Comment: editingReturn.Comment || '',
      });
      // Завантажуємо товари
      if (editingReturn.Items && Array.isArray(editingReturn.Items)) {
        const formattedItems = editingReturn.Items.map(item => ({
          PartyID: item.PartyID,
          ProductID: item.ProductID,
          ProductName: item.ProductName || '',
          Quantity: item.Quantity || 0,
          Price: item.Price || 0,
          ArrivalID: item.ArrivalID,
          ArrivalNumber: item.ArrivalNumber,
          ArrivalDate: item.ArrivalDate,
        }));
        setItems(formattedItems);
      }
    } else {
      setIsEditing(false);
    }
  }, [editingReturn, activeCenterId]);
  
  // Зберігаємо форму в sessionStorage при кожній зміні (тільки якщо не редагуємо)
  useEffect(() => {
    if (!isEditing) {
      try {
        sessionStorage.setItem('return_form_state', JSON.stringify(form));
        console.log('🔍 CreateReturnForm: Збережено форму в sessionStorage:', form);
      } catch (error) {
        console.error('Помилка збереження форми:', error);
      }
    }
  }, [form, isEditing]);
  
  const [items, setItems] = useState([]);
  
  // Модальне вікно для вибору товару
  const [showProductModal, setShowProductModal] = useState(false);
  const [productBarcode, setProductBarcode] = useState('');
  const [productArrivals, setProductArrivals] = useState([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState('');

  // Прапорець, щоб не перезаписувати форму після першого завантаження
  const [formInitialized, setFormInitialized] = useState(false);
  
  useEffect(() => {
    (async () => {
      try {
        const [centersData, suppliersData, companiesData] = await Promise.all([
          api.getCenters().catch(() => []),
          api.getSuppliers().catch(() => []),
          api.getCompanies().catch(() => [])
        ]);
        setCenters(Array.isArray(centersData) ? centersData : []);
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        
        // Встановлюємо значення за замовчуванням тільки при першому завантаженні або якщо вони не встановлені
        if (!formInitialized) {
          const defCompany = companiesData?.[0]?.ID ?? '';
          const defCenter = activeCenterId || (centersData?.[0]?.ID ?? '');
          setForm(prev => {
            // Зберігаємо всі існуючі значення, включаючи SupplierID
            const updated = {
              ...prev,
              // Не перезаписуємо існуючі значення, тільки встановлюємо за замовчуванням якщо порожні
              CompanyID: prev.CompanyID || defCompany,
              CenterID: prev.CenterID || defCenter,
              // SupplierID завжди зберігаємо як є
              SupplierID: prev.SupplierID,
            };
            console.log('🔍 CreateReturnForm: Оновлення форми після завантаження довідників:', {
              prev: { SupplierID: prev.SupplierID, CompanyID: prev.CompanyID, CenterID: prev.CenterID },
              updated: { SupplierID: updated.SupplierID, CompanyID: updated.CompanyID, CenterID: updated.CenterID }
            });
            return updated;
          });
          setFormInitialized(true);
        }
      } catch (error) {
        console.error('Помилка завантаження довідників:', error);
      }
    })();
  }, [activeCenterId, formInitialized]);

  // Пошук товару по ProductID (для вибору зі складу)
  const handleProductSearchByID = async (productId) => {
    console.log('🔍 CreateReturnForm: handleProductSearchByID викликано з productId:', productId);
    
    // Завжди відкриваємо модальне вікно
    setShowProductModal(true);
    setLoadingArrivals(true);
    setProductArrivals([]);
    setSelectedProductName('');
    
    try {
      // Отримуємо товар по ID через getProducts
      const products = await api.getProducts();
      console.log('🔍 CreateReturnForm: Отримано товари:', products?.length || 0);
      const product = Array.isArray(products) 
        ? products.find(p => Number(p.ID) === Number(productId) || Number(p.ProductID) === Number(productId))
        : null;
      
      console.log('🔍 CreateReturnForm: Знайдено товар:', product);
      
      if (!product || (!product.ID && !product.ProductID)) {
        alert('Товар не знайдено');
        setLoadingArrivals(false);
        setShowProductModal(false);
        return;
      }
      
      const productID = Number(product.ID || product.ProductID);
      const productName = product.FullName || product.Name || `Товар #${productID}`;
      console.log('🔍 CreateReturnForm: Використовуємо productID:', productID, 'назва:', productName);
      
      // Зберігаємо назву товару для відображення в модальному вікні
      setSelectedProductName(productName);
      
      // Фільтри з шапки
      const filters = {};
      if (form.SupplierID && form.SupplierID !== '' && form.SupplierID !== '0') {
        filters.supplier_id = Number(form.SupplierID);
        console.log('🔍 CreateReturnForm: handleProductSearchByID - Додано фільтр постачальника:', filters.supplier_id);
      } else {
        console.log('🔍 CreateReturnForm: handleProductSearchByID - Постачальник не встановлений:', form.SupplierID);
      }
      if (form.CompanyID && form.CompanyID !== '' && form.CompanyID !== '0') {
        filters.company_id = Number(form.CompanyID);
        console.log('🔍 CreateReturnForm: handleProductSearchByID - Додано фільтр підприємства:', filters.company_id);
      } else {
        console.log('🔍 CreateReturnForm: handleProductSearchByID - Підприємство не встановлене:', form.CompanyID);
      }
      if (form.ArrivalPosted) {
        filters.status = 'posted';
        console.log('🔍 CreateReturnForm: handleProductSearchByID - Додано фільтр статусу: posted');
      }
      // Фільтр ПДВ: тільки якщо чекбокс встановлений (true = 'yes', false = 'no')
      if (form.WithVAT === true) {
        filters.with_vat = 'yes';
        console.log('🔍 CreateReturnForm: handleProductSearchByID - Додано фільтр ПДВ: yes');
      } else if (form.WithVAT === false) {
        filters.with_vat = 'no';
        console.log('🔍 CreateReturnForm: handleProductSearchByID - Додано фільтр ПДВ: no');
      }
      
      console.log('🔍 CreateReturnForm: handleProductSearchByID - Всі фільтри:', filters);
      console.log('🔍 CreateReturnForm: handleProductSearchByID - Поточний стан форми:', form);
      const arrivals = await api.getArrivalDocs(filters);
      console.log('🔍 CreateReturnForm: Отримано прибуткових накладних:', arrivals?.length || 0);
      
      const arrivalsWithProduct = [];
      for (const arrival of Array.isArray(arrivals) ? arrivals : []) {
        try {
          const partiesData = await api.getUnclosedPartiesFromArrival(arrival.ID);
          const parties = Array.isArray(partiesData?.Parties) ? partiesData.Parties : [];
          const productParties = parties.filter(p => Number(p.ProductID) === Number(productID));
          console.log(`🔍 CreateReturnForm: Накладна ${arrival.ID}: знайдено ${productParties.length} партій для товару ${productID}`);
          
          for (const party of productParties) {
            arrivalsWithProduct.push({
              ArrivalID: arrival.ID,
              ArrivalNumber: arrival.Number || `#${arrival.ID}`,
              ArrivalDate: arrival.Date,
              PartyID: party.PartyID,
              ProductID: productID,
              ProductName: product.FullName || product.Name,
              RemainingQty: party.RemainingQty,
              PurchasePrice: party.PurchasePrice,
            });
          }
        } catch (err) {
          console.error(`Помилка для накладної ${arrival.ID}:`, err);
        }
      }
      
      console.log('🔍 CreateReturnForm: Всього знайдено накладних з товаром:', arrivalsWithProduct.length);
      setProductArrivals(arrivalsWithProduct);
      
      // Не закриваємо модальне вікно навіть якщо накладних немає - показуємо повідомлення
    } catch (error) {
      console.error('Помилка пошуку:', error);
      alert('Помилка пошуку товару');
    } finally {
      setLoadingArrivals(false);
    }
  };

  // Обробка вибраних товарів зі складу
  useEffect(() => {
    const checkSelection = async () => {
      try {
        const stored = sessionStorage.getItem('selected::return_doc');
        if (!stored) return;
        
        console.log('🔍 CreateReturnForm: Знайдено дані в sessionStorage');
        const data = JSON.parse(stored);
        console.log('🔍 CreateReturnForm: Розпарсено дані:', data);
        
        if (!data?.items || !Array.isArray(data.items) || data.items.length === 0) {
          console.log('🔍 CreateReturnForm: Немає товарів у даних');
          return;
        }
        
        // Очищаємо sessionStorage одразу, щоб не обробити вдруге
        sessionStorage.removeItem('selected::return_doc');
        
        // Для першого товару відкриваємо модальне вікно ОДРАЗУ
        const firstItem = data.items[0];
        console.log('🔍 CreateReturnForm: Обробляємо товар:', firstItem);
        
        if (!firstItem || !firstItem.id) {
          console.error('🔍 CreateReturnForm: Невірний формат товару:', firstItem);
          return;
        }
        
        // Відкриваємо модальне вікно одразу
        setShowProductModal(true);
        setLoadingArrivals(true);
        setProductArrivals([]);
        setSelectedProductName('');
        
        // Тепер шукаємо товар та накладні
        await handleProductSearchByID(firstItem.id);
      } catch (error) {
        console.error('Помилка обробки вибраних товарів:', error);
        setShowProductModal(false);
        setLoadingArrivals(false);
      }
    };
    
    // Перевіряємо одразу при монтуванні
    checkSelection();
    
    // Перевіряємо при фокусі вікна (коли користувач повертається з іншої вкладки/сторінки)
    const handleFocus = () => {
      if (sessionStorage.getItem('selected::return_doc')) {
        checkSelection();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Також перевіряємо періодично (на випадок якщо focus не спрацює)
    const interval = setInterval(() => {
      if (sessionStorage.getItem('selected::return_doc')) {
        checkSelection();
      }
    }, 300);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA');
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('uk-UA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(amount || 0);
  };

  // Пошук товару
  const handleProductSearch = async (barcode) => {
    if (!barcode || !barcode.trim()) return;
    
    setProductBarcode(barcode.trim());
    setLoadingArrivals(true);
    setShowProductModal(true);
    
    try {
      // Фільтри з шапки
      const filters = {};
      if (form.SupplierID && form.SupplierID !== '' && form.SupplierID !== '0') {
        filters.supplier_id = Number(form.SupplierID);
        console.log('🔍 CreateReturnForm: handleProductSearch - Додано фільтр постачальника:', filters.supplier_id);
      } else {
        console.log('🔍 CreateReturnForm: handleProductSearch - Постачальник не встановлений:', form.SupplierID);
      }
      if (form.CompanyID && form.CompanyID !== '' && form.CompanyID !== '0') {
        filters.company_id = Number(form.CompanyID);
        console.log('🔍 CreateReturnForm: handleProductSearch - Додано фільтр підприємства:', filters.company_id);
      } else {
        console.log('🔍 CreateReturnForm: handleProductSearch - Підприємство не встановлене:', form.CompanyID);
      }
      if (form.ArrivalPosted) {
        filters.status = 'posted';
        console.log('🔍 CreateReturnForm: handleProductSearch - Додано фільтр статусу: posted');
      }
      // Фільтр ПДВ: тільки якщо чекбокс встановлений (true = 'yes', false = 'no')
      if (form.WithVAT === true) {
        filters.with_vat = 'yes';
        console.log('🔍 CreateReturnForm: handleProductSearch - Додано фільтр ПДВ: yes');
      } else if (form.WithVAT === false) {
        filters.with_vat = 'no';
        console.log('🔍 CreateReturnForm: handleProductSearch - Додано фільтр ПДВ: no');
      }
      
      console.log('🔍 CreateReturnForm: handleProductSearch - Всі фільтри:', filters);
      const arrivals = await api.getArrivalDocs(filters);
      const product = await api.getProductByBarcode(barcode);
      
      if (!product || !product.ID) {
        alert('Товар не знайдено');
        setLoadingArrivals(false);
        return;
      }
      
      const productID = product.ID;
      
      const arrivalsWithProduct = [];
      for (const arrival of Array.isArray(arrivals) ? arrivals : []) {
        try {
          const partiesData = await api.getUnclosedPartiesFromArrival(arrival.ID);
          const parties = Array.isArray(partiesData?.Parties) ? partiesData.Parties : [];
          const productParties = parties.filter(p => p.ProductID === productID);
          
          for (const party of productParties) {
            arrivalsWithProduct.push({
              ArrivalID: arrival.ID,
              ArrivalNumber: arrival.Number || `#${arrival.ID}`,
              ArrivalDate: arrival.Date,
              PartyID: party.PartyID,
              ProductID: productID,
              ProductName: product.FullName || product.Name,
              RemainingQty: party.RemainingQty,
              PurchasePrice: party.PurchasePrice,
            });
          }
        } catch (err) {
          console.error(`Помилка для накладної ${arrival.ID}:`, err);
        }
      }
      
      setProductArrivals(arrivalsWithProduct);
    } catch (error) {
      console.error('Помилка пошуку:', error);
      alert('Помилка пошуку товару');
    } finally {
      setLoadingArrivals(false);
    }
  };

  // Додавання товару
  const handleAddProduct = (arrivalData, quantity) => {
    const qty = Number(quantity) || 0;
    if (qty <= 0 || qty > arrivalData.RemainingQty) {
      alert(`Невірна кількість. Максимум: ${arrivalData.RemainingQty}`);
      return;
    }
    
    const existingIndex = items.findIndex(item => item.PartyID === arrivalData.PartyID);
    
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].Quantity = qty;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          ProductID: arrivalData.ProductID,
          ProductName: arrivalData.ProductName,
          PartyID: arrivalData.PartyID,
          ArrivalDocID: arrivalData.ArrivalID,
          ArrivalNumber: arrivalData.ArrivalNumber,
          ArrivalDate: arrivalData.ArrivalDate,
          Quantity: qty,
          Price: arrivalData.PurchasePrice,
          RemainingQty: arrivalData.RemainingQty,
        },
      ]);
    }
    
    setShowProductModal(false);
    setProductBarcode('');
    setProductArrivals([]);
  };

  // Видалення товару
  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Зміна кількості
  const handleQuantityChange = (index, quantity) => {
    const qty = Number(quantity) || 0;
    const updated = [...items];
    if (qty <= 0) {
      updated.splice(index, 1);
    } else if (qty > updated[index].RemainingQty) {
      alert(`Максимальна кількість: ${updated[index].RemainingQty}`);
      return;
    } else {
      updated[index].Quantity = qty;
    }
    setItems(updated);
  };

  // Створення повернення
  const handleCreate = async () => {
    if (!form.SupplierID) {
      alert('Оберіть постачальника');
      return;
    }
    if (!form.CompanyID) {
      alert('Оберіть підприємство');
      return;
    }
    if (!form.CenterID) {
      alert('Оберіть центр обліку');
      return;
    }
    if (items.length === 0) {
      alert('Додайте хоча б один товар');
      return;
    }

    try {
      const payload = {
        Header: {
          Date: form.Date,
          SupplierID: Number(form.SupplierID),
          CompanyID: Number(form.CompanyID),
          CenterID: Number(form.CenterID),
          ArrivalPosted: form.ArrivalPosted,
          WithVAT: form.WithVAT,
          Comment: form.Comment || '',
        },
        Items: items.map(item => ({
          PartyID: item.PartyID,
          Quantity: item.Quantity,
          Price: item.Price,
          TaxRateID: null,
        })),
      };
      
      if (isEditing && editingReturn) {
        await api.updateReturnDoc(editingReturn.ID, payload);
        alert('Повернення оновлено!');
      } else {
        await api.createReturnDoc(payload);
        // Очищаємо збережену форму після успішного створення
        try {
          sessionStorage.removeItem('return_form_state');
        } catch (error) {
          console.error('Помилка очищення форми:', error);
        }
        alert('Повернення створено!');
      }
      onSuccess?.();
      onClose?.();
    } catch (error) {
      alert(`Помилка: ${error?.message || error}`);
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 px-8 py-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">
            {isEditing ? 'Редагувати повернення постачальнику' : 'Створити повернення постачальнику'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-orange-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8">
          {/* Шапка документа */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  № повернення
                </label>
                <input
                  type="text"
                  value={form.Number || '(автоматично)'}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата *
                </label>
                <input
                  type="date"
                  value={form.Date}
                  onChange={e => setForm({...form, Date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Постачальник *
                </label>
                <select
                  value={form.SupplierID}
                  onChange={e => setForm({...form, SupplierID: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Оберіть постачальника</option>
                  {suppliers.map(s => (
                    <option key={s.ID} value={s.ID}>{s.Name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Підприємство *
                </label>
                <select
                  value={form.CompanyID}
                  onChange={e => setForm({...form, CompanyID: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Оберіть підприємство</option>
                  {companies.map(c => (
                    <option key={c.ID} value={c.ID}>{c.Name || c.ShortName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Центр обліку *
                </label>
                <select
                  value={form.CenterID}
                  onChange={e => setForm({...form, CenterID: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Оберіть центр</option>
                  {centers.map(c => (
                    <option key={c.ID} value={c.ID}>{c.Name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ArrivalPosted}
                  onChange={e => setForm({...form, ArrivalPosted: e.target.checked})}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-700">
                  Прибуткова проведена (по рахункам)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.WithVAT}
                  onChange={e => setForm({...form, WithVAT: e.target.checked})}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-700">ПДВ</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Коментар
              </label>
              <textarea
                value={form.Comment}
                onChange={e => setForm({...form, Comment: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                rows={2}
                placeholder="Додаткові нотатки..."
              />
            </div>
          </div>

          {/* Таблиця товарів */}
          <div className="mb-6">
            <div className="mb-4 flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Штрихкод (Enter)
                </label>
                <input
                  type="text"
                  value={productBarcode}
                  onChange={e => setProductBarcode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleProductSearch(productBarcode);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="Скануй або введи та натисни Enter"
                />
              </div>
              <div className="flex items-end gap-3">
                <StockPickerButton
                  selectionKey="return_doc"
                  centerId={form.CenterID || activeCenterId || ''}
                  label="Стан складу"
                  className="px-6 py-3 bg-gradient-to-r from-blue-100 to-indigo-200 border border-blue-300 rounded-xl font-semibold hover:shadow-lg transition"
                />
                <button
                  onClick={() => handleProductSearch(productBarcode)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600"
                >
                  Пошук
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-orange-100 border-b-2 border-orange-300">
                    <th className="text-left p-3 border-r border-gray-300 font-semibold">Товар</th>
                    <th className="text-left p-3 border-r border-gray-300 font-semibold">Прибуткова накладна</th>
                    <th className="text-center p-3 border-r border-gray-300 font-semibold">К-сть</th>
                    <th className="text-right p-3 border-r border-gray-300 font-semibold">Ціна</th>
                    <th className="text-right p-3 border-r border-gray-300 font-semibold">Сума</th>
                    <th className="text-center p-3 font-semibold">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-orange-50">
                      <td className="p-3 border-r border-gray-300">
                        <div className="font-medium">{item.ProductName}</div>
                        <div className="text-xs text-gray-500">#{item.ProductID}</div>
                      </td>
                      <td className="p-3 border-r border-gray-300">
                        <div className="font-medium">{item.ArrivalNumber}</div>
                        <div className="text-xs text-gray-500">{formatDate(item.ArrivalDate)}</div>
                      </td>
                      <td className="p-3 border-r border-gray-300">
                        <input
                          type="number"
                          min="0"
                          max={item.RemainingQty}
                          step="0.001"
                          value={item.Quantity}
                          onChange={e => handleQuantityChange(index, e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="p-3 border-r border-gray-300 text-right font-mono">
                        {formatAmount(item.Price)}
                      </td>
                      <td className="p-3 border-r border-gray-300 text-right font-semibold">
                        {formatAmount(item.Quantity * item.Price)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Додайте товари для повернення
                </div>
              )}
            </div>
            
            {items.length > 0 && (
              <div className="mt-4 text-right text-xl font-bold">
                Разом: {formatAmount(items.reduce((sum, item) => sum + item.Quantity * item.Price, 0))}
              </div>
            )}
          </div>
        </div>
        
        <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-semibold"
          >
            Скасувати
          </button>
          <button
            onClick={handleCreate}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:shadow-lg"
          >
            {isEditing ? 'Зберегти зміни' : 'Створити повернення'}
          </button>
        </div>
      </div>

      {/* Модальне вікно вибору товару */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">Вибір прибуткової накладної</h3>
                {selectedProductName && (
                  <p className="text-blue-100 text-sm mt-1">{selectedProductName}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setProductBarcode('');
                  setProductArrivals([]);
                }}
                className="text-white hover:text-blue-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              {loadingArrivals ? (
                <div className="text-center py-8">Завантаження...</div>
              ) : productArrivals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Товар не знайдено в прибуткових накладних за вказаними фільтрами
                </div>
              ) : (
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-blue-100 border-b-2 border-blue-300">
                      <th className="text-left p-3 border-r border-gray-300 font-semibold">Прибуткова №</th>
                      <th className="text-left p-3 border-r border-gray-300 font-semibold">Дата</th>
                      <th className="text-right p-3 border-r border-gray-300 font-semibold">Залишок</th>
                      <th className="text-right p-3 border-r border-gray-300 font-semibold">Ціна закупівлі</th>
                      <th className="text-center p-3 font-semibold">Кількість повернення</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productArrivals.map((arrival, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-blue-50">
                        <td className="p-3 border-r border-gray-300 font-medium">
                          {arrival.ArrivalNumber}
                        </td>
                        <td className="p-3 border-r border-gray-300">
                          {formatDate(arrival.ArrivalDate)}
                        </td>
                        <td className="p-3 border-r border-gray-300 text-right font-semibold">
                          {arrival.RemainingQty.toFixed(3)}
                        </td>
                        <td className="p-3 border-r border-gray-300 text-right font-mono">
                          {formatAmount(arrival.PurchasePrice)}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={arrival.RemainingQty}
                            step="0.001"
                            defaultValue="0"
                            onBlur={e => {
                              const qty = Number(e.target.value) || 0;
                              if (qty > 0) {
                                handleAddProduct(arrival, qty);
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const qty = Number(e.target.value) || 0;
                                if (qty > 0) {
                                  handleAddProduct(arrival, qty);
                                }
                              }
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

