import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import StockPickerButton from "../components/StockPickerButton.jsx";
import BarcodeInput from "../components/BarcodeInput.jsx";
import { useUser } from "../UserContext";

export default function DiscountDocumentsPage(){
  const navigate = useNavigate();
  const { centerId: activeCenterId } = useUser();
  const [docs, setDocs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [items, setItems] = useState([]);
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [barcode, setBarcode] = useState("");

  useEffect(() => { api.getCenters().then(setCenters).catch(()=>{}); }, []);
  useEffect(() => { if (activeCenterId && !centerId) setCenterId(String(activeCenterId)); }, [activeCenterId, centerId]);

  // Автоматично додаємо товари з selectionBridge
  useEffect(() => {
    if (current?.ID) {
      console.log('🔍 DiscountDocumentsPage: Перевіряємо sessionStorage для документа:', current.ID);
      const picked = window.sessionStorage.getItem('selected::discount_doc');
      console.log('🔍 DiscountDocumentsPage: Отримано з sessionStorage (raw):', picked);
      
      if (picked) {
        try {
          const parsed = JSON.parse(picked);
          console.log('🔍 DiscountDocumentsPage: Отримано з sessionStorage (parsed):', parsed);
          
          if (parsed?.items && parsed.items.length > 0) {
            console.log('🔍 DiscountDocumentsPage: Товари для додавання:', parsed.items);
            
            // Додаємо всі обрані товари асинхронно
            const processItems = async () => {
              console.log('🔍 DiscountDocumentsPage: Починаємо обробку товарів...');
              for (const item of parsed.items) {
                if (item.id) {
                  const productId = Number(item.id);
                  const quantity = Number(item.quantity || 1);
                  const price = Number(item.price || 0);
                  
                  console.log('🔍 DiscountDocumentsPage: Обробляємо товар:', { productId, quantity, price });
                  
                  // Перевіряємо чи товар вже є в документі
                  const existingItem = items.find(it => it.ProductID === productId);
                  
                  if (existingItem) {
                    // Якщо товар вже є - оновлюємо кількість
                    const newQuantity = existingItem.Quantity + quantity;
                    console.log('🔍 DiscountDocumentsPage: Оновлюємо існуючий товар:', { existingItem: existingItem.ID, newQuantity });
                    await api.updateDiscountDocItem(current.ID, existingItem.ID, { 
                      Quantity: newQuantity,
                      Price: price // Оновлюємо ціну на нову
                    });
                  } else {
                    // Якщо товар новий - додаємо
                    console.log('🔍 DiscountDocumentsPage: Додаємо новий товар:', { productId, quantity, price });
                    await api.addDiscountDocItem(current.ID, { 
                      ProductID: productId, 
                      Quantity: quantity, 
                      Price: price 
                    });
                  }
                }
              }
              // Очищаємо sessionStorage
              window.sessionStorage.removeItem('selected::discount_doc');
              console.log('🔍 DiscountDocumentsPage: sessionStorage очищено');
              // Перезавантажуємо позиції
              console.log('🔍 DiscountDocumentsPage: Перезавантажуємо позиції...');
              setTimeout(() => reloadItems(), 100);
            };
            
            processItems().catch(e => {
              console.error('Помилка обробки обраних товарів:', e);
            });
          } else {
            console.log('🔍 DiscountDocumentsPage: Немає товарів для додавання або неправильна структура:', parsed);
          }
        } catch (e) {
          console.error('Помилка обробки обраних товарів:', e);
        }
      } else {
        console.log('🔍 DiscountDocumentsPage: sessionStorage порожній для ключа selected::discount_doc');
      }
    } else {
      console.log('🔍 DiscountDocumentsPage: current.ID не встановлено:', current);
    }
  }, [current?.ID]);

  async function reloadDocs(){ setDocs(await api.getDiscountDocs()); }
  async function reloadItems(){ 
    if (current?.ID) {
      console.log('🔍 DiscountDocumentsPage: Завантаження позицій для документа:', current.ID);
      const items = await api.getDiscountDocItems(current.ID);
      console.log('🔍 DiscountDocumentsPage: Отримано позицій:', items?.length || 0);
      setItems(items);
    }
  }

  useEffect(() => { reloadDocs(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reloadItems(); }, [current?.ID]);

  async function createDoc(){
    console.log('🔍 DiscountDocumentsPage: Створення документа з CenterID:', Number(centerId || activeCenterId));
    console.log('🔍 DiscountDocumentsPage: centerId:', centerId, 'activeCenterId:', activeCenterId);
    const res = await api.addDiscountDoc({ CenterID: Number(centerId || activeCenterId) });
    console.log('🔍 DiscountDocumentsPage: Створено документ:', res);
    await reloadDocs();
    const doc = await api.getDiscountDoc(res.ID);
    console.log('🔍 DiscountDocumentsPage: Завантажено документ:', doc);
    setCurrent(doc);
  }

  function centerNameById(id){
    const c = (centers||[]).find(x => String(x.ID) === String(id));
    return c ? (c.Name || c.CenterName || c.ID) : id;
  }

  function setCurrentField(key, value){
    setCurrent(prev => prev ? { ...prev, [key]: value } : prev);
  }

  async function persistCurrent(patch){
    if (!current?.ID) return;
    try { await api.updateDiscountDoc(current.ID, patch); } catch {}
  }

  function updateItemLocal(itemId, patch){
    setItems(prev => prev.map(it => it.ID === itemId ? { ...it, ...patch } : it));
  }

  async function persistItem(itemId, patch){
    if (!current?.ID) return;
    try { await api.updateDiscountDocItem(current.ID, itemId, patch); } catch {}
  }

  // Режим списку документів
  if (!current) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Заголовок */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-3xl shadow-2xl p-8 mb-12">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-white mb-4">
                📝 Документи уцінки
              </h1>
              <p className="text-2xl text-violet-100">
                Управління документами уцінки товарів
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
            <div className="flex gap-4">
              <button 
                onClick={async () => {
                  if (window.confirm('Очистити забруднені дані в StockBalances? Це видалить всі записи з нульовою кількістю та застарілі коментарі.')) {
                    try {
                      const result = await api.cleanupStockBalances();
                      alert(`Очищено: ${result.total_deleted} записів\n- Нульова кількість: ${result.deleted_zero_quantity}\n- Коментарі уцінки: ${result.deleted_discount_comments}\n- Дублікати: ${result.deleted_duplicates}`);
                      await reloadDocs();
                    } catch (err) {
                      alert('Помилка очищення: ' + (err?.message || err));
                    }
                  }
                }} 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-6 py-3 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
                title="Очистити забруднені дані в StockBalances"
              >
                🧹 Очистити
              </button>
              <button 
                onClick={createDoc} 
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
              >
                ✨ + Додати документ
              </button>
            </div>
          </div>

          {/* Таблиця документів */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-violet-100 to-purple-100">
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">№</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Дата</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Центр</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Коментар</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Статус</th>
                  <th className="p-4 text-center font-bold text-lg border-b-2 border-violet-200">Дії</th>
                </tr>
              </thead>
              <tbody>
                {(docs||[]).map(d => (
                  <tr key={d.ID} className="hover:bg-violet-50 transition-colors duration-200">
                    <td className="p-4 border-b border-violet-100">{d.DocNumber || d.ID}</td>
                    <td className="p-4 border-b border-violet-100">{String(d.DocDate).slice(0,10)}</td>
                    <td className="p-4 border-b border-violet-100">{centerNameById(d.CenterID)}</td>
                    <td className="p-4 border-b border-violet-100">{d.Comment || ''}</td>
                    <td className="p-4 border-b border-violet-100">{d.Status || 'open'}</td>
                    <td className="p-4 border-b border-violet-100 text-center" style={{ whiteSpace:'nowrap' }}>
                      <button title="Редагувати" onClick={()=>setCurrent(d)} className="mr-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">✎</button>
                      <button title="Видалити" onClick={async()=>{ 
                        if (window.confirm('Видалити документ? Товари будуть повернуті на головний склад.')) { 
                          try {
                            const result = await api.deleteDiscountDoc(d.ID);
                            if (result.returned_to_main_warehouse > 0) {
                              alert(`Документ видалено! Повернуто на головний склад: ${result.returned_to_main_warehouse} товарів`);
                            } else {
                              alert('Документ видалено!');
                            }
                            await reloadDocs(); 
                          } catch (err) {
                            alert('Помилка видалення: ' + (err?.message || err));
                          }
                        } 
                      }} className="bg-gradient-to-r from-red-500 to-pink-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Режим редагування документа
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="text-3xl font-bold text-gray-800">Документ №{current.DocNumber || current.ID}</div>
              <div className="text-lg text-gray-600">{String(current.DocDate).slice(0,10)} · Центр {centerNameById(current.CenterID)}</div>
            </div>
            <div className="flex gap-4">
              <button onClick={()=>{ setCurrent(null); }} className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl">← До списку</button>
              <button onClick={async()=>{ 
                try {
                  await persistCurrent({ Comment: current.Comment||'' }); 
                  await api.postDiscountDocPostings(current.ID); 
                  await reloadItems(); 
                  await reloadDocs(); 
                  setCurrent(null);
                } catch(e) {
                  alert(e?.message || 'Помилка запису');
                }
              }} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl">Записати</button>
              <button onClick={async()=>{ const r = await api.closeDiscountDocIfEmpty(current.ID); if (r?.closed) { await reloadDocs(); setCurrent(null); } }} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl">Закрити при 0</button>
              <button onClick={async()=>{ 
                if (window.confirm('Видалити документ? Товари будуть повернуті на головний склад.')) { 
                  try {
                    const result = await api.deleteDiscountDoc(current.ID);
                    if (result.returned_to_main_warehouse > 0) {
                      alert(`Документ видалено! Повернуто на головний склад: ${result.returned_to_main_warehouse} товарів`);
                    } else {
                      alert('Документ видалено!');
                    }
                    await reloadDocs(); 
                    setCurrent(null);
                  } catch (err) {
                    alert('Помилка видалення: ' + (err?.message || err));
                  }
                } 
              }} className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl">🗑 Видалити</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">Коментар</label>
              <input
                type="text"
                value={current.Comment || ''}
                onChange={e=>setCurrentField('Comment', e.target.value)}
                onBlur={e=>persistCurrent({ Comment: e.target.value })}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-violet-500 focus:outline-none transition-colors duration-300"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">Штрихкод та вибір зі складу</label>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Скануй або введи та натисни Enter"
                  value={barcode}
                  onChange={(e)=>setBarcode(e.target.value)}
                  onKeyDown={async(e)=>{
                    if (e.key === 'Enter') {
                      const s = (barcode||'').trim();
                      if (!s) return;
                      try {
                        const p = await api.getProductByBarcode(s);
                        if (p && p.ID) {
                          await api.addDiscountDocItem(current.ID, { ProductID: Number(p.ID||p.Id), Quantity: 1, Price: Number(p.Price||0) });
                          setBarcode('');
                          await reloadItems();
                        }
                      } catch(err) {
                        alert(err?.message || 'Товар не знайдено');
                      }
                    }
                  }}
                  className="flex-1 p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-violet-500 focus:outline-none transition-colors duration-300"
                />
                <StockPickerButton 
                  selectionKey="discount_doc" 
                  centerId={String(current.CenterID)} 
                  label="Стан складу" 
                  className="bg-gradient-to-r from-violet-100 to-purple-200 border-2 border-violet-300 rounded-2xl px-6 py-4 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <table className="min-w-full bg-white border-2 border-violet-200 rounded-2xl overflow-hidden">
              <thead>
                <tr className="bg-gradient-to-r from-violet-100 to-purple-100">
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Товар</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">К-сть</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Поточна ціна</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">% знижки</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Нова ціна</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">Сума</th>
                  <th className="p-4 text-left font-bold text-lg border-b-2 border-violet-200">ШК уцінки</th>
                  <th className="p-4 text-center font-bold text-lg border-b-2 border-violet-200">Дії</th>
                </tr>
              </thead>
              <tbody>
                {(items||[]).map(it => {
                  const qty = Number(it.Quantity||0);
                  const newPrice = Number(it.Price||0);
                  const base = Number(it.BasePrice||it.PriceBase||newPrice);
                  const discountPct = base ? Number(((1 - (newPrice/base)) * 100).toFixed(2)) : 0;
                  const belowCost = typeof it.AvgCost === 'number' ? newPrice < Number(it.AvgCost) : false;
                  return (
                    <tr key={it.ID} className={belowCost ? 'bg-red-50' : 'hover:bg-violet-50'} style={{ background: belowCost ? '#fff2f2' : undefined }}>
                      <td className="p-4 border-b border-violet-100">{it.ProductName || it.FullName || it.Name || it.ProductID}</td>
                      <td className="p-4 border-b border-violet-100 text-right" style={{ minWidth: 120 }}>
                        <input type="number" value={qty}
                               onChange={e=>updateItemLocal(it.ID, { Quantity: Number(e.target.value)||0 })}
                               onBlur={e=>persistItem(it.ID, { Quantity: Number(e.target.value)||0 })}
                               className="w-full p-3 border-2 border-gray-200 rounded-xl text-right focus:border-violet-500 focus:outline-none transition-colors duration-300" />
                      </td>
                      <td className="p-4 border-b border-violet-100 text-right">{base.toFixed(2)}</td>
                      <td className="p-4 border-b border-violet-100 text-right" style={{ minWidth: 120 }}>
                        <input type="number" value={discountPct}
                               onChange={e=>{ const pct = Number(e.target.value)||0; const price = base ? Number((base*(1-pct/100)).toFixed(2)) : 0; updateItemLocal(it.ID, { Price: price }); }}
                               onBlur={e=>{ const pct = Number(e.target.value)||0; const price = base ? Number((base*(1-pct/100)).toFixed(2)) : 0; persistItem(it.ID, { Price: price }); }}
                               className="w-full p-3 border-2 border-gray-200 rounded-xl text-right focus:border-violet-500 focus:outline-none transition-colors duration-300" />
                      </td>
                      <td className="p-4 border-b border-violet-100 text-right" style={{ minWidth: 120 }}>
                        <input type="number" value={newPrice}
                               onChange={e=>updateItemLocal(it.ID, { Price: Number(e.target.value)||0 })}
                               onBlur={e=>persistItem(it.ID, { Price: Number(e.target.value)||0 })}
                               className="w-full p-3 border-2 border-gray-200 rounded-xl text-right focus:border-violet-500 focus:outline-none transition-colors duration-300" />
                      </td>
                      <td className="p-4 border-b border-violet-100 text-right">{(newPrice*qty).toFixed(2)}</td>
                      <td className="p-4 border-b border-violet-100 font-mono">{it.DiscountBarcode||''}</td>
                      <td className="p-4 border-b border-violet-100 text-center">
                        <button onClick={async()=>{ await api.deleteDiscountDocItem(current.ID, it.ID); await reloadItems(); }} className="bg-gradient-to-r from-red-500 to-pink-600 text-white border-none rounded-xl px-4 py-2 font-bold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-right mt-6 text-2xl font-bold text-gray-800">
              Разом: {(items||[]).reduce((s,it)=> s + Number(it.Price||0)*Number(it.Quantity||0), 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
