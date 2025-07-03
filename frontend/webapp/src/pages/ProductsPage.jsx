import React, { useEffect, useState } from 'react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showProductCard, setShowProductCard] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [templateId, setTemplateId] = useState(3); // дефолт
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Завантажуємо дані товарів...');
      
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(),
        api.getCategories()
      ]);
      
      console.log('📦 Отримані товари:', productsData);
      console.log('🏷️ Отримані категорії:', categoriesData);
      console.log('📊 Кількість товарів:', Array.isArray(productsData) ? productsData.length : 'НЕ МАСИВ');
      
      // Підвантажуємо повну назву для кожного товару
      const productsWithFullName = await Promise.all(
        (Array.isArray(productsData) ? productsData : []).map(async (prod) => {
          try {
            const fullNameResp = await api.getProductFullName(prod.ID);
            return { ...prod, FullName: fullNameResp.FullName };
          } catch {
            return { ...prod, FullName: prod.Name };
          }
        })
      );
      setProducts(productsWithFullName);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('❌ Помилка завантаження:', error);
      // Додаткова інформація про помилку
      if (error.message) {
        console.error('📝 Повідомлення помилки:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // При виборі категорії оновлюємо templateId
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    const category = categories.find(c => c.ID === Number(categoryId));
    if (category && category.TemplateID) {
      setTemplateId(category.TemplateID);
    }
  };

  const handleDeleteProduct = async (product) => {
    // TODO: додати перевірку використання у замовленнях, якщо потрібно
    if (window.confirm('Видалити цей товар?')) {
      await api.deleteProduct(product.ID);
      loadData();
    }
  };

  // Показ ProductCard
  if (showProductCard) {
    return (
      <div style={{ marginLeft: 240, padding: 20 }}>
        <ProductCard
          templateId={templateId}
          productId={editingProductId}
          onSave={(result) => {
            setShowProductCard(false);
            setEditingProductId(null);
            loadData();
          }}
          onCancel={() => {
            setShowProductCard(false);
            setEditingProductId(null);
          }}
        />
      </div>
    );
  }

  if (loading) {
  return (
      <div style={{ 
        marginLeft: 240, 
        padding: 40, 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "60vh" 
      }}>
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "40px 60px",
          borderRadius: 20,
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Завантаження товарів...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',minHeight:'100vh',width:'100vw',padding:'32px 0'}}>
      <div style={{maxWidth:1100, margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(90deg,#7b6eea 0%,#a37c2d 100%)',borderRadius:18,padding:'18px 32px',marginBottom:32,boxShadow:'0 2px 12px #0001'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:32}}>📦</span>
            <span style={{fontSize:24,fontWeight:700,color:'#fff',letterSpacing:0.5}}>Каталог товарів</span>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={() => window.location.assign('/webapp')} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>← На головну</button>
            <button onClick={() => {
              setEditingProductId(null);
              setShowProductCard(true);
            }} style={{background:'#00b894',color:'#fff',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>+ Новий товар</button>
          </div>
        </div>
        {/* Список товарів */}
        {products.length === 0 ? (
          <div style={{
            background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
            padding: "60px",
            borderRadius: 16,
            textAlign: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>📦</div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#2d3436",
              marginBottom: 12
            }}>
              Каталог порожній
            </div>
            <div style={{ fontSize: 16, color: "#636e72", marginBottom: 24 }}>
              Додайте перший товар до каталогу
            </div>
            <button
              onClick={() => {
                setEditingProductId(null);
                setShowProductCard(true);
              }}
              style={{
                background: "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "16px 32px",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(0, 184, 148, 0.4)"
              }}
            >
              ✨ Створити перший товар
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20
          }}>
            {products.map(product => (
              <div
                key={product.ID}
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  transition: "all 0.3s",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: 380
                }}
              >
                {/* Фото товару */}
                <div style={{ position: "relative", height: 120, width: 120, margin: "0 auto" }}>
                  {product.Photo ? (
                    <img
                      src={`http://localhost:8000/api/preview/${product.Photo}`}
                      alt={product.Name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        borderRadius: 12,
                        background: "#f8f9fa"
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "100%",
                      height: "100%",
                      background: "#f8f9fa",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12
                    }}>
                      <div style={{ fontSize: 32, color: "#ccc" }}>📷</div>
                    </div>
                  )}
                </div>

                {/* Інформація про товар */}
                <div style={{ padding: "20px", flex: 1 }}>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#2d3436",
                    margin: "0 0 8px 0",
                    lineHeight: 1.3
                  }}>
                    {product.FullName || product.Name}
                  </h3>
                  
                  {product.Description && (
                    <p style={{
                      fontSize: 14,
                      color: "#636e72",
                      margin: "0 0 12px 0",
                      lineHeight: 1.4
                    }}>
                      {product.Description}
                    </p>
                  )}

                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 16
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#6c757d"
                    }}>
                      <span>🏷️</span>
                      <span>{categories.find(c => c.ID === product.CategoryID)?.CategoryName || 'Без категорії'}</span>
                    </div>
                    
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#6c757d"
                    }}>
                      <span>📊</span>
                      <span style={{
                        fontFamily: "monospace",
                        background: "#f8f9fa",
                        padding: "2px 6px",
                        borderRadius: 4
                      }}>
                        {product.Barcode || 'Без штрихкоду'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: "auto", justifyContent: "center", padding: 20 }}>
                  <button
                    onClick={() => {
                      setEditingProductId(product.ID);
                      setShowProductCard(true);
                    }}
                    style={{
                      flex: 1,
                      background: "#3498db",
                      color: "white",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      transition: "all 0.3s",
                      boxShadow: "0 4px 15px rgba(52, 152, 219, 0.2)"
                    }}
                  >
                    ✏️ Редагувати
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product)}
                    style={{
                      flex: 1,
                      background: "#e74c3c",
                      color: "white",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      transition: "all 0.3s",
                      boxShadow: "0 4px 15px rgba(231, 76, 60, 0.2)"
                    }}
                  >
                    🗑️ Видалити
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}