import React, { useEffect, useState } from "react";
import { api } from "../api";
import ProductCardTemplateFields from "./ProductCardTemplateFields";

export default function ProductCardTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    const data = await api.getProductCardTemplates();
    setTemplates(data || []);
    setLoading(false);
  }

  function handleEdit(template) {
    setEditing(template ? { ...template } : { Name: "", Description: "" });
  }

  async function handleSave() {
    if (!editing.Name) {
      alert("Вкажіть назву шаблону!");
      return;
    }
    if (editing.ID) {
      await api.updateProductCardTemplate(editing.ID, editing);
    } else {
      await api.addProductCardTemplate(editing);
    }
    setEditing(null);
    loadTemplates();
  }

  async function handleDelete(id) {
    if (window.confirm("Видалити шаблон?")) {
      await api.deleteProductCardTemplate(id);
      loadTemplates();
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <h2>Шаблони карток товару</h2>
      {loading ? <div>Завантаження...</div> : (
        <>
          <button onClick={() => handleEdit(null)} style={{ marginBottom: 18 }}>+ Додати шаблон</button>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Назва</th>
                <th>Опис</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.ID}>
                  <td>{t.ID}</td>
                  <td>{t.Name}</td>
                  <td>{t.Description}</td>
                  <td>
                    <button onClick={() => handleEdit(t)}>✏️</button>
                    <button onClick={() => handleDelete(t.ID)} style={{ marginLeft: 10 }}>🗑️</button>
                    <button onClick={() => setSelectedTemplateId(t.ID)} style={{ marginLeft: 10 }}>⚙️ Параметри</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {editing && (
        <div style={{
          background: "#fffbe8",
          padding: 18,
          marginTop: 24,
          borderRadius: 8,
          maxWidth: 400,
          boxShadow: "0 2px 6px #0001"
        }}>
          <h3>{editing.ID ? "Редагувати шаблон" : "Додати шаблон"}</h3>
          <div>
            <label>Назва:</label>
            <input
              name="Name"
              value={editing.Name || ""}
              onChange={e => setEditing({ ...editing, Name: e.target.value })}
              style={{ marginLeft: 10, width: 220 }}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <label>Опис:</label>
            <input
              name="Description"
              value={editing.Description || ""}
              onChange={e => setEditing({ ...editing, Description: e.target.value })}
              style={{ marginLeft: 10, width: 220 }}
            />
          </div>
          <div style={{ marginTop: 18 }}>
            <button onClick={handleSave}>Зберегти</button>
            <button onClick={() => setEditing(null)} style={{ marginLeft: 18 }}>Відміна</button>
          </div>
        </div>
      )}

      {/* Параметри (поля) шаблону */}
      {selectedTemplateId && (
        <div style={{
          background: "#fff",
          padding: 18,
          marginTop: 32,
          borderRadius: 8,
          maxWidth: 720,
          boxShadow: "0 2px 6px #0002"
        }}>
          <ProductCardTemplateFields
            templateId={selectedTemplateId}
            onClose={() => setSelectedTemplateId(null)}
          />
        </div>
      )}
    </div>
  );
}
