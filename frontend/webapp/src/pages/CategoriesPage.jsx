import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Додаємо
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
    UnitID: '',
    IsVAT: false,
    IsExcise: false,
    ParentID: null,
    DisplayOrder: 0,
    CategoryCode: '',
    ProductCardTemplateID: null,
  });
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate(); // Додаємо

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
    const cat = { ...newCategory };
    if (!cat.ProductCardTemplateID) cat.ProductCardTemplateID = getDefaultTemplateId();
    await api.addCategory(cat);
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
    setShowForm(false);
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
      ProductCardTemplateID: category.ProductCardTemplateID || getDefaultTemplateId(),
    });
    setShowForm(true);
  };

  const deleteCategory = async (id) => {
    await api.deleteCategory(id);
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : []));
  };

  async function saveEditCategory() {
    if (!editing.CategoryName.trim()) return;
    await api.updateCategory(editing.ID, editing);
    setEditing(null);
    setShowForm(false);
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : []));
  }

  const handleFormChange = (key, value) => {
    if (editing) {
      setEditing({ ...editing, [key]: value });
    } else {
      setNewCategory({ ...newCategory, [key]: value });
    }
  };

  // Групування категорій (ті, що без ParentID — основні)
  const mainCategories = categories.filter(cat => !cat.ParentID);
  const subCategories = categories.filter(cat => cat.ParentID);

  return (
    <div style={{
      background:'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',
      minHeight:'100vh', width:'100vw', padding: '32px 0'
    }}>
      <div style={{maxWidth:950, margin:'0 auto'}}>
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'linear-gradient(90deg,#7b6eea 0%,#a37c2d 100%)',
          borderRadius:18, padding:'18px 32px',marginBottom:32,boxShadow:'0 2px 12px #0001'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:32}}>📂</span>
            <span style={{fontSize:24,fontWeight:700,color:'#fff',letterSpacing:0.5}}>Категорії товару</span>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={() => navigate("/")}
              style={{
                background:'#e9ecef',color:'#333',border:'none',borderRadius:10,
                padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'
              }}>← На головну</button>
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              style={{
                background:'#00b894',color:'#fff',border:'none',borderRadius:10,
                padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'
              }}>+ Додати</button>
          </div>
        </div>

        {(showForm || editing) && (
          <div style={{
            background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001',
            padding: 32, marginBottom: 32, maxWidth: 600
          }}>
            <h3 style={{marginBottom: 18, fontWeight: 700}}>{editing ? 'Редагувати категорію' : 'Додати категорію'}</h3>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:2}}>
                  <label style={{fontWeight:500}}>Назва категорії:</label>
                  <input value={(editing ? editing.CategoryName : newCategory.CategoryName) || ""}
                    onChange={e => handleFormChange('CategoryName', e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Тип:</label>
                  <select value={(editing ? editing.ProductType : newCategory.ProductType) || ""}
                    onChange={e => handleFormChange('ProductType', e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}}>
            {PRODUCT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
          </select>
                </div>
              </div>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Одиниця виміру:</label>
                  <select value={(editing ? editing.UnitID : newCategory.UnitID) ?? ""}
                    onChange={e => handleFormChange('UnitID', Number(e.target.value))}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}}>
            <option value="">Одиниця виміру</option>
            {units.map(u => <option key={u.ID} value={u.ID}>{u.UnitName} ({u.ShortName})</option>)}
          </select>
        </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Шаблон картки:</label>
                  <select value={(editing ? editing.ProductCardTemplateID : newCategory.ProductCardTemplateID) ?? ""}
                    onChange={e => handleFormChange('ProductCardTemplateID', Number(e.target.value))}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}}>
                    <option value="">Виберіть шаблон</option>
                    {templates.map(t => <option key={t.ID} value={t.ID}>{t.IsDefault ? '⭐ ' : ''}{t.Name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Батьківська категорія:</label>
                  <select value={(editing ? editing.ParentID : newCategory.ParentID) ?? ""}
                    onChange={e => handleFormChange('ParentID', e.target.value ? Number(e.target.value) : null)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}}>
            <option value="">Без батьківської категорії</option>
                    {mainCategories.map(cat =>
              <option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
            )}
          </select>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Код категорії:</label>
                  <input value={(editing ? editing.CategoryCode : newCategory.CategoryCode) || ""}
                    onChange={e => handleFormChange('CategoryCode', e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}}/>
                </div>
              </div>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:1, display:'flex', flexDirection:'column', gap:8, justifyContent:'flex-end'}}>
                  <label style={{fontWeight:500}}>ПДВ:</label>
                  <input type="checkbox" checked={!!(editing ? editing.IsVAT : newCategory.IsVAT)}
                    onChange={e => handleFormChange('IsVAT', e.target.checked)} style={{marginRight: 6}} />
                  <label style={{fontWeight:500, marginTop:8}}>Акциз:</label>
                  <input type="checkbox" checked={!!(editing ? editing.IsExcise : newCategory.IsExcise)}
                    onChange={e => handleFormChange('IsExcise', e.target.checked)} style={{marginRight: 6}} />
                </div>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
              <button onClick={editing ? saveEditCategory : addCategory}
                style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>
                {editing ? 'Зберегти' : 'Додати'}
              </button>
              <button onClick={()=>{ setEditing(null); setShowForm(false); }}
                style={{background:'#6c757d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16,marginLeft:12}}>
                Відміна
              </button>
            </div>
        </div>
        )}

        {/* Таблиця категорій/підкатегорій */}
        <div style={{
          background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001',
          padding: 24, marginTop: 0, overflowX: 'auto'
        }}>
          <table style={{
            width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff',
            fontSize: 18, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px #0001'
          }}>
            <thead>
              <tr style={{ background: '#ede7fb' }}>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:20}}>Категорія</th>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:20}}>Підкатегорія</th>
                <th style={{border: '1px solid #d1c4e9'}}>Тип</th>
                <th style={{border: '1px solid #d1c4e9'}}>Одиниця</th>
                <th style={{border: '1px solid #d1c4e9'}}>Шаблон картки</th>
                <th style={{border: '1px solid #d1c4e9'}}>ПДВ</th>
                <th style={{border: '1px solid #d1c4e9'}}>Акциз</th>
                <th style={{border: '1px solid #d1c4e9'}}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {mainCategories.map(cat => (
                <React.Fragment key={cat.ID}>
                  <tr>
                    <td style={{
                      border: '1px solid #d1c4e9',
                      color: '#764ee3',
                      fontWeight: 700,
                      fontSize: 20,
                      background:'#f8f6ff',
                      padding:'10px 14px'
                    }}>
                      {cat.CategoryName}
                    </td>
                    <td style={{border: '1px solid #d1c4e9'}} />
                    <td style={{border: '1px solid #d1c4e9'}}>{cat.ProductType}</td>
                    <td style={{border: '1px solid #d1c4e9'}}>{units.find(u=>u.ID===cat.UnitID)?.UnitName||''}</td>
                    <td style={{border: '1px solid #d1c4e9'}}>{cat.ProductCardTemplateID
                      ? templates.find(t => t.ID === cat.ProductCardTemplateID)?.Name || ""
                      : (templates.find(t => t.IsDefault)?.Name ? `⭐ ${templates.find(t => t.IsDefault)?.Name}` : "")
                    }</td>
                    <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>{cat.IsVAT ? '✅' : ''}</td>
                    <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>{cat.IsExcise ? '✅' : ''}</td>
                    <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>
                      <button onClick={()=>editCategory(cat)} style={{fontSize:22,marginRight:8}}>✏️</button>
                      <button onClick={()=>deleteCategory(cat.ID)} style={{fontSize:22}}>🗑️</button>
                    </td>
                  </tr>
                  {/* Підкатегорії */}
                  {subCategories.filter(sub => sub.ParentID === cat.ID).map(sub => (
                    <tr key={sub.ID} style={{background:'#fcf6e6'}}>
                      <td style={{border: '1px solid #d1c4e9'}} />
                      <td style={{
                        border: '1px solid #d1c4e9',
                        fontWeight: 700,
                        fontStyle:'italic',
                        color: '#5c438c',
                        fontSize: 18,
                        padding:'10px 32px'
                      }}>
                        ⎯ {sub.CategoryName}
                      </td>
                      <td style={{border: '1px solid #d1c4e9'}}>{sub.ProductType}</td>
                      <td style={{border: '1px solid #d1c4e9'}}>{units.find(u=>u.ID===sub.UnitID)?.UnitName||''}</td>
                      <td style={{border: '1px solid #d1c4e9'}}>{sub.ProductCardTemplateID
                        ? templates.find(t => t.ID === sub.ProductCardTemplateID)?.Name || ""
                        : (templates.find(t => t.IsDefault)?.Name ? `⭐ ${templates.find(t => t.IsDefault)?.Name}` : "")
                      }</td>
                      <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>{sub.IsVAT ? '✅' : ''}</td>
                      <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>{sub.IsExcise ? '✅' : ''}</td>
                      <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>
                        <button onClick={()=>editCategory(sub)} style={{fontSize:22,marginRight:8}}>✏️</button>
                        <button onClick={()=>deleteCategory(sub.ID)} style={{fontSize:22}}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
