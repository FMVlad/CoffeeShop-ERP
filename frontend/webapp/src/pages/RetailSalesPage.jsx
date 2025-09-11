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
  const handledSelectionRef = useRef(false);

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
      } else {
        const res = await api.addSale({ Header: { CenterID: Number(activeCenterId) } });
        const doc = await api.getSale(res.ID);
        setCurrent(doc);
      }
    })();
  }, [activeCenterId]);

  useEffect(() => { reloadItems(); }, [current?.ID]);

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

  // Прийом вибору зі складу (selectionBridge)
  useEffect(() => {
    (async () => {
      if (!current?.ID) return;
      if (handledSelectionRef.current) return;
      const raw = window.sessionStorage.getItem('selected::retail_sale');
      if (!raw) return;
      handledSelectionRef.current = true;
      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed?.items) ? parsed.items : [];
        for (const it of arr) {
          const pid = Number(it.id || it.ProductID);
          const qty = Number(it.quantity || it.Qty || 1);
          const price = Number(it.price || it.Price || 0);
          if (pid && qty > 0) {
            await api.addSaleItem(current.ID, { ProductID: pid, Quantity: qty, Price: price });
          }
        }
      } catch {}
      window.sessionStorage.removeItem('selected::retail_sale');
      await reloadItems();
    })();
  }, [current?.ID]);

  // Додавання по штрихкоду по Enter
  async function addByBarcode() {
    const s = (barcode || '').trim();
    if (!s || !current?.ID) return;
    try {
      const p = await api.getProductByBarcode(s);
      if (p && p.ID) {
        const isDisc = !!p.IsDiscountBarcode;
        const priceToUse = isDisc && typeof p.DiscountPrice === 'number' ? Number(p.DiscountPrice) : Number(p.Price || 0);
        await api.addSaleItem(current.ID, { ProductID: Number(p.ID), Quantity: 1, Price: priceToUse });
        setBarcode('');
        await reloadItems();
      }
    } catch (e) {
      alert(e?.message || 'Товар не знайдено');
    }
  }

  const totalByItems = items.reduce((s,it)=> s + Number(it.Quantity||0)*Number(it.Price||0), 0);
  const totalRetail = items.reduce((s,it)=> {
    const pid = Number(it.ProductID || it.ProductId || it.Product || 0);
    const retail = priceMap[pid] ?? Number(it.Price || 0);
    return s + Number(it.Quantity||0) * Number(retail||0);
  }, 0);
  const totalDiscount = Math.max(0, totalRetail - totalByItems);

  return (
    <div className="retail-root">
      <header className="retail-header">
        <button onClick={() => navigate('/sales')} className="px-4 py-2 bg-white/10 rounded-lg">← Назад</button>
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
            />
            <button onClick={addByBarcode} className="btn-blue">Знайти</button>
            <StockPickerButton
              selectionKey="retail_sale"
              centerId={String(current?.CenterID || activeCenterId || '')}
              label="Знайти на складі"
              className="btn-blue-outline"
            />
            <button className="btn-blue">Вибрати покупця</button>
            <input className="retail-action-input" placeholder="Застосована акція" disabled />
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
                  return (
                    <tr key={it.ID} className={isDiscount ? 'bg-rose-50' : undefined}>
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3">{/* Фото */}</td>
                      <td className="p-3 font-semibold" style={{ color: isDiscount ? '#be123c' : undefined }}>{it.ProductName || it.FullName || it.Name || it.ProductID}</td>
                      <td className="p-3 text-right">{qty.toFixed(3)}</td>
                      <td className="p-3 text-right">{Number(retail||0).toFixed(2)}</td>
                      <td className="p-3 text-right">{price.toFixed(2)}</td>
                      <td className="p-3 text-right">{(qty*price).toFixed(2)}</td>
                      <td className="p-3 text-right">{/* ФОП */}</td>
                      <td className="p-3 text-right">
                        <button onClick={async()=>{ await api.deleteSaleItem(current.ID, it.ID); await reloadItems(); }} className="px-3 py-1 bg-red-500 text-white rounded-lg">✕</button>
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
            <input className="border rounded px-3 py-2" value={current?.ID || ''} readOnly />
            <label className="text-sm text-gray-600 self-center">Дата</label>
            <input className="border rounded px-3 py-2" value={(current?.Date || new Date().toISOString()).slice(0,10)} readOnly />
          </div>

          <div className="border rounded p-3 mb-3">
            <div className="text-center font-semibold mb-2">ПІБ Покупця</div>
            <div className="text-center text-sm text-gray-600">% знижки , сума бонусів</div>
          </div>

          <div className="text-sm mb-2">Кількість рядків</div>
          <div className="border rounded p-3 mb-3">
            <div className="flex justify-between mb-2"><span>Всього:</span><span>{totalRetail.toFixed(2)}</span></div>
            <div className="flex justify-between mb-2"><span>Сума знижки:</span><span>{totalDiscount.toFixed(2)}</span></div>
            <div className="flex justify-between mb-2"><span>Всього до сплати:</span><span className="font-bold">{totalByItems.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>В тому числі ПДВ</span><span>{(totalByItems * 0.2).toFixed(2)}</span></div>
          </div>

          <div className="border rounded p-3 mb-3">
            <div className="font-semibold mb-2">Чеки підприємців:</div>
            <div className="flex justify-between"><span>ФОП.....</span><span>Сума</span></div>
            <div className="flex justify-between"><span>ФОП.....</span><span>Сума</span></div>
          </div>

          <button className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold">Оплатити</button>
        </aside>
      </main>

      <footer className="retail-footer">
        <div className="text-sm text-gray-500">Готово до роботи</div>
      </footer>
    </div>
  );
}
