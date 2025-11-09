import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import StockPickerButton from '../components/StockPickerButton.jsx';
import BarcodeInput from '../components/BarcodeInput.jsx';
import { useUser } from '../UserContext';

export default function MovementDocumentsPage(){
  const navigate = useNavigate();
  const location = useLocation();
  const { centerId: activeCenterId } = useUser();
  const [docs, setDocs] = useState([]);
  const [centers, setCenters] = useState([]);
  const [current, setCurrent] = useState(null);
  const [isInTransit, setIsInTransit] = useState(false);
  const [fromCenterId, setFromCenterId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toCenterId, setToCenterId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editDocDate, setEditDocDate] = useState('');
  // Списки складів прибрані — склад визначається автоматично (in_transit або main)
  const [toCenters, setToCenters] = useState([]);
  function todayLocal(){
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const [dateFrom, setDateFrom] = useState(() => todayLocal());
  const [dateTo, setDateTo] = useState(() => todayLocal());
  const [sentStatus, setSentStatus] = useState('');
  const [recvStatus, setRecvStatus] = useState('');

  useEffect(()=>{
    (async()=>{
      try {
        const list = await api.getMovements({ center_id: activeCenterId });
        setDocs(Array.isArray(list)?list:[]);
      } catch(e){ console.error(e); setDocs([]); }
      try { const cs = await api.getCenters(); setCenters(Array.isArray(cs)?cs:[]); } catch{}
    })();
  },[activeCenterId]);

  // Центр-джерело за замовчуванням = активний центр із сайдбару
  useEffect(()=>{
    if (activeCenterId) setFromCenterId(String(activeCenterId));
  }, [activeCenterId]);

  // Якщо повернулися зі складу з параметром doc_id — автоматично відкриваємо документ
  useEffect(()=>{
    try {
      const sp = new URLSearchParams(location.search || '');
      const did = sp.get('doc_id');
      if (did && !current) {
        (async()=>{
          const d = await api.getMovement(Number(did));
          setCurrent(d); setItems(d.Items||[]);
          try { setEditDocDate(String(d.DocDate||'').slice(0,10)); } catch {}
          try { const w1 = await api.getWarehouses(d.FromCenterID); setFromWhs(Array.isArray(w1)?w1:[]); } catch {}
          try { const w2 = await api.getWarehouses(d.ToCenterID); setToWhs(Array.isArray(w2)?w2:[]); } catch {}
        })();
      }
    } catch {}
  }, [location.search]);

  // Коли відкрили будь-який документ — підставити поточні значення і завантажити склади
  useEffect(()=>{
    if (!current?.ID) return;
    try { setEditDocDate(String(current.DocDate||'').slice(0,10)); } catch {}
    (async()=>{
      try { const cs = await api.getCenters(); setToCenters(Array.isArray(cs)?cs:[]); } catch {}
    })();
  }, [current?.ID, current?.FromCenterID, current?.ToCenterID]);

  // Вибір складу зі сторінки складу
  const openStockPicker = (key, cid, widSetter) => (
    <StockPickerButton selectionKey={key} centerId={cid} label="Стан складу" className="bg-gradient-to-r from-violet-100 to-purple-200 border-2 border-violet-300 rounded-2xl px-6 py-3 font-bold" />
  );

  const createDoc = async () => {
    // Валідємо: отримувач обов'язково
    if (!fromCenterId || !toCenterId) {
      alert('Оберіть центри: джерело і центр-отримувач');
      return;
    }
    // за замовчуванням джерело — головний склад обраного центру
    let fwid = fromWarehouseId;
    if (!fwid && fromCenterId) {
      try {
        const whs = await api.getWarehouses(fromCenterId);
        const main = (whs||[]).find(w=>String(w.Type).toLowerCase()==='main');
        if (main) fwid = main.ID;
      } catch {}
    }
    const payload = {
      FromCenterID: Number(fromCenterId),
      FromWarehouseID: Number(fwid),
      ToCenterID: Number(toCenterId),
      ToWarehouseID: toWarehouseId ? Number(toWarehouseId) : undefined,
      IsInTransit: isInTransit,
    };
    const res = await api.addMovement(payload);
    const doc = await api.getMovement(res.ID);
    setCurrent(doc); setItems(doc.Items||[]);
    // Фіксуємо doc_id в URL, щоб не «закривався» після повернення
    try { navigate(`/stock/movements?doc_id=${doc.ID}`, { replace: true }); } catch {}
    await api.getMovements({ center_id: activeCenterId }).then(setDocs);
  };

  const addScanned = async () => {
    if (!current?.ID || !barcode.trim()) return;
    // шукаємо товар по штрихкоду
    const p = await api.getProductByBarcode(barcode.trim());
    if (!p?.ID) { alert('Товар не знайдено'); return; }
    await api.addMovementItem(current.ID, { ProductID: p.ID, Quantity: 1 });
    const doc = await api.getMovement(current.ID); setItems(doc.Items||[]); setBarcode('');
  };

  const selectionBridgeKey = 'move_add';

  function centerNameById(id){
    const c = (centers||[]).find(x => String(x.ID) === String(id));
    return c ? (c.Name || c.CenterName || c.ID) : id;
  }

  function movementStatusUa(status){
    const s = String(status || '').toLowerCase();
    if (s === 'draft') return 'Чернетка';
    if (s === 'shipped') return 'Відвантажено';
    if (s === 'received') return 'Отримано';
    return status || '';
  }

  function incomingStatusUa(status){
    const s = String(status || '').toLowerCase();
    if (s === 'shipped') return 'В дорозі';
    if (s === 'received') return 'Отримано';
    if (s === 'draft') return 'Чернетка';
    return status || '';
  }

  const sentDocs = useMemo(() => {
    const list = Array.isArray(docs) ? docs : [];
    if (!activeCenterId) return list;
    return list.filter(d => {
      if (Number(d.FromCenterID) !== Number(activeCenterId)) return false;
      const dd = String(d.DocDate||'').slice(0,10);
      const fromOk = !dateFrom || dd >= String(dateFrom);
      const toOk = !dateTo || dd <= String(dateTo);
      return fromOk && toOk;
    });
  }, [docs, activeCenterId, dateFrom, dateTo]);

  const receivedDocs = useMemo(() => {
    const list = Array.isArray(docs) ? docs : [];
    if (!activeCenterId) return list;
    return list.filter(d => {
      if (Number(d.ToCenterID) !== Number(activeCenterId)) return false;
      const dd = String(d.DocDate||'').slice(0,10);
      const fromOk = !dateFrom || dd >= String(dateFrom);
      const toOk = !dateTo || dd <= String(dateTo);
      return fromOk && toOk;
    });
  }, [docs, activeCenterId, dateFrom, dateTo]);

  const sentFiltered = useMemo(()=>{
    const list = Array.isArray(sentDocs) ? sentDocs : [];
    const key = String(sentStatus||'').toLowerCase();
    if (!key) return list;
    return list.filter(d => String(d.Status||'').toLowerCase() === key);
  }, [sentDocs, sentStatus]);

  const receivedFiltered = useMemo(()=>{
    const list = Array.isArray(receivedDocs) ? receivedDocs : [];
    const key = String(recvStatus||'').toLowerCase();
    if (!key) return list;
    return list.filter(d => String(d.Status||'').toLowerCase() === key);
  }, [receivedDocs, recvStatus]);

  useEffect(()=>{
    if (!current?.ID) return;
    try {
      const raw = window.sessionStorage.getItem(`selected::${selectionBridgeKey}`);
      if (!raw) return;
      const payload = JSON.parse(raw);
      const list = (payload?.items||[]);
      (async ()=>{
        // Отримати існуючі позиції для об'єднання
        let existing = await api.getMovement(current.ID);
        const existingByProduct = new Map((existing.Items||[]).map(it=> [Number(it.ProductID), it]));
        for (const it of list) {
          const pid = Number(it.id);
          const addQty = Number(it.quantity||1);
          const found = existingByProduct.get(pid);
          if (found) {
            await api.updateMovementItem(current.ID, found.ID, { Quantity: Number(found.Quantity) + addQty });
          } else {
            await api.addMovementItem(current.ID, { ProductID: pid, Quantity: addQty });
          }
        }
        const doc = await api.getMovement(current.ID); setItems(doc.Items||[]);
        window.sessionStorage.removeItem(`selected::${selectionBridgeKey}`);
      })();
    } catch {}
  }, [current?.ID]);

  if (!current) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Заголовок у стилі Уцінки */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-3xl shadow-2xl p-8 mb-12">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-white mb-4">🚚 Документи переміщення</h1>
              <p className="text-2xl text-violet-100">Управління переміщеннями між складами</p>
            </div>
          </div>

          {/* Навігація */}
          <div className="flex flex-col sm:flex-row gap-6 justify-between items-center mb-12">
            <div className="flex items-center gap-6">
              <button onClick={() => navigate('/stock')} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl">← Назад до складів</button>
              <button onClick={() => navigate('/')} className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl">🏠 На головну</button>
            </div>
          </div>

          {/* Форма створення документа */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-2">Центр-джерело</div>
                <select value={fromCenterId || String(activeCenterId || '')} onChange={e=>setFromCenterId(e.target.value)} disabled className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-violet-500 focus:outline-none transition-colors duration-300 disabled:bg-gray-100 disabled:text-gray-500">
                  <option value="">Оберіть…</option>
                  {centers.map(c=>(<option key={c.ID} value={c.ID}>{c.Name}</option>))}
                </select>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Центр-отримувач</div>
                <select value={toCenterId} onChange={e=>setToCenterId(e.target.value)} className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-violet-500 focus:outline-none transition-colors duration-300">
                  <option value="">Оберіть отримувача</option>
                  {centers.map(c=>(<option key={c.ID} value={c.ID}>{c.Name}</option>))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input id="tr" type="checkbox" checked={isInTransit} onChange={e=>setIsInTransit(e.target.checked)} />
                <label htmlFor="tr">Товар в дорозі</label>
              </div>
            </div>
            <div className="mt-6">
              <button onClick={createDoc} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl">Створити документ</button>
            </div>
          </div>

          {/* Фільтр дат */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">З дати</span>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="p-2 border-2 border-gray-200 rounded-xl" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">по</span>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="p-2 border-2 border-gray-200 rounded-xl" />
              </div>
              <button onClick={async()=>{ try{ const l=await api.getMovements({ center_id: activeCenterId }); setDocs(Array.isArray(l)?l:[]);}catch{} }} className="ml-auto bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">Оновити</button>
            </div>
          </div>

          {/* Таблиця документів (відправлені) */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Переміщення відправлені</h3>
              <div className="flex items-center gap-3">
                <select value={sentStatus} onChange={e=>setSentStatus(e.target.value)} className="p-2 border-2 border-gray-200 rounded-xl">
                  <option value="">Всі статуси</option>
                  <option value="draft">Чернетка</option>
                  <option value="shipped">Відвантажено</option>
                  <option value="received">Отримано</option>
                </select>
                <button onClick={async()=>{ try{ const l=await api.getMovements({ center_id: activeCenterId }); setDocs(Array.isArray(l)?l:[]);}catch{} }} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">Оновити</button>
              </div>
            </div>
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-violet-100 to-purple-100">
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200" style={{width:70}}>№</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Дата</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Отримувач</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Статус</th>
                  <th className="p-4 text-center font-bold text-lg border-b-2 border-violet-200">Дії</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(sentFiltered)?sentFiltered:[]).map((d, idx)=> (
                  <tr key={d.ID} className="hover:bg-violet-50 transition-colors duration-200">
                    <td className="p-4 border-b border-violet-100">{idx + 1}</td>
                    <td className="p-4 border-b border-violet-100">{String(d.DocDate||'').slice(0,10)}</td>
                    <td className="p-4 border-b border-violet-100">{centerNameById(d.ToCenterID)}</td>
                    <td className="p-4 border-b border-violet-100">{movementStatusUa(d.Status)}</td>
                    <td className="p-4 border-b border-violet-100 text-center" style={{ whiteSpace:'nowrap' }}>
                      {String(d.Status||'').toLowerCase()==='received' ? (
                        <button onClick={async()=>{ const doc = await api.getMovement(d.ID); setCurrent(doc); setItems(doc.Items||[]); }} className="bg-gradient-to-r from-slate-500 to-gray-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">👁</button>
                      ) : (
                        <>
                          <button onClick={async()=>{ const doc = await api.getMovement(d.ID); setCurrent(doc); setItems(doc.Items||[]); }} className="mr-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">✎</button>
                          <button onClick={async()=>{ if(window.confirm('Видалити документ?')){ await api.deleteMovement?.(d.ID); const l=await api.getMovements({ center_id: activeCenterId }); setDocs(Array.isArray(l)?l:[]); } }} className="bg-gradient-to-r from-red-500 to-pink-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">🗑</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {Array.isArray(sentDocs) && sentDocs.length===0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={5}>Документів поки немає</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Таблиця документів (отримані) */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 mt-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Переміщення отримані</h3>
              <div className="flex items-center gap-3">
                <select value={recvStatus} onChange={e=>setRecvStatus(e.target.value)} className="p-2 border-2 border-gray-200 rounded-xl">
                  <option value="">Всі статуси</option>
                  <option value="draft">Чернетка</option>
                  <option value="shipped">В дорозі</option>
                  <option value="received">Отримано</option>
                </select>
                <button onClick={async()=>{ try{ const l=await api.getMovements(); setDocs(Array.isArray(l)?l:[]);}catch{} }} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">Оновити</button>
              </div>
            </div>
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-violet-100 to-purple-100">
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200" style={{width:70}}>№</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Дата</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Відправник</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Статус</th>
                  <th className="p-4 text-center font-bold text-lg border-b-2 border-violet-200">Дії</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(receivedFiltered)?receivedFiltered:[]).map((d, idx)=> (
                  <tr key={d.ID} className="hover:bg-violet-50 transition-colors duration-200">
                    <td className="p-4 border-b border-violet-100">{idx + 1}</td>
                    <td className="p-4 border-b border-violet-100">{String(d.DocDate||'').slice(0,10)}</td>
                    <td className="p-4 border-b border-violet-100">{centerNameById(d.FromCenterID)}</td>
                    <td className="p-4 border-b border-violet-100">{incomingStatusUa(d.Status)}</td>
                    <td className="p-4 border-b border-violet-100 text-center" style={{ whiteSpace:'nowrap' }}>
                      {String(d.Status||'').toLowerCase()==='received' ? (
                        <button onClick={async()=>{ const doc = await api.getMovement(d.ID); setCurrent(doc); setItems(doc.Items||[]); }} className="bg-gradient-to-r from-slate-500 to-gray-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">👁</button>
                      ) : (
                        <>
                          <button onClick={async()=>{ const doc = await api.getMovement(d.ID); setCurrent(doc); setItems(doc.Items||[]); }} className="mr-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">✎</button>
                          <button onClick={async()=>{ if(window.confirm('Видалити документ?')){ await api.deleteMovement?.(d.ID); const l=await api.getMovements({ center_id: activeCenterId }); setDocs(Array.isArray(l)?l:[]); } }} className="bg-gradient-to-r from-red-500 to-pink-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">🗑</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {Array.isArray(receivedDocs) && receivedDocs.length===0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={5}>Документів поки немає</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="text-3xl font-bold text-gray-800">Переміщення #{current.ID}</div>
          <div className="flex gap-3">
            {Number(current.FromCenterID)===Number(activeCenterId) && (
              <button onClick={async()=>{ await api.shipMovement(current.ID); const d = await api.getMovement(current.ID); setCurrent(d); }} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">Відвантажити</button>
            )}
            {Number(current.ToCenterID)===Number(activeCenterId) && (
              String(current.Status||'').toLowerCase()==='shipped' ? (
                <button onClick={async()=>{ await api.receiveMovement(current.ID); const d = await api.getMovement(current.ID); setCurrent(d); try{ const l=await api.getMovements({ center_id: activeCenterId }); setDocs(Array.isArray(l)?l:[]);}catch{} }} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">Прийняти</button>
              ) : String(current.Status||'').toLowerCase()==='received' ? (
                <button onClick={async()=>{ await api.cancelReceiveMovement(current.ID); const d = await api.getMovement(current.ID); setCurrent(d); try{ const l=await api.getMovements({ center_id: activeCenterId }); setDocs(Array.isArray(l)?l:[]);}catch{} }} className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-5 py-2 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">Відмінити прийняття</button>
              ) : null
            )}
            <button onClick={()=>setCurrent(null)} className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-5 py-2 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">Закрити</button>
          </div>
        </div>

        {/* Редагування для відправника / перегляд для отримувача */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Дата документа</div>
            <input type="date" value={editDocDate} onChange={e=>setEditDocDate(e.target.value)} disabled={Number(current.ToCenterID)===Number(activeCenterId)} className="w-full p-3 border-2 border-gray-200 rounded-xl disabled:bg-gray-100 disabled:text-gray-500" />
          </div>
          {Number(current.ToCenterID)!==Number(activeCenterId) && (
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <input id="isTrEdit" type="checkbox" checked={Boolean(current.IsInTransit)} onChange={e=> setCurrent(prev=> ({...prev, IsInTransit: e.target.checked}))} />
                <label htmlFor="isTrEdit" className="text-sm text-gray-600">Товар в дорозі</label>
              </div>
            </div>
          )}
          {Number(current.ToCenterID)!==Number(activeCenterId) && (
            <div>
              <div className="text-sm text-gray-600 mb-1">Центр-отримувач</div>
              <select value={current.ToCenterID} onChange={async e=>{
                const v = Number(e.target.value);
                setCurrent(prev => ({...prev, ToCenterID: v}));
              }} className="w-full p-3 border-2 border-gray-200 rounded-xl">
                {toCenters.map(c=> (<option key={c.ID} value={c.ID}>{c.Name || c.CenterName || c.ID}</option>))}
              </select>
            </div>
          )}
        </div>
        {Number(current.ToCenterID)!==Number(activeCenterId) && (
          <div className="flex justify-end mb-8">
            <button onClick={async()=>{
              try {
                await api.updateMovement(current.ID, { DocDate: editDocDate, ToCenterID: current.ToCenterID, IsInTransit: Boolean(current.IsInTransit) });
                const d = await api.getMovement(current.ID); setCurrent(d); setItems(d.Items||[]);
                try { setEditDocDate(String(d.DocDate||'').slice(0,10)); } catch {}
                alert('Збережено');
              } catch(e){ alert(e?.message || 'Помилка збереження'); }
            }} className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-2 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">Зберегти зміни</button>
          </div>
        )}

        {Number(current.FromCenterID)===Number(activeCenterId) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">Штрихкод</div>
              <input value={barcode} onChange={e=>setBarcode(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') addScanned(); }} className="w-full p-3 border rounded-xl" placeholder="Скануй та Enter" />
            </div>
            <div className="flex items-end gap-3">
              {openStockPicker(selectionBridgeKey, String(current.FromCenterID), setFromWarehouseId)}
              <button onClick={()=>navigate(`/stock/state?select=1&key=${selectionBridgeKey}&center_id=${current.FromCenterID}&back=/stock/movements?doc_id=${current.ID}`)} className="px-4 py-3 bg-violet-100 border border-violet-300 rounded-2xl font-bold">Вибрати зі складу</button>
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-3 items-center">
          <div className="text-sm text-gray-600">Фільтр:</div>
          <select value={items._filter || ''} onChange={e=>{
            const v = e.target.value; setSelectedIds(new Set()); setItems(prev=>{ const cp=[...prev]; cp._filter=v; return cp; });
          }} className="p-2 border rounded-lg">
            <option value="">Всі позиції</option>
            <option value="no_to_price">Без ціни у отримувача</option>
            <option value="price_diff">Тільки з різницею цін</option>
          </select>
          {((items._filter||'')==='no_to_price' || (items._filter||'')==='price_diff') && (
            <div className="flex items-center gap-3">
              <button onClick={()=>{
                // відмітити всі видимі
                const filter = items._filter || '';
                const all = new Set();
                (items||[]).forEach(it=>{
                  if (filter==='no_to_price' && !Boolean(it.PriceToCenterSpecific)) all.add(it.ID);
                  else if (filter==='price_diff'){
                    const pf = it.PriceFrom!=null?Number(it.PriceFrom):null; const pt = it.PriceTo!=null?Number(it.PriceTo):null;
                    if (pf!=null && pt!=null && Math.abs(pf-pt)>1e-9) all.add(it.ID);
                  }
                });
                setSelectedIds(all);
              }} className="px-3 py-1 text-sm bg-gray-100 rounded-lg">Відмітити всі</button>
              <button onClick={()=>setSelectedIds(new Set())} className="px-3 py-1 text-sm bg-gray-100 rounded-lg">Очистити</button>
              <div className="flex items-center gap-2">
                <span className="text-sm">Дія для обраних:</span>
                <select id="bulkAction" className="p-2 border rounded-lg">
                  <option value="take_from_source">Взяти ціну у джерела</option>
                  <option value="recalc_from_cost">Розрахувати від собівартості (роздріб)</option>
                </select>
                <span className="text-sm">Крок округлення:</span>
                <select id="roundStep" className="p-2 border rounded-lg">
                  {(window.__roundingSteps || [0.01,0.05,0.1,0.5,1,5,10]).map(s=> (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {/* режим округлення за замовчуванням: nearest (селект прибрано для економії місця) */}
                <button onClick={async()=>{
                  const action = document.getElementById('bulkAction').value;
                  const stepVal = document.getElementById('roundStep').value;
                  const roundModeEl = document.getElementById('roundMode');
                  const roundMode = roundModeEl ? roundModeEl.value : 'nearest';
                  const ids = Array.from(selectedIds);
                  if (!ids.length) return;
                  await api.fetchJSON(`/api/movements/${current.ID}/items/bulk-price`, {
                    method: 'POST',
                    body: JSON.stringify({ ids, action, rounding_step: stepVal? Number(stepVal): null, rounding_mode: roundMode || null }),
                  });
                  const d = await api.getMovement(current.ID); setItems(d.Items||[]);
                }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">Застосувати</button>
              </div>
            </div>
          )}
        </div>
        <table className="min-w-full bg-white border-2 border-violet-200 rounded-2xl overflow-hidden">
          <thead>
            <tr className="bg-gradient-to-r from-violet-100 to-purple-100">
              {((items._filter||'')==='no_to_price' || (items._filter||'')==='price_diff') && (<th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200" style={{width:36}}>✓</th>)}
              <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Товар</th>
              <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Ціна (звідки)</th>
              <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Ціна (куди)</th>
              <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">К-сть</th>
              <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Дії</th>
            </tr>
          </thead>
          <tbody>
            {(()=>{
              const filter = items._filter || '';
              const filtered = (items||[]).filter(it=>{
              const filter = items._filter || '';
              if (filter === 'no_to_price') {
                // критерій: у центру-отримувача немає власної (center-specific) ціни
                if (Boolean(it.PriceToCenterSpecific)) return false;
              } else if (filter === 'price_diff') {
                const pf = it.PriceFrom != null ? Number(it.PriceFrom) : null;
                const pt = it.PriceTo != null ? Number(it.PriceTo) : null;
                if (!(pf != null && pt != null && Math.abs(pf-pt) > 1e-9)) return false;
              }
              return true;
              });
              return filtered.map(it => {
              const pf = it.PriceFrom != null ? Number(it.PriceFrom) : null;
              const pt = it.PriceTo != null ? Number(it.PriceTo) : null;
              const diff = pf != null && pt != null && Math.abs(pf - pt) > 1e-9;
              const showSelect = (filter==='no_to_price' || filter==='price_diff');
              const checked = selectedIds.has(it.ID);
              return (
              <tr key={it.ID} className={`border-t ${diff ? 'bg-yellow-50' : ''} ${checked ? 'ring-2 ring-blue-300' : ''}`}>
                {showSelect && (
                  <td className="p-4 border-b border-violet-100">
                    <input type="checkbox" checked={checked} onChange={e=>{
                      setSelectedIds(prev=>{
                        const ns = new Set(prev); if(e.target.checked) ns.add(it.ID); else ns.delete(it.ID); return ns;
                      })
                    }} />
                  </td>
                )}
                <td className="p-4 border-b border-violet-100">{it.ProductName || it.ProductID}</td>
                <td className="p-4 border-b border-violet-100" style={{minWidth:100}}>{pf != null ? pf.toFixed(2) : ''}</td>
                <td className="p-4 border-b border-violet-100" style={{minWidth:100}}>{pt != null ? pt.toFixed(2) : ''}</td>
                <td className="p-4 border-b border-violet-100" style={{minWidth:140}}>
                  <input type="number" value={Number(it.Quantity)}
                         onChange={e=> setItems(prev=>prev.map(x=> x.ID===it.ID? { ...x, Quantity: e.target.value } : x))}
                         onKeyDown={async e=>{ if(e.key==='Enter'){ await api.updateMovementItem(current.ID, it.ID, { Quantity: Number(it.Quantity)||1 }); const d = await api.getMovement(current.ID); setItems(d.Items||[]); } }}
                         className="w-32 p-3 border-2 border-gray-200 rounded-xl text-right focus:border-violet-500 focus:outline-none transition-colors duration-300" />
                </td>
                <td className="p-4 border-b border-violet-100">
                  <button onClick={async()=>{ await api.addMovementItem(current.ID, { ProductID: it.ProductID, Quantity: 1 }); const d=await api.getMovement(current.ID); setItems(d.Items||[]); }} className="mr-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">+1</button>
                  <button onClick={async()=>{ await api.updateMovementItem?.(current.ID, it.ID, { Quantity: Math.max(1, Number(it.Quantity)-1) }); const d=await api.getMovement(current.ID); setItems(d.Items||[]); }} className="mr-2 bg-gradient-to-r from-gray-300 to-slate-400 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">-1</button>
                  <button onClick={async()=>{ await api.deleteMovementItem?.(current.ID, it.ID); const d=await api.getMovement(current.ID); setItems(d.Items||[]); }} className="bg-gradient-to-r from-red-500 to-pink-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">✕</button>
                </td>
              </tr>
            )})})()}
          </tbody>
        </table>
      </div>
    </div>
  );
}


