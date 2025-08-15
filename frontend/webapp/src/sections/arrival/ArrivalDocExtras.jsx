// src/sections/arrival/ArrivalDocExtras.jsx
import React from "react";

export default function ArrivalDocExtras({ doc, setDoc }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-gray-600 mb-2">
        Додаткові витрати розподіляються пропорційно нетто-сумі позицій та потрапляють у собівартість (партії).
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
  );
}
