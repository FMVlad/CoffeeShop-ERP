import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function CashboxesTab({ centerId }) {
  const [cashboxes, setCashboxes] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState({ Name: "", CurrencyID: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!centerId) return;
    api.getCashboxes(centerId).then(setCashboxes);
    api.getCurrencies().then(data => {
      setCurrencies(data);
      // Вибрати гривню (UAH) за замовчуванням
      if (!form.CurrencyID) {
        const uah = data.find(c => c.CurrencyCode === "UAH" || c.Name.includes("грив"));
        if (uah) setForm(f => ({ ...f, CurrencyID: uah.ID }));
      }
    });
    // eslint-disable-next-line
  }, [centerId]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    if (!form.Name.trim() || !form.CurrencyID) return;
    api.addCashbox({
      Name: form.Name.trim(),
      CurrencyID: form.CurrencyID,
      CenterID: centerId,
      IsActive: 1
    }).then(() => {
      setForm({ Name: "", CurrencyID: form.CurrencyID });
      api.getCashboxes(centerId).then(setCashboxes);
      setAdding(false);
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Видалити цю касу?")) {
      api.deleteCashbox(id).then(() => api.getCashboxes(centerId).then(setCashboxes));
    }
  };

  return (
    <div>
      {/* --- Форма додавання --- */}
      <div style={{ marginBottom: 24 }}>
        {!adding ? (
          <button
            style={{
              background: "#208f41", color: "#fff", padding: "10px 28px",
              borderRadius: 8, fontSize: 16, border: "none", fontWeight: 600, cursor: "pointer"
            }}
            onClick={() => setAdding(true)}
          >+ Додати</button>
        ) : (
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <input
              name="Name"
              value={form.Name}
              placeholder="Назва каси *"
              onChange={handleChange}
              style={{ fontSize: 16, padding: "8px", borderRadius: 8, border: "1px solid #ccc", minWidth: 180 }}
            />
            <select
              name="CurrencyID"
              value={form.CurrencyID}
              onChange={handleChange}
              style={{ fontSize: 16, padding: "8px", borderRadius: 8, border: "1px solid #ccc" }}
            >
              <option value="">Валюта</option>
              {currencies.map(c => (
                <option key={c.ID} value={c.ID}>{c.Name}</option>
              ))}
            </select>
            <button
              style={{ background: "#208f41", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}
              onClick={handleAdd}
              disabled={!form.Name.trim() || !form.CurrencyID}
            >Додати</button>
            <button
              style={{ background: "#eee", color: "#444", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}
              onClick={() => setAdding(false)}
            >Відміна</button>
          </div>
        )}
      </div>

      {/* --- Таблиця кас --- */}
      <table style={{ width: "100%", background: "#f7f7fb", borderRadius: 10, overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "#f2e9fa" }}>
            <th style={{ padding: "10px 14px", textAlign: "left" }}>Назва</th>
            <th style={{ padding: "10px 14px", textAlign: "left" }}>Валюта</th>
            <th style={{ width: 80 }}>Дії</th>
          </tr>
        </thead>
        <tbody>
          {cashboxes.map(cb => (
            <tr key={cb.ID} style={{ borderBottom: "1px solid #e5e0f5" }}>
              <td style={{ padding: "8px 14px" }}>{cb.Name}</td>
              <td style={{ padding: "8px 14px" }}>{currencies.find(c => c.ID === cb.CurrencyID)?.Name || "?"}</td>
              <td style={{ padding: "8px 14px" }}>
                {/* Додай редагування якщо треба */}
                <button
                  style={{ background: "#e04747", color: "#fff", border: "none", borderRadius: 7, padding: 8, fontWeight: 700, cursor: "pointer" }}
                  onClick={() => handleDelete(cb.ID)}
                  title="Видалити"
                >🗑️</button>
              </td>
            </tr>
          ))}
          {cashboxes.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", color: "#bbb", padding: 18 }}>Немає кас</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
