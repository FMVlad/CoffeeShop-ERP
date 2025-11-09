import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useUser } from '../UserContext';

const pageWrapperStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #f9f5ff 0%, #ebe6ff 45%, #f2f9ff 100%)',
  padding: '40px 24px 80px'
};

const layoutStyle = {
  maxWidth: 1320,
  margin: '0 auto'
};

const heroCardStyle = {
  background: 'linear-gradient(120deg, #5f7dff 0%, #6f99ff 35%, #8ab2ff 100%)',
  borderRadius: 34,
  padding: '56px 38px',
  color: '#fff',
  boxShadow: '0 30px 68px rgba(95, 125, 255, 0.32)',
  position: 'relative',
  overflow: 'hidden'
};

const heroIconStyle = {
  fontSize: 56,
  display: 'block',
  marginBottom: 18
};

const heroTitleStyle = {
  fontSize: 46,
  fontWeight: 800,
  marginBottom: 10,
  letterSpacing: 0.8
};

const heroSubtitleStyle = {
  fontSize: 20,
  opacity: 0.9
};

const heroActionsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 18,
  justifyContent: 'center',
  marginTop: 34
};

const heroBtnBase = {
  border: 'none',
  borderRadius: 18,
  padding: '14px 36px',
  fontWeight: 700,
  fontSize: 18,
  cursor: 'pointer',
  color: '#fff',
  boxShadow: '0 18px 42px rgba(0, 0, 0, 0.18)',
  transition: 'transform .18s ease, box-shadow .18s ease'
};

const backBtnStyle = {
  ...heroBtnBase,
  background: 'linear-gradient(120deg, #4bb4ff 0%, #5dc8ff 100%)'
};

const homeBtnStyle = {
  ...heroBtnBase,
  background: 'linear-gradient(120deg, #ff8b68 0%, #ff6f61 100%)'
};

const filtersCardStyle = {
  background: '#ffffffee',
  borderRadius: 28,
  padding: 36,
  marginTop: -42,
  boxShadow: '0 24px 48px rgba(41, 78, 143, 0.2)',
  backdropFilter: 'blur(3px)'
};

const filtersGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 22,
  alignItems: 'end'
};

const labelStyle = {
  display: 'block',
  marginBottom: 10,
  fontWeight: 600,
  color: '#20315f',
  fontSize: 15,
  letterSpacing: 0.3
};

const controlStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 14,
  border: '2px solid rgba(95, 120, 190, 0.25)',
  fontSize: 15,
  outline: 'none',
  boxShadow: '0 6px 20px rgba(95, 120, 190, 0.12)',
  background: '#fff'
};

const searchBtnStyle = {
  background: 'linear-gradient(135deg, #5f7dff 0%, #7a99ff 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 14,
  padding: '12px 28px',
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
  boxShadow: '0 18px 36px rgba(95, 125, 255, 0.28)',
  justifySelf: 'center'
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 26,
  marginTop: 32
};

const statCardStyle = {
  background: '#fff',
  borderRadius: 24,
  padding: '32px 28px',
  textAlign: 'center',
  boxShadow: '0 22px 48px rgba(68, 91, 140, 0.2)'
};

const statValueStyle = (color) => ({
  fontSize: 50,
  fontWeight: 800,
  color
});

const statLabelStyle = {
  fontSize: 16,
  color: '#3e4d74',
  marginTop: 10,
  letterSpacing: 0.2
};

const tableSectionStyle = {
  background: '#fff',
  borderRadius: 28,
  marginTop: 40,
  boxShadow: '0 28px 56px rgba(68, 91, 140, 0.2)',
  border: '2px solid #c8d7ff',
  overflow: 'hidden'
};

const tableHeaderStyle = {
  fontSize: 22,
  fontWeight: 800,
  color: '#20315f',
  padding: '28px 36px',
  borderBottom: '2px solid #c8d7ff'
};

const tableContainerStyle = {
  width: '100%',
  overflowX: 'auto'
};

const tableStyle = {
  width: '100%',
  minWidth: 960,
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontFamily: 'inherit'
};

const tableHeadCellStyle = {
  padding: '18px 22px',
  fontWeight: 700,
  fontSize: 15,
  textAlign: 'left',
  background: '#e8f0ff',
  color: '#20315f',
  borderBottom: '2px solid #c4d5ff',
  borderRight: '2px solid #c4d5ff'
};

const tableCellStyle = {
  padding: '16px 22px',
  fontSize: 15,
  color: '#1b2747',
  background: '#fff',
  borderBottom: '1px solid #dde7ff',
  borderRight: '2px solid #e6efff'
};

const badgeStyleBase = {
  padding: '7px 16px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.4,
  display: 'inline-block'
};

export default function NonCashPage() {
  const navigate = useNavigate();
  const { centerId: activeCenterId } = useUser();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

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
      result = result.filter((p) => p.Direction === filters.direction);
    }

    if (filters.customer) {
      const search = filters.customer.toLowerCase();
      result = result.filter((p) => {
        const payer = (p.PayerName || '').toLowerCase();
        const receiver = (p.RecipientName || '').toLowerCase();
        return payer.includes(search) || receiver.includes(search);
      });
    }

    return result;
  }, [payments, filters.direction, filters.customer]);

  const stats = React.useMemo(() => {
    const income = filteredPayments
      .filter((p) => p.Direction === 'Надходження')
      .reduce((sum, p) => sum + Math.abs(parseFloat(p.Amount) || 0), 0);
    const outcome = filteredPayments
      .filter((p) => p.Direction === 'Розрахунок')
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
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div style={pageWrapperStyle}>
      <div style={layoutStyle}>
        <div style={heroCardStyle}>
          <span style={heroIconStyle}>🏦</span>
          <div style={heroTitleStyle}>Безготівкові платежі</div>
          <div style={heroSubtitleStyle}>
            Контроль банківських операцій, надходжень та розрахунків
          </div>

          <div style={heroActionsStyle}>
            <button type="button" onClick={() => navigate('/finance')} style={backBtnStyle}>
              ← Назад
            </button>
            <button type="button" onClick={() => navigate('/')} style={homeBtnStyle}>
              🏠 На головну
            </button>
          </div>
        </div>

        <div style={filtersCardStyle}>
          <div style={filtersGridStyle}>
            <div>
              <label style={labelStyle}>Дата від</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                style={controlStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Дата до</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                style={controlStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Напрямок</label>
              <select
                value={filters.direction}
                onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
                style={controlStyle}
              >
                <option value="">Всі</option>
                <option value="Надходження">Надходження</option>
                <option value="Розрахунок">Розрахунок</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Платник / Отримувач</label>
              <input
                type="text"
                value={filters.customer}
                placeholder="Пошук..."
                onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
                style={controlStyle}
              />
            </div>
            <button type="button" onClick={loadPayments} style={searchBtnStyle}>
              🔍 Пошук
            </button>
          </div>

          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <div style={statValueStyle('#5f7dff')}>{stats.count}</div>
              <div style={statLabelStyle}>Кількість операцій</div>
            </div>
            <div style={statCardStyle}>
              <div style={statValueStyle('#00c48c')}>{formatAmount(stats.income)}</div>
              <div style={statLabelStyle}>Загальне надходження</div>
            </div>
            <div style={statCardStyle}>
              <div style={statValueStyle('#ff6f61')}>{formatAmount(stats.outcome)}</div>
              <div style={statLabelStyle}>Загальний розрахунок</div>
            </div>
          </div>
        </div>

        <div style={tableSectionStyle}>
          <div style={tableHeaderStyle}>Список операцій</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 64, fontSize: 18, color: '#3e4d74' }}>
              Завантаження...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 64, fontSize: 18, color: '#60719d' }}>
              Немає операцій
            </div>
          ) : (
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...tableHeadCellStyle, borderLeft: '2px solid #c4d5ff' }}>№</th>
                    <th style={tableHeadCellStyle}>Дата</th>
                    <th style={tableHeadCellStyle}>Номер документа</th>
                    <th style={tableHeadCellStyle}>Платник</th>
                    <th style={tableHeadCellStyle}>Отримувач</th>
                    <th style={tableHeadCellStyle}>Напрямок</th>
                    <th style={{ ...tableHeadCellStyle, textAlign: 'right' }}>Сума</th>
                    <th style={tableHeadCellStyle}>Підстава</th>
                    <th style={{ ...tableHeadCellStyle, borderRight: '2px solid #c4d5ff' }}>
                      Підстава оплати
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p, idx) => (
                    <tr key={p.ID}>
                      <td style={{ ...tableCellStyle, borderLeft: '2px solid #e6efff' }}>{idx + 1}</td>
                      <td style={tableCellStyle}>{formatDate(p.RelatedDocumentDate || p.Date)}</td>
                      <td style={tableCellStyle}>{p.RelatedDocumentNumber || p.DocumentNumber || '-'}</td>
                      <td style={tableCellStyle}>{p.PayerName || '-'}</td>
                      <td style={tableCellStyle}>{p.RecipientName || '-'}</td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            ...badgeStyleBase,
                            background:
                              p.Direction === 'Надходження'
                                ? 'rgba(0, 196, 140, 0.16)'
                                : 'rgba(255, 111, 97, 0.16)',
                            color: p.Direction === 'Надходження' ? '#00996a' : '#e0544d'
                          }}
                        >
                          {p.Direction || '-'}
                        </span>
                      </td>
                      <td style={{ ...tableCellStyle, fontWeight: 700, textAlign: 'right' }}>
                        {formatAmount(Math.abs(parseFloat(p.Amount) || 0))}
                      </td>
                      <td style={tableCellStyle}>
                        {p.OperationPurposeWithDate || p.OperationPurpose || '-'}
                      </td>
                      <td style={{ ...tableCellStyle, borderRight: '2px solid #e6efff' }}>
                        {p.Notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


