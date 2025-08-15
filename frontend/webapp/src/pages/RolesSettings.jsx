import React, { useEffect, useState } from "react";
import { api } from "../api"; // Використовуй api, не fetch!

export default function RolesSettings() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formRole, setFormRole] = useState({ RoleName: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const rs = await api.getRoles();
    setRoles(rs);
    setLoading(false);
  };

  const handleAdd = () => {
    setEditing(null);
    setFormRole({ RoleName: "" });
    setShowForm(true);
  };

  const handleEdit = (role) => {
    setEditing(role);
    setFormRole({ RoleName: role.RoleName });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Видалити роль?")) {
      await api.deleteRole(id);
      load();
    }
  };

  const handleSubmit = async () => {
    if (!formRole.RoleName.trim()) {
      alert("Введіть назву ролі");
      return;
    }
    if (editing) {
      await api.updateRole(editing.ID, formRole);
    } else {
      await api.addRole(formRole);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: ".02em" }}>Ролі</h2>
        <button onClick={handleAdd} style={addBtnStyle}>+ Додати роль</button>
      </div>
      {showForm && (
        <div style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 4px 32px #0002",
          padding: 36,
          marginBottom: 36,
          maxWidth: 440
        }}>
          <h3 style={{ marginBottom: 18, fontWeight: 700 }}>
            {editing ? "Редагувати роль" : "Додати роль"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input
              value={formRole.RoleName}
              onChange={e => setFormRole({ ...formRole, RoleName: e.target.value })}
              style={inputStyle}
              placeholder="Назва ролі"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 20 }}>
            <button
              onClick={handleSubmit}
              style={saveBtnStyle}
            >
              {editing ? "Зберегти" : "Додати"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditing(null); }}
              style={cancelBtnStyle}
            >
              Відміна
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div>Завантаження...</div>
      ) : (
        <div style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 4px 32px #0002",
          padding: 0,
          margin: 0,
          overflow: "hidden"
        }}>
          <table style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            fontFamily: "inherit",
            borderRadius: 18,
            overflow: "hidden",
            margin: 0,
            boxShadow: "0 0 0 2px #000"
          }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Назва ролі</th>
                <th style={{ ...headerCellStyle, textAlign: "center", width: 180 }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role.ID}
                  style={{
                    borderBottom: "2px solid #000",
                    background: "#f9f8fe",
                    transition: "background 0.2s",
                    cursor: "pointer"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "#ede2fd"}
                  onMouseOut={e => e.currentTarget.style.background = "#f9f8fe"}
                >
                  <td style={{
                    padding: "16px 18px",
                    border: "2px solid #000",
                    fontSize: 18
                  }}>{role.RoleName}</td>
                  <td style={{
                    textAlign: "center",
                    border: "2px solid #000"
                  }}>
                    <button onClick={() => handleEdit(role)}
                      style={{
                        background: "#fff8c5",
                        border: "2px solid #c0b31c",
                        borderRadius: 8,
                        color: "#856800",
                        fontWeight: 700,
                        padding: "7px 14px",
                        marginRight: 10,
                        fontSize: 22,
                        cursor: "pointer"
                      }}
                      title="Редагувати"
                    >✏️</button>
                    <button onClick={() => handleDelete(role.ID)}
                      style={{
                        background: "#ffe3e3",
                        border: "2px solid #d64040",
                        borderRadius: 8,
                        color: "#d64040",
                        fontWeight: 700,
                        padding: "7px 14px",
                        fontSize: 22,
                        cursor: "pointer"
                      }}
                      title="Видалити"
                    >🗑️</button>
                    {/* Кнопка для налаштування прав */}
                    <button
                      onClick={() => alert("Налаштування прав буде тут!")}
                      style={{
                        background: "#208f41",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "7px 18px",
                        fontWeight: 700,
                        fontSize: 16,
                        marginLeft: 12,
                        cursor: "pointer"
                      }}
                    >Права</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const inputStyle = {
  fontSize: 17, padding: "13px", borderRadius: 9, border: "1px solid #ccc",
  width: "100%", boxSizing: "border-box", marginBottom: 0
};
const headerCellStyle = {
  background: "#e6d7fa",
  color: "#22105a",
  fontWeight: 700,
  fontSize: 18,
  padding: "14px 18px",
  border: "2px solid #000",
  textAlign: "left"
};
const addBtnStyle = {
  background: "#208f41", color: "#fff", padding: "12px 32px",
  borderRadius: 10, fontSize: 18, border: "none", fontWeight: 700, cursor: "pointer",
  boxShadow: "0 2px 8px #0001"
};
const cancelBtnStyle = {
  background: "#eee", color: "#444", border: "none", borderRadius: 8,
  padding: "13px 27px", fontWeight: 600, cursor: "pointer", fontSize: 16
};
const saveBtnStyle = {
  background: "#208f41", color: "#fff", border: "none", borderRadius: 8,
  padding: "13px 27px", fontWeight: 600, cursor: "pointer", fontSize: 16
};
