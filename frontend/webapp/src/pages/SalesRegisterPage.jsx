import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function SalesRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const backUrl = searchParams.get('backUrl') || '/sales';
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  
  // Модалка вибору клієнта
  const [showClientPick, setShowClientPick] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientList, setClientList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Фільтри з URL параметрами
  const [filters, setFilters] = useState({
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    customer: searchParams.get('customer') || '',
    paymentMethod: searchParams.get('paymentMethod') || '',
    company: searchParams.get('company') || ''
  });

  // Обчислення статистики
  const stats = React.useMemo(() => {
    const totalAmount = sales.reduce((sum, s) => sum + (parseFloat(s.TotalAmount) || 0), 0);
    const cashAmount = sales
      .filter(s => s.PaymentMethod === 'cash')
      .reduce((sum, s) => sum + (parseFloat(s.TotalAmount) || 0), 0);
    const bankAmount = sales
      .filter(s => s.PaymentMethod === 'bank')
      .reduce((sum, s) => sum + (parseFloat(s.TotalAmount) || 0), 0);
    
    return {
      count: sales.length,
      totalAmount,
      cashAmount,
      bankAmount
    };
  }, [sales]);

  // Завантаження продажів
  useEffect(() => {
    loadSales();
  }, [filters]);

  // Завантаження клієнтів при відкритті модалки
  useEffect(() => {
    (async () => {
      if (!showClientPick) return;
      try {
        const res = await api.getClients({ q: clientSearch });
        setClientList(Array.isArray(res) ? res : []);
      } catch { 
        setClientList([]); 
      }
    })();
  }, [showClientPick, clientSearch]);

  // Ініціалізація вибраного клієнта з фільтрів (якщо є в URL)
  useEffect(() => {
    if (filters.customer && !selectedCustomer) {
      // Якщо є ім'я клієнта в фільтрах, але об'єкт не вибрано, створюємо мінімальний об'єкт для відображення
      setSelectedCustomer({ Name: filters.customer });
    }
  }, [filters.customer]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.customer) params.customer = filters.customer;
      if (filters.paymentMethod) params.payment_method = filters.paymentMethod;
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
    const sale = sales.find(s => s.ID === saleId);
    if (!sale) return;
    
    // Перевіряємо статус документа
    if (sale.Status === 'paid') {
      const forceDelete = window.confirm(
        'Цей документ вже проведений (оплачений).\n\n' +
        'Примусове видалення відкотить всі операції:\n' +
        '• Поверне товари на склад\n' +
        '• Відкотить рухи партій\n' +
        '• Видалить проводки та платежі\n\n' +
        'Ви впевнені, що хочете продовжити?'
      );
      
      if (!forceDelete) return;
      
      try {
        await api.forceDeleteSale(saleId);
        await loadSales();
        if (selectedSale?.ID === saleId) {
          setSelectedSale(null);
          setSaleItems([]);
        }
        alert('Документ та всі пов\'язані операції успішно видалено');
      } catch (error) {
        console.error('Помилка примусового видалення продажу:', error);
        alert('Помилка примусового видалення продажу: ' + (error.message || 'Невідома помилка'));
      }
    } else {
      // Звичайне видалення для чернеток
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
        alert('Помилка видалення продажу: ' + (error.message || 'Невідома помилка'));
      }
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
            <button onClick={() => navigate(backUrl)} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>← Назад</button>
            <button onClick={() => navigate('/')} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>🏠 На головну</button>
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
              <div style={{display:'flex',gap:8}}>
                <input 
                  type="text" 
                  value={selectedCustomer ? selectedCustomer.Name : ''}
                  placeholder={selectedCustomer ? selectedCustomer.Name : "Оберіть клієнта..."}
                  readOnly
                  style={{flex:1,padding:8,borderRadius:6,border:'1px solid #ccc',background:'#f8f9fa',cursor:'pointer'}}
                  onClick={() => setShowClientPick(true)}
                />
                <button 
                  onClick={() => {
                    setShowClientPick(true);
                    setClientSearch('');
                  }}
                  style={{padding:'8px 16px',background:'#007bff',color:'#fff',border:'none',borderRadius:6,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}
                >
                  Вибрати
                </button>
                {selectedCustomer && (
                  <button 
                    onClick={() => {
                      setSelectedCustomer(null);
                      setFilters({...filters, customer: ''});
                    }}
                    style={{padding:'8px 12px',background:'#dc3545',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}}
                    title="Очистити"
                  >
                    ✕
                  </button>
                )}
              </div>
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
                <option value="bank">Безготівка</option>
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
                      <th style={{textAlign:'center',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Статус</th>
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
                           sale.PaymentMethod === 'bank' ? 'Безготівка' : 'Невідомо'}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0',textAlign:'center'}}>
                          <span style={{
                            padding:'4px 8px',
                            borderRadius:12,
                            fontSize:12,
                            fontWeight:600,
                            background: sale.Status === 'paid' ? '#d4edda' : '#fff3cd',
                            color: sale.Status === 'paid' ? '#155724' : '#856404'
                          }}>
                            {sale.Status === 'paid' ? '✅ Проведений' : '📝 Чернетка'}
                          </span>
                        </td>
                        <td style={{padding:'8px 12px',textAlign:'center'}}>
                          {/* Кнопка редагування тільки для чернеток */}
                          {sale.Status === 'draft' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/sales/retail?edit=${sale.ID}`);
                              }}
                              style={{marginRight:4,padding:'4px 8px',background:'#007bff',color:'#fff',border:'none',borderRadius:4,cursor:'pointer',fontSize:12}}
                            >
                              ✏️
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSale(sale.ID);
                            }}
                            style={{
                              padding:'4px 8px',
                              background: sale.Status === 'paid' ? '#ff6b35' : '#dc3545',
                              color:'#fff',
                              border:'none',
                              borderRadius:4,
                              cursor:'pointer',
                              fontSize:12
                            }}
                            title={sale.Status === 'paid' ? 'Примусове видалення (відкотить операції)' : 'Видалити чернетку'}
                          >
                            {sale.Status === 'paid' ? '⚠️' : '🗑️'}
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
              Склад документа {selectedSale ? (selectedSale.Number || `#${selectedSale.ID}`) : ''}
            </h3>
            
            {selectedSale ? (
              <div style={{flex:1,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',border:'1px solid #e0c9a0',background:'#fff'}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #e0c9a0',background:'#f8f9fa'}}>
                      <th style={{textAlign:'center',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600,width:40}}>№</th>
                      <th style={{textAlign:'left',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Товар</th>
                      <th style={{textAlign:'center',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Кількість</th>
                      <th style={{textAlign:'right',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Ціна</th>
                      <th style={{textAlign:'right',padding:'8px 12px',borderRight:'1px solid #e0c9a0',fontWeight:600}}>Сума</th>
                      <th style={{textAlign:'left',padding:'8px 12px',fontWeight:600}}>Підприємство</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map((item, index) => (
                      <tr key={item.ID} style={{borderBottom:'1px solid #e0c9a0'}}>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0',textAlign:'center',fontWeight:600}}>
                          {index + 1}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0'}}>
                          {item.ProductName || 'Без назви'}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0',textAlign:'center'}}>
                          {item.Quantity}
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0',textAlign:'right'}}>
                          {formatAmount(item.Price)} грн
                        </td>
                        <td style={{padding:'8px 12px',borderRight:'1px solid #e0c9a0',textAlign:'right',fontWeight:600}}>
                          {formatAmount(item.TotalAmount)} грн
                        </td>
                        <td style={{padding:'8px 12px'}}>
                          {item.CompanyName || 'Без підприємства'}
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

        {/* Статистика */}
        <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px #0001',padding:24,marginTop:24}}>
          <h3 style={{margin:'0 0 16px 0',fontSize:18,fontWeight:700,color:'#333'}}>📊 Статистика</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:16}}>
            <div style={{background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',padding:16,borderRadius:12,color:'#fff'}}>
              <div style={{fontSize:14,opacity:0.9,marginBottom:4}}>Кількість чеків</div>
              <div style={{fontSize:24,fontWeight:700}}>{stats.count}</div>
            </div>
            <div style={{background:'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',padding:16,borderRadius:12,color:'#fff'}}>
              <div style={{fontSize:14,opacity:0.9,marginBottom:4}}>Загальна сума</div>
              <div style={{fontSize:24,fontWeight:700}}>{formatAmount(stats.totalAmount)} грн</div>
            </div>
            <div style={{background:'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',padding:16,borderRadius:12,color:'#fff'}}>
              <div style={{fontSize:14,opacity:0.9,marginBottom:4}}>💵 Готівка</div>
              <div style={{fontSize:20,fontWeight:700}}>{formatAmount(stats.cashAmount)} грн</div>
            </div>
            <div style={{background:'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',padding:16,borderRadius:12,color:'#fff'}}>
              <div style={{fontSize:14,opacity:0.9,marginBottom:4}}>🏦 Безготівка</div>
              <div style={{fontSize:20,fontWeight:700}}>{formatAmount(stats.bankAmount)} грн</div>
            </div>
            </div>
          </div>
        </div>

      {/* Модалка вибору клієнта */}
      {showClientPick && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,zIndex:50}}>
          <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px rgba(0,0,0,0.2)',width:'100%',maxWidth:'48rem',padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontSize:20,fontWeight:700}}>Вибір покупця</div>
              <button 
                onClick={() => setShowClientPick(false)} 
                style={{padding:'4px 12px',background:'#e9ecef',border:'none',borderRadius:6,cursor:'pointer',fontSize:18}}
              >
                ✕
              </button>
            </div>
            <input 
              value={clientSearch} 
              onChange={e => setClientSearch(e.target.value)} 
              placeholder="Пошук..." 
              style={{width:'100%',border:'1px solid #ccc',borderRadius:6,padding:'8px 12px',marginBottom:12}} 
            />
            <div style={{maxHeight:'24rem',overflow:'auto',border:'1px solid #e0c9a0',borderRadius:6}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead style={{background:'#f8f9fa'}}>
                  <tr>
                    <th style={{padding:8,textAlign:'left',borderBottom:'2px solid #e0c9a0',fontWeight:600}}>Назва</th>
                    <th style={{padding:8,textAlign:'center',borderBottom:'2px solid #e0c9a0',fontWeight:600}}>Штрихкод</th>
                    <th style={{padding:8,textAlign:'right',borderBottom:'2px solid #e0c9a0',fontWeight:600}}>Дія</th>
                  </tr>
                </thead>
                <tbody>
                  {(clientList || []).map(c => (
                    <tr key={c.ID} style={{borderTop:'1px solid #e0c9a0'}}>
                      <td style={{padding:8}}>{c.Name}</td>
                      <td style={{padding:8,textAlign:'center',fontFamily:'monospace'}}>{c.Barcode}</td>
                      <td style={{padding:8,textAlign:'right'}}>
                        <button 
                          onClick={() => {
                            setSelectedCustomer(c);
                            setFilters({...filters, customer: c.Name});
                            setShowClientPick(false);
                            setClientSearch('');
                          }}
                          style={{padding:'4px 12px',background:'#4f46e5',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontWeight:600}}
                        >
                          Обрати
                        </button>
                      </td>
                    </tr>
                  ))}
                  {clientList.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{padding:12,textAlign:'center',color:'#666'}}>
                        Нічого не знайдено
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}



