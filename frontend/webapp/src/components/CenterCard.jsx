import React, { useState, useEffect } from "react";
import { api } from "../api";

const DEFAULT_WAREHOUSES = [
  { Name: "Головний склад", Type: "main" },
  { Name: "Резервний склад", Type: "reserve" },
  { Name: "Резерв замовлення", Type: "order_reserve" },
  { Name: "Резерв виробництва", Type: "production_reserve" },
  { Name: "Товар в дорозі", Type: "in_transit" },
  { Name: "Уцінка", Type: "write_off" },
];

export default function CenterCard({ centerId = null, onClose, onSaved }) {
  const [tab, setTab] = useState("main");
  const [fields, setFields] = useState({
    Name: "",
    City: "",
    FullAddress: "",
    Phone: "",
  });
  const [warehouses, setWarehouses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(Boolean(centerId));
  const [loading, setLoading] = useState(!!centerId);

  useEffect(() => {
    if (centerId) {
      setLoading(true);
      api.getCenters().then(list => {
        const c = (list || []).find(x => String(x.ID) === String(centerId));
        if (c) setFields({
          Name: c.Name || "",
          City: c.City || "",
          FullAddress: c.FullAddress || "",
          Phone: c.Phone || "",
        });
      });
      api.getWarehouses(centerId).then(ws => setWarehouses(ws || []));
      setLoading(false);
    } else {
      setWarehouses(DEFAULT_WAREHOUSES);
    }
  }, [centerId]);

  // --- Обробка інпутів
  const handleChange = (key, value) =>
    setFields(prev => ({ ...prev, [key]: value }));

  // --- Збереження
  const handleSave = async () => {
    setSaving(true);
    try {
      let resp;
      if (centerId) {
        resp = await api.updateCenter(centerId, fields);
      } else {
        resp = await api.addCenter(fields);
        // Складами займається бекенд (автоматично)
      }
      if (onSaved) onSaved(resp);
      onClose();
    } catch {
      alert("❌ Помилка збереження центру обліку!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      maxWidth: 540,
      margin: "48px auto",
      background: "#fff",
      borderRadius: 18,
      boxShadow: "0 10px 40px rgba(0,0,0,0.13)",
      overflow: "hidden"
    }}>
      <div style={{
        background: "#e8ddf8", color: "#442a60", padding: "18px 40px",
        fontWeight: 700, fontSize: 23, textAlign: "center", borderBottom: "1px solid #ece0f4"
      }}>
        {centerId ? "Редагувати" : "Новий"} центр обліку
      </div>
      <div style={{
        display: "flex", borderBottom: "1px solid #ece0f4",
        background: "#f6f3fa"
      }}>
        {["main", "warehouses", "cashboxes", "companies"].map(t => (
          <button
            key={t}
            style={{
              flex: 1, padding: "14px", border: "none",
              background: tab === t ? "#fff" : "transparent",
              borderBottom: tab === t ? "2px solid #6d4c2b" : "2px solid transparent",
              fontSize: 15, fontWeight: 600, color: tab === t ? "#6d4c2b" : "#999",
              cursor: "pointer", transition: "all 0.18s"
            }}
            onClick={() => setTab(t)}
          >
            {{
              main: "Основні дані",
              warehouses: "Склади",
              cashboxes: "Каси",
              companies: "Підприємства"
            }[t]}
          </button>
        ))}
      </div>

      <div style={{ padding: 34 }}>
        {tab === "main" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Назва центру обліку *</div>
              <input
                type="text"
                value={fields.Name}
                onChange={e => handleChange("Name", e.target.value)}
                style={{ width: "100%", padding: 11, borderRadius: 7, border: "1px solid #ccc" }}
                required
              />
            </label>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Місто</div>
              <input
                type="text"
                value={fields.City}
                onChange={e => handleChange("City", e.target.value)}
                style={{ width: "100%", padding: 11, borderRadius: 7, border: "1px solid #ccc" }}
              />
            </label>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Повна адреса</div>
              <input
                type="text"
                value={fields.FullAddress}
                onChange={e => handleChange("FullAddress", e.target.value)}
                style={{ width: "100%", padding: 11, borderRadius: 7, border: "1px solid #ccc" }}
              />
            </label>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Телефон</div>
              <input
                type="text"
                value={fields.Phone}
                onChange={e => handleChange("Phone", e.target.value)}
                style={{ width: "100%", padding: 11, borderRadius: 7, border: "1px solid #ccc" }}
              />
            </label>
          </div>
        )}

        {tab === "warehouses" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 18 }}>Склади центру</div>
            <ul style={{ paddingLeft: 22 }}>
              {warehouses.map(w => (
                <li key={w.ID || w.Type} style={{ marginBottom: 8, fontSize: 16 }}>
                  <span style={{ fontWeight: 600 }}>{w.Name}</span>
                  <span style={{ color: "#997" }}> ({{
                    main: "Головний",
                    reserve: "Резервний",
                    order_reserve: "Замовлення",
                    production_reserve: "Виробництво",
                    in_transit: "В дорозі",
                    write_off: "Уцінка"
                  }[w.Type] || w.Type})</span>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 14 }}>
              Додавати інші склади можна буде після створення центру обліку
            </div>
          </div>
        )}

        {/* Порожні вкладки (на майбутнє): */}
        {tab === "cashboxes" && (
          <div style={{ color: "#aaa", fontSize: 15, textAlign: "center", padding: 32 }}>
            Список кас буде тут (після створення центру)
          </div>
        )}
        {tab === "companies" && (
          <div style={{ color: "#aaa", fontSize: 15, textAlign: "center", padding: 32 }}>
            Підприємства додаватимуться після створення центру
          </div>
        )}

        <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", marginTop: 36 }}>
          <button
            onClick={onClose}
            style={{
              background: "#bbb", color: "#fff", border: "none", borderRadius: 7,
              padding: "10px 24px", fontWeight: 600, cursor: "pointer"
            }}
          >Скасувати</button>
          <button
            onClick={handleSave}
            disabled={saving || !fields.Name}
            style={{
              background: "#31ad5f", color: "#fff", border: "none", borderRadius: 7,
              padding: "10px 32px", fontWeight: 600, cursor: "pointer", opacity: !fields.Name ? 0.6 : 1
            }}
          >{saving ? "Збереження..." : "Зберегти"}</button>
        </div>
      </div>
    </div>
  );
}
