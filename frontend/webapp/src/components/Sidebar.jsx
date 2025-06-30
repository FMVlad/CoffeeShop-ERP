import React from 'react';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <nav className="sidebar" style={{width: 220, background: '#f8fafc', minHeight: '100vh', padding: 24, boxSizing: 'border-box', position: 'fixed', left: 0, top: 0}}>
      <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
        <li style={{marginBottom: 16}}><Link to="/categories">Категорії товару</Link></li>
        <li style={{marginBottom: 16}}><Link to="/price-categories">Категорії цін</Link></li>
        <li style={{marginBottom: 16}}><Link to="/products">Товари</Link></li>
        <li><Link to="/price-list">Прайс-лист</Link></li>
        <li><Link to="/system-parameters">Системні налаштування</Link></li>
      </ul>
    </nav>
  );
} 