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
  const [newCategory, setNewCategory] = useState({
    CategoryName: '',
    ProductType: 'Штучний',
    UnitID: '',   // змінено!
    IsVAT: false,
    IsExcise: false,
    ParentID: null,
    DisplayOrder: 0,
    CategoryCode: '',
  });

  useEffect(() => {
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : []));
    api.getUnits().then(data => setUnits(Array.isArray(data) ? data : []));
  }, []);

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
    });
    api.getCategories().then(data => setCategories(Array.isArray(data) ? data : []));
  };

  return (
    <div style={{marginLeft: 240, padding: 32, maxWidth: 700}}>
      <h2 style={{fontSize: 24, marginBottom: 24}}>Категорії товару</h2>
      <div style={{marginBottom: 24, background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 1px 8px #eee'}}>
        <div style={{marginBottom: 8}}>
          <input
            value={newCategory.CategoryName}
            onChange={e => setNewCategory({...newCategory, CategoryName: e.target.value})}
            placeholder="Назва категорії"
            style={{padding: 8, fontSize: 16, marginRight: 8, width: 220}}
          />
          <select
            value={newCategory.ProductType}
            onChange={e => setNewCategory({...newCategory, ProductType: e.target.value})}
            style={{padding: 8, fontSize: 16, marginRight: 8}}
          >
            {PRODUCT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
          </select>
          <select
            value={newCategory.UnitID}
            onChange={e => setNewCategory({...newCategory, UnitID: Number(e.target.value)})}
            style={{padding: 8, fontSize: 16, marginRight: 8, width: 110}}
          >
            <option value="">Одиниця виміру</option>
            {units.map(u => <option key={u.ID} value={u.ID}>{u.UnitName} ({u.ShortName})</option>)}
          </select>
        </div>
        <div style={{marginBottom: 8}}>
          <select
            value={newCategory.ParentID || ''}
            onChange={e => setNewCategory({...newCategory, ParentID: e.target.value ? Number(e.target.value) : null})}
            style={{padding: 8, fontSize: 16, marginRight: 8}}
          >
            <option value="">Без батьківської категорії</option>
            {categories.filter(cat => !cat.ParentID).map(cat =>
              <option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
            )}
          </select>
          <input
            value={newCategory.CategoryCode}
            onChange={e => setNewCategory({...newCategory, CategoryCode: e.target.value})}
            placeholder="Код категорії"
            style={{padding: 8, fontSize: 16, marginRight: 8, width: 140}}
          />
          <input
            type="number"
            value={newCategory.DisplayOrder}
            onChange={e => setNewCategory({...newCategory, DisplayOrder: Number(e.target.value)})}
            placeholder="Порядок"
            style={{padding: 8, fontSize: 16, marginRight: 8, width: 90}}
            min={0}
          />
        </div>
        <div style={{marginBottom: 8}}>
          <label style={{marginRight: 20}}>
            <input
              type="checkbox"
              checked={newCategory.IsVAT}
              onChange={e => setNewCategory({...newCategory, IsVAT: e.target.checked})}
              style={{marginRight: 4}}
            />
            ПДВ
          </label>
          <label>
            <input
              type="checkbox"
              checked={newCategory.IsExcise}
              onChange={e => setNewCategory({...newCategory, IsExcise: e.target.checked})}
              style={{marginRight: 4}}
            />
            Акциз
          </label>
        </div>
        <button onClick={addCategory} style={{padding: '8px 18px', fontSize: 16, borderRadius: 8, background: '#a37c2d', color: '#fff'}}>Додати</button>
      </div>
     <ul style={{fontSize: 18, background: "#fff", borderRadius: 10, boxShadow: "0 2px 6px #eee", padding: 24}}>
        {Array.isArray(categories) && categories.map(cat => (
        <li key={cat.ID} style={{marginBottom: 8}}>
          <b>{cat.CategoryName}</b>
         {cat.ParentID ? <> (🔗 Підкатегорія: {categories.find(c => c.ID === cat.ParentID)?.CategoryName})</> : ''}
          {cat.ProductType && <> — {cat.ProductType}</>}
          {cat.IsVAT ? <> — ПДВ</> : ''}
          {cat.IsExcise ? <> — Акциз</> : ''}
          {cat.UnitID ? <> — Од. виміру: {units.find(u => u.ID === cat.UnitID)?.UnitName} ({units.find(u => u.ID === cat.UnitID)?.ShortName})</> : ''}
      {cat.CategoryCode && <> — Код: {cat.CategoryCode}</>}
    </li>
  ))}
</ul>

    </div>
  );
}
