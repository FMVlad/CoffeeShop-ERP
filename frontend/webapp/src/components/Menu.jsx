import React, { useState, useEffect } from "react";
import { Search, Edit, Trash2, Plus, Filter } from "lucide-react";
import toast from "react-hot-toast";

// API базовий URL
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api';

// API функції
const api = {
  async getMenu(search = '', category = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'Всі') params.append('category', category);
    
    const response = await fetch(`${API_BASE_URL}/menu?${params}`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    return response.json();
  },

  async createItem(item) {
    const response = await fetch(`${API_BASE_URL}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to create item');
    return response.json();
  },

  async updateItem(id, item) {
    const response = await fetch(`${API_BASE_URL}/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to update item');
    return response.json();
  },

  async deleteItem(id) {
    const response = await fetch(`${API_BASE_URL}/menu/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete item');
    return response.json();
  },

  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  }
};

// Початкові дані (fallback якщо API не працює)
const initialMenu = [
  { id: 1, name: "Торт", price: 1.0, emoji: "🍰", category: "Десерти" },
  { id: 2, name: "Бургер", price: 4.99, emoji: "🍔", category: "Страви" },
  { id: 3, name: "Картопля фрі", price: 1.49, emoji: "🍟", category: "Гарніри" },
  { id: 4, name: "Хотдог", price: 3.49, emoji: "🌭", category: "Страви" },
  { id: 5, name: "Піца", price: 7.99, emoji: "🍕", category: "Страви" },
  { id: 6, name: "Кола", price: 1.49, emoji: "🥤", category: "Напої" },
];

export default function Menu() {
  const [menu, setMenu] = useState(initialMenu);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Всі");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categories, setCategories] = useState(["Всі", "Страви", "Десерти", "Напої", "Гарніри"]);
  const [loading, setLoading] = useState(false);

  // Завантаження даних з API
  useEffect(() => {
    loadMenu();
    loadCategories();
  }, []);

  // Завантаження меню
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadMenu();
    }, 300); // Debounce для пошуку

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const items = await api.getMenu(searchTerm, selectedCategory);
      setMenu(items);
    } catch (error) {
      console.error('Error loading menu:', error);
      toast.error('Помилка завантаження меню');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Фільтрування меню (fallback для локальних даних)
  const filteredMenu = Array.isArray(menu) ? menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Всі" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) : [];

  const handleDeleteItem = async (id) => {
    try {
      await api.deleteItem(id);
      await loadMenu();
      toast.success("Товар видалено! 🗑️");
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Помилка видалення товару');
    }
  };

  const handleAddItem = async (newItem) => {
    try {
      await api.createItem(newItem);
      setShowAddModal(false);
      await loadMenu();
      toast.success("Товар успішно додано! 🎉");
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Помилка додавання товару');
    }
  };

  const handleEditItem = async (updatedItem) => {
    try {
      await api.updateItem(updatedItem.id, updatedItem);
      setEditingItem(null);
      await loadMenu();
      toast.success("Товар оновлено! ✅");
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Помилка оновлення товару');
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      {/* Пошук і фільтри */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800">Управління меню</h2>
            <span className="px-3 py-1 bg-coffee-100 text-coffee-800 rounded-full text-sm font-medium">
              {filteredMenu.length} товарів
            </span>
            {loading && <span className="text-sm text-gray-500">Завантаження...</span>}
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Додати товар
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Пошук товарів..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field pl-10 pr-8 appearance-none bg-white"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Картки товарів */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMenu.map((item, index) => (
          <div 
            key={item.id} 
            className="card p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="text-center mb-4">
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{item.name}</h3>
              <span className="text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 px-3 py-1 rounded-full">
                {item.category}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ціна:</span>
                <span className="font-bold text-transparent bg-gradient-to-r from-coffee-600 to-coffee-800 bg-clip-text text-lg">
                  {item.price.toFixed(2)} ₴
                </span>
              </div>
              {item.stock !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Склад:</span>
                  <span className="text-sm text-gray-600">{item.stock} шт</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setEditingItem(item)}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <Edit size={16} />
                Редагувати
              </button>
              <button 
                onClick={() => handleDeleteItem(item.id)}
                className="px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredMenu.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Товари не знайдено</h3>
          <p className="text-gray-500">Спробуйте змінити критерії пошуку</p>
        </div>
      )}

      {/* Модальні вікна */}
      {showAddModal && (
        <ItemModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddItem}
          title="Додати новий товар"
          categories={categories}
        />
      )}

      {editingItem && (
        <ItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleEditItem}
          title="Редагувати товар"
          categories={categories}
        />
      )}
    </div>
  );
}

// Модальне вікно для додавання/редагування товару
function ItemModal({ item, onClose, onSave, title, categories }) {
  const [formData, setFormData] = useState({
    name: item?.name || "",
    price: item?.price || "",
    emoji: item?.emoji || "🍽️",
    category: item?.category || "Страви",
    description: item?.description || "",
    stock: item?.stock || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error("Заповніть всі обов'язкові поля!");
      return;
    }
    
    onSave({
      ...(item || {}),
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">{title}</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Назва товару *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="Введіть назву"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ціна *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Склад
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категорія
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field"
                >
                  {categories.slice(1).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Емодзі
                </label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="input-field text-center text-2xl"
                  placeholder="🍽️"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Опис
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field resize-none"
                rows="3"
                placeholder="Опис товару..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
              >
                {item ? "Оновити" : "Додати"}
      </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 