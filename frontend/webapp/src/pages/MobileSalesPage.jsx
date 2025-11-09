import React from 'react';
import { useNavigate } from 'react-router-dom';
import './mobile-sales.css';

export default function MobileSalesPage() {
  const navigate = useNavigate();

  return (
    <div className="ms-root">
      <header className="ms-header">
        <button className="ms-back" onClick={() => navigate('/sales')}>←</button>
        <div className="ms-title">📱 Мобільна торгівля</div>
        <button className="ms-home" onClick={() => navigate('/')}>🏠</button>
      </header>

      <main className="ms-main">
        <div className="ms-panel">
          <input className="ms-barcode" placeholder="Скануйте або введіть штрихкод" />
          <div className="ms-actions">
            <button className="ms-action">➕ Додати позицію</button>
            <button className="ms-action">🧾 Оформити</button>
          </div>
        </div>
        <div className="ms-list">
          <div className="ms-row ms-row--head">
            <div className="ms-col-name">Товар</div>
            <div className="ms-col-qty">К-сть</div>
            <div className="ms-col-sum">Сума</div>
          </div>
          {/* TODO: rows */}
          <div className="ms-empty">Позиції відсутні</div>
        </div>
      </main>

      <footer className="ms-footer">
        <div className="ms-total">
          <div className="ms-total-label">Разом</div>
          <div className="ms-total-value">0.00</div>
        </div>
      </footer>
    </div>
  );
}



