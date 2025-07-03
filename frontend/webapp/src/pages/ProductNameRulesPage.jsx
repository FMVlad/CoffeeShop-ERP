import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from '../api';

export default function ProductNameRulesPage() {
  const navigate = useNavigate();
  const [allFields, setAllFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Завантажуємо всі поля з шаблону (templateId=3, щоб включити "Розмір")
      const fieldsResponse = await fetch("http://localhost:8000/api/product-card-template-fields?template_id=3");
      const fieldsData = await fieldsResponse.json();
      
      // Завантажуємо поточні правила формування назви
      try {
        const rulesResponse = await fetch("http://localhost:8000/api/product-full-name-fields");
        const rulesData = await rulesResponse.json();
        
        // Створюємо список вибраних полів з порядком
        const currentlySelected = rulesData
          .filter(rule => rule.IsEnabled)
          .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
          .map(rule => rule.SqlName);
        
        setSelectedFields(currentlySelected);
      } catch (error) {
        // Якщо API не працює, починаємо з порожнього списку
        setSelectedFields([]);
      }
      
      setAllFields(fieldsData);
      setLoading(false);
    } catch (error) {
      console.error("Помилка завантаження:", error);
      setLoading(false);
    }
  };

  const handleFieldToggle = (sqlName) => {
    if (selectedFields.includes(sqlName)) {
      setSelectedFields(prev => prev.filter(f => f !== sqlName));
    } else {
      setSelectedFields(prev => [...prev, sqlName]);
    }
  };

  const moveField = (index, direction) => {
    const newSelected = [...selectedFields];
    const newIndex = index + direction;
    
    if (newIndex >= 0 && newIndex < newSelected.length) {
      [newSelected[index], newSelected[newIndex]] = [newSelected[newIndex], newSelected[index]];
      setSelectedFields(newSelected);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Створюємо правила для збереження
      const rulesToSave = allFields.map((field) => ({
        SqlName: field.SqlName,
        IsEnabled: selectedFields.includes(field.SqlName),
        DisplayOrder: selectedFields.indexOf(field.SqlName) !== -1 ? selectedFields.indexOf(field.SqlName) : 999
      }));

      console.log("📤 Відправляємо правила:", rulesToSave);
      console.log("🎯 Обрані поля:", selectedFields);

      const response = await fetch("http://localhost:8000/api/product-full-name-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rulesToSave)
      });

      console.log("📡 Відповідь сервера:", response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Результат:", result);
        alert("✅ Правила збережено!");
        loadAllData();
      } else {
        const errorText = await response.text();
        console.error("❌ Помилка сервера:", errorText);
        alert(`❌ Помилка збереження: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Помилка збереження:", error);
      alert(`❌ Помилка збереження: ${error.message}`);
    } finally {
    setSaving(false);
    }
  };

  const generatePreview = () => {
    if (selectedFields.length === 0) return "Оберіть поля для формування назви";
    
    return selectedFields
      .map(sqlName => {
        const field = allFields.find(f => f.SqlName === sqlName);
        return field ? field.DisplayName : sqlName;
      })
      .join(" / ");
  };

  const handleRefreshFullnames = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('http://localhost:8000/api/products/refresh-fullnames', { method: 'POST' });
      const result = await response.json();
      alert(result.message || 'Оновлено!');
    } catch (error) {
      alert('Помилка оновлення: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };

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
    <div style={{background:'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',minHeight:'100vh',paddingTop:32}}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Шапка */}
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
              Налаштуйте які поля входитимуть у повну назву товару та їх порядок
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

        {/* Превью результату */}
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

        {/* Кнопки збереження */}
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

        {/* Підказка */}
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
              <strong>1.</strong> Клікайте на поля зліва щоб додати їх до формування назви
            </p>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>2.</strong> Змінюйте порядок стрілочками ⬆️⬇️ справа
            </p>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>3.</strong> Результат відображається у "Попередньому перегляді"
            </p>
            <p style={{ margin: 0 }}>
              <strong>4.</strong> Натисніть "Зберегти" щоб застосувати зміни
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