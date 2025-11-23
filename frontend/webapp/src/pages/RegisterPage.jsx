import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentItems, setDocumentItems] = useState([]);
  
  // Довідники для фільтрів
  const [centers, setCenters] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [companies, setCompanies] = useState([]);
  
  // Фільтри
  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    dateFrom: today,
    dateTo: today,
    centerId: '',
    supplierId: '',
    companyId: '',
    status: '',
    withVAT: '' // '' - всі, 'yes' - з ПДВ, 'no' - без ПДВ
  });
  
  // Стан для оплати
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDocument, setPaymentDocument] = useState(null);
  
  // Стан для таблиць оплат
  const [duePayments, setDuePayments] = useState([]);
  const [overduePayments, setOverduePayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  
  // Фільтри для просрочених оплат
  const [overdueFilters, setOverdueFilters] = useState({
    dateFrom: '',
    dateTo: today
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

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.centerId) params.center_id = Number(filters.centerId);
      if (filters.supplierId) params.supplier_id = Number(filters.supplierId);
      if (filters.companyId) params.company_id = Number(filters.companyId);
      if (filters.status) params.status = filters.status;
      if (filters.withVAT && filters.withVAT !== '') params.with_vat = filters.withVAT;
      
      console.log('🔍 RegisterPage: Завантаження документів з параметрами:', params);
      const data = await api.getArrivalDocs(params);
      console.log('🔍 RegisterPage: Отримано документів:', Array.isArray(data) ? data.length : 0);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Помилка завантаження документів:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // Очищаємо вибраний документ та товари при зміні фільтрів
    setSelectedDocument(null);
    setDocumentItems([]);
    loadDocuments();
  }, [loadDocuments]);

  // Завантаження деталей документа
  const loadDocumentDetails = async (docId) => {
    try {
      const data = await api.getArrivalDoc(docId);
      setDocumentItems(Array.isArray(data?.Items) ? data.Items : []);
    } catch (error) {
      console.error('Помилка завантаження деталей документа:', error);
      setDocumentItems([]);
    }
  };

  // Обробка вибору документа
  const handleDocumentSelect = (doc) => {
    setSelectedDocument(doc);
    loadDocumentDetails(doc.ID);
  };

  // Обробка оплати
  const handlePayment = (doc) => {
    setPaymentDocument(doc);
    setShowPaymentModal(true);
  };

  // Завантаження накладних, які треба сплатити
  const loadDuePayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const params = {
        payment_due_date: today, // Накладні, у яких дата оплати сьогодні або раніше
        status: 'posted' // Тільки проведені
      };
      const data = await api.getArrivalDocs(params);
      const todayDate = new Date(today);
      todayDate.setHours(23, 59, 59, 999); // До кінця дня
      setDuePayments(Array.isArray(data) ? data.filter(doc => {
        if (!doc.PaymentDueDate) return false;
        const dueDate = new Date(doc.PaymentDueDate);
        return dueDate <= todayDate;
      }) : []);
    } catch (error) {
      console.error('Помилка завантаження накладних для оплати:', error);
      setDuePayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [today]);

  // Завантаження просрочених оплат
  const loadOverduePayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const params = {
        status: 'posted'
      };
      if (overdueFilters.dateFrom) {
        params.payment_due_date_from = overdueFilters.dateFrom;
      }
      if (overdueFilters.dateTo) {
        params.payment_due_date_to = overdueFilters.dateTo;
      }
      const data = await api.getArrivalDocs(params);
      const todayDate = new Date(today);
      setOverduePayments(Array.isArray(data) ? data.filter(doc => {
        if (!doc.PaymentDueDate) return false;
        const dueDate = new Date(doc.PaymentDueDate);
        return dueDate < todayDate;
      }) : []);
    } catch (error) {
      console.error('Помилка завантаження просрочених оплат:', error);
      setOverduePayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [overdueFilters, today]);

  // Завантаження таблиць оплат
  useEffect(() => {
    loadDuePayments();
    loadOverduePayments();
  }, [loadDuePayments, loadOverduePayments]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-3xl shadow-2xl p-8 mb-12 w-full">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              📊 Реєстр прибуткових накладних
            </h1>
            <p className="text-2xl text-purple-100">
              Перегляд та аналіз всіх документів закупівель
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
        </div>

        {/* Фільтри */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-8 py-6 border-b-2 border-purple-200">
            <h3 className="text-2xl font-bold text-purple-800 mb-4">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Всі</option>
                  <option value="yes">З ПДВ</option>
                  <option value="no">Без ПДВ</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Таблиця документів */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-8 py-6 border-b-2 border-purple-200">
            <h3 className="text-2xl font-bold text-purple-800">
              📋 Перелік прибуткових накладних
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
                  <table className="w-full border-collapse border border-purple-200">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-purple-100 border-b-2 border-purple-300">
                        <th className="text-left p-3 border-r border-purple-200 font-semibold text-purple-800">№ рядка</th>
                        <th className="text-left p-3 border-r border-purple-200 font-semibold text-purple-800">Дата документа</th>
                        <th className="text-left p-3 border-r border-purple-200 font-semibold text-purple-800">Номер документа</th>
                        <th className="text-left p-3 border-r border-purple-200 font-semibold text-purple-800">Центр обліку</th>
                        <th className="text-left p-3 border-r border-purple-200 font-semibold text-purple-800">Постачальник</th>
                        <th className="text-left p-3 border-r border-purple-200 font-semibold text-purple-800">Підприємство</th>
                        <th className="text-left p-3 border-r border-purple-200 font-semibold text-purple-800">Дата оплати</th>
                        <th className="text-right p-3 border-r border-purple-200 font-semibold text-purple-800">Сума документа</th>
                        <th className="text-center p-3 font-semibold text-purple-800 w-32">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc, index) => (
                        <tr 
                          key={doc.ID}
                          onClick={() => handleDocumentSelect(doc)}
                          className={`border-b border-purple-200 cursor-pointer hover:bg-purple-50 transition-colors ${
                            selectedDocument?.ID === doc.ID ? 'bg-purple-100' : ''
                          }`}
                        >
                          <td className="p-3 border-r border-purple-200 text-center font-semibold">
                            {index + 1}
                          </td>
                          <td className="p-3 border-r border-purple-200">
                            {formatDate(doc.Date)}
                          </td>
                          <td className="p-3 border-r border-purple-200 font-semibold">
                            {doc.Number || `#${doc.ID}`}
                          </td>
                          <td className="p-3 border-r border-purple-200">
                            {doc.CenterName || '—'}
                          </td>
                          <td className="p-3 border-r border-purple-200">
                            {doc.SupplierName || '—'}
                          </td>
                          <td className="p-3 border-r border-purple-200">
                            {doc.CompanyName || '—'}
                          </td>
                          <td className="p-3 border-r border-purple-200">
                            {doc.PaymentDueDate ? formatDate(doc.PaymentDueDate) : '—'}
                          </td>
                          <td className="p-3 border-r border-purple-200 text-right font-semibold">
                            {formatAmount(doc.TotalAmount)} {doc.CurrencyCode || 'грн'}
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handlePayment(doc)}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-semibold"
                              title="Оплатити"
                            >
                              💳 Оплатити
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {documents.length === 0 && (
                    <div className="text-center text-gray-500 text-lg py-12">
                      Документів не знайдено
                    </div>
                  )}
                </div>

                {/* Перелік товарів вибраного документа */}
                {selectedDocument && documentItems.length > 0 && (
                  <div className="mt-8 border-t-2 border-purple-300 pt-6">
                    <h4 className="text-xl font-bold text-purple-800 mb-4">
                      Товари документа {selectedDocument.Number || `#${selectedDocument.ID}`}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-purple-200">
                        <thead>
                          <tr className="bg-purple-100 border-b-2 border-purple-300">
                            <th className="text-center p-3 border-r border-purple-200 font-semibold text-purple-800 w-16">№</th>
                            <th className="text-left p-3 border-r border-purple-200 font-semibold text-purple-800">Товар</th>
                            <th className="text-center p-3 border-r border-purple-200 font-semibold text-purple-800">Кількість</th>
                            <th className="text-right p-3 border-r border-purple-200 font-semibold text-purple-800">Ціна</th>
                            <th className="text-right p-3 font-semibold text-purple-800">Сума</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentItems.map((item, index) => (
                            <tr key={item.ID} className="border-b border-purple-200 hover:bg-purple-50">
                              <td className="p-3 border-r border-purple-200 text-center font-semibold">
                                {index + 1}
                              </td>
                              <td className="p-3 border-r border-purple-200">
                                {item.ProductName || '—'}
                              </td>
                              <td className="p-3 border-r border-purple-200 text-center">
                                {item.Quantity || 0}
                              </td>
                              <td className="p-3 border-r border-purple-200 text-right">
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

                {selectedDocument && documentItems.length === 0 && (
                  <div className="mt-8 border-t-2 border-purple-300 pt-6 text-center text-gray-500">
                    Товари не знайдено
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Модальне вікно оплати */}
        {showPaymentModal && paymentDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6 flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">💳 Оплата</h2>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentDocument(null);
                  }}
                  className="text-white hover:text-green-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Накладна: {paymentDocument.Number || `#${paymentDocument.ID}`}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Дата документа:</span>
                      <span className="ml-2 font-medium">{formatDate(paymentDocument.Date)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Дата оплати:</span>
                      <span className="ml-2 font-medium">{formatDate(paymentDocument.PaymentDueDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Постачальник:</span>
                      <span className="ml-2 font-medium">{paymentDocument.SupplierName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Сума:</span>
                      <span className="ml-2 font-medium text-lg">
                        {formatAmount(paymentDocument.TotalAmount)} {paymentDocument.CurrencyCode || 'грн'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center text-gray-500 py-8">
                  <p>Функціонал оплати буде додано пізніше</p>
                </div>
              </div>
              
              <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentDocument(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-semibold"
                >
                  Закрити
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблиця "Треба сплатити" */}
        <div className="mt-8 bg-white rounded-3xl shadow-2xl border-2 border-yellow-200 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-8 py-6 border-b-2 border-yellow-200">
            <h3 className="text-2xl font-bold text-yellow-800">
              ⏰ Треба сплатити
            </h3>
            <p className="text-sm text-yellow-600 mt-1">Накладні, у яких настав термін оплати</p>
          </div>
          
          <div className="p-8">
            {loadingPayments ? (
              <div className="text-center text-gray-500 text-lg py-12">
                ⏳ Завантаження...
              </div>
            ) : duePayments.length === 0 ? (
              <div className="text-center text-gray-500 text-lg py-12">
                Накладних для оплати не знайдено
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-yellow-200">
                  <thead>
                    <tr className="bg-yellow-100 border-b-2 border-yellow-300">
                      <th className="text-left p-3 border-r border-yellow-200 font-semibold text-yellow-800">№</th>
                      <th className="text-left p-3 border-r border-yellow-200 font-semibold text-yellow-800">Дата документа</th>
                      <th className="text-left p-3 border-r border-yellow-200 font-semibold text-yellow-800">Номер</th>
                      <th className="text-left p-3 border-r border-yellow-200 font-semibold text-yellow-800">Постачальник</th>
                      <th className="text-left p-3 border-r border-yellow-200 font-semibold text-yellow-800">Дата оплати</th>
                      <th className="text-right p-3 border-r border-yellow-200 font-semibold text-yellow-800">Сума</th>
                      <th className="text-center p-3 font-semibold text-yellow-800 w-32">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duePayments.map((doc, index) => (
                      <tr key={doc.ID} className="border-b border-yellow-200 hover:bg-yellow-50">
                        <td className="p-3 border-r border-yellow-200 text-center font-semibold">
                          {index + 1}
                        </td>
                        <td className="p-3 border-r border-yellow-200">
                          {formatDate(doc.Date)}
                        </td>
                        <td className="p-3 border-r border-yellow-200 font-semibold">
                          {doc.Number || `#${doc.ID}`}
                        </td>
                        <td className="p-3 border-r border-yellow-200">
                          {doc.SupplierName || '—'}
                        </td>
                        <td className="p-3 border-r border-yellow-200">
                          {formatDate(doc.PaymentDueDate)}
                        </td>
                        <td className="p-3 border-r border-yellow-200 text-right font-semibold">
                          {formatAmount(doc.TotalAmount)} {doc.CurrencyCode || 'грн'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handlePayment(doc)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-semibold"
                            title="Оплатити"
                          >
                            💳 Оплатити
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Таблиця "Просрочена оплата" */}
        <div className="mt-8 bg-white rounded-3xl shadow-2xl border-2 border-red-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 px-8 py-6 border-b-2 border-red-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-red-800">
                  ⚠️ Просрочена оплата
                </h3>
                <p className="text-sm text-red-600 mt-1">Накладні з простроченою датою оплати</p>
              </div>
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">З дати</label>
                  <input
                    type="date"
                    value={overdueFilters.dateFrom}
                    onChange={e => {
                      setOverdueFilters({...overdueFilters, dateFrom: e.target.value});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">До дати</label>
                  <input
                    type="date"
                    value={overdueFilters.dateTo}
                    onChange={e => {
                      setOverdueFilters({...overdueFilters, dateTo: e.target.value});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            {loadingPayments ? (
              <div className="text-center text-gray-500 text-lg py-12">
                ⏳ Завантаження...
              </div>
            ) : overduePayments.length === 0 ? (
              <div className="text-center text-gray-500 text-lg py-12">
                Просрочених оплат не знайдено
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-red-200">
                  <thead>
                    <tr className="bg-red-100 border-b-2 border-red-300">
                      <th className="text-left p-3 border-r border-red-200 font-semibold text-red-800">№</th>
                      <th className="text-left p-3 border-r border-red-200 font-semibold text-red-800">Дата документа</th>
                      <th className="text-left p-3 border-r border-red-200 font-semibold text-red-800">Номер</th>
                      <th className="text-left p-3 border-r border-red-200 font-semibold text-red-800">Постачальник</th>
                      <th className="text-left p-3 border-r border-red-200 font-semibold text-red-800">Дата оплати</th>
                      <th className="text-right p-3 border-r border-red-200 font-semibold text-red-800">Сума</th>
                      <th className="text-center p-3 font-semibold text-red-800 w-32">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overduePayments.map((doc, index) => (
                      <tr key={doc.ID} className="border-b border-red-200 hover:bg-red-50">
                        <td className="p-3 border-r border-red-200 text-center font-semibold">
                          {index + 1}
                        </td>
                        <td className="p-3 border-r border-red-200">
                          {formatDate(doc.Date)}
                        </td>
                        <td className="p-3 border-r border-red-200 font-semibold">
                          {doc.Number || `#${doc.ID}`}
                        </td>
                        <td className="p-3 border-r border-red-200">
                          {doc.SupplierName || '—'}
                        </td>
                        <td className="p-3 border-r border-red-200">
                          {formatDate(doc.PaymentDueDate)}
                        </td>
                        <td className="p-3 border-r border-red-200 text-right font-semibold">
                          {formatAmount(doc.TotalAmount)} {doc.CurrencyCode || 'грн'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handlePayment(doc)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-semibold"
                            title="Оплатити"
                          >
                            💳 Оплатити
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
