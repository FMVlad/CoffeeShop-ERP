import React, { useEffect, useState } from "react";
import { api } from '../api';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCompany());
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    refresh();
    api.getSettlementAccounts().then(setAccounts);
  }, []);

  function refresh() {
    api.getCompanies().then(setCompanies);
  }

  function emptyCompany() {
    return {
      Name: "", ShortName: "", EDRPOU: "", IPN: "", Address: "", RegistrationInfo: "", TaxInfo: "", MainAccountID: ""
    };
  }

  function handleAddClick() {
    setForm(emptyCompany());
    setEditingId(null);
    setShowForm(true);
  }

  function handleEditClick(company) {
    setForm({ ...company });
    setEditingId(company.ID);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.Name) return;
    if (editingId) {
      await api.updateCompany({ ...form, ID: editingId });
    } else {
      await api.addCompany(form);
    }
    setShowForm(false);
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id) {
    if (window.confirm("Видалити підприємство?")) {
      await api.deleteCompany(id);
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
      }}>Підприємства</h2>

      <button
        style={addBtnStyle}
        onClick={handleAddClick}
      >
        + Додати підприємство
      </button>

      {/* --- ФОРМА ДОДАВАННЯ/РЕДАГУВАННЯ --- */}
      {showForm && (
        <div style={modalCardStyle}>
          <h3 style={{ marginBottom: 18, fontWeight: 700 }}>
            {editingId ? "Редагувати підприємство" : "Додати підприємство"}
          </h3>
          <CompanyForm
            form={form}
            setForm={setForm}
            accounts={accounts}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={handleSave} style={saveBtnStyle}>
              {editingId ? "Зберегти" : "Додати"}
            </button>
            <button onClick={handleCloseForm} style={cancelBtnStyle}>Відміна</button>
          </div>
        </div>
      )}

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Назва</th>
              <th style={headerCellStyle}>ЄДРПОУ</th>
              <th style={headerCellStyle}>ІПН</th>
              <th style={headerCellStyle}>Адреса</th>
              <th style={headerCellStyle}>Рахунок</th>
              <th style={{ ...headerCellStyle, textAlign: 'center', minWidth: 110 }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c =>
              <tr key={c.ID} style={rowStyle}>
                <td style={cellStyle}>{c.Name}</td>
                <td style={cellStyle}>{c.EDRPOU}</td>
                <td style={cellStyle}>{c.IPN}</td>
                <td style={cellStyle}>{c.Address}</td>
                <td style={cellStyle}>
                  {accounts.find(a => a.ID === c.MainAccountID)?.AccountNumber || ''}
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <button onClick={() => handleEditClick(c)} style={editBtnStyle} title="Редагувати">✏️</button>
                  <button onClick={() => handleDelete(c.ID)} style={deleteBtnStyle} title="Видалити">🗑️</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- FORM FIELDS --- //
function CompanyForm({ form, setForm, accounts }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Скорочено:</label>
          <input
            value={form.ShortName}
            onChange={e => setForm(f => ({ ...f, ShortName: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Назва:</label>
          <input
            value={form.Name}
            onChange={e => setForm(f => ({ ...f, Name: e.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>ЄДРПОУ:</label>
          <input
            value={form.EDRPOU}
            onChange={e => setForm(f => ({ ...f, EDRPOU: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>ІПН:</label>
          <input
            value={form.IPN}
            onChange={e => setForm(f => ({ ...f, IPN: e.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Адреса:</label>
          <input
            value={form.Address}
            onChange={e => setForm(f => ({ ...f, Address: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Розрахунковий рахунок:</label>
          <select
            value={form.MainAccountID || ""}
            onChange={e => setForm(f => ({ ...f, MainAccountID: e.target.value }))}
            style={inputStyle}
          >
            <option value="">— Розрахункові —</option>
            {accounts.map(acc => (
              <option key={acc.ID} value={acc.ID}>
                {acc.AccountNumber} {acc.BankName ? `(${acc.BankName})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
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
  maxWidth: 650
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
