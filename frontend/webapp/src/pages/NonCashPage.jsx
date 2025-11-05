import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useUser } from '../UserContext';

export default function NonCashPage() {
  const navigate = useNavigate();
  const { centerId: activeCenterId } = useUser();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Встановлюємо по замовчуванню сьогоднішню дату
  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    dateFrom: today,
    dateTo: today,
    direction: '',
    customer: ''
  });

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = { payment_method: 'bank' };
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      // Додаємо фільтр по центру обліку
      if (activeCenterId) params.center_id = Number(activeCenterId);
      
      const data = await api.getPayments(params);
      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Помилка завантаження безготівкових платежів:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [filters.dateFrom, filters.dateTo, activeCenterId]);

  const filteredPayments = React.useMemo(() => {
    let result = payments;
    
    if (filters.direction) {
      result = result.filter(p => p.Direction === filters.direction);
    }
    
    if (filters.customer) {
      const search = filters.customer.toLowerCase();
      result = result.filter(p => {
        const payer = (p.PayerName || '').toLowerCase();
        const receiver = (p.RecipientName || '').toLowerCase();
        return payer.includes(search) || receiver.includes(search);
      });
    }
    
    return result;
  }, [payments, filters.direction, filters.customer]);

  const stats = React.useMemo(() => {
    const income = filteredPayments
      .filter(p => p.Direction === 'Надходження')
      .reduce((sum, p) => sum + Math.abs(parseFloat(p.Amount) || 0), 0);
    const outcome = filteredPayments
      .filter(p => p.Direction === 'Розрахунок')
      .reduce((sum, p) => sum + Math.abs(parseFloat(p.Amount) || 0), 0);
    
    return { count: filteredPayments.length, income, outcome };
  }, [filteredPayments]);

  const formatDate = (str) => {
    if (!str) return '';
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('uk-UA');
    } catch {
      return '';
    }
  };

  const formatAmount = (val) => {
    return new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div style={{minHeight: '100vh', background: '#f5f6fa'}}>
      <div style={{marginLeft: 280, padding: 32}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f5f6fa',borderRadius:18,padding:'18px 32px',marginBottom:32}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:32}}>🏦</span>
            <span style={{fontSize:24,fontWeight:700,color:'#333',letterSpacing:0.5}}>Безготівкові платежі</span>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={() => navigate('/finance')} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>← Назад</button>
            <button onClick={() => navigate('/')} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>🏠 На головну</button>
          </div>
        </div>

        {/* Фільтри */}
        <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px #0001',padding:24,marginBottom:24}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:16,alignItems:'end'}}>
            <div>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#333'}}>Дата від</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} style={{width:'100%',padding:'10px 14px',border:'2px solid #e0e0e0',borderRadius:10,fontSize:15}} />
            </div>
            <div>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#333'}}>Дата до</label>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilters({...filters, dateTo: e.target.value})} style={{width:'100%',padding:'10px 14px',border:'2px solid #e0e0e0',borderRadius:10,fontSize:15}} />
            </div>
            <div>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#333'}}>Напрямок</label>
              <select value={filters.direction} onChange={(e) => setFilters({...filters, direction: e.target.value})} style={{width:'100%',padding:'10px 14px',border:'2px solid #e0e0e0',borderRadius:10,fontSize:15}}>
                <option value="">Всі</option>
                <option value="Надходження">Надходження</option>
                <option value="Розрахунок">Розрахунок</option>
              </select>
            </div>
            <div>
              <label style={{display:'block',marginBottom:8,fontWeight:600,color:'#333'}}>Платник / Отримувач</label>
              <input type="text" value={filters.customer} onChange={(e) => setFilters({...filters, customer: e.target.value})} placeholder="Пошук..." style={{width:'100%',padding:'10px 14px',border:'2px solid #e0e0e0',borderRadius:10,fontSize:15}} />
            </div>
            <button onClick={loadPayments} style={{background:'#7b6eea',color:'#fff',border:'none',borderRadius:10,padding:'10px 24px',fontWeight:700,fontSize:15,cursor:'pointer'}}>🔍 Пошук</button>
          </div>
        </div>

        {/* Статистика */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:24}}>
          <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px #0001',padding:24,textAlign:'center'}}>
            <div style={{fontSize:36,fontWeight:700,color:'#7b6eea'}}>{stats.count}</div>
            <div style={{fontSize:16,color:'#666',marginTop:8}}>Кількість операцій</div>
          </div>
          <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px #0001',padding:24,textAlign:'center'}}>
            <div style={{fontSize:36,fontWeight:700,color:'#28a745'}}>{formatAmount(stats.income)}</div>
            <div style={{fontSize:16,color:'#666',marginTop:8}}>Загальний прибуток</div>
          </div>
          <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px #0001',padding:24,textAlign:'center'}}>
            <div style={{fontSize:36,fontWeight:700,color:'#dc3545'}}>{formatAmount(stats.outcome)}</div>
            <div style={{fontSize:16,color:'#666',marginTop:8}}>Загальний видаток</div>
          </div>
        </div>

        {/* Таблиця */}
        <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px #0001',padding:24}}>
          <div style={{fontSize:20,fontWeight:700,marginBottom:20}}>Список операцій</div>
          {loading ? (
            <div style={{textAlign:'center',padding:40}}>Завантаження...</div>
          ) : filteredPayments.length === 0 ? (
            <div style={{textAlign:'center',padding:40,color:'#999'}}>Немає операцій</div>
          ) : (
            <div style={{overflow:'auto',display:'flex',justifyContent:'center'}}>
              <table style={{width:'100%',maxWidth:'100%',borderCollapse:'collapse',margin:'0 auto'}}>
                <thead>
                  <tr style={{background:'#f8f9fa',borderBottom:'2px solid #dee2e6'}}>
                    <th style={{padding:'12px',textAlign:'left',fontWeight:600}}>№</th>
                    <th style={{padding:'12px',textAlign:'left',fontWeight:600}}>Дата</th>
                    <th style={{padding:'12px',textAlign:'left',fontWeight:600}}>Номер документа</th>
                    <th style={{padding:'12px',textAlign:'left',fontWeight:600}}>Платник</th>
                    <th style={{padding:'12px',textAlign:'left',fontWeight:600}}>Отримувач</th>
                    <th style={{padding:'12px',textAlign:'left',fontWeight:600}}>Напрямок</th>
                    <th style={{padding:'12px',textAlign:'right',fontWeight:600}}>Сума</th>
                    <th style={{padding:'12px',textAlign:'left',fontWeight:600}}>Підстава</th>
                    <th style={{padding:'12px',textAlign:'left',fontWeight:600}}>Підстава оплати</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{padding:'40px',textAlign:'center',color:'#999'}}>
                        Операцій не знайдено
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p, idx) => (
                      <tr key={p.ID} style={{borderBottom:'1px solid #eee'}}>
                        <td style={{padding:'12px'}}>{idx + 1}</td>
                        <td style={{padding:'12px'}}>{formatDate(p.RelatedDocumentDate || p.Date)}</td>
                        <td style={{padding:'12px'}}>{p.RelatedDocumentNumber || p.DocumentNumber || '-'}</td>
                        <td style={{padding:'12px'}}>{p.PayerName || '-'}</td>
                        <td style={{padding:'12px'}}>{p.RecipientName || '-'}</td>
                        <td style={{padding:'12px'}}>
                          <span style={{padding:'4px 12px',borderRadius:6,fontSize:13,fontWeight:600,background:p.Direction === 'Надходження' ? '#d4edda' : '#f8d7da',color:p.Direction === 'Надходження' ? '#155724' : '#721c24'}}>
                            {p.Direction || '-'}
                          </span>
                        </td>
                        <td style={{padding:'12px',fontWeight:600,textAlign:'right'}}>{formatAmount(Math.abs(parseFloat(p.Amount) || 0))}</td>
                        <td style={{padding:'12px'}}>{p.OperationPurposeWithDate || p.OperationPurpose || '-'}</td>
                        <td style={{padding:'12px'}}>{p.Notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

