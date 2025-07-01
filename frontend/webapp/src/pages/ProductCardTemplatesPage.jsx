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
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', marginTop: 12, border: '1px solid #e0c9a0' }}>
            <thead>
              <tr style={{borderBottom:'2px solid #e0c9a0'}}>
                <th style={{textAlign:'left',padding:'8px 0',borderRight:'1px solid #e0c9a0'}}>Назва</th>
                <th style={{textAlign:'left',borderRight:'1px solid #e0c9a0'}}>Опис</th>
                <th style={{textAlign:'left'}}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.ID} style={{borderBottom:'1px solid #e0c9a0'}}>
                  <td style={{borderRight:'1px solid #e0c9a0'}}>
                    {t.IsDefault ? (
                      <span style={{color:'#c4282d',fontWeight:700,fontSize:'1.08em'}}>
                        ⭐ {t.Name}
                      </span>
                    ) : t.Name}
                  </td>
                  <td style={{borderRight:'1px solid #e0c9a0'}}>{t.Description}</td>
                  <td>
                    <button onClick={() => handleEdit(t)} style={{marginRight:8}}>✏️</button>
                    <button onClick={() => handleDelete(t.ID)} style={{marginRight:8}}>🗑️</button>
                    <button onClick={() => setSelectedTemplateId(t.ID)}>⚙️ Параметри</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {editing && (
        <div style={{background:'#fff',padding:28,borderRadius:16,boxShadow:'0 4px 24px #0001',maxWidth:520,margin:'32px 0',display:'flex',flexDirection:'column',gap:18}}>
          <h3 style={{marginBottom:8,fontWeight:700}}>{editing.ID ? 'Редагувати шаблон' : 'Додати шаблон'}</h3>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <label style={{fontWeight:500}}>Назва:</label>
            <input
              name="Name"
              value={editing.Name || ""}
              onChange={e => setEditing({ ...editing, Name: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc' }}
            />
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <label style={{fontWeight:500}}>Опис:</label>
            <input
              name="Description"
              value={editing.Description || ""}
              onChange={e => setEditing({ ...editing, Description: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc' }}
            />
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <input
              type="checkbox"
              checked={!!editing.IsDefault}
              onChange={e => setEditing({ ...editing, IsDefault: e.target.checked })}
              id="isDefaultCheckbox"
              style={{marginRight: 6}}
            />
            <label htmlFor="isDefaultCheckbox" style={{fontWeight:500, cursor:'pointer'}}>Основна картка</label>
          </div>
          <div style={{display:'flex', gap:12, justifyContent:'flex-end', marginTop:8}}>
            <button onClick={handleSave} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:6,padding:'8px 20px',fontWeight:600}}>Зберегти</button>
            <button onClick={() => setEditing(null)} style={{background:'#6c757d',color:'#fff',border:'none',borderRadius:6,padding:'8px 20px',fontWeight:600}}>Відміна</button>
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

