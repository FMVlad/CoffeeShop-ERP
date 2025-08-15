import React, { useState, useEffect } from "react";
import { api } from "../api";

const warehouseTypes = [
  { value: "main", label: "Головний склад" },
  { value: "reserve", label: "Резервний склад" },
  { value: "order_reserve", label: "Резерв замовлення" },
  { value: "production_reserve", label: "Резерв виробництва" },
  { value: "in_transit", label: "Товар в дорозі" },
  { value: "write_off", label: "Уцінка" },
];

export default function WarehouseForm({ warehouse, onClose, onSaved }) {
  const [form, setForm] = useState({ Name: "", Type: "main", IsActive: 1 });

  useEffect(() => {
    setForm(warehouse || { Name: "", Type: "main", IsActive: 1 });
  }, [warehouse]);

  if (!warehouse) return null;

  const handleSave = async () => {
    if (warehouse.ID) {
      await api.updateWarehouse(warehouse.ID, form);
    } else {
      await api.addWarehouse({ ...form, CenterID: warehouse.CenterID });
    }
    onSaved();
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.23)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#fff", padding: 30, borderRadius: 14, minWidth: 320 }}>
        <h2>{warehouse.ID ? "Редагувати склад" : "Новий склад"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input value={form.Name} placeholder="Назва *"
                 onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} />
          <select value={form.Type}
                  onChange={e => setForm(f => ({ ...f, Type: e.target.value }))}>
            {warehouseTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button style={{ background: "#eee", color: "#444", padding: "9px 25px", borderRadius: 7 }} onClick={onClose}>Скасувати</button>
          <button style={{ background: "#2d9a7c", color: "#fff", padding: "9px 28px", borderRadius: 7 }} onClick={handleSave}>
            {warehouse.ID ? "Зберегти" : "Додати"}
          </button>
        </div>
      </div>
    </div>
  );
}
