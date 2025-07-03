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
      console.log('📊 Отримані системні параметри:', data);
      
      // Перевіряємо чи це масив
      if (Array.isArray(data)) {
        setParams(data);
      } else if (data && data.error) {
        // Якщо API повертає помилку з інформацією про структуру
        setError(`Помилка API: ${data.error}`);
        console.log('🗂️ Колонки таблиці:', data.columns);
        console.log('📄 Зразок даних:', data.sample_data);
        setParams(data.sample_data || []);
      } else {
        setParams([]);
      }
    } catch (err) {
      console.error('❌ Помилка завантаження параметрів:', err);
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

  if (loading) {
    return (
      <div style={{ marginLeft: 240, padding: 32 }}>
        <h2>Системні налаштування</h2>
        <div>Завантаження...</div>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: 240, padding: 32, maxWidth: 650 }}>
      <h2>Системні налаштування</h2>
      
      {error && (
        <div style={{ 
          color: "#d63384", 
          background: "#f8d7da", 
          padding: 12, 
          borderRadius: 6, 
          marginBottom: 16,
          border: "1px solid #f5c2c7"
        }}>
          ⚠️ {error}
        </div>
      )}
      
      {message && (
        <div style={{ 
          color: "#0f5132", 
          background: "#d1e7dd", 
          padding: 12, 
          borderRadius: 6, 
          marginBottom: 16,
          border: "1px solid #badbcc"
        }}>
          ✅ {message}
        </div>
      )}
      
      <table border={1} cellPadding={8} style={{ fontSize: 16, background: "#fff", marginBottom: 24, minWidth: 450 }}>
        <thead>
          <tr>
            <th>Ключ (param)</th>
            <th>Значення (value)</th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          {params.map(param => (
            <tr key={param.ID}>
              <td>
                <input
                  value={param.ParamKey || param.ParameterKey || ""}
                  onChange={e => handleChange(param.ID, "ParamKey", e.target.value)}
                  style={{ width: 180 }}
                  disabled // Ключ краще не редагувати!
                />
              </td>
              <td>
                <input
                  value={param.ParamValue || param.ParameterValue || ""}
                  onChange={e => handleChange(param.ID, "ParamValue", e.target.value)}
                  style={{ width: 320 }}
                />
              </td>
              <td>
                <button onClick={() => handleUpdate(param.ID, param)}>💾 Зберегти</button>
                <button onClick={() => handleDelete(param.ID)} style={{ marginLeft: 8, color: "red" }}>🗑 Видалити</button>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <input
                value={newParam.ParamKey}
                placeholder="Новий ключ"
                onChange={e => setNewParam({ ...newParam, ParamKey: e.target.value })}
                style={{ width: 180 }}
              />
            </td>
            <td>
              <input
                value={newParam.ParamValue}
                placeholder="Значення"
                onChange={e => setNewParam({ ...newParam, ParamValue: e.target.value })}
                style={{ width: 320 }}
              />
            </td>
            <td>
              <button onClick={handleAdd}>➕ Додати</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div style={{fontSize: 14, color: "#888"}}>
        Приклад: <br/>
        <b>PhotoPath</b> — шлях до фото товарів <br/>
        <b>TelegramToken</b> — токен для бота <br/>
        <b>PrinterName</b> — принтер робочого місця
      </div>
    </div>
  );
}
