// src/pages/ProductCardTemplateFields.jsx

import React, { useState, useEffect } from "react";

export default function ProductCardTemplateFields() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newField, setNewField] = useState({
    DisplayName: "",
    SqlName: "",
    FieldType: "string",
    MaxLength: 255,
    IsRequired: false,
    IsVisible: true,
    Description: ""
  });

  // Завантажити шаблони (картки)
  useEffect(() => {
    fetch("http://localhost:8000/api/product-card-templates")
      .then(res => res.json())
      .then(data => {
        setTemplates(data);
        if (data.length) setSelectedTemplateId(data[0].ID);
      });
  }, []);

  // Завантажити поля для обраного шаблону
  useEffect(() => {
    if (!selectedTemplateId) return;
    setLoading(true);
    fetch(`http://localhost:8000/api/product-card-template-fields?template_id=${selectedTemplateId}`)
      .then(res => res.json())
      .then(data => {
        setFields(data);
        setLoading(false);
      })
      .catch(err => {
        alert("❌ Помилка завантаження полів: " + err.message);
        setLoading(false);
      });
  }, [selectedTemplateId]);

  // Автогенерація SqlName
  const generateSqlName = (displayName) => {
    return displayName
      .replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[а-яіїє]/g, (char) => {
        const map = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
          'ж': 'zh', 'з': 'z', 'и': 'y', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'і': 'i', 'ї': 'yi', 'є': 'ye'
        };
        return map[char] || char;
      });
  };

  const handleAddField = async () => {
    if (!newField.DisplayName.trim()) {
      alert("💡 Введіть назву поля!");
      return;
    }
    const sqlName = newField.SqlName || generateSqlName(newField.DisplayName);
    try {
      const resp = await fetch("http://localhost:8000/api/product-card-template-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newField,
          SqlName: sqlName,
          TemplateID: selectedTemplateId
        })
      });
      if (!resp.ok) {
        const error = await resp.json();
        alert("❌ " + (error.detail || "Помилка створення поля"));
      return;
    }
      setNewField({
      DisplayName: "",
      SqlName: "",
        FieldType: "string",
        MaxLength: 255,
      IsRequired: false,
      IsVisible: true,
        Description: ""
      });
      setShowAddForm(false);
      // reload fields
      const data = await fetch(`http://localhost:8000/api/product-card-template-fields?template_id=${selectedTemplateId}`).then(r => r.json());
      setFields(data);
    } catch (e) {
      alert("❌ Сталася помилка при додаванні поля.");
    }
  };

  const toggleVisibility = async (fieldId, field) => {
    try {
      await fetch(`http://localhost:8000/api/product-card-template-fields/${fieldId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...field,
          IsVisible: !field.IsVisible
        })
    });
    // reload fields
      const data = await fetch(`http://localhost:8000/api/product-card-template-fields?template_id=${selectedTemplateId}`).then(r => r.json());
      setFields(data);
    } catch (error) {
      alert("❌ Помилка оновлення: " + error.message);
    }
  };

  const deleteField = async (fieldId) => {
    if (!window.confirm("⚠️ Видалити це поле назавжди?")) return;
    try {
      await fetch(`http://localhost:8000/api/product-card-template-fields/${fieldId}`, {
        method: "DELETE"
      });
      // reload fields
      const data = await fetch(`http://localhost:8000/api/product-card-template-fields?template_id=${selectedTemplateId}`).then(r => r.json());
      setFields(data);
    } catch (error) {
      alert("❌ Помилка видалення: " + error.message);
    }
  };

  // --- UI ---
  const standardFields = fields.filter(f => f.IsStandard);
  const customFields = fields.filter(f => !f.IsStandard);

  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: "0 auto" }}>
      {/* Вибір картки */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 18 }}>
        <label style={{ fontWeight: 600, fontSize: 18, color: "#b85450" }}>🗂️ Картка товару:</label>
        <select
          value={selectedTemplateId || ""}
          onChange={e => setSelectedTemplateId(Number(e.target.value))}
          style={{ padding: 10, fontSize: 16, borderRadius: 8, minWidth: 220, border: "1px solid #bbb" }}
        >
          {templates.map(tpl => (
            <option key={tpl.ID} value={tpl.ID}>{tpl.Name}</option>
          ))}
        </select>
      </div>

      {/* Заголовок */}
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ color: "#b85450", margin: 0, fontSize: 28 }}>
          🔧 Налаштування полів товару
        </h2>
        <div style={{
          color: "#666",
          margin: "12px 0 0 0",
          fontSize: 16,
          background: "#e7f3ff",
          padding: 16,
          borderRadius: 8,
          border: "1px solid #b6d7ff"
        }}>
          <strong>Що це?</strong> Тут ви керуєте полями для створення товару.<br />
          <strong>Як працює?</strong> Додайте поле тут → воно з'явиться у формі товару.
        </div>
      </div>

      {/* Стандартні поля */}
      <div style={{ marginBottom: 30 }}>
        <h3 style={{ color: "#28a745", margin: "0 0 16px 0", fontSize: 20 }}>
          🛡️ Основні поля <span style={{ fontSize: 14, color: "#666", fontWeight: 400 }}>(завжди є)</span>
        </h3>
        <div style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8f9fa" }}>
              <tr>
                <th style={{ padding: 12, textAlign: "left" }}>Назва</th>
                <th style={{ padding: 12, textAlign: "left" }}>Код</th>
                <th style={{ padding: 12, textAlign: "center" }}>Тип</th>
                <th style={{ padding: 12, textAlign: "center" }}>Важливе</th>
                <th style={{ padding: 12, textAlign: "center" }}>Показувати</th>
          </tr>
        </thead>
        <tbody>
              {standardFields.map((field) => (
                <tr key={field.ID || field.SqlName} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>
                    {field.DisplayName}
                    {field.IsRequired && <span style={{ color: "#dc3545", marginLeft: 4 }}>*</span>}
                  </td>
                  <td style={{ padding: 12, fontFamily: "monospace", fontSize: 13, color: "#666" }}>
                    {field.SqlName}
                  </td>
                  <td style={{ padding: 12, textAlign: "center" }}>
                    <span style={{
                      background: "#e3f2fd",
                      color: "#1976d2",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11
                    }}>
                      {field.FieldType === "string" ? "Текст" :
                        field.FieldType === "number" ? "Число" : "Інше"}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: "center" }}>
                    {field.IsRequired ? "⚠️" : "—"}
                  </td>
                  <td style={{ padding: 12, textAlign: "center" }}>
                    <span style={{ color: "#28a745", fontWeight: 600 }}>Завжди</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </div>

      {/* Додаткові поля */}
        <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: "#007bff", margin: 0, fontSize: 20 }}>
            ⚡ Додаткові поля <span style={{ fontSize: 14, color: "#666", fontWeight: 400 }}>(ваші)</span>
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: showAddForm ? "#6c757d" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            {showAddForm ? "❌ Скасувати" : "➕ Додати поле"}
          </button>
        </div>
        {/* Форма */}
        {showAddForm && (
          <div style={{
            background: "#fff3cd",
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
            border: "2px solid #ffeaa7"
          }}>
            <h4 style={{ margin: "0 0 20px 0", color: "#856404" }}>
              ✨ Нове поле
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Назва поля *
                </label>
                <input
                  type="text"
                  value={newField.DisplayName}
                  onChange={e => {
                    const displayName = e.target.value;
                    setNewField({
                      ...newField,
                      DisplayName: displayName,
                      SqlName: newField.SqlName || generateSqlName(displayName)
                    });
                  }}
                  placeholder="Країна походження"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 8,
                    border: "2px solid #ddd",
                    fontSize: 14
                  }}
                />
        </div>
        <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Тип
                </label>
                <select
                  value={newField.FieldType}
                  onChange={e => setNewField({ ...newField, FieldType: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 8,
                    border: "2px solid #ddd",
                    fontSize: 14
                  }}
                >
                  <option value="string">📝 Короткий текст</option>
                  <option value="text">📄 Довгий текст</option>
                  <option value="number">🔢 Число</option>
                  <option value="date">📅 Дата</option>
          </select>
        </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newField.IsRequired}
                  onChange={e => setNewField({ ...newField, IsRequired: e.target.checked })}
                />
                <span>⚠️ Обов'язкове для заповнення</span>
              </label>
            </div>
            <button
              onClick={handleAddField}
              style={{
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 16
              }}
            >
              ✨ Створити
            </button>
          </div>
        )}

        {/* Список */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>⏳ Завантаження...</div>
        ) : customFields.length > 0 ? (
          <div style={{
            background: "white",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8f9fa" }}>
                <tr>
                  <th style={{ padding: 12, textAlign: "left" }}>Назва</th>
                  <th style={{ padding: 12, textAlign: "center" }}>Тип</th>
                  <th style={{ padding: 12, textAlign: "center" }}>Важливе</th>
                  <th style={{ padding: 12, textAlign: "center" }}>Показувати</th>
                  <th style={{ padding: 12, textAlign: "center" }}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {customFields.map((field) => (
                  <tr key={field.ID} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: 12, fontWeight: 600 }}>
                      {field.DisplayName}
                      {field.IsRequired && <span style={{ color: "#dc3545", marginLeft: 4 }}>*</span>}
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      <span style={{
                        background: "#e3f2fd",
                        color: "#1976d2",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 11
                      }}>
                        {field.FieldType === "string" ? "📝" :
                          field.FieldType === "number" ? "🔢" :
                            field.FieldType === "date" ? "📅" : "📄"}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {field.IsRequired ? "⚠️" : "—"}
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      <button
                        onClick={() => toggleVisibility(field.ID, field)}
                        style={{
                          background: field.IsVisible ? "#28a745" : "#6c757d",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 12,
                          cursor: "pointer"
                        }}
                      >
                        {field.IsVisible ? "👁️ Так" : "🙈 Ні"}
                      </button>
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      <button
                        onClick={() => deleteField(field.ID)}
                        style={{
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 12,
                          cursor: "pointer"
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            background: "#f8f9fa",
            border: "2px dashed #dee2e6",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            color: "#6c757d"
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Поки що немає додаткових полів
            </div>
            <div style={{ fontSize: 14 }}>
              Натисніть "➕ Додати поле" щоб створити перше
            </div>
          </div>
        )}
        </div>

      {/* Пояснення */}
      <div style={{
        background: "#e7f3ff",
        borderRadius: 12,
        padding: 20,
        marginTop: 30,
        border: "1px solid #b6d7ff"
      }}>
        <h4 style={{ margin: "0 0 12px 0", color: "#0056b3" }}>
          💡 Як це працює:
        </h4>
        <div style={{ color: "#0056b3", fontSize: 14 }}>
          1. Додайте нове поле тут<br />
          2. Воно автоматично з'явиться при створенні товару<br />
          3. Всі дані збережуться в базі
        </div>
        </div>
    </div>
  );
}
