import React, { useState, useEffect } from "react";
import { api } from '../api';

// --- Ієрархія для селектора категорій ---
function buildCategoryTree(categories, parentId = null) {
  return categories
    .filter(cat => String(cat.ParentID) === String(parentId))
    .map(cat => ({
      ...cat,
      children: buildCategoryTree(categories, cat.ID),
    }));
}
function renderCategoryOptions(tree, level = 0) {
  return tree.flatMap(cat => [
    <option key={cat.ID} value={cat.ID}>
      {Array(level).fill(' ').join('')}
      {level > 0 ? '▶ ' : ''}{cat.CategoryName}
    </option>,
    ...renderCategoryOptions(cat.children, level + 1)
  ]);
}

export default function ProductCard({
  templateId = null,
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
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId);

  const isEditMode = productId !== null;

  // --- Завантаження категорій та виробників ---
  useEffect(() => {
    const fetchInitial = async () => {
      const cats = await api.getCategories();
      setCategories(cats || []);
      const mans = await (api.getManufacturers ? api.getManufacturers() : Promise.resolve([]));
      setManufacturers(mans || []);
    };
    fetchInitial();
  }, []);

  // --- Завантаження продукту та шаблону ---
  useEffect(() => {
    const loadProductAndTemplate = async () => {
      setLoading(true);
      let initialFields = {};
      let templateIdToUse = templateId;

      if (isEditMode) {
        const products = await api.getProducts();
        const product = products.find(p => p.ID === productId);
        if (product) {
          const category = await api.getCategories().then(cats => cats.find(c => c.ID === product.CategoryID));
          templateIdToUse = (category && category.ProductCardTemplateID) || templateId || 3;
          setSelectedTemplateId(templateIdToUse);

          const tFields = await api.getProductCardTemplateFields(templateIdToUse);
          setTemplateFields(tFields);

          tFields.forEach(field => {
            initialFields[field.SqlName] = product?.[field.SqlName] ?? "";
          });
          setFields(initialFields);

          // Фото
          if (product?.Photo) {
            setPhotoPreview(`http://localhost:8000/api/preview/${product.Photo}`);
          }

          // Додаткові атрибути
          const attrs = await api.getProductAttributes(productId);
          setAttributeValues(attrs);

          // Повна назва (від беку)
          setFullName(product.FullName || "");
        }
      } else {
        const cats = await api.getCategories();
        setCategories(cats || []);
        let selectedCat = cats && cats.length > 0 ? cats[0] : null;
        if (selectedCat && selectedCat.ProductCardTemplateID) {
          templateIdToUse = selectedCat.ProductCardTemplateID;
        } else {
          templateIdToUse = templateId || 3;
        }
        setSelectedTemplateId(templateIdToUse);

        const tFields = await api.getProductCardTemplateFields(templateIdToUse);
        setTemplateFields(tFields);

        tFields.forEach(field => {
          if (field.SqlName === "Barcode") {
            const prefill = sessionStorage.getItem('productcard_prefill_barcode');
            if (prefill) initialFields[field.SqlName] = prefill;
            else initialFields[field.SqlName] = "";
          } else {
            initialFields[field.SqlName] = "";
          }
        });
        setFields(initialFields);
        setAttributeValues([]);
        setFullName("");
      }
      setLoading(false);
    };
    loadProductAndTemplate();
    // eslint-disable-next-line
  }, [productId]);

  // --- Preview FullName при зміні полів (динамічно через бекенд) ---
  useEffect(() => {
    if (!templateFields.length) return;
    let timeout = setTimeout(async () => {
      const currentCategory = fields.CategoryID || (categories[0]?.ID || null);
      if (!currentCategory) return;

      let ruleObj = null;
      try {
        const rules = await api.getProductNameRules();
        ruleObj = rules.find(r => String(r.CategoryID) === String(currentCategory));
      } catch {}
      if (!ruleObj || !ruleObj.Rule) {
        setFullName(""); // Немає rule — нічого не відображати
        return;
      }

      const values = {};
      templateFields.forEach(f => {
        if (f.IsStandard) values[f.SqlName] = fields[f.SqlName] ?? "";
      });
      attributeValues.forEach(a => {
        const fieldMeta = templateFields.find(f => f.ID === a.FieldID);
        if (fieldMeta) values[fieldMeta.SqlName] = a.Value;
      });

      try {
        const resp = await api.generateProductFullName({
          rule: ruleObj.Rule,
          values
        });
        setFullName(resp.full_name || "");
      } catch {
        setFullName("");
      }
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line
  }, [fields, attributeValues, templateFields]);

  // --- Категорія змінює шаблон і поля, але НЕ витирає значення якщо є ---
  const handleCategoryChange = async (categoryId) => {
    handleChange("CategoryID", categoryId);
    const selectedCat = categories.find(c => String(c.ID) === String(categoryId));
    const templateIdToUse = selectedCat?.ProductCardTemplateID || 3;
    setSelectedTemplateId(templateIdToUse);

    const tFields = await api.getProductCardTemplateFields(templateIdToUse);
    setTemplateFields(tFields);

    // Основні (стандартні) поля
    setFields(prevFields => {
      const newFields = {};
      tFields.forEach(f => {
        if (f.SqlName === "CategoryID") newFields[f.SqlName] = categoryId;
        else newFields[f.SqlName] = prevFields[f.SqlName] ?? "";
      });
      return newFields;
    });

    // Додаткові поля (атрибути)
    setAttributeValues(prevAttrs => {
      const allowedFieldIDs = tFields.filter(f => !f.IsStandard).map(f => f.ID);
      return prevAttrs.filter(a => allowedFieldIDs.includes(a.FieldID));
    });
  };

  // --- Для стандартних полів (Products) ---
  const handleChange = (sqlName, value) => {
    setFields(prev => ({
      ...prev,
      [sqlName]: value
    }));
  };

  // --- Для додаткових атрибутів (ProductAttributes) ---
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

  const handlePhotoUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('📸 Будь ласка, виберіть файл зображення');
      return;
    }
    if (isEditMode && productId) {
      try {
        const result = await api.uploadProductPhoto(productId, file);
        setPhotoPreview(`http://localhost:8000/api/preview/${result.filename}`);
        handleChange('Photo', result.filename);
        alert('✅ Фото та прев\'ю збережено!');
      } catch (error) {
        alert('❌ Помилка завантаження фото');
      }
    }
  };

  // --- Збереження ---
  const handleSave = async () => {
    setSaving(true);
    try {
      const standardFields = templateFields.filter(f => f.IsStandard);
      const standardData = {};
      standardFields.forEach(f => {
        let value = fields[f.SqlName];
        if (f.SqlName === "ManufacturerID") value = value ? Number(value) : null;
        if (f.SqlName === "CategoryID") value = value ? Number(value) : null;
        standardData[f.SqlName] = value;
      });

      const additionalData = attributeValues.map(attr => ({
        FieldID: attr.FieldID,
        Value: attr.Value
      }));

      let response;
      if (isEditMode) {
        response = await api.updateProduct(productId, standardData);
        if (additionalData.length > 0) {
          await api.saveProductAttributes(productId, additionalData);
        }
        onSave(response);
        alert('✅ Товар оновлено!');
      } else {
        response = await api.addProduct(standardData);
        if (additionalData.length > 0) {
          await api.saveProductAttributes(response.id, additionalData);
        }
        onSave(response);
        alert('✅ Товар створено!');
      }
    } catch (error) {
      alert('❌ Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  // Кнопка: Зберегти й додати в накладну
  const handleSaveAndAddToArrival = async () => {
    await handleSave();
    try {
      // Після створення в onSave міг прийти response з id — заберемо останній продукт через пошук по штрихкоду
      const bc = fields.Barcode || sessionStorage.getItem('productcard_prefill_barcode') || "";
      if (bc) {
        const p = await api.getProductByBarcode(bc);
        if (p && p.ID) {
          const selected = [{ ID: p.ID, FullName: p.FullName || p.Name || "", Quantity: 1 }];
          sessionStorage.setItem('arrival_selected_products', JSON.stringify(selected));
        }
      }
    } catch {}
    // Повертаємось назад
    window.history.back();
  };

  // --- Рендер полів ---
  const renderField = (field) => {
    const { SqlName, DisplayName, FieldType, IsRequired, ID: FieldID, IsStandard } = field;

    if (SqlName === "CategoryID") {
      // --- Ієрархічний селектор категорій ---
      const tree = buildCategoryTree(categories);

      return (
        <div key={SqlName} style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 8, fontSize: 14, color: "#333" }}>
            {DisplayName} {IsRequired && <span style={{ color: "#e74c3c" }}>*</span>}
          </label>
          <select
            value={fields[SqlName] || ""}
            onChange={e => handleCategoryChange(e.target.value)}
            style={{
              width: "100%", padding: "12px", borderRadius: 8,
              border: "1px solid #ddd", fontSize: 14, background: "white", boxSizing: "border-box"
            }}
          >
            <option value="">Оберіть категорію</option>
            {renderCategoryOptions(tree)}
          </select>
        </div>
      );
    }

    if (
      SqlName === "ManufacturerID" ||
      SqlName === "Manufacturer" ||
      SqlName.toLowerCase().includes("manufacturer") ||
      SqlName.toLowerCase().includes("виробник")
    ) {
      return (
        <div key={SqlName} style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 8, fontSize: 14, color: "#333" }}>
            {DisplayName} {IsRequired && <span style={{ color: "#e74c3c" }}>*</span>}
          </label>
          <select
            value={fields[SqlName] || ""}
            onChange={e => handleChange(SqlName, e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, background: "white", boxSizing: "border-box" }}
          >
            <option value="">Оберіть виробника</option>
            {manufacturers.map(man => (
              <option key={man.ID} value={man.ID}>
                {man.ManufacturerName}{man.Country ? " (" + man.Country + ")" : ""}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (IsStandard) {
      return (
        <div key={SqlName} style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 8, fontSize: 14, color: "#333" }}>
            {DisplayName} {IsRequired && <span style={{ color: "#e74c3c" }}>*</span>}
          </label>
          <input
            type={FieldType === "number" ? "number" : "text"}
            value={fields[SqlName] ?? ""}
            onChange={e => handleChange(SqlName, e.target.value)}
            placeholder={`Введіть ${DisplayName.toLowerCase()}`}
            style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
      );
    }

    const attrValue = attributeValues.find(a => a.FieldID === FieldID)?.Value ?? "";
    return (
      <div key={SqlName} style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600, display: "block", marginBottom: 8, fontSize: 14, color: "#333" }}>
          {DisplayName} {IsRequired && <span style={{ color: "#e74c3c" }}>*</span>}
        </label>
        <input
          type={FieldType === "number" ? "number" : "text"}
          value={attrValue}
          onChange={e => handleAttributeChange(FieldID, e.target.value)}
          placeholder={`Введіть ${DisplayName.toLowerCase()}`}
          style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
        />
      </div>
    );
  };

  const getPhotoUrl = () => {
    if (photoPreview && isEditMode && fields.Photo) {
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

  const standardFieldsArr = templateFields.filter(f => f.IsStandard && f.IsVisible && f.SqlName !== "Photo");
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
      <div style={{ background: "#f7ede2", color: "#6d4c2b", padding: "28px 40px", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>🛒 Деталі товару</h1>
        {fullName && (
          <div style={{
            marginTop: 12, fontSize: 20, fontWeight: 700,
            color: "#c4282d", textShadow: "0 1px 2px #fff8"
          }}>
            {fullName}
          </div>
        )}
      </div>

      <div style={{
        display: "flex",
        background: "#f8f9fa",
        borderBottom: "1px solid #e9ecef"
      }}>
        <button
          onClick={() => setActiveTab("details")}
          style={{
            flex: 1, padding: "12px 16px", border: "none",
            background: activeTab === "details" ? "white" : "transparent",
            borderBottom: activeTab === "details" ? "2px solid #007bff" : "2px solid transparent",
            fontSize: 14, fontWeight: 600, color: activeTab === "details" ? "#007bff" : "#666",
            cursor: "pointer", transition: "all 0.2s"
          }}
        >Основні дані</button>
        <button
          onClick={() => setActiveTab("attributes")}
          style={{
            flex: 1, padding: "12px 16px", border: "none",
            background: activeTab === "attributes" ? "white" : "transparent",
            borderBottom: activeTab === "attributes" ? "2px solid #007bff" : "2px solid transparent",
            fontSize: 14, fontWeight: 600, color: activeTab === "attributes" ? "#007bff" : "#666",
            cursor: "pointer", transition: "all 0.2s"
          }}
        >Додаткові поля</button>
        <button
          onClick={() => setActiveTab("pricing")}
          style={{
            flex: 1, padding: "12px 16px", border: "none",
            background: activeTab === "pricing" ? "white" : "transparent",
            borderBottom: activeTab === "pricing" ? "2px solid #007bff" : "2px solid transparent",
            fontSize: 14, fontWeight: 600, color: activeTab === "pricing" ? "#007bff" : "#666",
            cursor: "pointer", transition: "all 0.2s"
          }}
        >Ціни</button>
      </div>

      <div style={{ padding: "24px" }}>
        {activeTab === "details" && (
          <div style={{ display: "flex", gap: 24 }}>
                       <div style={{ flex: "0 0 200px" }}>
              <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>Фото</div>
              {getPhotoUrl() ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={getPhotoUrl()}
                    alt="Товар"
                    style={{
                      width: 200, height: 200, objectFit: "cover",
                      borderRadius: 12, border: "1px solid #ddd"
                    }}
                    onError={() => {
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
                      position: "absolute", top: 8, right: 8,
                      background: "rgba(0,0,0,0.7)", color: "white",
                      border: "none", borderRadius: "50%", width: 24, height: 24,
                      fontSize: 12, cursor: "pointer"
                    }}
                  >✕</button>
                </div>
              ) : (
                <div
                  style={{
                    width: 200, height: 200, border: "2px dashed #ddd",
                    borderRadius: 12, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    cursor: "pointer", background: "#f8f9fa"
                  }}
                  onClick={() => document.getElementById('photo-input').click()}
                >
                  <div style={{ fontSize: 48, marginBottom: 8, color: "#ccc" }}>📷</div>
                  <div style={{ fontSize: 12, color: "#666", textAlign: "center" }}>
                    Клікніть для завантаження<br />фото товару
                  </div>
                  <input
                    id="photo-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={e => e.target.files[0] && handlePhotoUpload(e.target.files[0])}
                  />
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {standardFieldsArr.map(renderField)}
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
          >Скасувати</button>
          <button
            onClick={handleSaveAndAddToArrival}
            disabled={saving}
            style={{
              background: saving ? "#e9ecef" : "#28a745",
              color: saving ? "#6c757d" : "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer"
            }}
          >{saving ? "Збереження…" : "Зберегти й додати в накладну"}</button>
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
          >{saving ? "Збереження..." : "Зберегти"}</button>
        </div>
      </div>
    </div>
  );
}

