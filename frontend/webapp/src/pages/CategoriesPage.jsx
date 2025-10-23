import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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
    if (window.confirm("Видалити категорію?")) {
      await api.deleteCategory(id);
      api.getCategories().then(data => setCategories(Array.isArray(data) ? data : []));
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex flex-col">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              📂 Категорії товару
            </h1>
            <p className="text-2xl text-blue-100">
              Управління категоріями та групами товарів
            </p>
          </div>
        </div>
        {/* Кнопки управління */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/dictionaries")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              ← Назад до довідників
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-gray-500 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
            >
              🏠 На головну
            </button>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl"
          >
            ✨ + Додати категорію
          </button>
        </div>

        {/* Форма додавання/редагування */}
        {(showForm || editing) && (
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-blue-200 mb-12 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b-2 border-blue-200">
              <h3 className="text-3xl font-bold text-blue-800">
                {editing ? '✏️ Редагувати категорію' : '✨ Додати категорію'}
              </h3>
            </div>
            <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Основна інформація */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Назва категорії *
                    </label>
          <input
                      type="text"
                      value={(editing ? editing.CategoryName : newCategory.CategoryName) || ""}
                      onChange={e => handleFormChange('CategoryName', e.target.value)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                      placeholder="Введіть назву категорії"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Тип товару
                    </label>
          <select
                      value={(editing ? editing.ProductType : newCategory.ProductType) || ""}
                      onChange={e => handleFormChange('ProductType', e.target.value)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                    >
                      {PRODUCT_TYPES.map(pt => (
                        <option key={pt.value} value={pt.value}>{pt.label}</option>
                      ))}
          </select>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Одиниця виміру
                    </label>
          <select
                      value={(editing ? editing.UnitID : newCategory.UnitID) ?? ""}
                      onChange={e => handleFormChange('UnitID', Number(e.target.value))}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                    >
                      <option value="">Виберіть одиницю виміру</option>
                      {units.map(u => (
                        <option key={u.ID} value={u.ID}>
                          {u.UnitName} ({u.ShortName})
                        </option>
                      ))}
          </select>
        </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Код категорії
                    </label>
                    <input
                      type="text"
                      value={(editing ? editing.CategoryCode : newCategory.CategoryCode) || ""}
                      onChange={e => handleFormChange('CategoryCode', e.target.value)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                      placeholder="Введіть код категорії"
                    />
                  </div>
                </div>

                {/* Додаткова інформація */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Батьківська категорія
                    </label>
          <select
                      value={(editing ? editing.ParentID : newCategory.ParentID) ?? ""}
                      onChange={e => handleFormChange('ParentID', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50 hover:bg-white"
          >
            <option value="">Без батьківської категорії</option>
                      {mainCategories.map(cat => (
              <option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Шаблон картки товару
                    </label>
                    <select
                      value={(editing ? editing.ProductCardTemplateID : newCategory.ProductCardTemplateID) ?? ""}
                      onChange={e => handleFormChange('ProductCardTemplateID', Number(e.target.value))}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                    >
                      <option value="">Виберіть шаблон</option>
                      {templates.map(t => (
                        <option key={t.ID} value={t.ID}>
                          {t.IsDefault ? '⭐ ' : ''}{t.Name}
                        </option>
                      ))}
          </select>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Порядок відображення
                    </label>
          <input
            type="number"
                      value={(editing ? editing.DisplayOrder : newCategory.DisplayOrder) || 0}
                      onChange={e => handleFormChange('DisplayOrder', Number(e.target.value))}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50 hover:bg-white"
                      placeholder="0"
          />
        </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-4">
            <input
              type="checkbox"
                        id="vat"
                        checked={!!(editing ? editing.IsVAT : newCategory.IsVAT)}
                        onChange={e => handleFormChange('IsVAT', e.target.checked)}
                        className="w-6 h-6 text-blue-600 border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:ring-2"
                      />
                      <label htmlFor="vat" className="text-lg font-semibold text-gray-700">
                        Платник ПДВ
          </label>
                    </div>
                    <div className="flex items-center gap-4">
            <input
              type="checkbox"
                        id="excise"
                        checked={!!(editing ? editing.IsExcise : newCategory.IsExcise)}
                        onChange={e => handleFormChange('IsExcise', e.target.checked)}
                        className="w-6 h-6 text-blue-600 border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:ring-2"
                      />
                      <label htmlFor="excise" className="text-lg font-semibold text-gray-700">
                        Акцизний товар
          </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопки форми */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end mt-10 pt-8 border-t-2 border-blue-100">
                <button
                  onClick={() => { setShowForm(false); setEditing(null); }}
                  className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  ❌ Скасувати
                </button>
                <button
                  onClick={editing ? saveEditCategory : addCategory}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-xl hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  💾 {editing ? 'Зберегти' : 'Додати'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблиця категорій */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b-2 border-blue-200">
            <h3 className="text-2xl font-bold text-blue-800">
              📋 Список категорій ({categories.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-100 to-indigo-100">
                <tr>
                  <th className="px-8 py-4 text-left text-lg font-bold text-blue-800">Категорія</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-blue-800">Підкатегорія</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-blue-800">Тип</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-blue-800">Одиниця</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-blue-800">Шаблон картки</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-blue-800">ПДВ</th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-blue-800">Акциз</th>
                  <th className="px-8 py-4 text-center text-lg font-bold text-blue-800">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-blue-50">
                {mainCategories.map(cat => (
                  <React.Fragment key={cat.ID}>
                    {/* Основна категорія */}
                    <tr className="hover:bg-blue-50 transition-colors duration-200">
                      <td className="px-8 py-4 text-lg font-bold text-blue-800 bg-blue-50">
                        {cat.CategoryName}
                      </td>
                      <td className="px-8 py-4 text-lg text-gray-600"></td>
                      <td className="px-8 py-4 text-lg text-gray-600">
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                          {cat.ProductType}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-lg text-gray-600">
                        {units.find(u => u.ID === cat.UnitID)?.UnitName || '-'}
                      </td>
                      <td className="px-8 py-4 text-lg text-gray-600">
                        {cat.ProductCardTemplateID
                          ? templates.find(t => t.ID === cat.ProductCardTemplateID)?.Name || ""
                          : (templates.find(t => t.IsDefault)?.Name ? `⭐ ${templates.find(t => t.IsDefault)?.Name}` : "")
                        }
                      </td>
                      <td className="px-8 py-4 text-lg">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          cat.IsVAT 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cat.IsVAT ? '✅ Так' : '❌ Ні'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-lg">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          cat.IsExcise 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cat.IsExcise ? '⚠️ Так' : '❌ Ні'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => editCategory(cat)}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteCategory(cat.ID)}
                            className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Підкатегорії */}
                    {subCategories.filter(sub => sub.ParentID === cat.ID).map(sub => (
                      <tr key={sub.ID} className="hover:bg-blue-50 transition-colors duration-200">
                        <td className="px-8 py-4 text-lg text-gray-600"></td>
                        <td className="px-8 py-4 text-lg font-semibold text-gray-700 bg-gray-50 pl-16">
                          ⎯ {sub.CategoryName}
                        </td>
                        <td className="px-8 py-4 text-lg text-gray-600">
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700">
                            {sub.ProductType}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-lg text-gray-600">
                          {units.find(u => u.ID === sub.UnitID)?.UnitName || '-'}
                        </td>
                        <td className="px-8 py-4 text-lg text-gray-600">
                          {sub.ProductCardTemplateID
                            ? templates.find(t => t.ID === sub.ProductCardTemplateID)?.Name || ""
                            : (templates.find(t => t.IsDefault)?.Name ? `⭐ ${templates.find(t => t.IsDefault)?.Name}` : "")
                          }
                        </td>
                        <td className="px-8 py-4 text-lg">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            sub.IsVAT 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {sub.IsVAT ? '✅ Так' : '❌ Ні'}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-lg">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            sub.IsExcise 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {sub.IsExcise ? '⚠️ Так' : '❌ Ні'}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={() => editCategory(sub)}
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteCategory(sub.ID)}
                              className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300"
                            >
                              🗑️
                            </button>
                          </div>
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

      {/* Футер */}
      <footer className="mt-auto border-t-2 border-blue-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-center gap-6">
          <div className="text-center">
            <span className="text-2xl font-bold text-blue-800 tracking-wide">
              �� Категорії товару VYSHNIA
            </span>
            <p className="text-blue-600 text-base mt-1">
              Система управління категоріями
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
