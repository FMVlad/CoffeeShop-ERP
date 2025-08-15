import React, { useEffect, useState } from "react";
import { api } from "../api";
import { sha256 } from "js-sha256"; // npm install js-sha256

export default function UsersSettings() {
  const [users, setUsers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const emptyUser = {
    Username: "",
    PasswordHash: "",
    CentersOfAccountingID: "",
    IsActive: true,
  };
  const [formUser, setFormUser] = useState(emptyUser);
  const [password, setPassword] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [us, cs] = await Promise.all([
      api.getUsers(),
      api.getCentersOfAccounting()
    ]);
    setUsers(us);
    setCenters(cs);
    setLoading(false);
  };

  const handleAdd = () => {
    setEditing(null);
    setFormUser(emptyUser);
    setPassword("");
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditing(user);
    setFormUser({
      Username: user.Username,
      PasswordHash: "",
      CentersOfAccountingID: user.CentersOfAccountingID || "",
      IsActive: user.IsActive,
    });
    setPassword("");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Видалити користувача?")) {
      await api.deleteUser(id);
      load();
    }
  };

  const handleSubmit = async () => {
    let userData = {
      ...formUser,
      CentersOfAccountingID: formUser.CentersOfAccountingID || null,
      PasswordHash: password ? sha256(password) : undefined,
    };
    if (editing) {
      if (!password) delete userData.PasswordHash;
      await api.updateUser(editing.ID, userData);
    } else {
      if (!password) return alert("Введіть пароль");
      await api.createUser({ ...userData });
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  return (
    <div style={{ maxWidth: 950, margin: "40px auto", padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: ".02em" }}>Користувачі</h2>
        <button onClick={handleAdd} style={addBtnStyle}>+ Додати користувача</button>
      </div>

      {(showForm || editing) && (
        <div style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 4px 32px #0002",
          padding: 36,
          marginBottom: 36,
          maxWidth: 540
        }}>
          <h3 style={{ marginBottom: 18, fontWeight: 700 }}>
            {editing ? "Редагувати користувача" : "Додати користувача"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontWeight: 500 }}>Логін:</label>
              <input
                value={formUser.Username}
                onChange={e => setFormUser({ ...formUser, Username: e.target.value })}
                style={inputStyle}
              />
            </div>
           <div>
  <label style={{ fontWeight: 500 }}>
    {editing ? "Новий пароль (обовʼязково!):" : "Пароль:"}
  </label>
  <input
    type="password"
    value={password}
    required
    onChange={e => setPassword(e.target.value)}
    style={inputStyle}
  />
</div>
            <div>
              <label style={{ fontWeight: 500 }}>Центр обліку:</label>
              <select
                value={formUser.CentersOfAccountingID || ""}
                onChange={e => setFormUser({ ...formUser, CentersOfAccountingID: e.target.value })}
                style={inputStyle}
              >
                <option value="">— Не вибрано —</option>
                {centers.map(center => (
                  <option key={center.ID} value={center.ID}>{center.Name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <label style={{ fontWeight: 500 }}>Активний:</label>
              <input
                type="checkbox"
                checked={!!formUser.IsActive}
                onChange={e => setFormUser({ ...formUser, IsActive: e.target.checked })}
              />
            </div>
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
                <th style={headerCellStyle}>Логін</th>
                <th style={headerCellStyle}>Центр обліку</th>
                <th style={headerCellStyle}>Активний</th>
                <th style={{ ...headerCellStyle, textAlign: "center", width: 120 }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr
                  key={user.ID}
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
                  }}>{user.Username}</td>
                  <td style={{
                    padding: "16px 18px",
                    border: "2px solid #000",
                    fontSize: 18
                  }}>{user.CenterName || "—"}</td>
                  <td style={{
                    textAlign: "center",
                    border: "2px solid #000",
                    fontSize: 18
                  }}>
                    {user.IsActive ? (
                      <span style={{
                        display: "inline-block",
                        width: 26,
                        height: 26,
                        background: "#1abc9c",
                        borderRadius: 6,
                        color: "#fff",
                        fontWeight: 700,
                        lineHeight: "26px",
                        textAlign: "center",
                        fontSize: 18,
                        boxShadow: "0 0 0 2px #87e6d1"
                      }}>✔</span>
                    ) : ""}
                  </td>
                  <td style={{
                    textAlign: "center",
                    border: "2px solid #000"
                  }}>
                    <button onClick={() => handleEdit(user)}
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
                    <button onClick={() => handleDelete(user.ID)}
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
