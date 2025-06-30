import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ProductPricesPage() {
  const [prices, setPrices] = useState([]);
  const [newPrice, setNewPrice] = useState({ ProductID: '', PriceCategoryID: '', Price: '' });

  useEffect(() => {
    api.getProductPrices().then(setPrices);
  }, []);

  const addPrice = async () => {
    if (!newPrice.ProductID || !newPrice.PriceCategoryID || !newPrice.Price) return;
    await api.addProductPrice({
      ProductID: Number(newPrice.ProductID),
      PriceCategoryID: Number(newPrice.PriceCategoryID),
      Price: Number(newPrice.Price)
    });
    setNewPrice({ ProductID: '', PriceCategoryID: '', Price: '' });
    api.getProductPrices().then(setPrices);
  };

  return (
    <div style={{marginLeft: 240, padding: 32}}>
      <h2 style={{fontSize: 24, marginBottom: 24}}>Ціни</h2>
      <div style={{marginBottom: 24}}>
        <input value={newPrice.ProductID} onChange={e => setNewPrice(p => ({...p, ProductID: e.target.value}))} placeholder="ID товару" style={{padding: 8, fontSize: 16, marginRight: 8, width: 100}} />
        <input value={newPrice.PriceCategoryID} onChange={e => setNewPrice(p => ({...p, PriceCategoryID: e.target.value}))} placeholder="ID категорії цін" style={{padding: 8, fontSize: 16, marginRight: 8, width: 140}} />
        <input value={newPrice.Price} onChange={e => setNewPrice(p => ({...p, Price: e.target.value}))} placeholder="Ціна" style={{padding: 8, fontSize: 16, marginRight: 8, width: 80}} />
        <button onClick={addPrice} style={{padding: '8px 16px', fontSize: 16}}>Додати</button>
      </div>
      <ul style={{fontSize: 18}}>
        {prices.map(price => (
          <li key={price.ID}>Товар #{price.ProductID}, Категорія цін #{price.PriceCategoryID}: {price.Price} ₴</li>
        ))}
      </ul>
    </div>
  );
} 