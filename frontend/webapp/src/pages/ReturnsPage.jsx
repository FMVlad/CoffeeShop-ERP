import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import CreateReturnForm from '../components/CreateReturnForm';

export default function ReturnsPage() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  
  // Довідники
  const [suppliers, setSuppliers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [centers, setCenters] = useState([]);
  
  // Стан для створення/редагування повернення
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReturn, setEditingReturn] = useState(null);
  
  // Фільтри
  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    dateFrom: today,
    dateTo: today,
    centerId: '',
    supplierId: '',
    companyId: '',
    status: '',
    withVAT: ''
  });

  // Завантаження довідників
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
      } catch (error) {
        console.error('Помилка завантаження довідників:', error);
      }
    })();
  }, []);

  // Перевірка вибору зі стану складу - відкриваємо модальне вікно якщо є дані
  useEffect(() => {
    const checkSelection = () => {
      try {
        const stored = sessionStorage.getItem('selected::return_doc');
        if (stored) {
          const data = JSON.parse(stored);
          if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
            // Відкриваємо модальне вікно, щоб CreateReturnForm міг обробити вибір
            setShowCreateModal(true);
          }
        }
      } catch (error) {
        console.error('Помилка перевірки вибору:', error);
      }
    };
    
    // Перевіряємо одразу
    checkSelection();
    
    // Перевіряємо при фокусі вікна
    const handleFocus = () => {
      checkSelection();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Періодична перевірка
    const interval = setInterval(checkSelection, 300);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);


  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.centerId) params.center_id = Number(filters.centerId);
      if (filters.supplierId) params.supplier_id = Number(filters.supplierId);
      if (filters.companyId) params.company_id = Number(filters.companyId);
      if (filters.status) params.status = filters.status;
      const data = await api.getReturnDocs(params);
      setReturns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Помилка завантаження повернень:', error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // Очищаємо вибраний документ та товари при зміні фільтрів
    setSelectedReturn(null);
    setReturnItems([]);
    loadReturns();
  }, [loadReturns]);

  // Завантаження деталей повернення
  const loadReturnDetails = async (returnId) => {
    try {
      const data = await api.getReturnDoc(returnId);
      setReturnItems(Array.isArray(data?.Items) ? data.Items : []);
    } catch (error) {
      console.error('Помилка завантаження деталей повернення:', error);
      setReturnItems([]);
    }
  };

  // Обробка вибору повернення
  const handleReturnSelect = (ret) => {
    setSelectedReturn(ret);
    loadReturnDetails(ret.ID);
  };

  // Редагування повернення
  const handleEdit = async (ret) => {
    try {
      const data = await api.getReturnDoc(ret.ID);
      setEditingReturn(data);
      setShowCreateModal(true);
    } catch (error) {
      console.error('Помилка завантаження повернення:', error);
      alert('Помилка завантаження повернення');
    }
  };

  // Видалення повернення
  const handleDelete = async (ret) => {
    if (!window.confirm(`Ви впевнені, що хочете видалити повернення ${ret.Number || `#${ret.ID}`}?`)) {
      return;
    }
    
    try {
      await api.deleteReturnDoc(ret.ID);
      alert('Повернення видалено');
      loadReturns();
      if (selectedReturn?.ID === ret.ID) {
        setSelectedReturn(null);
        setReturnItems([]);
      }
    } catch (error) {
      console.error('Помилка видалення повернення:', error);
      alert(`Помилка видалення: ${error?.message || error}`);
    }
  };

  // Форматування дати
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA');
  };

  // Форматування суми
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('uk-UA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(amount || 0);
  };

  // Відкриття модального вікна
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 mb-12 w-full">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              ↩️ Повернення постачальнику
            </h1>
            <p className="text-2xl text-orange-100">
              Оформлення повернень товарів постачальникам
            </p>
          </div>
        </div>

        {/* Кнопки управління */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/purchases')}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              ← Назад до закупівель
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              🏠 На головну
            </button>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Створити повернення
          </button>
        </div>

        {/* Фільтри */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-orange-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-8 py-6 border-b-2 border-orange-200">
            <h3 className="text-2xl font-bold text-orange-800 mb-4">
              🔍 Фільтри пошуку
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Період від */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Період від
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              {/* Період до */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Період до
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              {/* Центр обліку */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Центр обліку
                </label>
                <select 
                  value={filters.centerId}
                  onChange={e => setFilters({...filters, centerId: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Всі центри</option>
                  {centers.map(center => (
                    <option key={center.ID} value={center.ID}>{center.Name}</option>
                  ))}
                </select>
              </div>
              {/* Постачальник */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Постачальник
                </label>
                <select 
                  value={filters.supplierId}
                  onChange={e => setFilters({...filters, supplierId: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Всі постачальники</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.ID} value={supplier.ID}>{supplier.Name}</option>
                  ))}
                </select>
              </div>
              {/* Підприємство */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Підприємство
                </label>
                <select 
                  value={filters.companyId}
                  onChange={e => setFilters({...filters, companyId: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Всі підприємства</option>
                  {companies.map(company => (
                    <option key={company.ID} value={company.ID}>{company.Name || company.ShortName}</option>
                  ))}
                </select>
              </div>
              {/* Статус */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Статус
                </label>
                <select 
                  value={filters.status}
                  onChange={e => setFilters({...filters, status: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Всі статуси</option>
                  <option value="draft">Чернетка</option>
                  <option value="posted">Проведено</option>
                </select>
              </div>
              {/* ПДВ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ПДВ
                </label>
                <select 
                  value={filters.withVAT}
                  onChange={e => setFilters({...filters, withVAT: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Всі</option>
                  <option value="yes">З ПДВ</option>
                  <option value="no">Без ПДВ</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Таблиця повернень */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-orange-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-8 py-6 border-b-2 border-orange-200">
            <h3 className="text-2xl font-bold text-orange-800">
              ↩️ Список повернень
            </h3>
          </div>
          
          <div className="p-8 flex flex-col" style={{maxHeight: '70vh'}}>
            {loading ? (
              <div className="text-center text-gray-500 text-lg py-12">
                ⏳ Завантаження...
              </div>
            ) : (
              <>
                <div className="overflow-x-auto overflow-y-auto flex-1" style={{maxHeight: '600px'}}>
                  <table className="w-full border-collapse border border-orange-200">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-orange-100 border-b-2 border-orange-300">
                        <th className="text-left p-3 border-r border-orange-200 font-semibold text-orange-800">№ рядка</th>
                        <th className="text-left p-3 border-r border-orange-200 font-semibold text-orange-800">Дата документа</th>
                        <th className="text-left p-3 border-r border-orange-200 font-semibold text-orange-800">Номер документа</th>
                        <th className="text-left p-3 border-r border-orange-200 font-semibold text-orange-800">Центр обліку</th>
                        <th className="text-left p-3 border-r border-orange-200 font-semibold text-orange-800">Постачальник</th>
                        <th className="text-left p-3 border-r border-orange-200 font-semibold text-orange-800">Підприємство</th>
                        <th className="text-right p-3 border-r border-orange-200 font-semibold text-orange-800">Сума документа</th>
                        <th className="text-center p-3 font-semibold text-orange-800 w-32">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.map((ret, index) => (
                        <tr 
                          key={ret.ID}
                          onClick={() => handleReturnSelect(ret)}
                          className={`border-b border-orange-200 cursor-pointer hover:bg-orange-50 transition-colors ${
                            selectedReturn?.ID === ret.ID ? 'bg-orange-100' : ''
                          }`}
                        >
                          <td className="p-3 border-r border-orange-200 text-center font-semibold">
                            {index + 1}
                          </td>
                          <td className="p-3 border-r border-orange-200">
                            {formatDate(ret.Date)}
                          </td>
                          <td className="p-3 border-r border-orange-200 font-semibold">
                            {ret.Number || `#${ret.ID}`}
                          </td>
                          <td className="p-3 border-r border-orange-200">
                            {ret.CenterName || '—'}
                          </td>
                          <td className="p-3 border-r border-orange-200">
                            {ret.SupplierName || '—'}
                          </td>
                          <td className="p-3 border-r border-orange-200">
                            {ret.CompanyName || '—'}
                          </td>
                          <td className="p-3 border-r border-orange-200 text-right font-semibold">
                            {formatAmount(ret.TotalAmount)} {ret.CurrencyCode || 'грн'}
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleEdit(ret)}
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-semibold"
                                title="Редагувати"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(ret)}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold"
                                title="Видалити"
                                disabled={ret.Status === 'posted' || ret.Status === 'completed'}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {returns.length === 0 && (
            <div className="text-center text-gray-500 text-lg py-12">
                      Повернень не знайдено
                    </div>
                  )}
                </div>

                {/* Перелік товарів вибраного повернення */}
                {selectedReturn && returnItems.length > 0 && (
                  <div className="mt-8 border-t-2 border-orange-300 pt-6">
                    <h4 className="text-xl font-bold text-orange-800 mb-4">
                      Товари повернення {selectedReturn.Number || `#${selectedReturn.ID}`}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-orange-200">
                        <thead>
                          <tr className="bg-orange-100 border-b-2 border-orange-300">
                            <th className="text-center p-3 border-r border-orange-200 font-semibold text-orange-800 w-16">№</th>
                            <th className="text-left p-3 border-r border-orange-200 font-semibold text-orange-800">Товар</th>
                            <th className="text-center p-3 border-r border-orange-200 font-semibold text-orange-800">Кількість</th>
                            <th className="text-right p-3 border-r border-orange-200 font-semibold text-orange-800">Ціна</th>
                            <th className="text-right p-3 font-semibold text-orange-800">Сума</th>
                          </tr>
                        </thead>
                        <tbody>
                          {returnItems.map((item, index) => (
                            <tr key={item.ID} className="border-b border-orange-200 hover:bg-orange-50">
                              <td className="p-3 border-r border-orange-200 text-center font-semibold">
                                {index + 1}
                              </td>
                              <td className="p-3 border-r border-orange-200">
                                {item.ProductName || '—'}
                              </td>
                              <td className="p-3 border-r border-orange-200 text-center">
                                {item.Quantity || 0}
                              </td>
                              <td className="p-3 border-r border-orange-200 text-right">
                                {formatAmount(item.Price)}
                              </td>
                              <td className="p-3 text-right font-semibold">
                                {formatAmount((item.Quantity || 0) * (item.Price || 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedReturn && returnItems.length === 0 && (
                  <div className="mt-8 border-t-2 border-orange-300 pt-6 text-center text-gray-500">
                    Товари не знайдено
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Модальне вікно створення/редагування повернення */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <CreateReturnForm
            editingReturn={editingReturn}
            onClose={() => {
              setShowCreateModal(false);
              setEditingReturn(null);
            }}
            onSuccess={() => {
              loadReturns();
              setEditingReturn(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
