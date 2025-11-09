import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './RetailSalesPage.css';
import { api } from '../api';
import { useUser } from '../UserContext';
import StockPickerButton from '../components/StockPickerButton.jsx';

export default function RetailSalesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { centerId: activeCenterId, employee } = useUser();
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
  const [companiesList, setCompaniesList] = useState([]);
  const [settlementAccounts, setSettlementAccounts] = useState([]);
  const [settlementDefaults, setSettlementDefaults] = useState({});
  const [showProperties, setShowProperties] = useState(false);
  const [newDefaultCompanyId, setNewDefaultCompanyId] = useState('');
  const [newDefaultAccountId, setNewDefaultAccountId] = useState('');
  const [defaultCashboxId, setDefaultCashboxId] = useState(null);
  const lastSelectionPayloadRef = useRef(null);
  const cleanedRef = useRef(false);
  const [qtyDrafts, setQtyDrafts] = useState({});
  const [focusedItemId, setFocusedItemId] = useState(null);
  const barcodeInputRef = useRef(null);
  const payBtnRef = useRef(null);
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState('cash'); // cash | bank
  const [cashboxes, setCashboxes] = useState([]);
  const [cashboxId, setCashboxId] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [splitByCompany, setSplitByCompany] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const isInitializingRef = useRef(false);

  const defaultCashboxStorageKey = useMemo(() => {
    if (!employee?.ID || !activeCenterId) return null;
    return `retail-default-cashbox:${employee.ID}:${activeCenterId}`;
  }, [employee?.ID, activeCenterId]);

  const loadCashboxes = useCallback(async (centerId) => {
    if (!centerId) {
      setCashboxes([]);
      return [];
    }
    try {
      const list = await api.getCashboxes(Number(centerId));
      const arr = Array.isArray(list) ? list : [];
      setCashboxes(arr);
      return arr;
    } catch (error) {
      console.error('Не вдалося завантажити каси:', error);
      setCashboxes([]);
      return [];
    }
  }, []);

  const loadSettlementDefaults = useCallback(async () => {
    if (!employee?.ID || !activeCenterId) {
      setSettlementDefaults({});
      return;
    }
    try {
      const rows = await api.getSettlementPaymentDefaults({
        employee_id: employee.ID,
        center_id: activeCenterId,
      });
      const map = {};
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const companyId = row.CompanyID ?? row.company_id;
        const accountId = row.SettlementAccountID ?? row.settlement_account_id;
        if (companyId != null && accountId != null) {
          map[String(companyId)] = Number(accountId);
        }
      });
      setSettlementDefaults(map);
    } catch (error) {
      console.error('Не вдалося завантажити налаштування розрахункових рахунків:', error);
      setSettlementDefaults({});
    }
  }, [employee?.ID, activeCenterId]);

  const handleSaveDefaultCashbox = useCallback(
    (id) => {
      const numeric = id ? Number(id) : null;
      setDefaultCashboxId(numeric);
      if (payMethod === 'cash') {
        setCashboxId(numeric || null);
      }
      if (!defaultCashboxStorageKey) return;
      try {
        if (numeric) {
          window.localStorage.setItem(defaultCashboxStorageKey, String(numeric));
        } else {
          window.localStorage.removeItem(defaultCashboxStorageKey);
        }
      } catch (err) {
        console.error('Не вдалося зберегти налаштування каси за замовчуванням:', err);
      }
    },
    [defaultCashboxStorageKey, payMethod]
  );

  const handleUpsertSettlementDefault = useCallback(
    async (companyId, accountId) => {
      if (!employee?.ID || !activeCenterId) {
        alert('Спершу виберіть центр обліку та користувача.');
        return;
      }
      try {
        await api.upsertSettlementPaymentDefault({
          EmployeeID: employee.ID,
          CenterID: activeCenterId,
          CompanyID: Number(companyId),
          SettlementAccountID: Number(accountId),
          UpdatedBy: employee?.ID || null,
        });
        setSettlementDefaults((prev) => ({
          ...prev,
          [String(companyId)]: Number(accountId),
        }));
      } catch (error) {
        console.error('Не вдалося зберегти налаштування рахунку:', error);
        alert(error?.message || 'Не вдалося зберегти рахунок за замовчуванням');
      }
    },
    [employee?.ID, activeCenterId]
  );

  const handleDeleteSettlementDefault = useCallback(
    async (companyId) => {
      if (!employee?.ID || !activeCenterId) return;
      try {
        await api.deleteSettlementPaymentDefault({
          employee_id: employee.ID,
          center_id: activeCenterId,
          company_id: Number(companyId),
        });
        setSettlementDefaults((prev) => {
          const next = { ...prev };
          delete next[String(companyId)];
          return next;
        });
      } catch (error) {
        console.error('Не вдалося видалити налаштування рахунку:', error);
        alert(error?.message || 'Не вдалося видалити налаштування');
      }
    },
    [employee?.ID, activeCenterId]
  );

  const resolveSettlementAccount = useCallback(
    (companyId) => {
      if (companyId == null) return null;
      const key = String(companyId);
      return settlementDefaults[key] ?? null;
    },
    [settlementDefaults]
  );

  const handleAddSettlementDefault = useCallback(async () => {
    if (!newDefaultCompanyId) {
      alert('Оберіть підприємство для прив’язки.');
      return;
    }
    if (!newDefaultAccountId) {
      alert('Оберіть розрахунковий рахунок.');
      return;
    }
    await handleUpsertSettlementDefault(Number(newDefaultCompanyId), Number(newDefaultAccountId));
    setNewDefaultCompanyId('');
    setNewDefaultAccountId('');
  }, [newDefaultCompanyId, newDefaultAccountId, handleUpsertSettlementDefault]);

  async function reloadItems() {
    if (!current?.ID) return;
    try {
      const rows = await api.getSaleItems(current.ID);
      console.log('reloadItems: отримано позиції з БД для документа', current.ID, ':', rows);
      setItems(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('Помилка завантаження позицій:', err);
      setItems([]);
    }
  }

  // Функція для видалення пустих чернеток для центру
  async function deleteEmptyDrafts(centerId) {
    if (!centerId) return;
    try {
      // Отримуємо всі чернетки для центру
      const allDocs = await api.getSales({ status: 'draft' });
      const drafts = (Array.isArray(allDocs) ? allDocs : [])
        .filter(d => Number(d.CenterID) === Number(centerId));
      
      // Видаляємо тільки порожні чернетки (без позицій)
      for (const draft of drafts) {
        try {
          const items = await api.getSaleItems(draft.ID);
          if (!Array.isArray(items) || items.length === 0) {
            await api.deleteSale(draft.ID);
          }
        } catch (err) {
          console.error('Помилка видалення чернетки:', err);
        }
      }
    } catch (err) {
      console.error('Помилка очищення чернеток:', err);
    }
  }

  // Створення нового пустого документа при відкритті форми (тільки якщо немає поточного документа)
  useEffect(() => {
    (async () => {
      if (!activeCenterId) return;
      // Якщо вже є поточний документ-чернетка - не створюємо новий
      if (current?.ID && String(current.Status || 'draft').toLowerCase() === 'draft') {
        return;
      }
      // Якщо вже ініціалізується - не запускаємо повторно
      if (isInitializingRef.current) {
        return;
      }
      isInitializingRef.current = true;
      
      try {
        // Спочатку скидаємо поточний документ
        setCurrent(null);
        setItems([]);
        
        // Видаляємо всі пусті чернетки для цього центру перед створенням нового
        await deleteEmptyDrafts(activeCenterId);
        
        // Якщо є параметр edit - завантажуємо конкретний документ (тільки якщо він чернетка)
        const editId = searchParams.get('edit');
        if (editId) {
          try {
            const sale = await api.getSale(Number(editId));
            if (sale && String(sale.Status || 'draft').toLowerCase() === 'draft' && Number(sale.CenterID) === Number(activeCenterId)) {
              setCurrent(sale);
              if (sale?.CustomerID) {
                try { const c = await api.get('/clients/' + sale.CustomerID); setCustomer(c); } catch {}
              }
              await reloadItems();
              navigate('/sales/retail', { replace: true });
              isInitializingRef.current = false;
              return;
            } else {
              navigate('/sales/retail', { replace: true });
            }
          } catch {
            navigate('/sales/retail', { replace: true });
          }
        }
        
        // Створюємо новий пустий документ
        let retail = null;
        try { retail = await api.post('/clients/ensure-default-retail'); } catch {}
        
        try {
          const newDocRes = await api.addSale({
            Header: {
              CenterID: Number(activeCenterId),
              CustomerID: retail?.ID || null,
              CreatedBy: employee?.ID || null,
              EmployeeID: employee?.ID || null
            },
            Items: []
          });
          const newDoc = await api.getSale(newDocRes.ID);
          setCurrent(newDoc);
          if (retail?.ID) setCustomer(retail);
        } catch (err) {
          console.error('Помилка створення документа:', err);
          alert(err?.message || 'Помилка створення документа');
        }
      } finally {
        isInitializingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCenterId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reloadItems(); }, [current?.ID]);

  // Довідник компаній для відображення повної назви ФОП
  useEffect(() => {
    (async () => {
      try {
        const list = await api.getCompanies?.();
        const safeList = Array.isArray(list) ? list : [];
        setCompaniesList(safeList);
        const map = {};
        safeList.forEach(c => {
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

  useEffect(() => {
    (async () => {
      if (!activeCenterId) {
        setCashboxes([]);
        return;
      }
      await loadCashboxes(activeCenterId);
    })();
  }, [activeCenterId, loadCashboxes]);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.getSettlementAccounts?.();
        setSettlementAccounts(Array.isArray(list) ? list : []);
      } catch {
        setSettlementAccounts([]);
      }
    })();
  }, []);

  useEffect(() => {
    loadSettlementDefaults();
  }, [loadSettlementDefaults]);

  useEffect(() => {
    if (!defaultCashboxStorageKey) {
      setDefaultCashboxId(null);
      return;
    }
    try {
      const saved = window.localStorage.getItem(defaultCashboxStorageKey);
      setDefaultCashboxId(saved ? Number(saved) : null);
    } catch {
      setDefaultCashboxId(null);
    }
  }, [defaultCashboxStorageKey]);

  useEffect(() => {
    if (showProperties && activeCenterId) {
      loadCashboxes(activeCenterId);
    }
  }, [showProperties, activeCenterId, loadCashboxes]);

  // Підготовка модалки оплати при відкритті
  useEffect(() => {
    if (!showPay) return;
    const localItems = Array.isArray(items) ? items : [];
    const localTotal = localItems.reduce((s, it) => s + Number(it.Quantity || 0) * Number(it.Price || 0), 0);
    setPayAmount(Number(localTotal || 0));
    setCashReceived(Number(localTotal || 0));
    const companyIdsSet = new Set(
      localItems
        .map((it) => (it.CompanyID == null ? null : Number(it.CompanyID)))
        .filter((cid) => cid != null)
    );
    setSplitByCompany(() => {
      if (payMethod === 'bank') {
        return true;
      }
      return companyIdsSet.size > 1;
    });
  }, [showPay, items, payMethod]);

  // Якщо перемикнули спосіб на готівку — підставляємо внесену суму як до сплати
  useEffect(() => {
    if (!showPay) return;
    if (payMethod === 'cash') {
      setCashReceived(Number(payAmount || 0));
    }
  }, [payMethod, payAmount, showPay]);

  useEffect(() => {
    if (!showPay) return;
    if (payMethod !== 'cash') {
      setCashboxId(null);
      return;
    }
    const preferredId = defaultCashboxId;
    if (preferredId) {
      const exists = (cashboxes || []).find(
        (cb) => Number(cb.ID || cb.Id) === Number(preferredId)
      );
      if (exists) {
        setCashboxId(Number(preferredId));
        return;
      }
    }
    const first = (cashboxes && cashboxes.length) ? cashboxes[0] : null;
    setCashboxId(first ? (first.ID || first.Id || null) : null);
  }, [showPay, payMethod, cashboxes, defaultCashboxId]);

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
            // Якщо немає поточного документа - створюємо його
            if (!current?.ID) {
              let retail = customer || null;
              if (!retail) {
                try { retail = await api.post('/clients/ensure-default-retail'); } catch {}
              }
              const newDocRes = await api.addSale({ 
                Header: { 
                  CenterID: Number(activeCenterId), 
                  CustomerID: retail?.ID || null, 
                  CreatedBy: employee?.ID || null, 
                  EmployeeID: employee?.ID || null 
                },
                Items: [{ ProductID: pid, Quantity: Number(addQty||0), Price: price }]
              });
              const newDoc = await api.getSale(newDocRes.ID);
              setCurrent(newDoc);
              if (retail?.ID) setCustomer(retail);
              await reloadItems();
              return;
            }
            const res = await api.addSaleItem(current.ID, { ProductID: pid, Quantity: Number(addQty||0), Price: price });
            if (res?.ID) localItems.push({ ID: res.ID, ProductID: pid, Quantity: Number(addQty||0), Price: price });
          }
        }
      } catch {}
      await reloadItems();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, focusedItemId, current?.ID]);

  // Додавання по штрихкоду по Enter
  async function addByBarcode() {
    const s = (barcode || '').trim();
    if (!s) return;
    if (!activeCenterId) {
      alert('Центр обліку не вибрано');
      return;
    }
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
      if (!p || !p.ID) {
        alert('Товар не знайдено');
        return;
      }
      
      const isDisc = forcedDiscount || !!p.IsDiscountBarcode;
      const priceToUse = isDisc && typeof p.DiscountPrice === 'number'
        ? Number(p.DiscountPrice)
        : Number(priceMap[p.ID] ?? p.Price ?? 0);
      
      if (!priceToUse || priceToUse <= 0) {
        alert('Ціна товару не визначена');
        return;
      }
      
      // Мерджимо з існуючим рядком з тією ж ціною (до 2 знаків); markdown не змішуємо зі звичайними
      const candidate = (items || []).find(r =>
        Number(r.ProductID) === Number(p.ID)
          && Number(r.Price||0).toFixed(2) === Number(priceToUse||0).toFixed(2)
          && (!!markdownItemIds.has(Number(r.ID)) === !!isDisc)
      );
      // Якщо немає поточного документа - додаємо товар до існуючого (він має бути створений при відкритті)
      if (!current?.ID) {
        alert('Документ не створено. Спробуйте оновити сторінку.');
        return;
      }
      
      // Фіксуємо ID документа перед додаванням товару, щоб уникнути проблем зі зміною документа
      const docIdToUse = current.ID;
      console.log('Додавання товару до документа', docIdToUse);
      
      let newItemId = null;
      try {
        if (candidate && candidate.ID){
          const newQty = Number(candidate.Quantity||0) + 1;
          await api.updateSaleItem(docIdToUse, candidate.ID, { Quantity: newQty });
          newItemId = candidate.ID;
        } else {
          console.log('Додавання нового товару до документа', docIdToUse, ':', { ProductID: Number(p.ID), Quantity: 1, Price: priceToUse });
          try {
            const res = await api.addSaleItem(docIdToUse, { ProductID: Number(p.ID), Quantity: 1, Price: priceToUse });
            console.log('Результат додавання товару:', res);
            if (!res || !res.ID) {
              throw new Error('Товар не додано: відсутній ID в відповіді');
            }
            newItemId = res.ID;
          } catch (err) {
            console.error('Помилка додавання товару до бази:', err);
            alert('Помилка збереження товару: ' + (err?.message || 'Невідома помилка'));
            throw err;
          }
        }
        if (isDisc && newItemId) {
          setMarkdownItemIds(prev => { const ns = new Set(prev); ns.add(newItemId); return ns; });
        }
        setBarcode('');
        // Перевіряємо, чи документ не змінився під час додавання товару
        if (current?.ID === docIdToUse) {
          await reloadItems();
        } else {
          console.warn('Документ змінився під час додавання товару. Поточний:', current?.ID, 'Очікуваний:', docIdToUse);
          // Завантажуємо товари для поточного документа
          await reloadItems();
        }
      } catch (err) {
        console.error('Помилка додавання товару:', err);
        alert(err?.message || 'Помилка додавання товару');
      }
    } catch (e) {
      console.error('Помилка при додаванні товару:', e);
      alert(e?.message || 'Помилка при додаванні товару');
    }
  }

  const totalByItems = useMemo(
    () => (Array.isArray(items) ? items : []).reduce(
      (s, it) => s + Number(it.Quantity || 0) * Number(it.Price || 0),
      0
    ),
    [items]
  );

  const totalsByCompany = useMemo(() => {
    const acc = {};
    (Array.isArray(items) ? items : []).forEach((it) => {
      const cid = it.CompanyID ?? null;
      const amt = Number(it.Quantity || 0) * Number(it.Price || 0);
      const key = cid == null ? 'no_company' : String(cid);
      acc[key] = (acc[key] || 0) + amt;
    });
    return acc;
  }, [items]);
  const companyTotalsEntries = useMemo(
    () => Object.entries(totalsByCompany).filter(([cid]) => cid !== 'no_company'),
    [totalsByCompany]
  );
  const hasMultipleCompanies = companyTotalsEntries.length > 1;
  const settlementAccountOptions = useMemo(() => {
    const list = Array.isArray(settlementAccounts) ? settlementAccounts : [];
    return list.filter(
      (acc) => (acc.AccountType || acc.accountType || '').toLowerCase() === 'bank'
    );
  }, [settlementAccounts]);

  useEffect(() => {
    if (!showPay) return;
    if (payMethod === 'bank') {
      setSplitByCompany(true);
    } else if (!hasMultipleCompanies) {
      setSplitByCompany(false);
    }
  }, [payMethod, showPay, hasMultipleCompanies]);
  const companyLabel = (cid) => {
    if (cid == null) return '';
    const id = Number(cid);
    return companiesMap?.[id] || `ФОП #${id}`;
  };
  const settlementAccountLabel = useCallback(
    (accountId) => {
      if (!accountId) return '';
      const numeric = Number(accountId);
      const list = Array.isArray(settlementAccounts) ? settlementAccounts : [];
      const acc = list.find((a) => Number(a.ID || a.Id) === numeric);
      if (!acc) return `Рахунок #${numeric}`;
      const bank = acc.BankName ? ` (${acc.BankName})` : '';
      return `${acc.AccountNumber || acc.AccountName || acc.Name || `#${numeric}`}${bank}`;
    },
    [settlementAccounts]
  );
  const unmappedCompanies = useMemo(
    () =>
      (Array.isArray(companiesList) ? companiesList : []).filter((company) => {
        const id = Number(company.ID || company.Id);
        if (!id) return false;
        return settlementDefaults[String(id)] == null;
      }),
    [companiesList, settlementDefaults]
  );
  const totalRetail = useMemo(() => (Array.isArray(items) ? items : []).reduce((s,it)=> {
    const pid = Number(it.ProductID || it.ProductId || it.Product || 0);
    const retail = priceMap[pid] ?? Number(it.Price || 0);
    return s + Number(it.Quantity||0) * Number(retail||0);
  }, 0), [items, priceMap]);
  const totalDiscount = useMemo(() => Math.max(0, totalRetail - totalByItems), [totalRetail, totalByItems]);

  // При виході зі сторінки — видаляємо поточну чернетку (завжди, якщо вона чернетка)
  useEffect(() => {
    return () => {
      if (cleanedRef.current) return;
      cleanedRef.current = true;
      try {
        const isDraft = String(current?.Status || 'draft').toLowerCase() === 'draft';
        if (current?.ID && isDraft) {
          // Видаляємо чернетку завжди, незалежно від наявності позицій
          api.deleteSale(current.ID).catch(()=>{});
        }
      } catch {}
    };
  }, [current?.ID, current?.Status]);

  async function handleBack() {
    try {
      // Видаляємо чернетку при виході (завжди, якщо вона чернетка)
      const isDraft = String(current?.Status || 'draft').toLowerCase() === 'draft';
      if (current?.ID && isDraft) {
        // Перевіряємо чи документ порожній перед видаленням
        try {
          const items = await api.getSaleItems(current.ID);
          if (!Array.isArray(items) || items.length === 0) {
            await api.deleteSale(current.ID);
          }
        } catch {}
      }
      // Видаляємо всі пусті чернетки для центру
      if (activeCenterId) {
        await deleteEmptyDrafts(activeCenterId);
      }
    } catch {}
    navigate('/sales');
  }

  // Функція для відкриття звіту
  const openSalesReport = () => {
    const today = new Date().toISOString().split('T')[0];
    navigate(`/sales/register?dateFrom=${today}&dateTo=${today}&backUrl=/sales/retail`);
  };

  return (
    <div className="retail-root">
      <header className="retail-header">
        <button onClick={handleBack} className="px-4 py-2 bg-white/10 rounded-lg">← Назад</button>
        <div className="text-2xl font-bold">🏪 Роздрібні продажі</div>
        <button onClick={async ()=>{
          try {
            // Видаляємо поточну чернетку при виході
            const isDraft = String(current?.Status || 'draft').toLowerCase() === 'draft';
            if (current?.ID && isDraft) {
              try {
                const items = await api.getSaleItems(current.ID);
                if (!Array.isArray(items) || items.length === 0) {
                  await api.deleteSale(current.ID);
                }
              } catch {}
            }
            // Видаляємо всі пусті чернетки для центру
            if (activeCenterId) {
              await deleteEmptyDrafts(activeCenterId);
            }
          } catch {}
          navigate('/');
        }} className="px-4 py-2 bg-white/10 rounded-lg">🏠 Додому</button>
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
            <button className="btn-blue-outline" onClick={()=> setShowProperties(true)}>⚙️ Властивості</button>
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
                  // Після очищення - якщо документ порожній, видаляємо його
                  const itemsAfter = await api.getSaleItems(current.ID);
                  if (!Array.isArray(itemsAfter) || itemsAfter.length === 0) {
                    await api.deleteSale(current.ID);
                    setCurrent(null);
                    // Створюємо новий пустий документ
                    let retail = customer || null;
                    if (!retail) {
                      try { retail = await api.post('/clients/ensure-default-retail'); } catch {}
                    }
                    const newDocRes = await api.addSale({
                      Header: {
                        CenterID: Number(activeCenterId),
                        CustomerID: retail?.ID || null,
                        CreatedBy: employee?.ID || null,
                        EmployeeID: employee?.ID || null
                      },
                      Items: []
                    });
                    const newDoc = await api.getSale(newDocRes.ID);
                    setCurrent(newDoc);
                    if (retail?.ID) setCustomer(retail);
                  }
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
            {companyTotalsEntries.length === 0 && !totalsByCompany['no_company'] && (
              <div className="text-sm text-gray-500">Немає позицій</div>
            )}
            {companyTotalsEntries.map(([cid, sum]) => {
              const label = cid === 'no_company' ? 'Без компанії' : companyLabel(Number(cid));
              return (
                <div key={cid} className="flex justify-between">
                  <span>{label}</span>
                  <span>{Number(sum||0).toFixed(2)}</span>
                </div>
              );
            })}
            {totalsByCompany['no_company'] ? (
              <div className="flex justify-between text-sm text-red-600 mt-2">
                <span>Без компанії</span>
                <span>{Number(totalsByCompany['no_company'] || 0).toFixed(2)}</span>
              </div>
            ) : null}
          </div>
          <button
            ref={payBtnRef}
            onClick={() => setShowPay(true)}
            className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold"
          >Оплатити</button>
          <button
            onClick={openSalesReport}
            className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold"
          >📊 Реєстр реалізацій</button>
        </aside>
      </main>

      {showProperties && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-bold">Властивості реалізації</div>
              <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setShowProperties(false)}>✕</button>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="font-semibold text-lg mb-2">Готівка</h3>
                <label className="block text-sm text-gray-600 mb-1">Каса за замовчуванням</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={defaultCashboxId ?? ''}
                  onChange={(e)=> handleSaveDefaultCashbox(e.target.value || null)}
                >
                  <option value="">— Не вибрано —</option>
                  {(cashboxes || []).map((cb) => {
                    const id = cb.ID || cb.Id;
                    const label = cb.Name || cb.Title || `Каса #${id}`;
                    return (
                      <option key={id} value={id}>{label}</option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Обрана каса підставлятиметься автоматично під час готівкової оплати. Змінити її можна тут або безпосередньо в модалці оплати.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">Безготівкові рахунки за замовчуванням</h3>
                {Object.keys(settlementDefaults).length === 0 ? (
                  <div className="text-sm text-gray-500 border rounded px-3 py-3">
                    Ще не налаштовано жодної прив’язки. Додайте відповідність «підприємство → рахунок» нижче.
                  </div>
                ) : (
                  <div className="overflow-auto border rounded">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-left">Підприємство</th>
                          <th className="p-3 text-left">Розрахунковий рахунок</th>
                          <th className="p-3 text-center w-32">Дія</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(settlementDefaults).map(([companyId, accountId]) => {
                          const numericCompanyId = Number(companyId);
                          const label = companyLabel(numericCompanyId);
                          return (
                            <tr key={companyId} className="border-t">
                              <td className="p-3">{label || `ID ${companyId}`}</td>
                              <td className="p-3">
                                <select
                                  className="w-full border rounded px-2 py-1"
                                  value={accountId || ''}
                                  onChange={(e)=> {
                                    const val = e.target.value;
                                    if (!val) {
                                      handleDeleteSettlementDefault(numericCompanyId);
                                      return;
                                    }
                                    handleUpsertSettlementDefault(numericCompanyId, Number(val));
                                  }}
                                >
                                  <option value="">— Оберіть рахунок —</option>
                                  {settlementAccountOptions.map(acc => {
                                    const id = acc.ID || acc.Id;
                                    return (
                                      <option key={id} value={id}>
                                        {acc.AccountNumber} {acc.BankName ? `(${acc.BankName})` : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                <div className="text-xs text-gray-500 mt-1">
                                  {settlementAccountLabel(accountId) || 'Рахунок не вибрано'}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={()=> handleDeleteSettlementDefault(numericCompanyId)}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded"
                                >
                                  Видалити
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-5 border-t pt-4">
                  <div className="text-sm font-semibold mb-2">Додати нову прив’язку</div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Підприємство</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={newDefaultCompanyId}
                        onChange={(e)=> setNewDefaultCompanyId(e.target.value)}
                      >
                        <option value="">— Оберіть підприємство —</option>
                        {unmappedCompanies.map((company) => (
                          <option key={company.ID || company.Id} value={company.ID || company.Id}>
                            {company.Name || company.ShortName || `ФОП #${company.ID || company.Id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Розрахунковий рахунок</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={newDefaultAccountId}
                        onChange={(e)=> setNewDefaultAccountId(e.target.value)}
                      >
                        <option value="">— Оберіть рахунок —</option>
                        {settlementAccountOptions.map((acc) => (
                          <option key={acc.ID || acc.Id} value={acc.ID || acc.Id}>
                            {acc.AccountNumber} {acc.BankName ? `(${acc.BankName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={!newDefaultCompanyId || !newDefaultAccountId}
                        onClick={handleAddSettlementDefault}
                      >
                        Додати
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Ці налаштування діють для співробітника {employee?.Name || `ID ${employee?.ID ?? '?'}`}
                    {' '}та центру обліку №{activeCenterId}. Їх використовуємо при безготівковій оплаті.
                  </p>
                </div>
              </section>
            </div>

            <div className="mt-6 flex justify-end">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowProperties(false)}>Закрити</button>
            </div>
          </div>
        </div>
      )}

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
                  <input
                    type="checkbox"
                    checked={payMethod === 'bank' ? true : splitByCompany}
                    onChange={(e)=> { if (payMethod !== 'bank') setSplitByCompany(e.target.checked); }}
                    disabled={payMethod === 'bank'}
                  />
                  <span>
                    Розподілити оплату по ФОП/компаніях
                    {payMethod === 'bank' ? ' (обовʼязково для безготівки)' : ''}
                  </span>
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
              {companyTotalsEntries.length > 0 && (
                <div className="mt-2 text-sm text-gray-700">
                  {companyTotalsEntries.map(([cid, sum]) => (
                    <div key={cid} className="flex justify-between">
                      <span>{cid==='no_company' ? 'Без компанії' : companyLabel(Number(cid))}</span>
                      <span>{Number(sum||0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {totalsByCompany['no_company'] ? (
                <div className="mt-2 text-sm text-red-600">
                  <div className="flex justify-between">
                    <span>Без компанії</span>
                    <span>{Number(totalsByCompany['no_company'] || 0).toFixed(2)}</span>
                  </div>
                </div>
              ) : null}
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
                    const paymentDate = new Date().toISOString().slice(0, 10);
                    const effectiveSplit = payMethod === 'bank'
                      ? true
                      : (splitByCompany && Object.keys(totalsByCompany || {}).length > 0);

                    if (payMethod === 'cash' && !cashboxId) {
                      alert('Виберіть касу для готівкового платежу (у «Властивостях реалізації»).');
                      setIsPaying(false);
                      return;
                    }

                    if (payMethod === 'bank') {
                      const noCompanyAmount = totalsByCompany['no_company'] || 0;
                      if (noCompanyAmount > 0) {
                        alert('Є позиції без вказаного підприємства. Вкажіть підприємство для кожного товару перед безготівковою оплатою.');
                        setIsPaying(false);
                        return;
                      }
                      if (companyTotalsEntries.length === 0) {
                        alert('Немає товарів із прив’язаними підприємствами для безготівкової оплати.');
                        setIsPaying(false);
                        return;
                      }
                    }

                    const missingAccountCompanies = [];

                    if (effectiveSplit && Object.keys(totalsByCompany || {}).length > 0) {
                      const entries = payMethod === 'bank'
                        ? companyTotalsEntries
                        : Object.entries(totalsByCompany);
                      for (const [cid, sum] of entries) {
                        const amount = Number(sum || 0);
                        if (!(amount > 0)) continue;
                        const companyId = cid === 'no_company' ? null : Number(cid);
                        let settlementAccountId = null;
                        if (payMethod === 'bank') {
                          settlementAccountId = resolveSettlementAccount(companyId);
                          if (!settlementAccountId) {
                            missingAccountCompanies.push(companyId);
                            continue;
                          }
                        }
                        payments.push({
                          DocumentType: 'SALE',
                          DocumentID: current.ID,
                          PaymentMethod: payMethod,
                          Amount: amount,
                          Date: paymentDate,
                          CashboxID: payMethod === 'cash' ? (cashboxId || null) : null,
                          SettlementAccountID: payMethod === 'bank' ? settlementAccountId : null,
                          CompanyID: companyId,
                          CenterID: Number(activeCenterId) || current?.CenterID || null,
                          IsAuto: true,
                          EmployeeID: employee?.ID || null,
                          CreatedBy: employee?.ID || null
                        });
                      }
                    } else {
                      const singleCompanyId = (() => {
                        if (companyTotalsEntries.length === 1) {
                          return Number(companyTotalsEntries[0][0]);
                        }
                        if (current?.CompanyID != null) return Number(current.CompanyID);
                        if (companyTotalsEntries.length > 0) {
                          return Number(companyTotalsEntries[0][0]);
                        }
                        return null;
                      })();

                      let settlementAccountId = null;
                      if (payMethod === 'bank') {
                        settlementAccountId = resolveSettlementAccount(singleCompanyId);
                        if (!settlementAccountId) {
                          const label = singleCompanyId ? companyLabel(singleCompanyId) : 'обраної компанії';
                          alert(`Не налаштовано рахунок за замовчуванням для ${label}. Відкрийте «Властивості реалізації» та оберіть рахунок.`);
                          setShowProperties(true);
                          setIsPaying(false);
                          return;
                        }
                      }

                      payments.push({
                        DocumentType: 'SALE',
                        DocumentID: current.ID,
                        PaymentMethod: payMethod,
                        Amount: Number(payAmount || 0) || Number(totalByItems || 0),
                        Date: paymentDate,
                        CashboxID: payMethod === 'cash' ? (cashboxId || null) : null,
                        SettlementAccountID: payMethod === 'bank' ? settlementAccountId : null,
                        CompanyID: singleCompanyId,
                        CenterID: Number(activeCenterId) || current?.CenterID || null,
                        IsAuto: true,
                        EmployeeID: employee?.ID || null,
                        CreatedBy: employee?.ID || null
                      });
                    }

                    if (payMethod === 'bank' && missingAccountCompanies.length > 0) {
                      const names = missingAccountCompanies
                        .map((cid) => {
                          if (!cid) return 'невизначена компанія';
                          return companyLabel(cid) || `ID ${cid}`;
                        })
                        .join(', ');
                      alert(`Не вказано розрахунковий рахунок за замовчуванням для: ${names}. Відкрийте «Властивості реалізації» та додайте рахунок.`);
                      setShowProperties(true);
                      setIsPaying(false);
                      return;
                    }

                    if (payments.length === 0) {
                      alert('Не вдалося підготувати платежі. Перевірте налаштування реалізації.');
                      setIsPaying(false);
                      return;
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

                    // 4) Оновлюємо статус документа на 'paid' (TotalAmount буде перераховано з позицій автоматично)
                    try { 
                      // Перевіряємо чи є позиції перед оплатою
                      console.log('Перевірка позицій перед оплатою. Document ID:', current.ID);
                      console.log('Локальні позиції (frontend):', items);
                      console.log('Кількість локальних позицій:', items.length);
                      
                      const itemsCheck = await api.getSaleItems(current.ID);
                      console.log('Позиції з бази даних:', itemsCheck);
                      console.log('Кількість позицій з БД:', Array.isArray(itemsCheck) ? itemsCheck.length : 0);
                      
                      // Якщо в базі немає позицій, але є локальні - використовуємо локальні
                      if ((!Array.isArray(itemsCheck) || itemsCheck.length === 0) && items.length > 0) {
                        console.warn('Позиції є локально, але не в базі. Спробуємо провести оплату з локальними даними.');
                        // Не кидаємо помилку, дозволяємо backend перевірити позиції самостійно
                      } else if ((!Array.isArray(itemsCheck) || itemsCheck.length === 0) && items.length === 0) {
                        throw new Error('Документ не містить позицій. Неможливо провести оплату.');
                      }
                      // Оновлюємо статус на 'paid' (TotalAmount буде автоматично перераховано з позицій)
                      await api.updateSale(current.ID, { Status: 'paid', TotalAmount: Number(totalByItems||0) }); 
                    } catch (err) {
                      console.error('Помилка оновлення статусу:', err);
                      alert(err?.message || 'Помилка оновлення статусу документа');
                      throw err; // Перекидаємо помилку, щоб не продовжувати
                    }

                    // 5) Створюємо новий пустий документ після оплати
                    setItems([]);
                    setMarkdownItemIds(new Set());
                    setBarcode('');
                    
                    try {
                      let retail = customer || null;
                      if (!retail) {
                        try { retail = await api.post('/clients/ensure-default-retail'); } catch {}
                      }
                      const newDocRes = await api.addSale({
                        Header: {
                          CenterID: Number(activeCenterId),
                          CustomerID: retail?.ID || null,
                          CreatedBy: employee?.ID || null,
                          EmployeeID: employee?.ID || null
                        },
                        Items: []
                      });
                      const newDoc = await api.getSale(newDocRes.ID);
                      setCurrent(newDoc);
                      if (retail?.ID) setCustomer(retail);
                    } catch (err) {
                      console.error('Помилка створення нового документа:', err);
                    }

                    alert('Оплату проведено успішно');
                    setShowPay(false);
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
