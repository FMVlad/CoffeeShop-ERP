import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function SystemParametersPage() {
  const [params, setParams] = useState([]);
  const [newParam, setNewParam] = useState({ ParamKey: "", ParamValue: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { 
    loadParams();
  }, []);

  const loadParams = async () => {
    try {
      setLoading(true);
      const data = await api.getSystemParameters();
      if (Array.isArray(data)) {
        setParams(data);
      } else if (data && data.error) {
        setError(`Помилка API: ${data.error}`);
        setParams(data.sample_data || []);
      } else {
        setParams([]);
      }
    } catch (err) {
      setError(`Помилка завантаження: ${err.message}`);
      setParams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id, key, value) => {
    setParams(params.map(p => p.ID === id ? { ...p, [key]: value } : p));
  };

  const handleUpdate = async (id, param) => {
    try {
    await api.updateSystemParameter(id, param);
    setMessage("Значення збережено!");
    setTimeout(() => setMessage(""), 1200);
      loadParams();
    } catch (err) {
      setError(`Помилка збереження: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Видалити параметр?")) {
      try {
      await api.deleteSystemParameter(id);
        loadParams();
      } catch (err) {
        setError(`Помилка видалення: ${err.message}`);
      }
    }
  };

  const handleAdd = async () => {
    if (!newParam.ParamKey.trim()) return;
    try {
    await api.addSystemParameter(newParam);
    setNewParam({ ParamKey: "", ParamValue: "" });
    setMessage("Додано!");
    setTimeout(() => setMessage(""), 1200);
      loadParams();
    } catch (err) {
      setError(`Помилка додавання: ${err.message}`);
    }
  };

  // === Тут стилі! ===
  const pageStyle = {
    maxWidth: 680, margin: "40px auto", background: "#fff",
    borderRadius: 18, boxShadow: "0 4px 32px #0001", padding: 32
  };
  const headerStyle = { fontSize: 32, fontWeight: 800, margin: 0, marginBottom: 18, letterSpacing: ".02em", color: "#a12b3a" };
  const mainBtnStyle = {
    background: "#ffe7e0", color: "#a12b3a", padding: "8px 26px", borderRadius: 10,
    fontSize: 18, border: "2px solid #c7a984", fontWeight: 700, cursor: "pointer",
    marginBottom: 28, marginRight: 0
  };
  const tableStyle = {
    width: "100%", fontSize: 17, background: "#fff", marginBottom: 24,
    borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #e1b8b8"
  };
  const thStyle = { background: "#fbeee6", color: "#a12b3a", padding: "12px 16px", fontWeight: 800, border: "1px solid #eee" };
  const tdStyle = { padding: "10px 14px", border: "1px solid #f0d9d9", fontSize: 16 };
  const inputStyle = { fontSize: 16, padding: "10px", borderRadius: 7, border: "1px solid #ccc", width: "100%" };
  const actionBtn = {
    background: "#faf6f0", color: "#ad3900", border: "1.5px solid #ebd9b3", borderRadius: 7,
    padding: "6px 18px", fontWeight: 700, fontSize: 15, cursor: "pointer"
  };
  const deleteBtn = { ...actionBtn, color: "#c4282d", border: "1.5px solid #ffc5c5" };
  const addBtn = { ...actionBtn, background: "#d1f5c3", color: "#228a0f", border: "1.5px solid #b6e8b6" };

  if (loading) {
    return (
      <div style={pageStyle}>
        <h2 style={headerStyle}>Системні налаштування</h2>
        <div>Завантаження...</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Кнопка "На головну" */}
      <button style={mainBtnStyle} onClick={() => window.location.href = "/"}>
        ⬅️ На головну
      </button>

      <h2 style={headerStyle}>Системні налаштування</h2>

      {error && (
        <div style={{
          color: "#c4282d", background: "#f8d7da", padding: 12, borderRadius: 6, marginBottom: 16, border: "1.5px solid #ffc5c5"
        }}>
          ⚠️ {error}
        </div>
      )}
      {message && (
        <div style={{
          color: "#208f41", background: "#d1e7dd", padding: 12, borderRadius: 6, marginBottom: 16, border: "1.5px solid #b6e8b6"
        }}>
          ✅ {message}
        </div>
      )}

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Ключ (param)</th>
            <th style={thStyle}>Значення (value)</th>
            <th style={thStyle}>Дії</th>
          </tr>
        </thead>
        <tbody>
          {params.map(param => (
            <tr key={param.ID}>
              <td style={tdStyle}>
                <input
                  value={param.ParamKey || param.ParameterKey || ""}
                  onChange={e => handleChange(param.ID, "ParamKey", e.target.value)}
                  style={inputStyle}
                  disabled
                />
              </td>
              <td style={tdStyle}>
                <input
                  value={param.ParamValue || param.ParameterValue || ""}
                  onChange={e => handleChange(param.ID, "ParamValue", e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td style={tdStyle}>
                <button style={actionBtn} onClick={() => handleUpdate(param.ID, param)}>💾 Зберегти</button>
                <button style={deleteBtn} onClick={() => handleDelete(param.ID)}>🗑 Видалити</button>
              </td>
            </tr>
          ))}
          <tr>
            <td style={tdStyle}>
              <input
                value={newParam.ParamKey}
                placeholder="Новий ключ"
                onChange={e => setNewParam({ ...newParam, ParamKey: e.target.value })}
                style={inputStyle}
              />
            </td>
            <td style={tdStyle}>
              <input
                value={newParam.ParamValue}
                placeholder="Значення"
                onChange={e => setNewParam({ ...newParam, ParamValue: e.target.value })}
                style={inputStyle}
              />
            </td>
            <td style={tdStyle}>
              <button style={addBtn} onClick={handleAdd}>➕ Додати</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: 15, color: "#888", marginTop: 20 }}>
        <b>Приклади параметрів:</b><br />
        <b>PhotoPath</b> — шлях до фото товарів <br />
        <b>TelegramToken</b> — токен для бота <br />
        <b>PrinterName</b> — принтер робочого місця
      </div>
    </div>
  );
}
