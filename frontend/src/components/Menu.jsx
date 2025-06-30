import React from 'react';

const menu = [
  { name: 'Cake', price: 1.0, emoji: '🍰' },
  { name: 'Burger', price: 4.99, emoji: '🍔' },
  { name: 'Fries', price: 1.49, emoji: '🍟' },
  { name: 'Hotdog', price: 3.49, emoji: '🌭' },
  { name: 'Taco', price: 3.99, emoji: '🌮' },
  { name: 'Pizza', price: 7.99, emoji: '🍕' },
  { name: 'Donut', price: 1.49, emoji: '🍩' },
  { name: 'Popcorn', price: 1.99, emoji: '🍿' },
  { name: 'Coke', price: 1.49, emoji: '🥤' },
  { name: 'Icecream', price: 5.99, emoji: '🍦' },
  { name: 'Cookie', price: 3.99, emoji: '🍪' },
  { name: 'Flan', price: 7.99, emoji: '🍮' },
];

const Menu = () => (
  <div style={{ background: '#222', color: '#fff', padding: 20, borderRadius: 10 }}>
    <h2>Меню</h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {menu.map((item) => (
        <div key={item.name} style={{ background: '#333', borderRadius: 8, padding: 12, width: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 32 }}>{item.emoji}</div>
          <div>{item.name}</div>
          <div>${item.price.toFixed(2)}</div>
          <button style={{ marginTop: 8, background: '#ffa500', border: 'none', borderRadius: 4, padding: '4px 12px', color: '#fff' }}>Додати</button>
        </div>
      ))}
    </div>
  </div>
);

export default Menu; 