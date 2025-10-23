import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function SalesRegisterPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  
  // Фільтри
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    customer: '',
    paymentMethod: '',
    company: ''
  });

  // Завантаження продажів
  useEffect(() => {
    loadSales();
  }, [filters]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.customer) params.customer = filters.customer;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (filters.company) params.company = filters.company;
      
      const data = await api.getSales(params);
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Помилка завантаження продажів:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  // Завантаження деталей продажу
  const loadSaleDetails = async (saleId) => {
    try {
      const items = await api.getSaleItems(saleId);
      setSaleItems(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Помилка завантаження деталей:', error);
      setSaleItems([]);
    }
  };

  // Обробка вибору продажу
  const handleSaleSelect = (sale) => {
    setSelectedSale(sale);
    loadSaleDetails(sale.ID);
  };

  // Видалення продажу
  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей продаж?')) return;
    
    try {
      await api.deleteSale(saleId);
      await loadSales();
      if (selectedSale?.ID === saleId) {
        setSelectedSale(null);
        setSaleItems([]);
      }
    } catch (error) {
      console.error('Помилка видалення продажу:', error);
      alert('Помилка видалення продажу');
    }
  };

  // Форматування дати
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA') + ' ' + date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  };

  // Форматування суми
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('uk-UA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(amount || 0);
  };

  return (
    <div style={{background:'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',minHeight:'100vh',paddingTop:32}}>
      <div style={{marginLeft: 280, padding: 32}}>
        {/* Заголовок */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(90deg,#7b6eea 0%,#a37c2d 100%)',borderRadius:18,padding:'18px 32px',marginBottom:32,boxShadow:'0 2px 12px #0001'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:32}}>📋</span>
            <span style={{fontSize:24,fontWeight:700,color:'#fff',letterSpacing:0.5}}>Реєстр продажів</span>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={() => navigate('/sales')} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>← Назад</button>
            <button onClick={() => navigate('/webapp')} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>🏠 На головну</button>
          </div>
        </div>

        {/* Фільтри */}
        <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px #0001',padding:24,marginBottom:24}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:16,alignItems:'end'}}>
            <div>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#333'}}>Період від:</label>
              <input 
                type="date" 
                value={filters.dateFrom}
                onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}
              />
            </div>
            <div>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#333'}}>Період до:</label>
              <input 
                type="date" 
                value={filters.dateTo}
                onChange={e => setFilters({...filters, dateTo: e.target.value})}
                style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}
              />
            </div>
            <div>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#333'}}>Клієнт:</label>
              <input 
                type="text" 
                value={filters.customer}
                onChange={e => setFilters({...filters, customer: e.target.value})}
                placeholder="Пошук клієнта..."
                style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}
              />
            </div>
            <div>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#333'}}>Форма оплати:</label>
              <select 
                value={filters.paymentMethod}
                onChange={e => setFilters({...filters, paymentMethod: e.target.value})}
                style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}
              >
                <option value="">Всі</option>
                <option value="cash">Готівка</option>
                <option value="card">Картка</option>
                <option value="bank">Безготівка</option>
              </select>
            </div>
            <div>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#333'}}>Підприємство:</label>
              <select 
                value={filters.company}
                onChange={e => setFilters({...filters, company: e.target.value})}
                style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}
              >
                <option value="">Всі</option>
                {/* Тут будуть підприємства */}
              </select>
            </div>
            <div>
              <button 
                onClick={loadSales}
                style={{background:'#00b894',color:'#fff',border:'none',borderRadius:8,padding:'10px 20px',fontWeight:600,cursor:'pointer',width:'100%'}}
              >
                🔍 Пошук
              </button>
            </div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,height:'70vh'}}>
          {/* Список продажів */}
          <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px #0001',padding:24,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <h3 style={{margin:'0 0 16px 0',fontSize:18,fontWeight:700,color:'#333'}}>Перелік продажів</h3>
            
            {loading ? (
              <div style={{textAlign:'center',padding:40,color:'#666'}}>Завантаження...</div>
            ) : (
              <div style={{flex:1,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',border:'1px solid #e0c9a0',background:'#fff'}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #e0c9a0',background:'#f8f9fa'}}>
                      <th style={{textAlign:'left',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Дата</th>
                      <th style={{textAlign:'left',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Номер</th>
                      <th style={{textAlign:'right',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Сума</th>
                      <th style={{textAlign:'left',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Клієнт</th>
                      <th style={{textAlign:'left',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Оплата</th>
                      <th style={{textAlign:'left',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Підприємство</th>
                      <th style={{textAlign:'center',padding:'8px 12px',fontWeight:600}}>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr 
                        key={sale.ID} 
                        style={{
                          borderBottom:'1px solid #e0c9a0',
                          cursor:'pointer',
                          background: selectedSale?.ID === sale.ID ? '#e3f2fd' : 'transparent'
                        }}
                        onClick={() => handleSaleSelect(sale)}
                      >
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0'}}>
                          {formatDate(sale.Date)}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>
                          {sale.Number || sale.ID}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0',textAlign:'right',fontWeight:600}}>
                          {formatAmount(sale.TotalAmount)} грн
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0'}}>
                          {sale.CustomerName || 'Без назви'}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0'}}>
                          {sale.PaymentMethod === 'cash' ? 'Готівка' : 
                           sale.PaymentMethod === 'card' ? 'Картка' : 
                           sale.PaymentMethod === 'bank' ? 'Безготівка' : 'Невідомо'}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0'}}>
                          {sale.CompanyName || 'Без підприємства'}
                        </td>
                        <td style={{padding:'8px 12px',textAlign:'center'}}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/retail-sales?edit=${sale.ID}`);
                            }}
                            style={{marginRight:4,padding:'4px 8px',background:'#007bff',color:'#fff',border:'none',borderRadius:4,cursor:'pointer',fontSize:12}}
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSale(sale.ID);
                            }}
                            style={{padding:'4px 8px',background:'#dc3545',color:'#fff',border:'none',borderRadius:4,cursor:'pointer',fontSize:12}}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {sales.length === 0 && (
                  <div style={{textAlign:'center',padding:40,color:'#666'}}>
                    Продажів не знайдено
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Деталі продажу */}
          <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px #0001',padding:24,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <h3 style={{margin:'0 0 16px 0',fontSize:18,fontWeight:700,color:'#333'}}>
              Склад документа {selectedSale ? `#${selectedSale.ID}` : ''}
            </h3>
            
            {selectedSale ? (
              <div style={{flex:1,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',border:'1px solid #e0c9a0',background:'#fff'}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #e0c9a0',background:'#f8f9fa'}}>
                      <th style={{textAlign:'left',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Товар</th>
                      <th style={{textAlign:'center',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Кількість</th>
                      <th style={{textAlign:'right',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Ціна</th>
                      <th style={{textAlign:'right',padding:'8px 12px',fontWeight:600}}>Сума</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map(item => (
                      <tr key={item.ID} style={{borderBottom:'1px solid #e0c9a0'}}>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0'}}>
                          {item.ProductName || 'Без назви'}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0',textAlign:'center'}}>
                          {item.Quantity}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0',textAlign:'right'}}>
                          {formatAmount(item.Price)} грн
                        </td>
                        <td style={{padding:'8px 12px',textAlign:'right',fontWeight:600}}>
                          {formatAmount(item.TotalAmount)} грн
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {saleItems.length === 0 && (
                  <div style={{textAlign:'center',padding:40,color:'#666'}}>
                    Товари не знайдено
                  </div>
                )}
              </div>
            ) : (
              <div style={{textAlign:'center',padding:40,color:'#666'}}>
                Оберіть продаж для перегляду деталей
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



