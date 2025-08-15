import React, { useEffect, useState } from "react";
import { api } from "../api";
import ProductCardTemplateFields from "./ProductCardTemplateFields";

export default function ProductCardTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
    setEditing(template ? { ...template } : { Name: "", Description: "", IsDefault: false });
    setShowForm(true);
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
    setShowForm(false);
    loadTemplates();
  }

  async function handleDelete(id) {
    if (window.confirm("Видалити шаблон?")) {
      await api.deleteProductCardTemplate(id);
      loadTemplates();
    }
  }

  function handleCloseForm() {
    setEditing(null);
    setShowForm(false);
  }

  return (
    <div style={{ maxWidth: 950, margin: "50px auto", padding: 0 }}>
      <h2 style={{ marginBottom: 18, fontWeight: 800, fontSize: 32, letterSpacing: ".01em" }}>
        Шаблони карток товару
      </h2>
      <button style={addBtnStyle} onClick={() => handleEdit(null)}>
        + Додати шаблон
      </button>

      {/* --- ФОРМА ДОДАВАННЯ/РЕДАГУВАННЯ --- */}
      {showForm && (
        <div style={modalCardStyle}>
          <h3 style={{ marginBottom: 18, fontWeight: 700 }}>
            {editing.ID ? "Редагувати шаблон" : "Додати шаблон"}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Назва:</label>
              <input
                name="Name"
                value={editing.Name || ""}
                onChange={e => setEditing({ ...editing, Name: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Опис:</label>
              <input
                name="Description"
                value={editing.Description || ""}
                onChange={e => setEditing({ ...editing, Description: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={!!editing.IsDefault}
                onChange={e => setEditing({ ...editing, IsDefault: e.target.checked })}
                id="isDefaultCheckbox"
                style={{ marginRight: 6, width: 18, height: 18 }}
              />
              <label htmlFor="isDefaultCheckbox" style={{ fontWeight: 500, cursor: 'pointer' }}>Основна картка</label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={handleSave} style={saveBtnStyle}>Зберегти</button>
            <button onClick={handleCloseForm} style={cancelBtnStyle}>Відміна</button>
          </div>
        </div>
      )}

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Назва</th>
              <th style={headerCellStyle}>Опис</th>
              <th style={{ ...headerCellStyle, textAlign: 'center' }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.ID} style={rowStyle}>
                <td style={cellStyle}>
                  {t.IsDefault ? (
                    <span style={{ color: '#c4282d', fontWeight: 700, fontSize: '1.09em' }}>
                      ⭐ {t.Name}
                    </span>
                  ) : t.Name}
                </td>
                <td style={cellStyle}>{t.Description}</td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <button onClick={() => handleEdit(t)} style={editBtnStyle} title="Редагувати">✏️</button>
                  <button onClick={() => handleDelete(t.ID)} style={deleteBtnStyle} title="Видалити">🗑️</button>
                  <button
                    onClick={() => setSelectedTemplateId(t.ID)}
                    style={paramBtnStyle}
                    title="Поля шаблону"
                  >⚙️ Параметри</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Параметри (поля) шаблону */}
      {selectedTemplateId && (
        <div style={{
          background: "#fff",
          padding: 18,
          marginTop: 32,
          borderRadius: 14,
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

// --- СТИЛІ --- //
const addBtnStyle = {
  background: "#208f41",
  color: "#fff",
  padding: "12px 32px",
  borderRadius: 10,
  fontSize: 18,
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 8px #0001",
  marginBottom: 18
};
const tableWrapStyle = {
  background: '#fff',
  borderRadius: 18,
  boxShadow: '0 4px 24px #0001',
  padding: 0,
  marginTop: 0,
  overflow: "hidden",
  marginBottom: 24,
};
const tableStyle = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  border: "2px solid #000",
  background: '#fff',
  borderRadius: 18,
  fontFamily: "inherit",
  overflow: "hidden"
};
const headerCellStyle = {
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 16,
  padding: '16px 14px',
  background: '#e8d7f7',
  color: "#1a103a",
  border: "2px solid #000",
};
const cellStyle = {
  padding: '14px 14px',
  border: "2px solid #000",
  background: "#fff",
  fontSize: 15,
  color: "#22105a"
};
const rowStyle = {
  background: "#fff"
};
const labelStyle = {
  fontWeight: 500,
  marginBottom: 3,
  display: "inline-block"
};
const inputStyle = {
  width: '100%',
  padding: 11,
  borderRadius: 9,
  border: '1px solid #ccc',
  fontSize: 16,
  marginTop: 2,
  marginBottom: 0
};
const modalCardStyle = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 4px 24px #0001',
  padding: 32,
  marginBottom: 32,
  maxWidth: 520
};
const saveBtnStyle = {
  background: '#208f41',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 32px',
  fontWeight: 600,
  fontSize: 16,
  cursor: "pointer"
};
const cancelBtnStyle = {
  background: '#6c757d',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 32px',
  fontWeight: 600,
  fontSize: 16,
  marginLeft: 12,
  cursor: "pointer"
};
const editBtnStyle = {
  background: "#fff8c5",
  border: "2px solid #c0b31c",
  borderRadius: 8,
  color: "#856800",
  fontWeight: 700,
  padding: "7px 14px",
  marginRight: 10,
  fontSize: 20,
  cursor: "pointer"
};
const deleteBtnStyle = {
  background: "#ffe3e3",
  border: "2px solid #d64040",
  borderRadius: 8,
  color: "#d64040",
  fontWeight: 700,
  padding: "7px 14px",
  fontSize: 20,
  cursor: "pointer"
};
const paramBtnStyle = {
  background: "#e8e7fd",
  border: "2px solid #7a69d6",
  borderRadius: 8,
  color: "#3126a1",
  fontWeight: 700,
  padding: "7px 14px",
  marginLeft: 4,
  fontSize: 17,
  cursor: "pointer"
};
