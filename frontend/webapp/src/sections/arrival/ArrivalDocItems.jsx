// src/sections/arrival/ArrivalDocItems.jsx
import React, { useCallback, useState } from "react";
import ProductPicker from "../../components/ProductPicker";
import BarcodeInput from "../../components/BarcodeInput";

export default function ArrivalDocItems({ doc, setDoc }) {
  const [barcodeFocusBump, setBarcodeFocusBump] = useState(0);

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
    alert("Штрихкод не знайдено");
    // TODO: відкрити форму створення товару зі штрихкодом
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
        <div className="flex-1">
          <label className="text-sm block mb-1">Штрихкод (Enter)</label>
          <BarcodeInput
            key={barcodeFocusBump}
            autoFocus
            onResolve={onBarcodeResolved}
            placeholder="Скануй або введи та натисни Enter"
          />
        </div>
        <div className="flex gap-2">
          <button
            id="arrival-items-add-row"
            className="border rounded px-3 py-2"
            onClick={() => {
              addRow();
              // підфокусується знову
              setBarcodeFocusBump((n) => n + 1);
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
    </>
  );
}
