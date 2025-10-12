import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RetailSalesPage.css';
import { api } from '../api';
import { useUser } from '../UserContext';
import StockPickerButton from '../components/StockPickerButton.jsx';

export default function RetailSalesPage() {
  const navigate = useNavigate();
  const { centerId: activeCenterId } = useUser();
  const [current, setCurrent] = useState(null);
  const [items, setItems] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [priceMap, setPriceMap] = useState({});
  const [customer, setCustomer] = useState(null);
  const [markdownItemIds, setMarkdownItemIds] = useState(() => new Set());
  const [clientList, setClientList] = useState([]);
  const [showClientPick, setShowClientPick] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [companiesMap, setCompaniesMap] = useState({});
  const lastSelectionPayloadRef = useRef(null);
  const cleanedRef = useRef(false);
  const [qtyDrafts, setQtyDrafts] = useState({});
  const [focusedItemId, setFocusedItemId] = useState(null);
  const barcodeInputRef = useRef(null);
  const payBtnRef = useRef(null);
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState('cash'); // cash | bank | card
  const [cashboxes, setCashboxes] = useState([]);
  const [cashboxId, setCashboxId] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [splitByCompany, setSplitByCompany] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  async function reloadItems() {
    if (!current?.ID) return;
    const rows = await api.getSaleItems(current.ID);
    setItems(Array.isArray(rows) ? rows : []);
  }

  // Створення/відновлення чернетки продажу для активного центру
  useEffect(() => {
    (async () => {
      if (!activeCenterId) return;
      // знайдемо останню чернетку по центру
      const list = await api.getSales();
      const drafts = (Array.isArray(list) ? list : [])
        .filter(d => String(d.Status || 'draft').toLowerCase() === 'draft' && Number(d.CenterID) === Number(activeCenterId))
        .sort((a,b) => (new Date(a.Date) - new Date(b.Date)) || (a.ID - b.ID));
      const last = drafts.length ? drafts[drafts.length - 1] : null;
      if (last) {
        const doc = await api.getSale(last.ID);
        setCurrent(doc);
        // завантажимо клієнта, якщо є
        if (doc?.CustomerID) {
          try { const c = await api.get('/clients/' + doc.CustomerID); setCustomer(c); } catch {}
        }
      } else {
        // гарантуємо системного роздрібного покупця
        let retail = null;
        try { retail = await api.post('/clients/ensure-default-retail'); } catch {}
        const res = await api.addSale({ Header: { CenterID: Number(activeCenterId), CustomerID: retail?.ID || null } });
        const doc = await api.getSale(res.ID);
        setCurrent(doc);
        if (retail?.ID) setCustomer(retail);
      }
    })();
  }, [activeCenterId]);

  useEffect(() => { reloadItems(); }, [current?.ID]);

  // Довідник компаній для відображення повної назви ФОП
  useEffect(() => {
    (async () => {
      try {
        const list = await api.getCompanies?.();
        const map = {};
        (Array.isArray(list) ? list : []).forEach(c => {
          const id = Number(c.ID || c.Id || 0);
          if (!id) return;
          map[id] = c.Name || c.ShortName || c.FullName || `ФОП #${id}`;
        });
        setCompaniesMap(map);
      } catch {}
    })();
  }, []);

  // Прайс поточного центру для відображення «Ціна» (роздріб)
  useEffect(() => {
    (async () => {
      try {
        if (!activeCenterId) { setPriceMap({}); return; }
        const res = await api.get('/product-prices', { center_id: activeCenterId });
        const map = {};
        (Array.isArray(res) ? res : []).forEach(r => {
          const pid = Number(r.ProductID ?? r.ProductId ?? r.Product ?? r.ID ?? r.Id);
          const pval = Number(r.Price ?? r.Retail ?? r.RetailPrice ?? r.Value ?? 0);
          if (pid) map[pid] = isNaN(pval) ? 0 : pval;
        });
        setPriceMap(map);
      } catch {
        setPriceMap({});
      }
    })();
  }, [activeCenterId]);

  // Підготовка модалки оплати при відкритті
  useEffect(() => {
    (async () => {
      if (!showPay) return;
      try {
        // Локальні підрахунки від поточного списку позицій
        const localTotal = (Array.isArray(items) ? items : []).reduce((s, it) => s + Number(it.Quantity||0)*Number(it.Price||0), 0);
        setPayAmount(Number(localTotal || 0));
        setCashReceived(Number(localTotal || 0));
        const companiesSet = new Set((Array.isArray(items) ? items : []).map(it => (it.CompanyID ?? 'no_company')));
        setSplitByCompany(companiesSet.size > 1);
        // Підтягнути каси для центру
        if (activeCenterId) {
          const list = await api.getCashboxes(Number(activeCenterId));
          setCashboxes(Array.isArray(list) ? list : []);
          const first = (Array.isArray(list) && list.length) ? list[0] : null;
          setCashboxId(first ? (first.ID || first.Id) : null);
        }
      } catch {
        setCashboxes([]);
      }
    })();
  }, [showPay, activeCenterId, items]);

  // Якщо перемикнули спосіб на готівку — підставляємо внесену суму як до сплати
  useEffect(() => {
    if (!showPay) return;
    if (payMethod === 'cash') {
      setCashReceived(Number(payAmount || 0));
    }
  }, [payMethod, payAmount, showPay]);

  // Завантаження клієнтів при відкритті модалки
  useEffect(() => {
    (async () => {
      if (!showClientPick) return;
      try {
        const res = await api.getClients({ q: clientSearch });
        setClientList(Array.isArray(res) ? res : []);
      } catch { setClientList([]); }
    })();
  }, [showClientPick, clientSearch]);

  // Прийом вибору зі складу (selectionBridge)
  useEffect(() => {
    (async () => {
      if (!current?.ID) return;
      // Чекаємо поки завантажиться прайс-ліст, щоб не додати позиції з ціною 0
      if (!priceMap || Object.keys(priceMap).length === 0) return;
      const raw = window.sessionStorage.getItem('selected::retail_sale');
      if (!raw) return;
      if (lastSelectionPayloadRef.current === raw) return;
      lastSelectionPayloadRef.current = raw;
      // Видаляємо з sessionStorage одразу, щоб ефекти, що дублюються (StrictMode), не обробили вдруге
      try { window.sessionStorage.removeItem('selected::retail_sale'); } catch {}
      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed?.items) ? parsed.items : [];
        // 1) Зібрати батчі (pid+price) → сумарна кількість
        const batches = new Map();
        for (const it of arr) {
          const pid = Number(it.id || it.ProductID);
          const qty = Number(it.quantity || it.Qty || 1);
          const base = Number(it.price || it.Price || 0);
          const price = base > 0 ? base : Number(priceMap[pid] || 0);
          if (!pid || !(qty > 0)) continue;
          const key = `${pid}|${Number(price||0).toFixed(2)}|md:0`;
          batches.set(key, (batches.get(key) || 0) + qty);
        }
        // 2) Останній стан рядків з бекенду (щоб точно мерджити)
        const currentRows = await api.getSaleItems(current.ID);
        const localItems = Array.isArray(currentRows) ? currentRows : [];
        // 3) Відпрацювати батчі: оновити існуючі або додати нові
        for (const [key, addQty] of batches.entries()) {
          const [pidStr, priceStr] = key.split('|');
          const pid = Number(pidStr);
          const price = Number(priceStr);
          const candidate = (localItems || []).find(r =>
            Number(r.ProductID) === pid && Number(r.Price||0).toFixed(2) === price.toFixed(2)
            && !markdownItemIds.has(Number(r.ID))
          );
          if (candidate && candidate.ID) {
            const newQty = Number(candidate.Quantity||0) + Number(addQty||0);
            await api.updateSaleItem(current.ID, candidate.ID, { Quantity: newQty });
            candidate.Quantity = newQty;
          } else {
            const res = await api.addSaleItem(current.ID, { ProductID: pid, Quantity: Number(addQty||0), Price: price });
            if (res?.ID) localItems.push({ ID: res.ID, ProductID: pid, Quantity: Number(addQty||0), Price: price });
          }
        }
      } catch {}
      await reloadItems();
    })();
  }, [current?.ID, priceMap]);

  // Глобальні гарячі клавіші: Enter → фокус на штрихкод, F9 → оплатити,
  // +/- змінюють кількість активного рядка, Delete видаляє рядок
  useEffect(() => {
    function isTypingInInput(el){
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    }
    const onKey = async (e) => {
      const target = e.target;
      // F9 — оплатити
      if (e.key === 'F9') {
        e.preventDefault();
        try { payBtnRef.current?.click?.(); } catch {}
        return;
      }
      // Enter — фокус на штрихкод (якщо не вводимо текст у полі)
      if (e.key === 'Enter' && !isTypingInInput(target)) {
        e.preventDefault();
        try { barcodeInputRef.current?.focus?.(); } catch {}
        return;
      }
      // Для +/- та Delete потрібен активний рядок
      const active = (items || []).find(r => r.ID === focusedItemId);
      if (!active) return;
      const currentQty = Number(active.Quantity || 0);
      // + / =
      if ((e.key === '+' || e.key === '=') && !e.shiftKey) {
        e.preventDefault();
        const newQty = Number((currentQty + 1).toFixed(3));
        try { await api.updateSaleItem(current.ID, active.ID, { Quantity: newQty }); }
        catch(err){ alert(err?.message || 'Помилка зміни кількості'); }
        finally { await reloadItems(); }
        return;
      }
      // -
      if (e.key === '-') {
        e.preventDefault();
        const next = Number((currentQty - 1).toFixed(3));
        if (next <= 0) {
          try { await api.deleteSaleItem(current.ID, active.ID); }
          catch(err){ alert(err?.message || 'Помилка видалення рядка'); }
          finally { await reloadItems(); }
        } else {
          try { await api.updateSaleItem(current.ID, active.ID, { Quantity: next }); }
          catch(err){ alert(err?.message || 'Помилка зміни кількості'); }
          finally { await reloadItems(); }
        }
        return;
      }
      // Delete — видалити рядок
      if (e.key === 'Delete' && !isTypingInInput(target)) {
        e.preventDefault();
        try { await api.deleteSaleItem(current.ID, active.ID); }
        catch(err){ alert(err?.message || 'Помилка видалення рядка'); }
        finally { await reloadItems(); }
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, focusedItemId, current?.ID]);

  // Додавання по штрихкоду по Enter
  async function addByBarcode() {
    const s = (barcode || '').trim();
    if (!s || !current?.ID) return;
    try {
      // Якщо це штрихкод клієнта — встановлюємо покупця
      const clientPrefix = '990';
      if (s.startsWith(clientPrefix)) {
        try {
          const c = await api.get('/clients/by-barcode/' + encodeURIComponent(s));
          if (c?.ID) { setCustomer(c); setBarcode(''); return; }
        } catch {}
      }

      // Якщо це спеціальний штрихкод уцінки: 29 + склад(2..4) + решта
      // Приклад: 2936003600009 → склад 36 (беремо ціну уцінки)
      let forcedDiscount = false;
      if (s.startsWith('29') && s.length >= 8) {
        const w2 = Number(s.slice(2, 4));
        const w4 = Number(s.slice(2, 6));
        const warehouseHint = !isNaN(w4) && w4 > 0 ? w4 : (!isNaN(w2) ? w2 : null);
        if (warehouseHint != null) {
          forcedDiscount = true; // маркер, що потрібно брати уціночну ціну
        }
      }
      const p = await api.getProductByBarcode(s);
      if (p && p.ID) {
        const isDisc = forcedDiscount || !!p.IsDiscountBarcode;
        const priceToUse = isDisc && typeof p.DiscountPrice === 'number'
          ? Number(p.DiscountPrice)
          : Number(priceMap[p.ID] ?? p.Price ?? 0);
        // Мерджимо з існуючим рядком з тією ж ціною (до 2 знаків); markdown не змішуємо зі звичайними
        const candidate = (items || []).find(r =>
          Number(r.ProductID) === Number(p.ID)
            && Number(r.Price||0).toFixed(2) === Number(priceToUse||0).toFixed(2)
            && (!!markdownItemIds.has(Number(r.ID)) === !!isDisc)
        );
        let newItemId = null;
        if (candidate && candidate.ID){
          const newQty = Number(candidate.Quantity||0) + 1;
          await api.updateSaleItem(current.ID, candidate.ID, { Quantity: newQty });
          newItemId = candidate.ID;
        } else {
          const res = await api.addSaleItem(current.ID, { ProductID: Number(p.ID), Quantity: 1, Price: priceToUse });
          newItemId = res?.ID || null;
        }
        if (isDisc && newItemId) {
          setMarkdownItemIds(prev => { const ns = new Set(prev); ns.add(newItemId); return ns; });
        }
        setBarcode('');
        await reloadItems();
      }
    } catch (e) {
      alert(e?.message || 'Товар не знайдено');
    }
  }

  const totalByItems = items.reduce((s,it)=> s + Number(it.Quantity||0)*Number(it.Price||0), 0);
  const totalsByCompany = items.reduce((acc, it) => {
    const cid = it.CompanyID ?? null;
    const amt = Number(it.Quantity||0) * Number(it.Price||0);
    const key = cid == null ? 'no_company' : String(cid);
    acc[key] = (acc[key] || 0) + amt;
    return acc;
  }, {});
  const companyLabel = (cid) => {
    if (cid == null) return '';
    const id = Number(cid);
    return companiesMap?.[id] || `ФОП #${id}`;
  };
  const totalRetail = items.reduce((s,it)=> {
    const pid = Number(it.ProductID || it.ProductId || it.Product || 0);
    const retail = priceMap[pid] ?? Number(it.Price || 0);
    return s + Number(it.Quantity||0) * Number(retail||0);
  }, 0);
  const totalDiscount = Math.max(0, totalRetail - totalByItems);

  // При виході зі сторінки — видаляємо порожню чернетку
  useEffect(() => {
    return () => {
      if (cleanedRef.current) return;
      cleanedRef.current = true;
      try {
        const isDraft = String(current?.Status || 'draft').toLowerCase() === 'draft';
        if (current?.ID && isDraft && (!Array.isArray(items) || items.length === 0)) {
          api.deleteSale(current.ID).catch(()=>{});
        }
      } catch {}
    };
  }, [current?.ID, current?.Status, items?.length]);

  async function handleBack() {
    try {
      const isDraft = String(current?.Status || 'draft').toLowerCase() === 'draft';
      if (current?.ID && isDraft && (!Array.isArray(items) || items.length === 0)) {
        await api.deleteSale(current.ID);
      }
    } catch {}
    navigate('/sales');
  }

  return (
    <div className="retail-root">
      <header className="retail-header">
        <button onClick={handleBack} className="px-4 py-2 bg-white/10 rounded-lg">← Назад</button>
        <div className="text-2xl font-bold">🏪 Роздрібні продажі</div>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-white/10 rounded-lg">🏠 Додому</button>
      </header>

      <main className="retail-main">
        <section className="bg-white rounded-2xl shadow p-4">
          <div className="retail-toolbar">
            <input
              className="retail-barcode-input"
              placeholder="Штрихкод/Артикул"
              value={barcode}
              onChange={e=>setBarcode(e.target.value)}
              onKeyDown={e=>{ if (e.key === 'Enter') addByBarcode(); }}
              ref={barcodeInputRef}
            />
            <button onClick={addByBarcode} className="btn-blue">Знайти</button>
            <StockPickerButton
              selectionKey="retail_sale"
              centerId={String(current?.CenterID || activeCenterId || '')}
              label="Знайти на складі"
              className="btn-blue-outline"
            />
            <button className="btn-blue" onClick={()=> setShowClientPick(true)}>Вибрати покупця</button>
            <input className="retail-action-input" placeholder="Застосована акція" disabled />
            <button
              className="ml-auto px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded"
              onClick={async()=>{
                if (!current?.ID) return;
                const confirmClear = window.confirm('Очистити всі позиції реалізації?');
                if (!confirmClear) return;
                try {
                  await api.clearSaleItems(current.ID);
                  setItems([]);
                  setMarkdownItemIds(new Set());
                } catch (e) {
                  alert(e?.message || 'Не вдалося очистити реалізацію');
                }
              }}
            >Відмінити реалізацію</button>
          </div>
          <div className="border rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left w-12">№</th>
                  <th className="p-3 text-left">Фото</th>
                  <th className="p-3 text-left">Назва товару</th>
                  <th className="p-3 text-right">Кіл-ть</th>
                  <th className="p-3 text-right">Ціна</th>
                  <th className="p-3 text-right">Ціна зі знижкою</th>
                  <th className="p-3 text-right">Сума</th>
                  <th className="p-3 text-right">ФОП</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td className="p-3 text-gray-400" colSpan={9}>Позицій ще немає</td></tr>
                ) : items.map((it, idx) => {
                  const qty = Number(it.Quantity || 0);
                  const price = Number(it.Price || 0);
                  const pid = Number(it.ProductID || it.ProductId || it.Product || 0);
                  const retail = priceMap[pid] ?? price;
                  const isDiscount = price < retail - 0.0001;
                  const isMarkdown = markdownItemIds.has(it.ID);
                  const draftVal = qtyDrafts[it.ID];
                  const qtyInputVal = draftVal != null ? draftVal : qty.toFixed(3);
                  return (
                    <tr key={it.ID} className={isMarkdown ? 'bg-rose-50' : (isDiscount ? 'bg-emerald-50' : undefined)}>
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3">{/* Фото */}</td>
                      <td className="p-3 font-semibold" style={{ color: isMarkdown ? '#be123c' : (isDiscount ? '#047857' : undefined) }}>{it.ProductName || it.FullName || it.Name || it.ProductID}</td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="border rounded px-2 py-1 w-24 text-right"
                          value={qtyInputVal}
                          onFocus={()=> setFocusedItemId(it.ID)}
                          onChange={e=> setQtyDrafts(prev=> ({ ...prev, [it.ID]: e.target.value }))}
                          onKeyDown={async e=>{
                            if (e.key === 'Enter') {
                              const val = Number(String(qtyDrafts[it.ID] ?? qtyInputVal).replace(/,/g,'.'));
                              const newQty = isFinite(val) && val > 0 ? val : qty;
                              try {
                                await api.updateSaleItem(current.ID, it.ID, { Quantity: newQty });
                              } catch (err) {
                                alert(err?.message || 'Помилка збереження кількості');
                              } finally {
                                setQtyDrafts(prev=> { const n = { ...prev }; delete n[it.ID]; return n; });
                                await reloadItems();
                              }
                            }
                          }}
                          onBlur={async ()=>{
                            const val = Number(String(qtyDrafts[it.ID] ?? qtyInputVal).replace(/,/g,'.'));
                            const newQty = isFinite(val) && val > 0 ? val : qty;
                            try {
                              if (newQty !== qty) {
                                await api.updateSaleItem(current.ID, it.ID, { Quantity: newQty });
                              }
                            } catch (err) {
                              alert(err?.message || 'Помилка збереження кількості');
                            } finally {
                              setQtyDrafts(prev=> { const n = { ...prev }; delete n[it.ID]; return n; });
                              await reloadItems();
                            }
                          }}
                        />
                      </td>
                      <td className="p-3 text-right">{Number(retail||0).toFixed(2)}</td>
                      <td className="p-3 text-right">{price.toFixed(2)}</td>
                      <td className="p-3 text-right">{(qty*price).toFixed(2)}</td>
                      <td className="p-3 text-right">{companyLabel(it.CompanyID)}</td>
                      <td className="p-3 text-right">
                        <button onClick={async()=>{ await api.deleteSaleItem(current.ID, it.ID); setMarkdownItemIds(prev=>{ const ns=new Set(prev); ns.delete(it.ID); return ns; }); await reloadItems(); }} className="px-3 py-1 bg-red-500 text-white rounded-lg">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="bg-white rounded-2xl shadow p-4 retail-aside">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="text-sm text-gray-600 self-center">№</label>
            <input className="border rounded px-3 py-2" value={current?.Number || ''} readOnly />
            <label className="text-sm text-gray-600 self-center">Дата</label>
            <input className="border rounded px-3 py-2" value={(current?.Date || new Date().toISOString()).slice(0,10)} readOnly />
          </div>

          <div className="border rounded p-3 mb-3">
            <div className="text-center font-semibold mb-1">{customer?.Name || 'Роздрібний покупець'}</div>
            <div className="text-center text-xs text-gray-600">Категорія цін: Роздрібна</div>
          </div>

          <div className="text-sm mb-2">Кількість рядків: <span className="font-semibold">{items.length}</span></div>
          <div className="border rounded p-3 mb-3">
            <div className="flex justify-between mb-2"><span>Всього:</span><span>{totalRetail.toFixed(2)}</span></div>
            <div className="flex justify-between mb-2"><span>Сума знижки:</span><span>{totalDiscount.toFixed(2)}</span></div>
            <div className="flex justify-between mb-2"><span>Всього до сплати:</span><span className="font-bold">{totalByItems.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>В тому числі ПДВ</span><span>{(totalByItems * 0.2).toFixed(2)}</span></div>
          </div>

          <div className="border rounded p-3 mb-3">
            <div className="font-semibold mb-2">Чеки підприємців:</div>
            {Object.keys(totalsByCompany).length === 0 && (
              <div className="text-sm text-gray-500">Немає позицій</div>
            )}
            {Object.entries(totalsByCompany).map(([cid, sum]) => {
              const label = cid === 'no_company' ? 'Без компанії' : companyLabel(Number(cid));
              return (
                <div key={cid} className="flex justify-between">
                  <span>{label}</span>
                  <span>{Number(sum||0).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <button
            ref={payBtnRef}
            onClick={() => setShowPay(true)}
            className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold"
          >Оплатити</button>
        </aside>
      </main>

      {showClientPick && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-xl font-bold">Вибір покупця</div>
              <button onClick={()=> setShowClientPick(false)} className="px-3 py-1 bg-gray-200 rounded">✕</button>
            </div>
            <input value={clientSearch} onChange={e=> setClientSearch(e.target.value)} placeholder="Пошук..." className="w-full border rounded px-3 py-2 mb-3" />
            <div className="max-h-96 overflow-auto border rounded">
              <table className="min-w-full">
                <thead className="bg-gray-50"><tr><th className="p-2 text-left">Назва</th><th className="p-2">Штрихкод</th><th className="p-2">Дія</th></tr></thead>
                <tbody>
                  {(clientList||[]).map(c=> (
                    <tr key={c.ID} className="border-t">
                      <td className="p-2">{c.Name}</td>
                      <td className="p-2 text-center font-mono">{c.Barcode}</td>
                      <td className="p-2 text-right">
                        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={async()=>{
                          try {
                            if (current?.ID) await api.updateSale?.(current.ID, { CustomerID: c.ID });
                          } catch {}
                          setCustomer(c); setShowClientPick(false);
                        }}>Обрати</button>
                      </td>
                    </tr>
                  ))}
                  {clientList.length===0 && (<tr><td className="p-3 text-gray-500" colSpan={3}>Нічого не знайдено</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showPay && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xl font-bold">Оплата реалізації</div>
              <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setShowPay(false)}>✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Спосіб оплати</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={payMethod}
                  onChange={(e)=> setPayMethod(e.target.value)}
                >
                  <option value="cash">Готівка</option>
                  <option value="card">Картка</option>
                  <option value="bank">Безготівково</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Сума до сплати</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border rounded px-3 py-2 text-right"
                  value={String(payAmount)}
                  onChange={(e)=> setPayAmount(Number(e.target.value||0))}
                />
              </div>
              {payMethod === 'cash' && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Внесено</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border rounded px-3 py-2 text-right"
                      value={String(cashReceived)}
                      onChange={(e)=> setCashReceived(Number(e.target.value||0))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Решта</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2 text-right bg-gray-50"
                      disabled
                      value={String((Number(payAmount||0) - Number(cashReceived||0)).toFixed(2))}
                    />
                  </div>
                </div>
              )}
              {payMethod === 'cash' && (
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Каса</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={cashboxId ?? ''}
                    onChange={(e)=> setCashboxId(Number(e.target.value)||null)}
                  >
                    {(cashboxes||[]).map(cb=> (
                      <option key={cb.ID||cb.Id} value={cb.ID||cb.Id}>{cb.Name || cb.Title || `Каса #${cb.ID||cb.Id}`}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={splitByCompany} onChange={e=> setSplitByCompany(e.target.checked)} />
                  <span>Розподілити оплату по ФОП/компаніях</span>
                </label>
              </div>
            </div>

            <div className="border rounded p-3 my-4">
              <div className="flex justify-between"><span>Разом до сплати:</span><span className="font-bold">{Number(payAmount||0).toFixed(2)}</span></div>
              {payMethod === 'cash' && (
                <>
                  <div className="flex justify-between mt-1 text-sm"><span>Внесено:</span><span>{Number(cashReceived||0).toFixed(2)}</span></div>
                  <div className="flex justify-between mt-1 text-sm"><span>Решта:</span><span>{(Number(payAmount||0) - Number(cashReceived||0)).toFixed(2)}</span></div>
                </>
              )}
              {Object.keys(totalsByCompany||{}).length > 0 && (
                <div className="mt-2 text-sm text-gray-700">
                  {Object.entries(totalsByCompany).map(([cid, sum]) => (
                    <div key={cid} className="flex justify-between">
                      <span>{cid==='no_company' ? 'Без компанії' : companyLabel(Number(cid))}</span>
                      <span>{Number(sum||0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={async()=>{ if (isPaying) return; try { await handleBack(); } catch {} }} disabled={isPaying}>Скасувати</button>
              <button
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-60"
                disabled={isPaying || Number(totalByItems||0) <= 0}
                onClick={async()=>{
                  if (!current?.ID) return;
                  if (!Array.isArray(items) || items.length === 0) { alert('Немає позицій для оплати'); return; }
                  setIsPaying(true);
                  try {
                    // 1) Підготувати платежі (CREATE), без проведення
                    const createdPaymentIds = [];
                    const payments = [];
                    if (splitByCompany && Object.keys(totalsByCompany||{}).length > 0) {
                      for (const [cid, sum] of Object.entries(totalsByCompany)) {
                        payments.push({
                          DocumentType: 'SALE',
                          DocumentID: current.ID,
                          PaymentMethod: payMethod,
                          Amount: Number(sum||0),
                          Date: new Date().toISOString().slice(0,10),
                          CashboxID: payMethod==='cash' ? (cashboxId||null) : null,
                          AccountID: payMethod!=='cash' ? null : null,
                          CompanyID: cid==='no_company' ? null : Number(cid),
                          IsAuto: true
                        });
                      }
                    } else {
                      payments.push({
                        DocumentType: 'SALE',
                        DocumentID: current.ID,
                        PaymentMethod: payMethod,
                        Amount: Number(payAmount||0) || Number(totalByItems||0),
                        Date: new Date().toISOString().slice(0,10),
                        CashboxID: payMethod==='cash' ? (cashboxId||null) : null,
                        AccountID: payMethod!=='cash' ? null : null,
                        CompanyID: current?.CompanyID ?? null,
                        IsAuto: true
                      });
                    }

                    // Створюємо платежі, збираємо їх ID
                    for (const p of payments) {
                      if (!(p.Amount > 0)) continue;
                      const res = await api.addPayment(p);
                      const payId = res?.ID;
                      if (payId) createdPaymentIds.push(payId);
                    }

                    // 2) Провести продаж (списання/проводки). Якщо впаде — відкочуємо платежі
                    try {
                      await api.postSalePostings(current.ID);
                    } catch (errPost) {
                      // Відкатити створені платежі
                      for (const id of createdPaymentIds) {
                        try { await api.deletePayment(id); } catch {}
                      }
                      throw errPost;
                    }

                    // 3) Провести платежі
                    for (const id of createdPaymentIds) {
                      try { await api.postPaymentPostings(id); } catch {}
                    }

                    // 4) Оновити статус документа
                    try { await api.updateSale?.(current.ID, { Status: 'paid', TotalAmount: Number(totalByItems||0) }); } catch {}

                    alert('Оплату проведено успішно');
                    setShowPay(false);
                    navigate('/sales');
                  } catch (err) {
                    alert(err?.message || 'Помилка під час проведення оплати');
                  } finally {
                    setIsPaying(false);
                  }
                }}
              >Провести оплату</button>
            </div>
          </div>
        </div>
      )}

      <footer className="retail-footer">
        <div className="text-sm text-gray-500">Готово до роботи</div>
      </footer>
    </div>
  );
}

// Глобальні гарячі клавіші для сторінки роздрібу
// Enter — фокус на штрихкод, F9 — оплатити, +/− — зміна к-сті активного рядка, Del — видалити
// Ігноруємо, якщо фокус у текстовому полі (крім +/- у полі кількості, яке вже обробляється)
export function RetailSalesPageHotkeysBinder() { return null; }
