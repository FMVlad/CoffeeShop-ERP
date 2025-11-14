import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import StockPickerButton from "../components/StockPickerButton.jsx";
import { useUser } from "../UserContext";

export default function DiscountDocumentsPage() {
  const navigate = useNavigate();
  const { centerId: activeCenterId } = useUser();

  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [docs, setDocs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [items, setItems] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [pctEdit, setPctEdit] = useState({});
  const [roundStep, setRoundStep] = useState(1);
  const [roundMode, setRoundMode] = useState("nearest");
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const currentRef = useRef(null);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const centerNameById = useCallback((id) => {
    const c = (centers || []).find(x => String(x.ID) === String(id));
    return c ? (c.Name || c.CenterName || c.ID) : id;
  }, [centers]);

  useEffect(() => {
    api.getCenters().then(setCenters).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeCenterId && !centerId) {
      setCenterId(String(activeCenterId));
    }
  }, [activeCenterId, centerId]);

  const loadDoc = useCallback(async (docId, { withItems = true } = {}) => {
    if (!docId) {
      setCurrent(null);
      setItems([]);
      setPctEdit({});
      return;
    }
    try {
      const doc = await api.getDiscountDoc(docId);
      setCurrent(doc || null);
      if (withItems) {
        setLoadingItems(true);
        try {
          const loadedItems = await api.getDiscountDocItems(docId);
          setItems(Array.isArray(loadedItems) ? loadedItems : []);
          setPctEdit({});
        } finally {
          setLoadingItems(false);
        }
      }
    } catch (error) {
      console.error("❗ DiscountDocumentsPage: Не вдалося завантажити документ", error);
      setCurrent(null);
      setItems([]);
      setPctEdit({});
    }
  }, []);

  const reloadItems = useCallback(async (docIdParam) => {
    const targetId = docIdParam ?? currentRef.current?.ID;
    if (!targetId) return;
    setLoadingItems(true);
    try {
      console.log("🔍 DiscountDocumentsPage: Завантаження позицій для документа:", targetId);
      const loaded = await api.getDiscountDocItems(targetId);
      console.log("🔍 DiscountDocumentsPage: Отримано позицій:", Array.isArray(loaded) ? loaded.length : 0);
      setItems(Array.isArray(loaded) ? loaded : []);
      setPctEdit({});
    } catch (error) {
      console.error("❗ DiscountDocumentsPage: Не вдалося оновити позиції", error);
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const reloadDocs = useCallback(async (options = {}) => {
    try {
      setLoadingDocs(true);
      const list = await api.getDiscountDocs();
      const arr = Array.isArray(list) ? list : [];
      setDocs(arr);

      if (options.selectId) {
        await loadDoc(options.selectId, { withItems: true });
        return;
      }

      const active = currentRef.current;
      if (active) {
        const stillExists = arr.some(d => Number(d.ID) === Number(active.ID));
        if (!stillExists) {
          setCurrent(null);
          setItems([]);
          setPctEdit({});
          if (options.autoSelect && arr.length > 0) {
            await loadDoc(arr[0].ID, { withItems: true });
          }
        } else if (options.refreshSelected) {
          await loadDoc(active.ID, { withItems: true });
        }
      } else if (options.autoSelect && arr.length > 0) {
        await loadDoc(arr[0].ID, { withItems: true });
      }
    } catch (error) {
      console.error("❗ DiscountDocumentsPage: Не вдалося завантажити список документів", error);
      setDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [loadDoc]);

  useEffect(() => {
    reloadDocs({ autoSelect: false });
  }, [reloadDocs]);

  const handledSelectionRef = useRef(false);
  useEffect(() => {
    (async () => {
      if (handledSelectionRef.current) return;
      try {
        const pickedRaw = window.sessionStorage.getItem('selected::discount_doc');
        if (pickedRaw && !current?.ID) {
          handledSelectionRef.current = true;
          const list = await api.getDiscountDocs();
          setDocs(Array.isArray(list) ? list : []);
          const cid = Number(centerId || activeCenterId);
          const existing = (list || [])
            .filter(d => String(d.Status || 'open').toLowerCase() === 'open' && Number(d.CenterID) === cid)
            .sort((a,b) => (new Date(a.DocDate) - new Date(b.DocDate)) || (a.ID - b.ID));
          const last = existing.length ? existing[existing.length - 1] : null;
          if (last) {
            const doc = await api.getDiscountDoc(last.ID);
            setCurrent(doc);
            await reloadItems(last.ID);
          } else {
            await createDoc();
          }
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.ID, centerId, activeCenterId]);

  useEffect(() => {
    const currentId = current?.ID;
    if (!currentId) {
      console.log('🔍 DiscountDocumentsPage: current.ID не встановлено:', current);
      return;
    }

    let cancelled = false;
    console.log('🔍 DiscountDocumentsPage: Перевіряємо sessionStorage для документа:', currentId);
    const picked = window.sessionStorage.getItem('selected::discount_doc');
    console.log('🔍 DiscountDocumentsPage: Отримано з sessionStorage (raw):', picked);

    const processSelection = async () => {
      if (!picked) {
        console.log('🔍 DiscountDocumentsPage: sessionStorage порожній для ключа selected::discount_doc');
        return;
      }

      try {
        const parsed = JSON.parse(picked);
        console.log('🔍 DiscountDocumentsPage: Отримано з sessionStorage (parsed):', parsed);

        if (!parsed?.items || parsed.items.length === 0) {
          console.log('🔍 DiscountDocumentsPage: Немає товарів для додавання або неправильна структура:', parsed);
          return;
        }

        const existingList = await api.getDiscountDocItems(currentId);
        if (cancelled) return;
        const existingArray = Array.isArray(existingList) ? existingList : [];
        const existingMap = new Map(existingArray.map(it => [Number(it.ProductID), it]));
        setItems(existingArray);

        console.log('🔍 DiscountDocumentsPage: Починаємо обробку товарів...');
        for (const item of parsed.items) {
          if (cancelled) return;
          if (!item?.id) continue;

          const productId = Number(item.id);
          if (!productId) continue;

          const quantity = Number(item.quantity || 1);
          const price = Number(item.price || 0);
          console.log('🔍 DiscountDocumentsPage: Обробляємо товар:', { productId, quantity, price });

          const existingItem = existingMap.get(productId);
          if (existingItem) {
            const currentQuantity = Number(existingItem.Quantity || 0);
            const newQuantity = currentQuantity + quantity;
            console.log('🔍 DiscountDocumentsPage: Оновлюємо існуючий товар:', { existingItem: existingItem.ID, newQuantity });
            await api.updateDiscountDocItem(currentId, existingItem.ID, {
              Quantity: newQuantity,
              Price: price,
            });
            existingItem.Quantity = newQuantity;
            existingItem.Price = price;
          } else {
            console.log('🔍 DiscountDocumentsPage: Додаємо новий товар:', { productId, quantity, price });
            await api.addDiscountDocItem(currentId, {
              ProductID: productId,
              Quantity: quantity,
              Price: price,
            });
          }
        }

        window.sessionStorage.removeItem('selected::discount_doc');
        console.log('🔍 DiscountDocumentsPage: sessionStorage очищено');
        if (!cancelled) {
          await reloadItems(currentId);
        }
      } catch (e) {
        console.error('Помилка обробки обраних товарів:', e);
      }
    };

    processSelection().catch(e => console.error('Помилка обробки обраних товарів:', e));

    return () => {
      cancelled = true;
    };
  }, [current?.ID, reloadItems]);

  async function createDoc(){
    console.log('🔍 DiscountDocumentsPage: Створення документа з CenterID:', Number(centerId || activeCenterId));
    console.log('🔍 DiscountDocumentsPage: centerId:', centerId, 'activeCenterId:', activeCenterId);
    const res = await api.addDiscountDoc({ CenterID: Number(centerId || activeCenterId) });
    console.log('🔍 DiscountDocumentsPage: Створено документ:', res);
    await reloadDocs({ selectId: res.ID });
  }

  const roundPrice = (value) => {
    const step = Number(roundStep) || 0;
    const v = Number(value) || 0;
    if (step <= 0) return Number(v.toFixed(2));
    const scaled = v / step;
    let r;
    if (roundMode === 'up') r = Math.ceil(scaled);
    else if (roundMode === 'down') r = Math.floor(scaled);
    else r = Math.round(scaled);
    return Number((r * step).toFixed(2));
  };

  const applyRoundingAll = async () => {
    const docId = currentRef.current?.ID;
    if (!docId) return;
    for (const it of items) {
      const newP = roundPrice(it.Price);
      if (newP !== Number(it.Price)) {
        updateItemLocal(it.ID, { Price: newP });
        await persistItem(it.ID, { Price: newP });
      }
    }
    await reloadItems(docId);
  };

  const commitPercentForItem = async (item, pctStr) => {
    const baseSource = item.PriceBase ?? item.BasePrice ?? item.Price ?? 0;
    const base = Number(baseSource) || 0;
    const pct = Number(pctStr);
    const priceRaw = base ? (base * (1 - (isNaN(pct) ? 0 : pct) / 100)) : 0;
    const price = roundPrice(priceRaw);
    updateItemLocal(item.ID, { Price: price });
    await persistItem(item.ID, { Price: price });
    setPctEdit(prev => { const n = { ...prev }; delete n[item.ID]; return n; });
    const docId = currentRef.current?.ID;
    if (docId) {
      await reloadItems(docId);
    }
  };

  const setCurrentField = (key, value) => {
    setCurrent(prev => prev ? { ...prev, [key]: value } : prev);
  };

  async function persistCurrent(patch){
    const target = currentRef.current;
    if (!target?.ID) return;
    try { await api.updateDiscountDoc(target.ID, patch); } catch {}
  }

  const updateItemLocal = (itemId, patch) => {
    setItems(prev => prev.map(it => it.ID === itemId ? { ...it, ...patch } : it));
  };

  async function persistItem(itemId, patch){
    const target = currentRef.current;
    if (!target?.ID) return;
    try { await api.updateDiscountDocItem(target.ID, itemId, patch); } catch {}
  }

  const handleSelectDoc = useCallback((docId) => {
    if (!docId) return;
    loadDoc(docId, { withItems: true });
  }, [loadDoc]);

  const sortedDocs = useMemo(() => {
    return [...docs].sort((a, b) => {
      const dateA = new Date(a.DocDate || a.CreatedAt || 0).getTime();
      const dateB = new Date(b.DocDate || b.CreatedAt || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return Number(b.ID) - Number(a.ID);
    });
  }, [docs]);

  const handleDeleteDoc = useCallback(async (docId) => {
    if (!docId) return;
    if (!window.confirm('Видалити документ? Товари будуть повернуті на головний склад.')) return;
    try {
      const result = await api.deleteDiscountDoc(docId);
      if (result.returned_to_main_warehouse > 0) {
        alert(`Документ видалено! Повернуто на головний склад: ${result.returned_to_main_warehouse} товарів`);
      } else {
        alert('Документ видалено!');
      }
      const active = currentRef.current;
      if (active?.ID === docId) {
        setCurrent(null);
        setItems([]);
        setPctEdit({});
      }
      await reloadDocs({ autoSelect: false });
    } catch (err) {
      alert('Помилка видалення: ' + (err?.message || err));
    }
  }, [reloadDocs]);

  const handlePostDoc = useCallback(async () => {
    const doc = currentRef.current;
    if (!doc?.ID) return;
    try {
      await persistCurrent({ Comment: doc.Comment || '' });
      await api.postDiscountDocPostings(doc.ID);
      await reloadDocs({ selectId: doc.ID });
      alert('Документ успішно проведений');
    } catch (e) {
      alert(e?.message || 'Помилка запису');
    }
  }, [reloadDocs]);

  const handleCloseIfEmpty = useCallback(async () => {
    const doc = currentRef.current;
    if (!doc?.ID) return;
    try {
      const result = await api.closeDiscountDocIfEmpty(doc.ID);
      if (result?.closed) {
        await reloadDocs({ selectId: doc.ID, refreshSelected: true });
        alert('Документ закрито (порожній)');
      } else {
        alert('Документ не порожній — закриття заборонено');
      }
    } catch (error) {
      alert(error?.message || 'Не вдалося закрити документ');
    }
  }, [reloadDocs]);

  const handleCleanup = useCallback(async () => {
    if (!window.confirm('Очистити забруднені дані в StockBalances? Це видалить всі записи з нульовою кількістю та застарілі коментарі.')) {
      return;
    }
    try {
      const result = await api.cleanupStockBalances();
      alert(`Очищено: ${result.total_deleted} записів\n- Нульова кількість: ${result.deleted_zero_quantity}\n- Коментарі уцінки: ${result.deleted_discount_comments}\n- Дублікати: ${result.deleted_duplicates}`);
      await reloadDocs({ refreshSelected: true });
    } catch (err) {
      alert('Помилка очищення: ' + (err?.message || err));
    }
  }, [reloadDocs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 py-8 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-violet-500 to-purple-600 rounded-3xl shadow-2xl px-8 py-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">📝 Документи уцінки</h1>
            <p className="text-violet-100 text-lg">Оберіть документ зі списку або створіть новий, щоб переглянути склад та ціни.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/stock")}
              className="px-6 py-3 rounded-2xl font-semibold bg-white/15 hover:bg-white/25 text-white transition"
            >
              ← Назад до складів
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-2xl font-semibold bg-white/15 hover:bg-white/25 text-white transition"
            >
              🏠 На головну
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 items-start">
          <aside className="bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden h-[80vh]">
            <div className="px-6 py-5 border-b border-violet-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Перелік документів</h2>
                  <p className="text-sm text-gray-500">Натисніть на рядок, щоб переглянути позиції.</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm bg-violet-100 text-violet-700 font-semibold">
                  {docs.length}
                </span>
              </div>
              <label className="text-sm font-medium text-gray-600">Центр для нових документів</label>
              <select
                value={centerId}
                onChange={e => setCenterId(e.target.value)}
                className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">Автоматично ({centerNameById(activeCenterId)})</option>
                {centers.map(c => (
                  <option key={c.ID} value={String(c.ID)}>
                    {c.Name || c.CenterName || `Центр #${c.ID}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-auto">
              {loadingDocs ? (
                <div className="h-full flex items-center justify-center text-violet-500 font-medium">
                  Завантаження документів...
                </div>
              ) : sortedDocs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center px-6 text-center text-gray-500 gap-3">
                  <p>Поки що немає документів уцінки.</p>
                  <button
                    onClick={createDoc}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-md hover:shadow-lg transition"
                  >
                    ✨ Створити перший
                  </button>
                </div>
              ) : (
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-violet-50 text-xs uppercase text-violet-700 tracking-wide">
                      <th className="px-4 py-3 text-left">№</th>
                      <th className="px-4 py-3 text-left">Дата</th>
                      <th className="px-4 py-3 text-left">Центр</th>
                      <th className="px-4 py-3 text-left">Статус</th>
                      <th className="px-4 py-3 text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDocs.map(doc => {
                      const isActive = Number(current?.ID) === Number(doc.ID);
                      return (
                        <tr
                          key={doc.ID}
                          onClick={() => handleSelectDoc(doc.ID)}
                          className={`cursor-pointer transition ${
                            isActive ? 'bg-violet-100/70 hover:bg-violet-100' : 'hover:bg-violet-50'
                          }`}
                        >
                          <td className="px-4 py-3 border-t border-violet-100 font-semibold text-gray-700">
                            {doc.DocNumber || doc.ID}
                          </td>
                          <td className="px-4 py-3 border-t border-violet-100 text-sm text-gray-600">
                            {String(doc.DocDate).slice(0, 10)}
                          </td>
                          <td className="px-4 py-3 border-t border-violet-100 text-sm text-gray-600">
                            {centerNameById(doc.CenterID)}
                          </td>
                          <td className="px-4 py-3 border-t border-violet-100">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              String(doc.Status || 'open').toLowerCase() === 'posted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {doc.Status || 'open'}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-t border-violet-100 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDoc(doc.ID);
                              }}
                              className="text-red-500 hover:text-red-600 font-semibold"
                              title="Видалити документ"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-4 border-t border-violet-100 flex flex-col gap-3">
              <button
                onClick={createDoc}
                className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-md hover:shadow-lg transition"
              >
                ✨ Створити документ
              </button>
              <button
                onClick={handleCleanup}
                className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold shadow-md hover:shadow-lg transition"
              >
                🧹 Очистити StockBalances
              </button>
            </div>
          </aside>

          <section className="bg-white rounded-3xl shadow-2xl h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-violet-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {current ? `Документ №${current.DocNumber || current.ID}` : 'Оберіть документ'}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {current
                    ? `${String(current.DocDate).slice(0, 10)} · Центр ${centerNameById(current.CenterID)}`
                    : 'Щоб побачити позиції, виберіть документ ліворуч або створіть новий.'}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={createDoc}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow hover:shadow-md transition disabled:opacity-60"
                >
                  ✨ Новий документ
                </button>
                <button
                  onClick={handlePostDoc}
                  disabled={!current?.ID}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  ✅ Провести
                </button>
                <button
                  onClick={handleCloseIfEmpty}
                  disabled={!current?.ID}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold shadow hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  ⛔ Закрити при 0
                </button>
                <button
                  onClick={() => handleDeleteDoc(current?.ID)}
                  disabled={!current?.ID}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold shadow hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  🗑 Видалити
                </button>
              </div>
            </div>

            {current ? (
              <>
                <div className="px-6 py-4 border-b border-violet-100 grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-600">Коментар</label>
                    <input
                      type="text"
                      value={current.Comment || ''}
                      onChange={e=>setCurrentField('Comment', e.target.value)}
                      onBlur={e=>persistCurrent({ Comment: e.target.value })}
                      className="w-full px-4 py-3 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-600">Штрихкод та вибір зі складу</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Скануйте або введіть штрихкод та Enter"
                        value={barcode}
                        onChange={(e)=>setBarcode(e.target.value)}
                        onKeyDown={async(e)=>{
                          if (e.key === 'Enter') {
                            const s = (barcode||'').trim();
                            if (!s || !current?.ID) return;
                            try {
                              const p = await api.getProductByBarcode(s);
                              if (p && p.ID) {
                                await api.addDiscountDocItem(current.ID, { ProductID: Number(p.ID||p.Id), Quantity: 1, Price: Number(p.Price||0) });
                                setBarcode('');
                                await reloadItems(current.ID);
                              } else {
                                alert('Товар не знайдено');
                              }
                            } catch(err) {
                              alert(err?.message || 'Товар не знайдено');
                            }
                          }
                        }}
                        className="flex-1 px-4 py-3 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                      <StockPickerButton
                        selectionKey="discount_doc"
                        centerId={String(current.CenterID)}
                        label="Стан складу"
                        className="bg-gradient-to-r from-violet-100 to-purple-200 border border-violet-300 rounded-2xl px-4 py-3 font-semibold hover:shadow-lg transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-b border-violet-100 flex flex-wrap gap-3 items-center">
                  <span className="text-sm font-medium text-gray-600">Заокруглення</span>
                  <select
                    value={roundStep}
                    onChange={e=>setRoundStep(Number(e.target.value))}
                    className="px-3 py-2 text-sm border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {([0, ...(window.__roundingSteps || [0.01,0.05,0.1,0.5,1,5,10])]).map(s => (
                      <option key={s} value={s}>{s===0 ? 'Без' : s}</option>
                    ))}
                  </select>
                  <select
                    value={roundMode}
                    onChange={e=>setRoundMode(e.target.value)}
                    className="px-3 py-2 text-sm border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="nearest">до найближчого</option>
                    <option value="up">вгору</option>
                    <option value="down">вниз</option>
                  </select>
                  <button
                    onClick={applyRoundingAll}
                    className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-xl shadow hover:shadow-md transition"
                  >
                    Застосувати до всіх
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-auto px-6 pb-6">
                    {loadingItems ? (
                      <div className="h-full flex items-center justify-center text-violet-500 font-medium">
                        Завантаження позицій...
                      </div>
                    ) : (
                      <>
                        <table className="min-w-full bg-white border border-violet-200 rounded-2xl overflow-hidden">
                          <thead>
                            <tr className="bg-gradient-to-r from-violet-100 to-purple-100 text-sm">
                              <th className="p-3 text-left font-semibold text-gray-700">Товар</th>
                              <th className="p-3 text-right font-semibold text-gray-700">К-сть</th>
                              <th className="p-3 text-right font-semibold text-gray-700">Поточна ціна</th>
                              <th className="p-3 text-right font-semibold text-gray-700">% знижки</th>
                              <th className="p-3 text-right font-semibold text-gray-700">Нова ціна</th>
                              <th className="p-3 text-right font-semibold text-gray-700">Сума</th>
                              <th className="p-3 text-left font-semibold text-gray-700">ШК уцінки</th>
                              <th className="p-3 text-center font-semibold text-gray-700">Дії</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(items||[]).map(it => {
                              const qty = Number(it.Quantity||0);
                              const newPrice = Number(it.Price||0);
                              const base = Number(it.BasePrice||it.PriceBase||newPrice);
                              const computedPct = base ? Number(((1 - (newPrice/base)) * 100).toFixed(2)) : 0;
                              const percentValue = Object.prototype.hasOwnProperty.call(pctEdit, it.ID)
                                ? pctEdit[it.ID]
                                : computedPct;
                              const belowCost = typeof it.AvgCost === 'number' ? newPrice < Number(it.AvgCost) : false;
                              return (
                                <tr
                                  key={it.ID}
                                  className={belowCost ? 'bg-red-50/70' : 'hover:bg-violet-50'}
                                >
                                  <td className="p-3 border-t border-violet-200">
                                    <div className="font-medium text-gray-800">{it.ProductName || it.FullName || it.Name || it.ProductID}</div>
                                    <div className="text-xs text-gray-500">#{it.ProductID}</div>
                                  </td>
                                  <td className="p-3 border-t border-violet-200">
                                    <input
                                      type="number"
                                      value={qty}
                                      onChange={e=>updateItemLocal(it.ID, { Quantity: Number(e.target.value)||0 })}
                                      onBlur={e=>persistItem(it.ID, { Quantity: Number(e.target.value)||0 })}
                                      className="w-24 px-3 py-2 border border-violet-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                  </td>
                                  <td className="p-3 border-t border-violet-200 text-right font-mono text-sm">{base.toFixed(2)}</td>
                                  <td className="p-3 border-t border-violet-200 text-right">
                                    <input
                                      type="number"
                                      value={percentValue}
                                      onChange={e=> setPctEdit(prev => ({ ...prev, [it.ID]: e.target.value }))}
                                      onKeyDown={async e=>{ if (e.key === 'Enter') { await commitPercentForItem(it, pctEdit[it.ID]); } }}
                                      onBlur={async () => { await commitPercentForItem(it, pctEdit[it.ID]); }}
                                      className="w-24 px-3 py-2 border border-violet-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                  </td>
                                  <td className="p-3 border-t border-violet-200 text-right">
                                    <input
                                      type="number"
                                      value={newPrice}
                                      onChange={e=>{ const v = Number(e.target.value)||0; updateItemLocal(it.ID, { Price: v }); }}
                                      onBlur={async e=>{ const v = Number(e.target.value)||0; const price = roundPrice(v); updateItemLocal(it.ID, { Price: price }); await persistItem(it.ID, { Price: price }); }}
                                      className="w-28 px-3 py-2 border border-violet-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                  </td>
                                  <td className="p-3 border-t border-violet-200 text-right font-semibold font-mono text-sm">
                                    {(newPrice*qty).toFixed(2)}
                                  </td>
                                  <td className="p-3 border-t border-violet-200 font-mono text-sm text-gray-600">
                                    {it.DiscountBarcode||'—'}
                                  </td>
                                  <td className="p-3 border-t border-violet-200 text-center">
                                    <button
                                      onClick={async()=>{ await api.deleteDiscountDocItem(current.ID, it.ID); await reloadItems(current.ID); }}
                                      className="px-3 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold shadow hover:shadow-md transition"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="text-right mt-6 text-2xl font-bold text-gray-800">
                          Разом: {(items||[]).reduce((s,it)=> s + Number(it.Price||0)*Number(it.Quantity||0), 0).toFixed(2)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
                <p className="text-lg">Виберіть документ ліворуч, щоб переглянути позиції.</p>
                <button
                  onClick={createDoc}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow hover:shadow-lg transition"
                >
                  ✨ Створити документ
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
