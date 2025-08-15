import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api";
import useDebounced from "../hooks/useDebounced";
import ProductPicker from "../components/ProductPicker";
import BarcodeInput from "../components/BarcodeInput";

export default function ArrivalDocumentsPage() {
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

  // стабільний об’єкт фільтрів + debounce
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

  // ф-ція підвантаження списку документів (щоб тригерити після save)
  const fetchDocs = useCallback(async (filts) => {
    setLoading(true);
    try {
      const rows = await api.getArrivalDocs({
        date_from: filts.fltFrom || undefined,
        date_to: filts.fltTo || undefined,
        supplier_id: filts.fltSupplier || undefined,
      });
      setDocs(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // автопідвантаження списку при зміні фільтрів (debounce)
  useEffect(() => {
    fetchDocs(debouncedFilters);
  }, [debouncedFilters, fetchDocs]);

  // зберегти документ
  const save = useCallback(async () => {
    const canSave =
      doc.Items.length > 0 &&
      String(doc.SupplierID || "").length > 0 &&
      String(doc.CompanyID || "").length > 0 &&
      String(doc.CenterID || "").length > 0;

    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        ...doc,
        SupplierID: doc.SupplierID || null,
        CurrencyID: doc.CurrencyID || null,
        CompanyID: doc.CompanyID || null,
        CenterID: doc.CenterID || null,
        TypicalOperationID: doc.TypicalOperationID || null,
        TotalExtraCosts: +doc.TotalExtraCosts || 0,
        TotalAmount: doc.Items.reduce(
          (s, r) => s + (+r.Quantity || 0) * (+r.Price || 0),
          0
        ),
        // Temporary explicit warehouse to bypass FK while we diagnose backend
        WarehouseID: doc.WarehouseID || 31,
        UserID: 1, // TODO: поточний користувач
        Items: doc.Items.map((r) => ({
          ProductID: r.ProductID,
          Quantity: +r.Quantity || 0,
          Price: +r.Price || 0,
          TaxRateID: r.TaxRateID || null,
          PartyID: r.PartyID || null,
          QtyOrdered: r.QtyOrdered || null,
          QtyInvoiced: r.QtyInvoiced || null,
        })),
      };

      // Debug: show payload and items before sending
      console.info("[UI] SAVE Arrival payload:", payload);
      console.log("[UI] SAVE Items:", payload.Items);
      console.log("[UI] SAVE first item:", payload.Items?.[0]);
      if (editingId) {
        const res = await api.updateArrivalDoc(editingId, payload);
        if (res?.Postings) setDoc((d) => ({ ...d, Postings: res.Postings }));
      } else {
        const res = await api.addArrivalDoc(payload);
        if (res?.ID) setEditingId(res.ID);
        if (res?.Postings) setDoc((d) => ({ ...d, Postings: res.Postings }));
        if (res?.Number) setDoc((d) => ({ ...d, Number: res.Number }));
      }

      // оновити список після збереження
      fetchDocs(debouncedFilters);

      // після збереження покажемо вкладку Бухоблік (фід буде порожній до "Провести")
      setTab("accounting");
    } catch (e) {
      alert(e?.message || "Помилка збереження");
    } finally {
      setSaving(false);
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
  }, [editingId]);

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
  }, [showForm, saving, posting, save]);

  const startAdd = useCallback(() => {
    setEditingId(null);
    const defCompany = companies?.[0]?.ID ?? "";
    const defCenter = centers?.[0]?.ID ?? "";
    const defCurrency = currencies?.find((c) => String(c.IsActive) === "1" || c.IsActive === true)?.ID
      ?? currencies?.[0]?.ID
      ?? "";
    const defOp = typicalOps?.[0]?.ID ?? "";
    setDoc({
      ...emptyDoc,
      Number: "",
      CompanyID: defCompany,
      CenterID: defCenter,
      CurrencyID: defCurrency,
      TypicalOperationID: defOp,
    });
    setShowForm(true);
    setTab("items");
    setTimeout(() => setBarcodeFocusBump((n) => n + 1), 0);
  }, [companies, centers, currencies, typicalOps, emptyDoc]);

  const startEdit = useCallback(async (id) => {
    const d = await api.getArrivalDoc(id);
    setEditingId(id);
    setDoc({
      ...d,
      Date: d.Date?.slice(0, 10),
      SupplierID: d.SupplierID || "",
      CurrencyID: d.CurrencyID || "",
      CompanyID: d.CompanyID || "",
      CenterID: d.CenterID || "",
      TypicalOperationID: d.TypicalOperationID || "",
      PricesIncludeVAT: !!d.PricesIncludeVAT,
      TotalExtraCosts: d.TotalExtraCosts || 0,
      Items: (d.Items || []).map((r) => ({
        ...r,
        ProductName: r.ProductName || r.FullName || r.Name || "",
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
      if (!window.confirm("Видалити документ?")) return;
      await api.deleteArrivalDoc(id);
      fetchDocs(debouncedFilters);
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
      alert("Штрихкод не знайдено");
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

  const canSave =
    doc.Items.length > 0 &&
    String(doc.SupplierID || "").length > 0 &&
    String(doc.CompanyID || "").length > 0 &&
    String(doc.CenterID || "").length > 0;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-3">Прибуткові накладні</h2>

      {/* Фільтри */}
      <div className="flex gap-2 items-end mb-3">
        <div>
          <label className="text-sm block mb-1">З дати</label>
          <input
            type="date"
            className="border rounded p-2"
            value={fltFrom}
            onChange={(e) => setFltFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm block mb-1">По дату</label>
          <input
            type="date"
            className="border rounded p-2"
            value={fltTo}
            onChange={(e) => setFltTo(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm block mb-1">Постачальник</label>
          <select
            className="border rounded p-2 min-w-[220px]"
            value={fltSupplier}
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
        <div className="ml-auto text-sm text-gray-500">
          {loading ? "Оновлюю…" : `Знайдено: ${docs.length}`}
        </div>
        <button onClick={startAdd} className="bg-green-700 text-white px-4 py-2 rounded">
          + Додати
        </button>
      </div>

      {/* Таблиця списку */}
      {loading ? (
        <div>Завантаження…</div>
      ) : (
        <table className="w-full bg-white rounded border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">№</th>
              <th className="p-2 border">Дата</th>
              <th className="p-2 border">Постачальник</th>
              <th className="p-2 border">Центр</th>
              <th className="p-2 border">Сума</th>
              <th className="p-2 border">Валюта</th>
              <th className="p-2 border">Статус</th>
              <th className="p-2 border w-36">Дії</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  Немає документів
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.ID}>
                  <td className="p-2 border">{d.Number}</td>
                  <td className="p-2 border">{d.Date?.slice(0, 10)}</td>
                  <td className="p-2 border">{d.SupplierName}</td>
                  <td className="p-2 border">{d.CenterName || ""}</td>
                  <td className="p-2 border">{Number(d.TotalAmount || 0).toFixed(2)}</td>
                  <td className="p-2 border">{d.CurrencyCode || ""}</td>
                  <td className="p-2 border">{d.Status}</td>
                  <td className="p-2 border text-center">
                    <button className="px-2 py-1 border mr-2" onClick={() => startEdit(d.ID)}>
                      ✏️
                    </button>
                    <button className="px-2 py-1 border" onClick={() => remove(d.ID)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Форма */}
      {showForm && (
        <div className="mt-6 bg-white p-4 rounded border shadow">
          <h3 className="font-semibold mb-3">
            {editingId ? "Редагувати прибуткову" : "Нова прибуткова"}
          </h3>

          {/* шапка */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm block mb-1">№ накладної</label>
              <input
                className="border rounded p-2 w-full"
                value={doc.Number}
                onChange={(e) => setDoc({ ...doc, Number: e.target.value })}
                placeholder="автонумерація / вручну"
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Дата</label>
              <input
                type="date"
                className="border rounded p-2 w-full"
                value={doc.Date}
                onChange={(e) => setDoc({ ...doc, Date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Постачальник</label>
              <select
                className="border rounded p-2 w-full"
                value={doc.SupplierID}
                onChange={(e) => setDoc({ ...doc, SupplierID: e.target.value })}
              >
                <option value="">— оберіть —</option>
                {suppliers.map((s) => (
                  <option key={s.ID} value={s.ID}>
                    {s.Name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm block mb-1">Центр обліку</label>
              <select
                className="border rounded p-2 w-full"
                value={doc.CenterID}
                onChange={(e) => setDoc({ ...doc, CenterID: e.target.value })}
              >
                <option value="">— оберіть —</option>
                {centers.map((c) => (
                  <option key={c.ID} value={c.ID}>
                    {c.Name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm block mb-1">Підприємець / Компанія</label>
              <select
                className="border rounded p-2 w-full"
                value={doc.CompanyID}
                onChange={(e) => setDoc({ ...doc, CompanyID: e.target.value })}
              >
                <option value="">— оберіть —</option>
                {companies.map((c) => (
                  <option key={c.ID} value={c.ID}>
                    {c.Name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm block mb-1">Валюта</label>
              <select
                className="border rounded p-2 w-full"
                value={doc.CurrencyID}
                onChange={(e) => setDoc({ ...doc, CurrencyID: e.target.value })}
              >
                <option value="">— не вказано —</option>
                {currencies.map((c) => (
                  <option key={c.ID} value={c.ID}>
                    {c.CurrencyCode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm block mb-1">Типова операція</label>
              <select
                className="border rounded p-2 w-full"
                value={doc.TypicalOperationID || ""}
                onChange={(e) => setDoc({ ...doc, TypicalOperationID: e.target.value })}
              >
                <option value="">— оберіть —</option>
                {typicalOps.map((o) => (
                  <option key={o.ID} value={o.ID}>
                    {o.Name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                id="prices_vat"
                type="checkbox"
                className="w-5 h-5"
                checked={!!doc.PricesIncludeVAT}
                onChange={(e) => setDoc({ ...doc, PricesIncludeVAT: e.target.checked })}
              />
              <label htmlFor="prices_vat">Ціни постачальника з ПДВ</label>
            </div>

            <div>
              <label className="text-sm block mb-1">Додаткові витрати, грн</label>
              <input
                className="border rounded p-2 w-full text-right"
                type="number"
                step="0.01"
                value={doc.TotalExtraCosts}
                onChange={(e) => setDoc({ ...doc, TotalExtraCosts: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm block mb-1">Зовнішній № / Інвойс</label>
              <input
                className="border rounded p-2 w-full"
                value={doc.ExternalNumber || ""}
                onChange={(e) => setDoc({ ...doc, ExternalNumber: e.target.value })}
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm block mb-1">Коментар</label>
              <input
                className="border rounded p-2 w-full"
                value={doc.Comment || ""}
                onChange={(e) => setDoc({ ...doc, Comment: e.target.value })}
                placeholder="будь-які примітки…"
              />
            </div>
          </div>

          {/* вкладки */}
          <div className="mt-5 border-b flex gap-2">
            <button
              className={`px-3 py-2 ${
                tab === "items" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-600"
              }`}
              onClick={() => setTab("items")}
            >
              Позиції
            </button>
            <button
              className={`px-3 py-2 ${
                tab === "extras" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-600"
              }`}
              onClick={() => setTab("extras")}
            >
              Додаткові витрати
            </button>
            <button
              className={`px-3 py-2 ${
                tab === "accounting" ? "border-b-2 border-blue-600 font-semibold" : "text-gray-600"
              }`}
              onClick={() => setTab("accounting")}
            >
              Бухоблік
            </button>
          </div>

          {/* контент вкладок */}
          {tab === "items" && (
            <>
              {/* штрихкод + дії пошуку */}
              <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-end">
                <div className="flex-1">
                  <label className="text-sm block mb-1">Штрихкод (Enter)</label>
                  <BarcodeInput
                     key={barcodeFocusBump}
                         autoFocus
                            onResolve={onBarcodeResolved}
                     onNotFound={(bc) => alert("Штрихкод не знайдено")}
                     placeholder="Скануй або введи та натисни Enter"
                />

                </div>
                <div className="flex gap-2">
                  <button className="border rounded px-3 py-2" onClick={addRow}>
                    + Рядок
                  </button>
                </div>
              </div>

              {/* позиції */}
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full bg-white border rounded">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border">Товар</th>
                      <th className="p-2 border w-28">К-сть</th>
                      <th className="p-2 border w-28">Ціна</th>
                      <th className="p-2 border w-28">Сума</th>
                      <th className="p-2 border w-16">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.Items.map((r, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border">
                          <ProductPicker
                            value={r}
                            onSelect={(p) => {
                              const full = p?.ProductName || p?.FullName || p?.Name || "";
                              setItem(idx, "ProductID", p.ProductID);
                              setItem(idx, "ProductName", full);
                            }}
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            className="border rounded p-2 w-full text-right"
                            type="number"
                            step="0.001"
                            value={r.Quantity}
                            onChange={(e) => setItem(idx, "Quantity", e.target.value)}
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            className="border rounded p-2 w-full text-right"
                            type="number"
                            step="0.01"
                            value={r.Price}
                            onChange={(e) => setItem(idx, "Price", e.target.value)}
                          />
                        </td>
                        <td className="p-2 border text-right">
                          {((+r.Quantity || 0) * (+r.Price || 0)).toFixed(2)}
                        </td>
                        <td className="p-2 border text-center">
                          <button className="px-2 py-1 border" onClick={() => delItem(idx)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {doc.Items.length === 0 && (
                      <tr>
                        <td className="p-3 text-center text-gray-500 border" colSpan={5}>
                          Додайте позиції
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "extras" && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                Додаткові витрати розподіляються пропорційно нетто-сумі позицій та потрапляють у
                собівартість (партії).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm block mb-1">Загальна сума витрат, грн</label>
                  <input
                    className="border rounded p-2 w-full text-right"
                    type="number"
                    step="0.01"
                    value={doc.TotalExtraCosts}
                    onChange={(e) => setDoc({ ...doc, TotalExtraCosts: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "accounting" && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">
                Проводки сформовано за типовою операцією після натискання «Провести».
              </div>
              <table className="min-w-full bg-white border rounded">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border w-16">№</th>
                    <th className="p-2 border">Дт</th>
                    <th className="p-2 border">Кт</th>
                    <th className="p-2 border w-32">Сума</th>
                    <th className="p-2 border">Коментар</th>
                  </tr>
                </thead>
                <tbody>
                  {(doc.Postings || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-gray-500">
                        Проводок ще нема
                      </td>
                    </tr>
                  ) : (
                    doc.Postings.map((p, i) => (
                      <tr key={i}>
                        <td className="p-2 border text-right">{p.LineNo}</td>
                        <td className="p-2 border">{p.DebitAccount}</td>
                        <td className="p-2 border">{p.CreditAccount}</td>
                        <td className="p-2 border text-right">
                          {Number(p.Amount || 0).toFixed(2)}
                        </td>
                        <td className="p-2 border">{p.Comment || ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-4">
            <div className="text-lg">
              Разом (позиції): <b>{Number(doc.TotalAmount || 0).toFixed(2)}</b>
            </div>

            { (doc.Postings || []).length === 0 ? (
              <button
                className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-60"
                onClick={runPostings}
                disabled={posting || !editingId}
                title={!editingId ? "Спочатку збережи документ" : undefined}
              >
                {posting ? "Проводжу…" : "Провести"}
              </button>
            ) : (
              <button
                className="bg-orange-600 text-white px-5 py-2 rounded disabled:opacity-60"
                onClick={cancelPostings}
                disabled={posting || !editingId}
              >
                {posting ? "Скасовую…" : "Відмінити проведення"}
              </button>
            )}

            <button
              className="bg-green-700 text-white px-5 py-2 rounded disabled:opacity-60"
              onClick={save}
              disabled={saving || !canSave}
              title={
                !canSave
                  ? "Обери постачальника, компанію, центр і додай хоча б одну позицію"
                  : undefined
              }
            >
              {saving ? "Збереження…" : "Зберегти (Ctrl+S)"}
            </button>

            <button
              className="bg-gray-500 text-white px-5 py-2 rounded"
              onClick={() => setShowForm(false)}
              disabled={saving || posting}
              title="Esc"
            >
              {(doc.Postings || []).length > 0 ? "Закрити" : "Відміна"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
