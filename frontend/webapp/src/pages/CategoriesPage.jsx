import React, { useEffect, useState } from 'react';
import { api } from '../api';

const PRODUCT_TYPES = [
  { value: "Штучний", label: "Штучний" },
  { value: "Ваговий", label: "Ваговий" },
  { value: "Розливний", label: "Розливний" },
  { value: "Послуга", label: "Послуга" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newCategory, setNewCategory] = useState({
    CategoryName: '',
    ProductType: 'Штучний',
    UnitID: '',   // змінено!
    IsVAT: false,
    IsExcise: false,
    ParentID: null,
    DisplayOrder: 0,
    CategoryCode: '',
    ProductCardTemplateID: null,
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : []));
    api.getUnits().then(data => setUnits(Array.isArray(data) ? data : []));
    api.getProductCardTemplates().then(data => setTemplates(Array.isArray(data) ? data : []));
  }, []);

  function getDefaultTemplateId() {
    const main = templates.find(t => t.IsDefault);
    return main ? main.ID : (templates[0]?.ID || null);
  }

  const addCategory = async () => {
    if (!newCategory.CategoryName.trim()) return;
    await api.addCategory(newCategory);
    setNewCategory({
      CategoryName: '',
      ProductType: 'Штучний',
      UnitID: '',
      IsVAT: false,
      IsExcise: false,
      ParentID: null,
      DisplayOrder: 0,
      CategoryCode: '',
      ProductCardTemplateID: getDefaultTemplateId(),
    });
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : []));
  };

  const editCategory = (category) => {
    setEditing(category);
    setNewCategory({
      CategoryName: category.CategoryName,
      ProductType: category.ProductType,
      UnitID: category.UnitID,
      IsVAT: category.IsVAT,
      IsExcise: category.IsExcise,
      ParentID: category.ParentID,
      DisplayOrder: category.DisplayOrder,
      CategoryCode: category.CategoryCode,
      ProductCardTemplateID: category.ProductCardTemplateID,
    });
  };

  const deleteCategory = async (id) => {
    await api.deleteCategory(id);
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : []));
  };

  async function saveEditCategory() {
    if (!editing.CategoryName.trim()) return;
    await api.updateCategory(editing.ID, editing);
    setEditing(null);
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : []));
  }

  return (
    <div style={{background:'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',minHeight:'100vh',width:'100vw',padding: '32px 0'}}>
      <div style={{maxWidth:900, margin:'0 auto'}}>
        <button onClick={() => window.location.assign('/webapp')} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:8,padding:'8px 20px',fontWeight:600,cursor:'pointer',marginBottom:18}}>← На головну</button>
        <h2 style={{fontSize: 24, marginBottom: 24}}>Категорії товару</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'8px 20px',fontWeight:600,cursor:'pointer',marginBottom:18}}>+ Додати категорію</button>
        {(showForm || editing) && (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32, maxWidth: 600 }}>
            <h3 style={{marginBottom: 18, fontWeight: 700}}>{editing ? 'Редагувати категорію' : 'Додати категорію'}</h3>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:2}}>
                  <label style={{fontWeight:500}}>Назва категорії:</label>
                  <input value={editing?.CategoryName || ""} onChange={e => setEditing({...editing, CategoryName: e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Тип:</label>
                  <select value={editing?.ProductType || ""} onChange={e => setEditing({...editing, ProductType: e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}>
                    {PRODUCT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Одиниця виміру:</label>
                  <select value={editing?.UnitID ?? ""} onChange={e => setEditing({...editing, UnitID: Number(e.target.value)})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}>
                    <option value="">Одиниця виміру</option>
                    {units.map(u => <option key={u.ID} value={u.ID}>{u.UnitName} ({u.ShortName})</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Шаблон картки:</label>
                  <select value={editing?.ProductCardTemplateID ?? ""} onChange={e => setEditing({...editing, ProductCardTemplateID: Number(e.target.value)})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}>
                    {templates.map(t => <option key={t.ID} value={t.ID}>{t.IsDefault ? '⭐ ' : ''}{t.Name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Шаблон картки:</label>
                  <select
                    value={editing?.ParentID ?? ""}
                    onChange={e => setEditing({...editing, ParentID: e.target.value ? Number(e.target.value) : null})}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}
                  >
                    <option value="">Без батьківської категорії</option>
                    {categories.filter(cat => !cat.ParentID).map(cat =>
                      <option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
                    )}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Код категорії:</label>
                  <input value={editing?.CategoryCode || ""} onChange={e => setEditing({...editing, CategoryCode: e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
                </div>
              </div>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:1, display:'flex', flexDirection:'column', gap:8, justifyContent:'flex-end'}}>
                  <label style={{fontWeight:500}}>ПДВ:</label>
                  <input type="checkbox" checked={!!editing?.IsVAT} onChange={e => setEditing({...editing, IsVAT: e.target.checked})} style={{marginRight: 6}} />
                  <label style={{fontWeight:500, marginTop:8}}>Акциз:</label>
                  <input type="checkbox" checked={!!editing?.IsExcise} onChange={e => setEditing({...editing, IsExcise: e.target.checked})} style={{marginRight: 6}} />
                </div>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
              <button onClick={editing ? saveEditCategory : addCategory} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>{editing ? 'Зберегти' : 'Додати'}</button>
              <button onClick={()=>{ setEditing(null); setShowForm(false); }} style={{background:'#6c757d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16,marginLeft:12}}>Відміна</button>
            </div>
          </div>
        )}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 24, marginTop: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e0c9a0', background: '#fff', marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0c9a0' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', borderRight: '1px solid #e0c9a0' }}>Назва</th>
                <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Тип</th>
                <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Одиниця</th>
                <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Шаблон картки</th>
                <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>ПДВ</th>
                <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Акциз</th>
                <th style={{ textAlign: 'left' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat =>
                <tr key={cat.ID}>
                  <td>{cat.CategoryName}</td>
                  <td>{cat.ProductType}</td>
                  <td>{units.find(u=>u.ID===cat.UnitID)?.UnitName||''}</td>
                  <td>
                    {cat.ProductCardTemplateID
                      ? templates.find(t => t.ID === cat.ProductCardTemplateID)?.Name || ""
                      : (templates.find(t => t.IsDefault)?.Name ? `⭐ ${templates.find(t => t.IsDefault)?.Name}` : "")
                    }
                  </td>
                  <td>{cat.IsVAT?'✅':''}</td>
                  <td>{cat.IsExcise?'✅':''}</td>
                  <td>
                    <button onClick={()=>editCategory(cat)} style={{marginRight:8}}>✏️</button>
                    <button onClick={()=>deleteCategory(cat.ID)} style={{marginRight:8}}>🗑️</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
