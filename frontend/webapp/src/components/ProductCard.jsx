import React, { useState, useEffect } from "react";

export default function ProductCard({ 
  templateId = 1, 
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

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('💾 Зберігаємо товар:', fields);
      const url = isEditMode ? `http://localhost:8000/api/products/${productId}` : 'http://localhost:8000/api/products';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Якщо це новий товар і є тимчасове фото, перезавантажуємо його з правильною назвою
        if (!isEditMode && result.id && fields.Photo && photoPreview) {
          console.log('🔄 Перезавантажуємо фото для нового товару ID:', result.id);
          
          try {
            // Завантажуємо тимчасове фото
            const tempPhotoResponse = await fetch(photoPreview);
            const tempPhotoBlob = await tempPhotoResponse.blob();
            
            // Створюємо File об'єкт
            const tempPhotoFile = new File([tempPhotoBlob], 'photo.jpg', { type: 'image/jpeg' });
            
            // Завантажуємо фото з правильною назвою
            const formData = new FormData();
            formData.append('file', tempPhotoFile);
            
            const photoUploadResponse = await fetch(`http://localhost:8000/api/products/${result.id}/upload-photo`, {
              method: 'POST',
              body: formData
            });
            
            if (photoUploadResponse.ok) {
              const photoResult = await photoUploadResponse.json();
              console.log('✅ Фото перезавантажено з правильною назвою:', photoResult.filename);
              
              // Оновлюємо URL фото
              const newPhotoUrl = `http://localhost:8000/api/photo/${photoResult.filename}`;
              setPhotoPreview(newPhotoUrl);
            }
          } catch (photoError) {
            console.error('⚠️ Помилка перезавантаження фото:', photoError);
            // Не блокуємо збереження товару через помилку фото
          }
        }
        
        onSave(result);
        alert(isEditMode ? '✅ Товар оновлено!' : '✅ Товар створено!');
      } else {
        const errorText = await response.text();
        console.error('❌ Помилка сервера:', errorText);
        alert('❌ Помилка збереження');
      }
    } catch (error) {
      console.error('❌ Помилка:', error);
      alert('❌ Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    const { SqlName, DisplayName, FieldType, IsRequired } = field;
    
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
      console.log('🏭 Рендеримо поле виробника:', SqlName, field);
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
            <option value="">Оберіть виробника</option>
            {manufacturers.map(man => (
              <option key={man.ID} value={man.ID}>{man.ManufacturerName}</option>
            ))}
          </select>
          {manufacturers.length === 0 && (
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Немає виробників. Додайте їх у розділі "Виробники"
            </div>
          )}
        </div>
      );
    }
    
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
        {FieldType === "textarea" ? (
          <textarea
            value={fields[SqlName] || ""}
            onChange={e => handleChange(SqlName, e.target.value)}
            placeholder={`Введіть ${DisplayName.toLowerCase()}`}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              minHeight: 80,
              resize: "vertical",
              boxSizing: "border-box"
            }}
          />
        ) : FieldType === "number" ? (
          <input
            type="number"
            value={fields[SqlName] || ""}
            onChange={e => handleChange(SqlName, e.target.value)}
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
        ) : (
          <input
            type="text"
            value={fields[SqlName] || ""}
            onChange={e => handleChange(SqlName, e.target.value)}
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
        )}
      </div>
    );
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
      maxWidth: 800,
      margin: "20px auto",
      background: "white",
      borderRadius: 16,
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      overflow: "hidden"
    }}>
      {/* Заголовок */}
      <div style={{
        background: "#f8f9fa",
        padding: "20px 24px",
        borderBottom: "1px solid #e9ecef"
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 600,
          color: "#333"
        }}>
          Деталі товару
        </h2>
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
              
              {photoPreview ? (
                <div style={{ position: "relative" }}>
                  <img 
                    src={photoPreview} 
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