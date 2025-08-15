import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from '../api';

export default function ProductNameRulesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(null);

  const [allFields, setAllFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Завантажуємо шаблони карток
  useEffect(() => {
    api.getProductCardTemplates().then(data => {
      setTemplates(data);
      // Автовибір першого шаблону (або останнього з localStorage)
      const savedId = Number(localStorage.getItem('product_fullname_template_id'));
      if (data.length) {
        setTemplateId(savedId && data.some(t => t.ID === savedId) ? savedId : data[0].ID);
      }
    });
  }, []);

  // 2. Завантажуємо дані по вибраному шаблону
  useEffect(() => {
    if (templateId) {
      localStorage.setItem('product_fullname_template_id', templateId);
      loadAllData(templateId);
    }
  }, [templateId]);

  const loadAllData = async (tid) => {
    setLoading(true);
    try {
      const fieldsData = await api.getProductCardTemplateFields(tid);
      const rulesData = await api.getProductFullNameFields(tid);

      // Формуємо список вибраних полів
      const currentlySelected = (rulesData || [])
        .filter(rule => rule.IsIncluded)
        .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
        .map(rule => rule.SqlName);

      setAllFields(fieldsData);
      setSelectedFields(currentlySelected);
    } catch (error) {
      setAllFields([]);
      setSelectedFields([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Тогли поля для формування назви
  const handleFieldToggle = (sqlName) => {
    setSelectedFields(prev =>
      prev.includes(sqlName)
        ? prev.filter(f => f !== sqlName)
        : [...prev, sqlName]
    );
  };

  // --- Переміщення поля вгору/вниз
  const moveField = (index, direction) => {
    const newSelected = [...selectedFields];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < newSelected.length) {
      [newSelected[index], newSelected[newIndex]] = [newSelected[newIndex], newSelected[index]];
      setSelectedFields(newSelected);
    }
  };

  // --- Збереження
  const handleSave = async () => {
    setSaving(true);
    try {
      const rulesToSave = allFields.map(field => ({
        SqlName: field.SqlName,
        DisplayName: field.DisplayName,
        IsIncluded: selectedFields.includes(field.SqlName),
        DisplayOrder: selectedFields.includes(field.SqlName)
          ? selectedFields.indexOf(field.SqlName)
          : 999,
        FieldID: field.FieldID || null
      }));
      await api.saveProductFullNameFields(templateId, rulesToSave);
      alert("✅ Правила збережено!");
      loadAllData(templateId);
    } catch (error) {
      alert(`❌ Помилка збереження: ${error.message}`);
    } finally {
    setSaving(false);
    }
  };

  // --- Попередній перегляд
  const generatePreview = () => {
    if (!selectedFields.length) return "Оберіть поля для формування назви";
    return selectedFields
      .map(sqlName => {
        const field = allFields.find(f => f.SqlName === sqlName);
        return field ? field.DisplayName : sqlName;
      })
      .join(" / ");
  };

  // --- Оновлення повних імен для всіх товарів (по шаблону)
  const handleRefreshFullnames = async () => {
    setRefreshing(true);
    try {
      const result = await api.refreshProductFullNames(templateId);
      alert(result.message || 'Оновлено!');
    } catch (error) {
      alert('Помилка оновлення: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  // --- Вивід
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 40,
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, color: "#666" }}>Завантажуємо дані...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)', minHeight: '100vh', paddingTop: 32 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* --- Вибір шаблону --- */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 8, fontWeight: 600 }}>Шаблон картки:</label>
         <select
  value={templateId || ""}
  onChange={e => setTemplateId(Number(e.target.value))}
  style={{
    minWidth: 240,      // або більше, якщо треба ще ширше
    padding: '10px 14px',
    borderRadius: 8,
    border: '2px solid #6c757d',
    fontSize: 16,
    background: '#f8f9fa',
    fontWeight: 600,
    color: '#22105a',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    marginRight: 14,
  }}
>
  {templates.map(tpl =>
    <option value={tpl.ID} key={tpl.ID}>{tpl.Name || tpl.ID}</option>
  )}
</select>
        </div>

        {/* --- Шапка --- */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h1 style={{
              margin: 0,
              color: "#333",
              fontSize: 28,
              display: "flex",
              alignItems: "center",
              gap: 12
            }}>
              🏷️ Формування назви товару
            </h1>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 16 }}>
              Налаштуйте які поля входитимуть у повну назву товару та їх порядок для кожного шаблону
            </p>
          </div>

          <button
            onClick={() => navigate("/")}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 20px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14
            }}
          >
            🏠 Головне меню
          </button>
        </div>

        {/* --- Превью результату --- */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{
            margin: "0 0 16px 0",
            color: "#b85450",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 20
          }}>
            👁️ Попередній перегляд назви
          </h3>

          <div style={{
            background: "#f8f9fa",
            border: "2px solid #e9ecef",
            borderRadius: 12,
            padding: 20,
            fontSize: 18,
            fontWeight: 600,
            color: selectedFields.length > 0 ? "#333" : "#999",
            minHeight: 24,
            textAlign: "center"
          }}>
            {generatePreview()}
          </div>
        </div>

        {/* --- Доступні та обрані поля --- */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Доступні поля */}
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{
              margin: "0 0 20px 0",
              color: "#007bff",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18
            }}>
              📋 Доступні поля
            </h3>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {allFields.map(field => (
                <div
                  key={field.SqlName}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    border: "2px solid #e9ecef",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: selectedFields.includes(field.SqlName) ? "#e7f3ff" : "#f8f9fa",
                    borderColor: selectedFields.includes(field.SqlName) ? "#007bff" : "#e9ecef",
                    transition: "all 0.2s"
                  }}
                  onClick={() => handleFieldToggle(field.SqlName)}
                >
                  <div style={{ fontWeight: 600, color: "#333", marginBottom: 4 }}>
                    {selectedFields.includes(field.SqlName) ? "✅" : "⭕"} {field.DisplayName}
                    {field.IsRequired && <span style={{ color: "#dc3545", marginLeft: 4 }}>*</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>
                    {field.SqlName} • {field.IsStandard ? "Стандартне" : "Додаткове"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Обрані поля з порядком */}
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{
              margin: "0 0 20px 0",
              color: "#28a745",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18
            }}>
              🎯 Обрані поля ({selectedFields.length})
            </h3>
            {selectedFields.length === 0 ? (
              <div style={{
                textAlign: "center",
                color: "#999",
                padding: 40,
                border: "2px dashed #dee2e6",
                borderRadius: 8
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                <div>Оберіть поля зліва</div>
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {selectedFields.map((sqlName, index) => {
                  const field = allFields.find(f => f.SqlName === sqlName);
                  if (!field) return null;
                  return (
                    <div
                      key={sqlName}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        border: "2px solid #28a745",
                        borderRadius: 8,
                        background: "#f8fff8",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "#333", marginBottom: 4 }}>
                          {index + 1}. {field.DisplayName}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>
                          {field.SqlName}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => moveField(index, -1)}
                          disabled={index === 0}
                          style={{
                            background: index === 0 ? "#e9ecef" : "#007bff",
                            color: index === 0 ? "#6c757d" : "white",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                            cursor: index === 0 ? "not-allowed" : "pointer",
                            fontSize: 12
                          }}
                        >
                          ⬆️
                        </button>
                        <button
                          onClick={() => moveField(index, 1)}
                          disabled={index === selectedFields.length - 1}
                          style={{
                            background: index === selectedFields.length - 1 ? "#e9ecef" : "#007bff",
                            color: index === selectedFields.length - 1 ? "#6c757d" : "white",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                            cursor: index === selectedFields.length - 1 ? "not-allowed" : "pointer",
                            fontSize: 12
                          }}
                        >
                          ⬇️
                        </button>
                        <button
                          onClick={() => handleFieldToggle(sqlName)}
                          style={{
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: 12
                          }}
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* --- Кнопки збереження --- */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          marginTop: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          display: "flex",
          justifyContent: "center",
          gap: 16
        }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 16
            }}
          >
            ❌ Скасувати
          </button>
      <button
        onClick={handleSave}
            disabled={saving || selectedFields.length === 0}
            style={{
              background: saving || selectedFields.length === 0 ? "#e9ecef" : "#28a745",
              color: saving || selectedFields.length === 0 ? "#6c757d" : "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontWeight: 600,
              cursor: saving || selectedFields.length === 0 ? "not-allowed" : "pointer",
              fontSize: 16
            }}
          >
            {saving ? "💾 Збереження..." : "💾 Зберегти налаштування"}
          </button>
        </div>

        {/* --- Підказка --- */}
        <div style={{
          background: "rgba(255,255,255,0.9)",
          borderRadius: 16,
          padding: 20,
          marginTop: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
        }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#0056b3", fontSize: 16 }}>
            💡 Як це працює:
          </h4>
          <div style={{ color: "#0056b3", fontSize: 14, lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>1.</strong> Обирай шаблон картки згори, тоді формуй правила.
            </p>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>2.</strong> Клікай на поля зліва — додаватимуться справа!
            </p>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>3.</strong> Змінюй порядок — стрілочки тобі на допомогу.
            </p>
            <p style={{ margin: 0 }}>
              <strong>4.</strong> Не забудь зберегти та оновити повні імена для всіх товарів!
            </p>
          </div>
        </div>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            onClick={handleRefreshFullnames}
            disabled={refreshing}
            style={{
              background: refreshing ? "#6c757d" : "#00b894",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "14px 28px",
              fontWeight: 700,
              fontSize: 16,
              cursor: refreshing ? "not-allowed" : "pointer",
              boxShadow: "0 4px 15px rgba(0, 184, 148, 0.4)",
              marginTop: 12
            }}
          >
            {refreshing ? "Оновлення..." : "🔄 Оновити повну назву у всіх товарах"}
      </button>
        </div>
      </div>
    </div>
  );
}
