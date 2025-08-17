// src/sections/arrival/ArrivalDocItems.jsx
import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductPicker from "../../components/ProductPicker";
import BarcodeInput from "../../components/BarcodeInput";
import ProductDirectoryModal from "../../components/ProductDirectoryModal";

export default function ArrivalDocItems({ doc, setDoc, focusKey = 0, onRequestFocus }) {
  const [localFocusBump, setLocalFocusBump] = useState(0);
  const [showDirectory, setShowDirectory] = useState(false);
  const navigate = useNavigate();

  const addRow = useCallback(() => {
    setDoc((d) => ({
      ...d,
      Items: [
        ...d.Items,
        { ProductID: "", ProductName: "", Quantity: 1, Price: 0, TaxRateID: null },
      ],
    }));
  }, [setDoc]);

  const onBarcodeResolved = React.useCallback((p) => {
  if (!p) {
    return;
  }
  const name =
    p.FullName || p.fullName || p.full_name || p.ProductName || p.Name || p.name || "";
  const id = p.ID ?? p.Id ?? p.id ?? p.ProductID ?? p.product_id ?? "";

  setDoc((d) => {
    const newItems = [
      ...d.Items,
      {
        ProductID: id,
        ProductName: name,
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

  const setItem = useCallback(
    (idx, key, val) => {
      setDoc((d) => {
        const items = d.Items.map((r, i) => (i === idx ? { ...r, [key]: val } : r));
        const total = items.reduce((s, r) => s + (+r.Quantity || 0) * (+r.Price || 0), 0);
        return { ...d, Items: items, TotalAmount: total };
      });
    },
    [setDoc]
  );

  const delItem = useCallback(
    (idx) => {
      setDoc((d) => {
        const items = d.Items.filter((_, i) => i !== idx);
        const total = items.reduce((s, r) => s + (+r.Quantity || 0) * (+r.Price || 0), 0);
        return { ...d, Items: items, TotalAmount: total };
      });
    },
    [setDoc]
  );

  return (
    <>
      {/* штрихкод + дії пошуку */}
      <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-end">
        <div className="flex-1 md:flex-[0.55]">
          <label className="text-sm block mb-1">Штрихкод (Enter)</label>
          <BarcodeInput
            key={`${focusKey}-${localFocusBump}`}
            autoFocus
            onResolve={onBarcodeResolved}
            onNotFound={(bc) => {
              try {
                const snapshot = { editingId: null, doc };
                window.sessionStorage.setItem("arrival_restore_doc", JSON.stringify(snapshot));
                window.sessionStorage.setItem("prefill_barcode", bc);
              } catch {}
              // Виводимо дружню підказку і одразу переходимо у додавання
              try { window.localStorage.setItem("__notify_add_product", "true"); } catch {}
              navigate("/select-products?mode=add");
            }}
            placeholder="Скануй або введи та натисни Enter"
          />
        </div>
        <div className="flex gap-2 md:flex-[0.45]">
          <button
            className="border rounded px-3 py-2"
            onClick={() => {
              // Зберігаємо стан форми документа, щоб не втратити постачальника тощо
              try {
                const snapshot = {
                  editingId: null,
                  doc,
                };
                window.sessionStorage.setItem("arrival_restore_doc", JSON.stringify(snapshot));
              } catch {}
              const back = encodeURIComponent(window.location.pathname + window.location.search);
              navigate(`/select-products?back=${back}`);
            }}
            title="Відкрити сторінку вибору товарів"
          >
            🔎 Пошук у довіднику
          </button>
          <button
            className="border rounded px-3 py-2"
            onClick={() => alert('Стан складу: поки опційно')}
            title="Переглянути стан складу (опційно)"
          >
            🏬 Стан складу
          </button>
          <button
            id="arrival-items-add-row"
            className="border rounded px-3 py-2"
            onClick={() => {
              addRow();
              setLocalFocusBump((n) => n + 1);
              onRequestFocus?.();
            }}
          >
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
                      setItem(idx, "ProductID", p.ProductID);
                      setItem(idx, "ProductName", p.ProductName);
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
      {/* Обробка повернення зі сторінки вибору */}
      {/* Один раз обробляємо кеш після повернення */}
      {React.useMemo(() => {
        try {
          const raw = window.sessionStorage.getItem("arrival_selected_products");
          if (!raw) return null;
          window.sessionStorage.removeItem("arrival_selected_products");
          const selected = JSON.parse(raw);
          if (!Array.isArray(selected) || selected.length === 0) return null;
          setTimeout(() => {
            setDoc((d) => {
              const appended = selected.map((p) => ({
                ProductID: p.ID,
                ProductName: p.FullName || p.Name || "",
                Quantity: Number(p.Quantity || 1),
                Price: 0,
                TaxRateID: null,
              }));
              const newItems = [...d.Items, ...appended];
              const total = newItems.reduce((s, r) => s + (+r.Quantity || 0) * (+r.Price || 0), 0);
              return { ...d, Items: newItems, TotalAmount: total };
            });
            // після імпорту — сфокусувати штрихкод і нічого більше не відкривати
            setLocalFocusBump((n) => n + 1);
          }, 0);
        } catch {}
        return null;
      }, [])}
    </>
  );
}
