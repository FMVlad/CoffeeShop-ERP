// src/components/AccountsTab.jsx

import React, { useEffect, useState } from "react";
import { api } from '../api';

export default function AccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Порожній шаблон для нового рахунку
  const emptyAccount = {
    AccountCode: "",
    Name: "",
    ParentID: null,
    AccountType: "",
    AccountPurpose: "",
    CurrencyID: null,
    IsActive: true,
    IsSystem: false,
    Notes: "",
  };
  const [newAccount, setNewAccount] = useState(emptyAccount);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = () => {
    setLoading(true);
    api.getChartOfAccounts().then(data => {
      setAccounts(data);
      setLoading(false);
    });
  };

  function buildTree(items, parentId = null) {
    return items
      .filter(item => item.ParentID === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.ID)
      }));
  }
  const accountsTree = buildTree(accounts);

  const handleFormChange = (key, value) => {
    if (editing) {
      setEditing({ ...editing, [key]: value });
    } else {
      setNewAccount({ ...newAccount, [key]: value });
    }
  };

  const handleAdd = (parentID = null) => {
    setEditing(null);
    setNewAccount({ ...emptyAccount, ParentID: parentID });
    setShowForm(true);
  };

  const handleEdit = (account) => {
    setEditing(account);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Видалити рахунок?")) {
      await api.deleteChartOfAccount(id);
      fetchAccounts();
    }
  };

  const handleSubmit = async () => {
    if (editing) {
      await api.updateChartOfAccount(editing.ID, editing);
    } else {
      await api.addChartOfAccount(newAccount);
    }
    setEditing(null);
    setShowForm(false);
    fetchAccounts();
  };

  function renderAccounts(nodes, level = 0) {
    return nodes.map(node => (
      <React.Fragment key={node.ID}>
        <tr>
          <td style={{
            ...cellStyle,
            paddingLeft: 18 + 28 * level,
            fontWeight: node.ParentID ? 500 : 700,
            fontSize: node.ParentID ? 16 : 19,
            background: node.ParentID ? "#faf5eb" : "#e6d7fa",
            color: node.ParentID ? "#755d28" : "#22105a",
          }}>
            {node.Name}
          </td>
          <td style={cellStyle}>{node.AccountCode}</td>
          <td style={cellStyle}>{node.AccountType}</td>
          <td style={cellStyle}>{node.AccountPurpose}</td>
          <td style={cellStyle}>{node.Notes}</td>
          <td style={{ ...cellStyle, textAlign: "center" }}>{node.IsActive ? '✅' : ''}</td>
          <td style={{ ...cellStyle, textAlign: "center" }}>
            <button onClick={() => handleEdit(node)} style={editBtnStyle}>✏️</button>
            <button onClick={() => handleAdd(node.ID)} style={addBtnStyleInner}>➕</button>
            <button onClick={() => handleDelete(node.ID)} style={deleteBtnStyle}>🗑️</button>
          </td>
        </tr>
        {node.children && node.children.length > 0 && renderAccounts(node.children, level + 1)}
      </React.Fragment>
    ));
  }

  return (
    <div>
      <button onClick={() => handleAdd(null)} style={addBtnStyle}>+ Додати рахунок</button>
      {(showForm || editing) && (
        <div style={{
          background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001',
          padding: 32, marginBottom: 32, maxWidth: 800
        }}>
          <h3 style={{ marginBottom: 18, fontWeight: 700 }}>{editing ? 'Редагувати рахунок' : 'Додати рахунок'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500 }}>Назва рахунку:</label>
                <input value={(editing ? editing.Name : newAccount.Name) || ""}
                  onChange={e => handleFormChange('Name', e.target.value)}
                  style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500 }}>Код рахунку:</label>
                <input value={(editing ? editing.AccountCode : newAccount.AccountCode) || ""}
                  onChange={e => handleFormChange('AccountCode', e.target.value)}
                  style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500 }}>Тип:</label>
                <input value={(editing ? editing.AccountType : newAccount.AccountType) || ""}
                  onChange={e => handleFormChange('AccountType', e.target.value)}
                  style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500 }}>Мета:</label>
                <input value={(editing ? editing.AccountPurpose : newAccount.AccountPurpose) || ""}
                  onChange={e => handleFormChange('AccountPurpose', e.target.value)}
                  style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500 }}>Примітки:</label>
                <input value={(editing ? editing.Notes : newAccount.Notes) || ""}
                  onChange={e => handleFormChange('Notes', e.target.value)}
                  style={inputStyle} />
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: "center",
              gap: 36,
              marginTop: 18,
              marginBottom: 8,
              flexWrap: "wrap"
            }}>
              <span style={{ fontWeight: 500, minWidth: 90 }}>Активний:</span>
              <input
                type="checkbox"
                checked={!!(editing ? editing.IsActive : newAccount.IsActive)}
                onChange={e => handleFormChange('IsActive', e.target.checked)}
                style={{ width: 22, height: 22, marginRight: 12 }}
              />
              <span style={{ fontWeight: 500, minWidth: 120 }}>Системний:</span>
              <input
                type="checkbox"
                checked={!!(editing ? editing.IsSystem : newAccount.IsSystem)}
                onChange={e => handleFormChange('IsSystem', e.target.checked)}
                style={{ width: 22, height: 22, marginRight: 12 }}
              />
              <span style={{ fontWeight: 500, minWidth: 170 }}>Батьківський рахунок:</span>
              <select
                value={(editing ? editing.ParentID : newAccount.ParentID) ?? ""}
                onChange={e => handleFormChange('ParentID', e.target.value ? Number(e.target.value) : null)}
                style={selectStyle}
              >
                <option value="">Без батьківського рахунку</option>
                {accounts
                  .filter(a => !editing || a.ID !== editing.ID)
                  .map(acc => (
                    <option key={acc.ID} value={acc.ID}>
                      {acc.Name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={handleSubmit}
              style={formBtnStyle}>
              {editing ? 'Зберегти' : 'Додати'}
            </button>
            <button onClick={() => { setEditing(null); setShowForm(false); }}
              style={cancelBtnStyle}>
              Відміна
            </button>
          </div>
        </div>
      )}
      {loading ? <div>Завантаження...</div> : (
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 2px 8px #0001',
          marginTop: 12,
          border: '2px solid #000'
        }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Назва</th>
              <th style={headerCellStyle}>Код</th>
              <th style={headerCellStyle}>Тип</th>
              <th style={headerCellStyle}>Мета</th>
              <th style={headerCellStyle}>Примітки</th>
              <th style={{ ...headerCellStyle, textAlign: "center", width: 110 }}>Активний</th>
              <th style={{ ...headerCellStyle, textAlign: "center", width: 170 }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {renderAccounts(accountsTree)}
          </tbody>
        </table>
      )}
    </div>
  );
}

// --- СТИЛІ --- //
const headerCellStyle = {
  background: "#e6d7fa",
  color: "#22105a",
  fontWeight: 700,
  fontSize: 17,
  padding: "14px 18px",
  border: "2px solid #000",
  textAlign: "left"
};
const cellStyle = {
  padding: "12px 18px",
  border: "2px solid #000",
  fontSize: 15,
  color: "#22105a",
  background: "#fff"
};
const inputStyle = {
  width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 16
};
const selectStyle = {
  minWidth: 340,
  maxWidth: 420,
  width: "100%",
  padding: "8px",
  borderRadius: 6,
  border: "1px solid #ccc",
  fontSize: 16,
  background: "#fff",
  flex: 2
};
const addBtnStyle = {
  background: "#208f41", color: "#fff", padding: "10px 28px",
  borderRadius: 10, fontSize: 18, border: "none", fontWeight: 700, cursor: "pointer",
  marginBottom: 12, boxShadow: "0 2px 8px #0001"
};
const addBtnStyleInner = {
  background: "#e7e464",
  color: "#8d4f00",
  border: "2px solid #d8c820",
  borderRadius: 8,
  padding: "6px 11px",
  fontWeight: 700,
  fontSize: 19,
  marginRight: 8,
  cursor: "pointer"
};
const editBtnStyle = {
  background: "#fff8c5",
  border: "2px solid #c0b31c",
  borderRadius: 8,
  color: "#856800",
  fontWeight: 700,
  padding: "6px 11px",
  marginRight: 8,
  fontSize: 19,
  cursor: "pointer"
};
const deleteBtnStyle = {
  background: "#ffe3e3",
  border: "2px solid #d64040",
  borderRadius: 8,
  color: "#d64040",
  fontWeight: 700,
  padding: "6px 11px",
  fontSize: 19,
  cursor: "pointer"
};
const formBtnStyle = {
  background: "#c4282d", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontWeight: 600, fontSize: 16
};
const cancelBtnStyle = {
  background: "#6c757d", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontWeight: 600, fontSize: 16, marginLeft: 12
};
