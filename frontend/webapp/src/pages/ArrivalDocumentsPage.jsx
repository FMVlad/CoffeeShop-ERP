import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import useDebounced from "../hooks/useDebounced";
import ProductPicker from "../components/ProductPicker";
import BarcodeInput from "../components/BarcodeInput";
import ArrivalDocItems from "../sections/arrival/ArrivalDocItems";
import { useUser } from "../UserContext";

export default function ArrivalDocumentsPage() {
  const navigate = useNavigate();
  const { centerId: activeCenterId } = useUser();
  const [docs, setDocs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [centers, setCenters] = useState([]);
  const [typicalOps, setTypicalOps] = useState([]);
  const [loading, setLoading] = useState(true);

  // фільтри списку
  const [fltFrom, setFltFrom] = useState("");
  const [fltTo, setFltTo] = useState("");
  const [fltSupplier, setFltSupplier] = useState("");

  // вкладки у формі
  const [tab, setTab] = useState("items"); // items | extras | accounting

  // стабільний об'єкт фільтрів + debounce
  const filters = useMemo(
    () => ({ fltFrom, fltTo, fltSupplier }),
    [fltFrom, fltTo, fltSupplier]
  );
  const debouncedFilters = useDebounced(filters, 400);

  // форма (дефолти)
  const emptyDoc = useMemo(
    () => ({
      Number: "",
      Date: new Date().toISOString().slice(0, 10),
      SupplierID: "",
      CurrencyID: "",
      CurrencyRate: 1,
      CurrencyRateDate: new Date().toISOString().slice(0, 10),
      PricesIncludeVAT: false,
      CompanyID: "",
      CenterID: "",
      TypicalOperationID: "",
      TotalExtraCosts: 0, // грн документу
      ExternalNumber: "",
      Comment: "",
      TotalAmount: 0,
      Items: [],
      Postings: [], // фід з бекенду після збереження / проведення
    }),
    []
  );
  const [editingId, setEditingId] = useState(null);
  const [doc, setDoc] = useState(emptyDoc);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  // "фокус-тик" для Ctrl+B (перемонтує BarcodeInput і той знову автофокуснеться)
  const [barcodeFocusBump, setBarcodeFocusBump] = useState(0);

  // завантаження довідників
  useEffect(() => {
    let done = false;
    (async () => {
      if (done) return;
      setLoading(true);
      try {
        await Promise.all([
          api.getSuppliers().then(setSuppliers),
          api.getCurrencies().then(setCurrencies),
          api.getCompanies().then(setCompanies),
          api.getCenters().then(setCenters),
          api.getTypicalOperations().then((rows) =>
            setTypicalOps(Array.isArray(rows) ? rows.filter((r) => r.IsActive) : [])
          ),
        ]);
      } finally {
        if (!done) setLoading(false);
      }
    })();
    return () => {
      done = true;
    };
  }, []);
  
  // Логування activeCenterId
  useEffect(() => {
    console.log('🔍 ArrivalDocumentsPage: activeCenterId змінився:', activeCenterId);
  }, [activeCenterId]);

  // Відновлення форми та черги додавання позицій після повернення зі сторінки вибору товарів
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("arrival_restore_doc");
      if (raw) {
        const restored = JSON.parse(raw);
        const restoredDoc = restored?.doc && typeof restored.doc === 'object' ? restored.doc : restored;
        const safeDoc = restoredDoc && Array.isArray(restoredDoc.Items) ? restoredDoc : emptyDoc;
        if (restored?.editingId != null) setEditingId(restored.editingId);
        setDoc(safeDoc);
        setShowForm(true);
        sessionStorage.removeItem("arrival_restore_doc");
      }
    } catch (e) {
      console.error("Помилка відновлення форми:", e);
    }
  }, [emptyDoc]);

  // завантаження списку документів
  const fetchDocs = useCallback(
    async (filters) => {
      try {
        const data = await api.getArrivalDocs(filters);
        setDocs(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Помилка завантаження документів:", e);
        setDocs([]);
      }
    },
    []
  );

  // завантаження при зміні фільтрів
  useEffect(() => {
    fetchDocs(debouncedFilters);
  }, [debouncedFilters, fetchDocs]);

  // завантаження при зміні документа
  useEffect(() => {
    if (Array.isArray(doc?.Items) && doc.Items.length > 0) {
      fetchDocs(debouncedFilters);
    }
  }, [doc, editingId, fetchDocs, debouncedFilters]);

  // провести (згенерувати проводки)
  const runPostings = useCallback(async () => {
    if (!editingId) {
      alert("Спочатку збережи документ");
      return;
    }
    setPosting(true);
    try {
      const res = await api.postArrivalDocPostings(editingId);
      if (res?.Postings) {
        setDoc((d) => ({ ...d, Postings: res.Postings }));
        setTab("accounting");
        // статус у таблиці оновиться після рефрешу списку
        fetchDocs(debouncedFilters);
      }
    } catch (e) {
      alert(e?.message || "Помилка проведення");
    } finally {
      setPosting(false);
    }
  }, [editingId, fetchDocs, debouncedFilters]);

  const cancelPostings = useCallback(async () => {
    if (!editingId) return;
    setPosting(true);
    try {
      await api.cancelArrivalDocPostings(editingId);
      setDoc((d) => ({ ...d, Postings: [] }));
      fetchDocs(debouncedFilters);
    } catch (e) {
      alert(e?.message || "Не вдалося скасувати проведення");
    } finally {
      setPosting(false);
    }
  }, [editingId, fetchDocs, debouncedFilters]);

  const startAdd = useCallback(() => {
    setEditingId(null);
    const defCompany = companies?.[0]?.ID ?? "";
    // Використовуємо поточний активний центр замість першого зі списку
    const defCenter = activeCenterId || (centers?.[0]?.ID ?? "");
    const defCurrency = currencies?.find((c) => String(c.IsActive) === "1" || c.IsActive === true)?.ID
      ?? currencies?.[0]?.ID
      ?? "";
    const defOp = typicalOps?.[0]?.ID ?? "";
    
    console.log('🔍 ArrivalDocumentsPage: startAdd - activeCenterId:', activeCenterId, 'defCenter:', defCenter);
    
    setDoc({
      ...emptyDoc,
      Number: "",
      CompanyID: defCompany,
      CenterID: defCenter,
      CurrencyID: defCurrency,
      CurrencyRate: 1,
      CurrencyRateDate: new Date().toISOString().slice(0, 10),
      TypicalOperationID: defOp,
    });
    setShowForm(true);
    setTab("items");
    setTimeout(() => setBarcodeFocusBump((n) => n + 1), 0);
  }, [companies, centers, currencies, typicalOps, emptyDoc, activeCenterId]);

  const startEdit = useCallback(async (id) => {
    const d = await api.getArrivalDoc(id);
    setEditingId(id);
    setDoc({
      ...d,
      Date: d.Date?.slice(0, 10),
      SupplierID: d.SupplierID || "",
      CurrencyID: d.CurrencyID || "",
      CurrencyRate: d.CurrencyRate || 1,
      CurrencyRateDate: (d.CurrencyRateDate || d.Date || new Date().toISOString()).slice(0,10),
      CompanyID: d.CompanyID || "",
      CenterID: d.CenterID || "",
      TypicalOperationID: d.TypicalOperationID || "",
      PricesIncludeVAT: !!d.PricesIncludeVAT,
      TotalExtraCosts: d.TotalExtraCosts || 0,
      Items: (d.Items || []).map((r) => ({
        ...r,
        ProductName: r.ProductName || r.FullName || r.Name || "",
        PriceFC: r.PriceFC || null,
      })),
      TotalAmount:
        (d.Items || []).reduce(
          (s, r) => s + (+r.Quantity || 0) * (+r.Price || 0),
          0
        ) || 0,
      Postings: d.Postings || [],
    });
    setShowForm(true);
    setTab("items");
    setTimeout(() => setBarcodeFocusBump((n) => n + 1), 0);
  }, []);

  const remove = useCallback(
    async (id) => {
      if (!window.confirm("Видалити документ? Це також видалить всі пов'язані партії, рухи та залишки.")) return;
      try {
        const result = await api.deleteArrivalDoc(id);
        console.log('🔍 ArrivalDocumentsPage: Результат видалення:', result);
        
        if (result.ok) {
          let message = 'Документ видалено!';
          if (result.deleted_items > 0) message += `\n- Позицій: ${result.deleted_items}`;
          if (result.deleted_parties > 0) message += `\n- Партій: ${result.deleted_parties}`;
          if (result.deleted_balances > 0) message += `\n- Нульових залишків: ${result.deleted_balances}`;
          
          alert(message);
        }
        
        await fetchDocs(debouncedFilters);
      } catch (err) {
        console.error('Помилка видалення документу:', err);
        alert('Помилка видалення: ' + (err?.message || err));
      }
    },
    [fetchDocs, debouncedFilters]
  );

  // додати порожній рядок вручну
  const addRow = useCallback(() => {
    setDoc((d) => ({
      ...d,
      Items: [
        ...d.Items,
        { ProductID: "", ProductName: "", Quantity: 1, Price: 0, TaxRateID: null },
      ],
    }));
  }, []);

  // результат сканування/вводу штрихкоду
  const onBarcodeResolved = useCallback((p) => {
    if (!p) {
      return; // НЕ додаємо порожній рядок!
    }
    const displayName = p.FullName || p.ProductName || p.Name || "";
    setDoc((d) => {
      const newItems = [
        ...d.Items,
        {
          ProductID: p.ID ?? p.ProductID,
          ProductName: displayName,
          Quantity: 1,
          Price: 0,
          TaxRateID: null,
        },
      ];
      const total = newItems.reduce(
        (s, r) => s + (+r.Quantity || 0) * (+r.Price || 0),
        0
      );
      return { ...d, Items: newItems, TotalAmount: total };
    });
  }, []);

  const setItem = useCallback((idx, key, val) => {
    setDoc((d) => {
      const items = d.Items.map((r, i) => (i === idx ? { ...r, [key]: val } : r));
      const total = items.reduce(
        (s, r) => s + (+r.Quantity || 0) * (+r.Price || 0),
        0
      );
      return { ...d, Items: items, TotalAmount: total };
    });
  }, []);

  const delItem = useCallback((idx) => {
    setDoc((d) => {
      const items = d.Items.filter((_, i) => i !== idx);
      const total = items.reduce((s, r) => s + (+r.Quantity || 0) * (+r.Price || 0), 0);
      return { ...d, Items: items, TotalAmount: total };
    });
  }, []);

  const itemsCount = Array.isArray(doc?.Items) ? doc.Items.length : 0;
  const canSave =
    itemsCount > 0 &&
    String(doc?.SupplierID || "").length > 0 &&
    String(doc?.CompanyID || "").length > 0 &&
    String(doc?.CenterID || "").length > 0;

  const save = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateArrivalDoc(editingId, doc);
      } else {
        const result = await api.addArrivalDoc(doc);
        setEditingId(result.ID);
      }
      await fetchDocs(debouncedFilters);
      alert(editingId ? "Документ оновлено!" : "Документ створено!");
    } catch (e) {
      alert(e?.message || "Помилка збереження");
    } finally {
      setSaving(false);
    }
  }, [doc, editingId, canSave, fetchDocs, debouncedFilters]);

  // гарячі клавіші (поки форма відкрита)
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
      if ((e.ctrlKey && e.key.toLowerCase() === "b") || e.key === "F1") {
        e.preventDefault();
        setBarcodeFocusBump((n) => n + 1);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        addRow();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (!saving && !posting) setShowForm(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, saving, posting, save, addRow]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl shadow-2xl p-8 mb-12 w-full">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              📦 Прибуткові накладні
            </h1>
            <p className="text-2xl text-blue-100">
              Створення та управління прибутковими накладними
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
            onClick={startAdd}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Додати накладну
          </button>
        </div>

        {/* Фільтри */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-blue-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b-2 border-blue-200">
            <h3 className="text-2xl font-bold text-blue-800 mb-4">
              🔍 Фільтри пошуку
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">З дати</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={fltFrom || ""}
                  onChange={(e) => setFltFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm block mb-2">По дату</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={fltTo || ""}
                  onChange={(e) => setFltTo(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Постачальник</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={fltSupplier || ""}
                  onChange={(e) => setFltSupplier(e.target.value)}
                >
                  <option value="">Усі</option>
                  {suppliers.map((s) => (
                    <option key={s.ID} value={s.ID}>
                      {s.Name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-center text-gray-600 font-medium">
                {loading ? "⏳ Оновлюю…" : `📊 Знайдено: ${docs.length}`}
              </div>
            </div>
          </div>
        </div>

        {/* Таблиця списку */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b-2 border-blue-200">
            <h3 className="text-2xl font-bold text-blue-800">
              📋 Список документів
            </h3>
          </div>
          
          <div className="p-8">
            {loading ? (
              <div className="text-center text-gray-500 text-lg py-12">
                ⏳ Завантаження…
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center text-gray-500 text-lg py-12">
                📭 Немає документів
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-blue-200">№</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-blue-200">Дата</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-blue-200">Постачальник</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-blue-200">Центр</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-blue-200">Сума</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-blue-200">Валюта</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-blue-200">Статус</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-b border-blue-200 w-36">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d, index) => (
                      <tr key={d.ID} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                        <td className="px-6 py-4 text-sm text-gray-900 border-b border-blue-100">{d.Number}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 border-b border-blue-100">{d.Date?.slice(0, 10)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 border-b border-blue-100">{d.SupplierName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 border-b border-blue-100">{d.CenterName || ""}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 border-b border-blue-100 font-medium">{Number(d.TotalAmount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 border-b border-blue-100">{d.CurrencyCode || ""}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 border-b border-blue-100">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            d.Status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                            d.Status === 'posted' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {d.Status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center border-b border-blue-100">
                          <button 
                            className="px-3 py-2 bg-blue-500 text-white rounded-lg mr-2 hover:bg-blue-600 transition-colors duration-200" 
                            onClick={() => startEdit(d.ID)}
                            title="Редагувати"
                          >
                            ✏️
                          </button>
                          <button 
                            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200" 
                            onClick={() => remove(d.ID)}
                            title="Видалити"
                          >
                            🗑️
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

        {/* Форма */}
        {showForm && (
          <div className="mt-8 bg-white rounded-3xl shadow-2xl border-2 border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
              <h3 className="text-3xl font-bold text-white">
                {editingId ? "✏️ Редагувати прибуткову" : "🆕 Нова прибуткова"}
              </h3>
            </div>
            
            <div className="p-8">
              {/* шапка */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">№ накладної</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.Number || ""}
                    onChange={(e) => setDoc({ ...doc, Number: e.target.value })}
                    placeholder="автонумерація / вручну"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Дата</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.Date || ""}
                    onChange={(e) => setDoc({ ...doc, Date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Зовнішній номер</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.ExternalNumber || ""}
                    onChange={(e) => setDoc({ ...doc, ExternalNumber: e.target.value })}
                    placeholder="№ від постачальника"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Постачальник *</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.SupplierID || ""}
                    onChange={(e) => setDoc({ ...doc, SupplierID: e.target.value })}
                  >
                    <option value="">Обрати постачальника</option>
                    {suppliers.map((s) => (
                      <option key={s.ID} value={s.ID}>
                        {s.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Компанія *</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.CompanyID || ""}
                    onChange={(e) => setDoc({ ...doc, CompanyID: e.target.value })}
                  >
                    <option value="">Обрати компанію</option>
                    {companies.map((c) => (
                      <option key={c.ID} value={c.ID}>
                        {c.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Центр *</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.CenterID || ""}
                    onChange={(e) => setDoc({ ...doc, CenterID: e.target.value })}
                  >
                    <option value="">Обрати центр</option>
                    {centers.map((c) => (
                      <option key={c.ID} value={c.ID}>
                        {c.Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Валюта</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.CurrencyID || ""}
                    onChange={(e) => setDoc({ ...doc, CurrencyID: e.target.value })}
                  >
                    <option value="">Обрати валюту</option>
                    {currencies.map((c) => (
                      <option key={c.ID} value={c.ID}>
                        {c.CurrencyCode} - {c.CurrencyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Курс валют</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.CurrencyRate ?? ""}
                    onChange={(e) => setDoc({ ...doc, CurrencyRate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Дата курсу</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.CurrencyRateDate || ""}
                    onChange={(e) => setDoc({ ...doc, CurrencyRateDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Типова операція</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={doc.TypicalOperationID || ""}
                    onChange={(e) => setDoc({ ...doc, TypicalOperationID: e.target.value })}
                  >
                    <option value="">Обрати операцію</option>
                    {typicalOps.map((op) => (
                      <option key={op.ID} value={op.ID}>
                        {op.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={doc.PricesIncludeVAT}
                      onChange={(e) => setDoc({ ...doc, PricesIncludeVAT: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Ціни включають ПДВ</span>
                  </label>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Коментар</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  value={doc.Comment || ""}
                  onChange={(e) => setDoc({ ...doc, Comment: e.target.value })}
                  placeholder="Додаткові нотатки..."
                />
              </div>

              {/* вкладки */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setTab("items")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      tab === "items"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Товари
                  </button>
                  <button
                    onClick={() => setTab("extras")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      tab === "extras"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Додаткові витрати
                  </button>
                  <button
                    onClick={() => setTab("accounting")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      tab === "accounting"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Проводки
                  </button>
                </nav>
              </div>

              {/* вкладка товари */}
              {tab === "items" && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Товари та послуги</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={addRow}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                      >
                        + Додати рядок
                      </button>
                      <BarcodeInput
                        key={barcodeFocusBump}
                        onResolved={onBarcodeResolved}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
                      >
                        📱 Сканувати
                      </BarcodeInput>
                    </div>
                  </div>

                  <ArrivalDocItems
                    doc={doc}
                    setDoc={setDoc}
                    focusKey={barcodeFocusBump}
                    onRequestFocus={() => setBarcodeFocusBump((n) => n + 1)}
                    showFC={(() => {
                      const uah = currencies.find(c => c.CurrencyCode === 'UAH');
                      if (!doc.CurrencyID) return false;
                      if (!uah) return false;
                      return String(doc.CurrencyID) !== String(uah.ID);
                    })()}
                    rate={Number(doc.CurrencyRate || 1)}
                  />
                </div>
              )}

              {/* вкладка додаткові витрати */}
              {tab === "extras" && (
                <div className="mb-8">
                  <p className="text-sm text-gray-600 mb-4">
                    Додаткові витрати розподіляються пропорційно нетто-сумі позицій та потрапляють у
                    собівартість (партії).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Загальна сума витрат, грн</label>
                      <input
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                        type="number"
                        step="0.01"
                        value={doc.TotalExtraCosts}
                        onChange={(e) => setDoc({ ...doc, TotalExtraCosts: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* вкладка проводки */}
              {tab === "accounting" && (
                <div className="mb-8">
                  <div className="text-sm text-gray-600 mb-4">
                    Проводки сформовано за типовою операцією після натискання «Провести».
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200 w-16">№</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Дт</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Кт</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200 w-32">Сума</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Коментар</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(doc.Postings || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                              Проводок ще нема
                            </td>
                          </tr>
                        ) : (
                          doc.Postings.map((p, i) => (
                            <tr key={i} className="bg-white">
                              <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100 text-right">{p.LineNo}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100">{p.DebitAccount}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100">{p.CreditAccount}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100 text-right">
                                {Number(p.Amount || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100">{p.Comment || ""}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* кнопки дій */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t border-gray-200">
                <div className="text-lg font-medium text-gray-700">
                  Разом (позиції): <span className="text-blue-600 font-bold">{Number(doc.TotalAmount || 0).toFixed(2)}</span>
                </div>

                <div className="flex flex-wrap gap-4">
                  {(doc.Postings || []).length === 0 ? (
                    <button
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors duration-200"
                      onClick={runPostings}
                      disabled={posting || !editingId}
                      title={!editingId ? "Спочатку збережи документ" : undefined}
                    >
                      {posting ? "⏳ Проводжу…" : "✅ Провести"}
                    </button>
                  ) : (
                    <button
                      className="px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-60 transition-colors duration-200"
                      onClick={cancelPostings}
                      disabled={posting || !editingId}
                    >
                      {posting ? "⏳ Скасовую…" : "❌ Відмінити проведення"}
                    </button>
                  )}

                  <button
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-60 transition-colors duration-200"
                    onClick={save}
                    disabled={saving || !canSave}
                    title={
                      !canSave
                        ? "Обери постачальника, компанію, центр і додай хоча б одну позицію"
                        : undefined
                    }
                  >
                    {saving ? "⏳ Збереження…" : "💾 Зберегти (Ctrl+S)"}
                  </button>

                  <button
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-60 transition-colors duration-200"
                    onClick={() => remove(editingId)}
                    disabled={saving || posting}
                    title="Видалити документ та всі пов'язані дані"
                  >
                    🗑 Видалити
                  </button>

                  <button
                    className="px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors duration-200"
                    onClick={() => setShowForm(false)}
                    disabled={saving || posting}
                    title="Esc"
                  >
                    Закрити
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
