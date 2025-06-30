import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function PriceCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    api.getPriceCategories().then(setCategories);
  }, []);

  const addCategory = async () => {
    if (!newName.trim()) return;
    await api.addPriceCategory({ CategoryName: newName });
    setNewName('');
    api.getPriceCategories().then(setCategories);
  };

  return (
    <div style={{marginLeft: 240, padding: 32}}>
      <h2 style={{fontSize: 24, marginBottom: 24}}>Категорії цін</h2>
      <div style={{marginBottom: 24}}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Нова категорія цін" style={{padding: 8, fontSize: 16, marginRight: 8}} />
        <button onClick={addCategory} style={{padding: '8px 16px', fontSize: 16}}>Додати</button>
      </div>
      <ul style={{fontSize: 18}}>
        {categories.map(cat => (
          <li key={cat.ID}>{cat.CategoryName}</li>
        ))}
      </ul>
    </div>
  );
} 