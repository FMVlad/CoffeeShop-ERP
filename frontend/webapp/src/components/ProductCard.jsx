import React, { useState, useEffect } from "react";
import { api } from '../api';

export default function ProductCard({ 
  templateId = 3, 
  productId = null,
  onSave = () => {},
  onCancel = () => {}
}) {
  const [fields, setFields] = useState({});
  const [templateFields, setTemplateFields] = useState([]);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [attributeValues, setAttributeValues] = useState([]);
  const [fullName, setFullName] = useState("");

  const isEditMode = productId !== null;

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Завантажуємо дані...');
        const [templateData, categoriesData, manufacturersData] = await Promise.all([
          fetch(`http://localhost:8000/api/product-card-template-fields?template_id=${templateId}`).then(r => r.json()),
          fetch('http://localhost:8000/api/categories').then(r => r.json()),
          fetch('http://localhost:8000/api/manufacturers').then(r => r.json())
        ]);

        console.log('📋 Поля шаблону:', templateData);
        console.log('🏷️ Категорії:', categoriesData);
        console.log('🏭 Виробники:', manufacturersData);

        setTemplateFields(templateData);
        setCategories(categoriesData);
        setManufacturers(manufacturersData);

        const initialFields = {};
        templateData.forEach(field => {
          initialFields[field.SqlName] = "";
        });

        if (isEditMode) {
          const productResponse = await fetch(`http://localhost:8000/api/products/${productId}`);
          const productData = await productResponse.json();
          console.log('📦 Дані товару:', productData);
          
          Object.keys(productData).forEach(key => {
            if (initialFields.hasOwnProperty(key)) {
              initialFields[key] = productData[key] || "";
            }
          });

          if (productData.Photo) {
            setPhotoPreview(`http://localhost:8000/api/photo/${productData.Photo}`);
          }

          // Підвантажуємо додаткові параметри
          const attrs = await api.getProductAttributes(productId);
          setAttributeValues(attrs);
        }

        setFields(initialFields);
        setLoading(false);
      } catch (error) {
        console.error("❌ Помилка завантаження даних:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [templateId, productId, isEditMode]);

  useEffect(() => {
    if (productId) {
      fetch(`http://localhost:8000/api/products/${productId}/fullname`)
        .then(r => r.json())
        .then(data => setFullName(data.FullName || ""));
    } else {
      setFullName("");
    }
  }, [productId]);

  const handleChange = (sqlName, value) => {
    setFields(prev => ({ ...prev, [sqlName]: value }));
  };

  const handlePhotoUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('📸 Будь ласка, виберіть файл зображення');
      return;
    }

    if (isEditMode && productId) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        console.log('🔄 Завантажуємо фото для товару ID:', productId);
        const response = await fetch(`http://localhost:8000/api/products/${productId}/upload-photo`, {
          method: 'POST',
          body: formData
        });
        
        console.log('📡 Відповідь сервера:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Результат:', result);
          
          const photoUrl = `http://localhost:8000/api/photo/${result.filename}`;
          console.log('🖼️ URL фото:', photoUrl);
          setPhotoPreview(photoUrl);
          handleChange('Photo', result.filename);
          alert('✅ Фото та прев\'ю збережено!');
        } else {
          const errorText = await response.text();
          console.error('❌ Помилка сервера:', errorText);
          alert('❌ Помилка завантаження фото');
        }
      } catch (error) {
        console.error('❌ Помилка:', error);
        alert('❌ Помилка завантаження фото');
      }
    } else {
      const formData = new FormData();
      formData.append('file', file);

      try {
        console.log('🔄 Завантажуємо фото (тимчасово)...');
        const response = await fetch('http://localhost:8000/api/upload-image', {
          method: 'POST',
          body: formData
        });
        
        console.log('📡 Відповідь сервера:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Результат:', result);
          const photoUrl = `http://localhost:8000/uploads/${result.filename}`;
          console.log('🖼️ URL фото:', photoUrl);
          setPhotoPreview(photoUrl);
          handleChange('Photo', result.filename);
          alert('✅ Фото завантажено тимчасово!');
        } else {
          const errorText = await response.text();
          console.error('❌ Помилка сервера:', errorText);
          alert('❌ Помилка завантаження фото');
        }
      } catch (error) {
        console.error('❌ Помилка:', error);
        alert('❌ Помилка завантаження фото');
      }
    }
  };

  const handleAttributeChange = (fieldId, value) => {
    setAttributeValues(prev => {
      const idx = prev.findIndex(a => a.FieldID === fieldId);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], Value: value };
        return updated;
      } else {
        return [...prev, { FieldID: fieldId, Value: value }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Визначаємо стандартні поля (які є у templateFields з IsStandard)
      const standardFieldNames = templateFields.filter(f => f.IsStandard).map(f => f.SqlName);
      const standardData = {};
      Object.keys(fields).forEach(key => {
        if (standardFieldNames.includes(key)) {
          standardData[key] = fields[key];
        }
      });
      // Додаткові поля — тільки ті, що у attributeValues
      const additionalData = attributeValues.map(attr => ({
        FieldID: attr.FieldID,
        Value: attr.Value
      }));

      if (isEditMode) {
        // Оновлення стандартних полів
        const response = await fetch(`http://localhost:8000/api/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(standardData)
        });
        if (response.ok) {
          const result = await response.json();
          // Оновлення додаткових полів
          if (additionalData.length > 0) {
            await api.saveProductAttributes(productId, additionalData);
          }
          onSave(result);
          alert('✅ Товар оновлено!');
        } else {
          const errorText = await response.text();
          console.error('❌ Помилка сервера:', errorText);
          alert('❌ Помилка збереження');
        }
      } else {
        // Створення нового товару
        const response = await fetch('http://localhost:8000/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(standardData)
        });
        if (response.ok) {
          const result = await response.json();
          // Додаткові поля
          if (additionalData.length > 0) {
            await api.saveProductAttributes(result.id, additionalData);
          }
          onSave(result);
          alert('✅ Товар створено!');
        } else {
          const errorText = await response.text();
          console.error('❌ Помилка сервера:', errorText);
          alert('❌ Помилка збереження');
        }
      }
    } catch (error) {
      console.error('❌ Помилка:', error);
      alert('❌ Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    const { SqlName, DisplayName, FieldType, IsRequired, ID: FieldID } = field;
    
    if (SqlName === "CategoryID") {
      return (
        <div key={SqlName} style={{ marginBottom: 16 }}>
          <label style={{ 
            fontWeight: 600, 
            display: "block", 
            marginBottom: 8, 
            fontSize: 14,
            color: "#333"
          }}>
            {DisplayName} {IsRequired && <span style={{ color: "#e74c3c" }}>*</span>}
          </label>
          <select
            value={fields[SqlName] || ""}
            onChange={e => handleChange(SqlName, e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              background: "white",
              boxSizing: "border-box"
            }}
          >
            <option value="">Оберіть категорію</option>
            {categories.map(cat => (
              <option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
            ))}
          </select>
        </div>
      );
    }

    if (SqlName === "ManufacturerID" || SqlName === "Manufacturer" || SqlName.toLowerCase().includes("manufacturer") || SqlName.toLowerCase().includes("виробник")) {
      const manufacturer = manufacturers.find(man => man.ID === Number(fields[SqlName]));
      const displayValue = manufacturer
        ? `${manufacturer.ManufacturerName}${manufacturer.Country ? " (" + manufacturer.Country + ")" : ""}`
        : "";

      return (
        <div key={SqlName} style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 8, fontSize: 14, color: "#333" }}>
            {DisplayName} {IsRequired && <span style={{ color: "#e74c3c" }}>*</span>}
          </label>
          <select
            value={fields[SqlName] || ""}
            onChange={e => handleChange(SqlName, e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              background: "white",
              boxSizing: "border-box"
            }}
          >
            <option value="">Оберіть виробника</option>
            {manufacturers.map(man => (
              <option key={man.ID} value={man.ID}>
                {man.ManufacturerName}{man.Country ? " (" + man.Country + ")" : ""}
              </option>
            ))}
          </select>
          {manufacturer && (
            <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
              {displayValue}
            </div>
          )}
        </div>
      );
    }
    
    // Для додаткових полів беремо значення з attributeValues
    const attrValue = attributeValues.find(a => a.FieldID === FieldID)?.Value || fields[SqlName] || "";
    return (
      <div key={SqlName} style={{ marginBottom: 16 }}>
        <label style={{ 
          fontWeight: 600, 
          display: "block", 
          marginBottom: 8, 
          fontSize: 14,
          color: "#333"
        }}>
          {DisplayName} {IsRequired && <span style={{ color: "#e74c3c" }}>*</span>}
        </label>
        <input
          type={FieldType === "number" ? "number" : "text"}
          value={attrValue}
          onChange={e => handleAttributeChange(FieldID, e.target.value)}
          placeholder={`Введіть ${DisplayName.toLowerCase()}`}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 14,
            boxSizing: "border-box"
          }}
        />
      </div>
    );
  };

  // Визначаємо, яке фото показувати: прев'ю чи повне
  const getPhotoUrl = () => {
    if (photoPreview && isEditMode && fields.Photo) {
      // Після збереження показуємо прев'ю
      return `http://localhost:8000/api/preview/${fields.Photo}`;
    }
    return photoPreview;
  };

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "400px",
        fontSize: 18,
        color: "#666"
      }}>
        Завантаження...
      </div>
    );
  }

  const standardFields = templateFields.filter(f => f.IsStandard && f.IsVisible && f.SqlName !== "Photo");
  const additionalFields = templateFields.filter(f => !f.IsStandard && f.IsVisible);

  return (
    <div style={{
      maxWidth: 900,
      margin: "40px auto",
      background: "#fff",
      borderRadius: 20,
      boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
      overflow: "hidden",
      padding: 0
    }}>
      {/* Заголовок */}
      <div style={{ background: "#f7ede2", color: "#6d4c2b", padding: "28px 40px", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>🛒 Деталі товару</h1>
        {fullName && (
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: "#c4282d", textShadow: "0 1px 2px #fff8" }}>
            {fullName}
          </div>
        )}
      </div>

      {/* Вкладки */}
      <div style={{
        display: "flex",
        background: "#f8f9fa",
        borderBottom: "1px solid #e9ecef"
      }}>
        <button
          onClick={() => setActiveTab("details")}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "none",
            background: activeTab === "details" ? "white" : "transparent",
            borderBottom: activeTab === "details" ? "2px solid #007bff" : "2px solid transparent",
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === "details" ? "#007bff" : "#666",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Основні дані
        </button>
        <button
          onClick={() => setActiveTab("attributes")}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "none",
            background: activeTab === "attributes" ? "white" : "transparent",
            borderBottom: activeTab === "attributes" ? "2px solid #007bff" : "2px solid transparent",
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === "attributes" ? "#007bff" : "#666",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Додаткові поля
        </button>
        <button
          onClick={() => setActiveTab("pricing")}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "none",
            background: activeTab === "pricing" ? "white" : "transparent",
            borderBottom: activeTab === "pricing" ? "2px solid #007bff" : "2px solid transparent",
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === "pricing" ? "#007bff" : "#666",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Ціни
        </button>
      </div>

      {/* Контент */}
      <div style={{ padding: "24px" }}>
        {activeTab === "details" && (
          <div style={{ display: "flex", gap: 24 }}>
            {/* Фото зліва */}
            <div style={{ flex: "0 0 200px" }}>
              <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>
                Фото
              </div>
              
              {getPhotoUrl() ? (
                <div style={{ position: "relative" }}>
                  <img 
                    src={getPhotoUrl()} 
                    alt="Товар"
                    style={{ 
                      width: 200, 
                      height: 200, 
                      objectFit: "cover", 
                      borderRadius: 12,
                      border: "1px solid #ddd"
                    }}
                    onError={(e) => {
                      console.error('❌ Помилка завантаження фото:', e.target.src);
                      setPhotoPreview(null);
                      handleChange('Photo', '');
                    }}
                  />
                  <button
                    onClick={() => {
                      setPhotoPreview(null);
                      handleChange('Photo', '');
                    }}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(0,0,0,0.7)",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div 
                  style={{
                    width: 200,
                    height: 200,
                    border: "2px dashed #ddd",
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    background: "#f8f9fa"
                  }}
                  onClick={() => document.getElementById('photo-input').click()}
                >
                  <div style={{ fontSize: 48, marginBottom: 8, color: "#ccc" }}>📷</div>
                  <div style={{ fontSize: 12, color: "#666", textAlign: "center" }}>
                    Клікніть для завантаження<br/>фото товару
                  </div>
                  <input
                    id="photo-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files[0] && handlePhotoUpload(e.target.files[0])}
                  />
                </div>
              )}
            </div>

            {/* Поля справа */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {standardFields.map(renderField)}
              </div>
            </div>
          </div>
        )}

        {activeTab === "attributes" && (
          <div>
            {additionalFields.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {additionalFields.map(renderField)}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#999", padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
                <div>Додаткові поля не налаштовані</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Додайте поля через "Налаштування → Поля шаблонів"
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "pricing" && (
          <div style={{ textAlign: "center", color: "#999", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
            <div>Налаштування цін</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Буде додано у наступних версіях
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div style={{ 
          display: "flex", 
          gap: 12, 
          marginTop: 32, 
          justifyContent: "flex-end" 
        }}>
          <button 
            onClick={onCancel}
            disabled={saving}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1
            }}
          >
            Скасувати
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#6c757d" : "#c4282d",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer"
            }}
          >
            {saving ? "Збереження..." : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  );
} 