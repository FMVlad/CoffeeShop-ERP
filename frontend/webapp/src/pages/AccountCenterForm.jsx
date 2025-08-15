import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function AccountCenterForm({ open, center, onClose, onSaved }) {
  const [form, setForm] = useState({
    Name: "", City: "", FullAddress: "", Phone: ""
  });

  useEffect(() => {
    setForm(center || { Name: "", City: "", FullAddress: "", Phone: "" });
  }, [center, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (center && center.ID) {
      await api.updateCenter(center.ID, form);
    } else {
      await api.addCenter(form);
    }
    onSaved();
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.23)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#fff", padding: 30, borderRadius: 14, minWidth: 380, minHeight: 320 }}>
        <h2>{center ? "Редагувати центр обліку" : "Новий центр обліку"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input value={form.Name} placeholder="Назва *"
                 onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} />
          <input value={form.City} placeholder="Місто"
                 onChange={e => setForm(f => ({ ...f, City: e.target.value }))} />
          <input value={form.FullAddress} placeholder="Повна адреса"
                 onChange={e => setForm(f => ({ ...f, FullAddress: e.target.value }))} />
          <input value={form.Phone} placeholder="Телефон"
                 onChange={e => setForm(f => ({ ...f, Phone: e.target.value }))} />
        </div>
        <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button style={{ background: "#eee", color: "#444", padding: "9px 25px", borderRadius: 7 }} onClick={onClose}>Скасувати</button>
          <button style={{ background: "#2d9a7c", color: "#fff", padding: "9px 28px", borderRadius: 7 }} onClick={handleSave}>
            {center ? "Зберегти" : "Додати"}
          </button>
        </div>
      </div>
    </div>
  );
}
