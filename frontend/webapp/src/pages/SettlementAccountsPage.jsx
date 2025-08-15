import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function SettlementAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    AccountName: '', AccountNumber: '', BankName: '', BankCity: '', MFO: '', IsActive: true
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    api.getSettlementAccounts().then(setAccounts);
  }

  function handleAddClick() {
    setForm({ AccountName: '', AccountNumber: '', BankName: '', BankCity: '', MFO: '', IsActive: true });
    setEditingId(null);
    setShowForm(true);
  }

  function handleEditClick(account) {
    setForm({ ...account });
    setEditingId(account.ID);
    setShowForm(true);
  }

  async function handleSave() {
    // validation
    if (!form.AccountName || !form.AccountNumber || !form.BankName) return;
    if (editingId) {
      await api.updateSettlementAccount(editingId, form);
    } else {
      await api.addSettlementAccount(form);
    }
    setShowForm(false);
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id) {
    if (window.confirm("Видалити рахунок?")) {
      await api.deleteSettlementAccount(id);
      refresh();
    }
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingId(null);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "50px auto", padding: 0 }}>
      <h2 style={{
        marginBottom: 18, fontWeight: 800, fontSize: 34, letterSpacing: ".01em"
      }}>Розрахункові рахунки</h2>

      <button
        style={addBtnStyle}
        onClick={handleAddClick}
      >
        + Додати рахунок
      </button>

      {/* --- ФОРМА ДОДАВАННЯ/РЕДАГУВАННЯ --- */}
      {showForm && (
        <div style={modalCardStyle}>
          <h3 style={{ marginBottom: 18, fontWeight: 700 }}>
            {editingId ? "Редагувати рахунок" : "Додати рахунок"}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormFields form={form} setForm={setForm} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={handleSave} style={saveBtnStyle}>
                {editingId ? "Зберегти" : "Додати"}
              </button>
              <button onClick={handleCloseForm} style={cancelBtnStyle}>Відміна</button>
            </div>
          </div>
        </div>
      )}

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Назва</th>
              <th style={headerCellStyle}>Рахунок</th>
              <th style={headerCellStyle}>Банк</th>
              <th style={headerCellStyle}>Місто</th>
              <th style={headerCellStyle}>МФО</th>
              <th style={{ ...headerCellStyle, textAlign: 'center', minWidth: 110 }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(a =>
              <tr key={a.ID} style={rowStyle}>
                <td style={cellStyle}>{a.AccountName}</td>
                <td style={cellStyle}>{a.AccountNumber}</td>
                <td style={cellStyle}>{a.BankName}</td>
                <td style={cellStyle}>{a.BankCity}</td>
                <td style={cellStyle}>{a.MFO}</td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <button onClick={() => handleEditClick(a)} style={editBtnStyle} title="Редагувати">✏️</button>
                  <button onClick={() => handleDelete(a.ID)} style={deleteBtnStyle} title="Видалити">🗑️</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- FIELDS --- //
function FormFields({ form, setForm }) {
  return (
    <>
      <div>
        <label style={labelStyle}>Назва:</label>
        <input
          value={form.AccountName}
          onChange={e => setForm(f => ({ ...f, AccountName: e.target.value }))}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Рахунок:</label>
        <input
          value={form.AccountNumber}
          onChange={e => setForm(f => ({ ...f, AccountNumber: e.target.value }))}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Банк:</label>
        <input
          value={form.BankName}
          onChange={e => setForm(f => ({ ...f, BankName: e.target.value }))}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Місто:</label>
        <input
          value={form.BankCity}
          onChange={e => setForm(f => ({ ...f, BankCity: e.target.value }))}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>МФО:</label>
        <input
          value={form.MFO}
          onChange={e => setForm(f => ({ ...f, MFO: e.target.value }))}
          style={inputStyle}
        />
      </div>
    </>
  );
}

// --- СТИЛІ --- //
const addBtnStyle = {
  background: "#208f41",
  color: "#fff",
  padding: "12px 32px",
  borderRadius: 10,
  fontSize: 18,
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 8px #0001",
  marginBottom: 18
};
const tableWrapStyle = {
  background: '#fff',
  borderRadius: 18,
  boxShadow: '0 4px 24px #0001',
  padding: 0,
  marginTop: 0,
  overflow: "hidden",
  marginBottom: 24,
};
const tableStyle = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  border: "2px solid #000",
  background: '#fff',
  borderRadius: 18,
  fontFamily: "inherit",
  overflow: "hidden"
};
const headerCellStyle = {
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 16,
  padding: '16px 14px',
  background: '#e8d7f7',
  color: "#1a103a",
  border: "2px solid #000",
};
const cellStyle = {
  padding: '16px 14px',
  border: "2px solid #000",
  background: "#fff",
  fontSize: 15,
  color: "#22105a"
};
const rowStyle = {
  background: "#fff"
};
const labelStyle = {
  fontWeight: 500,
  marginBottom: 3,
  display: "inline-block"
};
const inputStyle = {
  width: '100%',
  padding: 11,
  borderRadius: 9,
  border: '1px solid #ccc',
  fontSize: 16,
  marginTop: 2,
  marginBottom: 0
};
const modalCardStyle = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 4px 24px #0001',
  padding: 32,
  marginBottom: 32,
  maxWidth: 600
};
const saveBtnStyle = {
  background: '#208f41',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 32px',
  fontWeight: 600,
  fontSize: 16,
  cursor: "pointer"
};
const cancelBtnStyle = {
  background: '#6c757d',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 32px',
  fontWeight: 600,
  fontSize: 16,
  marginLeft: 12,
  cursor: "pointer"
};
const editBtnStyle = {
  background: "#fff8c5",
  border: "2px solid #c0b31c",
  borderRadius: 8,
  color: "#856800",
  fontWeight: 700,
  padding: "7px 14px",
  marginRight: 10,
  fontSize: 20,
  cursor: "pointer"
};
const deleteBtnStyle = {
  background: "#ffe3e3",
  border: "2px solid #d64040",
  borderRadius: 8,
  color: "#d64040",
  fontWeight: 700,
  padding: "7px 14px",
  fontSize: 20,
  cursor: "pointer"
};
