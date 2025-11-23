// src/sections/arrival/ArrivalDocHeader.jsx
import React from "react";

export default function ArrivalDocHeader({
  doc,
  setDoc,
  suppliers,
  currencies,
  companies,
  centers,
  typicalOps,
}) {
  return (
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
        <label className="text-sm block mb-1">Дата оплати</label>
        <input
          type="date"
          className="border rounded p-2 w-full"
          value={doc.PaymentDueDate || ""}
          onChange={(e) => setDoc({ ...doc, PaymentDueDate: e.target.value || null })}
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
  );
}
