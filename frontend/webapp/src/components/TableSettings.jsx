import React, { useEffect, useState } from 'react';

export default function TableSettings({ isOpen, onClose, columns, onSave }) {
  const [localColumns, setLocalColumns] = useState(columns);

  // Синхронізуємо стан при відкритті модалки або зміні колонок ззовні
  useEffect(() => {
    if (isOpen) setLocalColumns(columns);
  }, [isOpen, columns]);

  if (!isOpen) return null;

  const handleToggleColumn = (key) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const moveColumn = (key, dir) => {
    setLocalColumns(prev => {
      const idx = prev.findIndex(c => c.key === key);
      if (idx < 0) return prev;
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const handleReset = () => {
    const defaultColumns = [
      { key: 'photo', title: 'Фото', visible: true },
      { key: 'product', title: 'Товар', visible: true },
      { key: 'barcode', title: 'Штрихкод', visible: true },
      { key: 'article', title: 'Артикул', visible: true },
      { key: 'quantity', title: 'К-сть', visible: true },
      { key: 'warehouse', title: 'Склад', visible: false },
      { key: 'costPrice', title: 'Собівартість', visible: true },
      { key: 'retailPrice', title: 'Роздрібна ціна', visible: true },
      { key: 'retailWithDiscount', title: 'Роздрібна (зі знижкою)', visible: true },
      { key: 'discountPrice', title: 'Уцінена ціна', visible: true },
      { key: 'amount', title: 'Сума', visible: true },
      { key: 'category', title: 'Категорія', visible: false },
      { key: 'manufacturer', title: 'Виробник', visible: false },
      { key: 'unit', title: 'Одиниця', visible: false },
      { key: 'vat', title: 'ПДВ', visible: false },
      { key: 'lastUpdate', title: 'Оновлено', visible: false }
    ];
    setLocalColumns(defaultColumns);
  };

  const visibleCount = localColumns.filter(col => col.visible).length;
  const totalCount = localColumns.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            ⚙️ Налаштування таблиці
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Підзаголовок */}
        <div className="mb-6 p-4 bg-blue-50 rounded-2xl">
          <p className="text-lg text-blue-800">
            Вибрано <span className="font-bold">{visibleCount}</span> з <span className="font-bold">{totalCount}</span> колонок
          </p>
        </div>

        {/* Список колонок */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {localColumns.map((column, idx) => (
            <div
              key={column.key}
              className={`p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                column.visible
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
              onClick={() => handleToggleColumn(column.key)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  column.visible
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-400 bg-white'
                }`}>
                  {column.visible && <span className="text-white text-sm">✓</span>}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{column.title}</div>
                  <div className="text-sm text-gray-600">{column.description}</div>
                </div>
                {/* Кнопки порядку */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    className={`px-2 py-1 rounded-md text-sm ${idx === 0 ? 'opacity-30 cursor-not-allowed bg-gray-200' : 'bg-white hover:bg-gray-100 border'} `}
                    onClick={(e) => { e.stopPropagation(); moveColumn(column.key, 'up'); }}
                    disabled={idx === 0}
                    title="Вище"
                  >
                    ↑
                  </button>
                  <button
                    className={`px-2 py-1 rounded-md text-sm ${idx === localColumns.length - 1 ? 'opacity-30 cursor-not-allowed bg-gray-200' : 'bg-white hover:bg-gray-100 border'} `}
                    onClick={(e) => { e.stopPropagation(); moveColumn(column.key, 'down'); }}
                    disabled={idx === localColumns.length - 1}
                    title="Нижче"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Кнопки */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-xl font-semibold hover:bg-gray-400 transition-colors duration-200"
          >
            ❌ Закрити
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors duration-200"
          >
            🔄 Скинути
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200"
          >
            💾 Зберегти
          </button>
        </div>
      </div>
    </div>
  );
}
