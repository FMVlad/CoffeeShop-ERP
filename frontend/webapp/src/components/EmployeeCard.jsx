import React, { useEffect, useState } from "react";
import { api } from "../api";

const tabs = [
  { id: "main", label: "Основні дані" },
  { id: "cashroles", label: "Центр/Каса/Роль" },
  { id: "extra", label: "Додаткові" }
];

const emptyEmployee = {
  LastName: "", FirstName: "", MiddleName: "", Phone: "", Email: "",
  Position: "", Barcode: "", CashboxRoles: [], Notes: ""
};

export default function EmployeeCard({ employee, onClose }) {
  const [form, setForm] = useState(emptyEmployee);
  const [tab, setTab] = useState("main");

  const [centers, setCenters] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cashboxes, setCashboxes] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedCashbox, setSelectedCashbox] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCenters().then(setCenters);
    api.getRoles().then(setRoles);
    api.getCashboxes().then(setCashboxes);
    if (employee) {
      // приводимо структуру (CashboxRoles) якщо раптом немає
      setForm({
        ...emptyEmployee,
        ...employee,
        CashboxRoles: employee.CashboxRoles || []
      });
    } else {
      setForm(emptyEmployee);
    }
    setError("");
    setSelectedCenter(""); setSelectedCashbox(""); setSelectedRole("");
  }, [employee]);

  // Фільтр кас по центру
  const filteredCashboxes = selectedCenter
    ? cashboxes.filter(cb => String(cb.CenterID) === String(selectedCenter))
    : [];

  function handleAddCashRole() {
    if (!selectedCenter || !selectedCashbox || !selectedRole) {
      setError("Оберіть Центр, Касу і Роль!");
      return;
    }
    const centerObj = centers.find(c => String(c.ID) === String(selectedCenter));
    const cashboxObj = filteredCashboxes.find(cb => String(cb.ID) === String(selectedCashbox));
    const roleObj = roles.find(r => String(r.ID) === String(selectedRole));
    // Дублікат?
    const exists = form.CashboxRoles.some(
      row =>
        String(row.CenterID) === String(selectedCenter) &&
        String(row.CashboxID) === String(selectedCashbox) &&
        String(row.RoleID) === String(selectedRole)
    );
    if (exists) {
      setError("Така комбінація вже додана!");
      return;
    }
    setForm(f => ({
      ...f,
      CashboxRoles: [
        ...f.CashboxRoles,
        {
          CenterID: selectedCenter,
          CenterName: centerObj?.Name || "",
          CashboxID: selectedCashbox,
          CashboxName: cashboxObj?.Name || "",
          RoleID: selectedRole,
          RoleName: roleObj?.RoleName || ""
        }
      ]
    }));
    setError("");
    setSelectedCashbox("");
    setSelectedRole("");
  }

  function handleRemoveCashRole(idx) {
    setForm(f => ({
      ...f,
      CashboxRoles: f.CashboxRoles.filter((_, i) => i !== idx)
    }));
  }

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setError("");
    // формуємо payload під бек: CashboxRoles передаємо як є
    const payload = {
      LastName: form.LastName,
      FirstName: form.FirstName,
      MiddleName: form.MiddleName,
      Phone: form.Phone,
      Email: form.Email,
      Position: form.Position,
      Barcode: form.Barcode,
      Notes: form.Notes,
      CashboxRoles: form.CashboxRoles
    };
    try {
      if (employee)
        await api.updateEmployee(employee.ID, payload);
      else
        await api.addEmployee(payload);
      onClose(true);
    } catch (e) {
      setError("Помилка збереження! " + (e?.message || ""));
    }
  }

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "#0003", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px #0002",
        minWidth: 540, padding: 28, minHeight: 400, position: "relative"
      }}>
        <h3 style={{ marginBottom: 12 }}>{employee ? "Редагувати" : "Додати"} співробітника</h3>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {tabs.map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? "#fbe3b8" : "#f3f3f3",
                color: tab === t.id ? "#8d4f00" : "#444",
                fontWeight: 700, border: "none", borderRadius: 6,
                padding: "8px 22px", cursor: "pointer"
              }}>{t.label}</button>
          ))}
        </div>

        {tab === "main" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input placeholder="Прізвище" value={form.LastName} onChange={e => handleChange("LastName", e.target.value)} />
            <input placeholder="Імʼя" value={form.FirstName} onChange={e => handleChange("FirstName", e.target.value)} />
            <input placeholder="По батькові" value={form.MiddleName} onChange={e => handleChange("MiddleName", e.target.value)} />
            <input placeholder="Телефон" value={form.Phone} onChange={e => handleChange("Phone", e.target.value)} />
            <input placeholder="Email" value={form.Email} onChange={e => handleChange("Email", e.target.value)} />
            <input placeholder="Посада" value={form.Position} onChange={e => handleChange("Position", e.target.value)} />
            <input placeholder="Штрихкод" value={form.Barcode} onChange={e => handleChange("Barcode", e.target.value)} />
          </div>
        )}

        {tab === "cashroles" && (
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <select value={selectedCenter} onChange={e => { setSelectedCenter(e.target.value); setSelectedCashbox(""); }}>
                <option value="">Центр обліку</option>
                {centers.map(c => <option key={c.ID} value={c.ID}>{c.Name}</option>)}
              </select>
              <select value={selectedCashbox} onChange={e => setSelectedCashbox(e.target.value)} disabled={!selectedCenter}>
                <option value="">Каса</option>
                {filteredCashboxes.map(cb => <option key={cb.ID} value={cb.ID}>{cb.Name}</option>)}
              </select>
              <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                <option value="">Роль</option>
                {roles.map(r => <option key={r.ID} value={r.ID}>{r.RoleName}</option>)}
              </select>
              <button onClick={handleAddCashRole} style={{
                background: "#00b894", color: "#fff", border: "none",
                borderRadius: 7, padding: "8px 18px", fontWeight: 700
              }}>+</button>
            </div>
            {error && <div style={{ color: "#c00", marginBottom: 8 }}>{error}</div>}
            {/* Таблиця */}
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fcf7ee", borderRadius: 6 }}>
              <thead>
                <tr>
                  <th style={{ padding: 6 }}>Центр обліку</th>
                  <th style={{ padding: 6 }}>Каса</th>
                  <th style={{ padding: 6 }}>Роль</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(form.CashboxRoles || []).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e0c9a0" }}>
                    <td style={{ padding: 6 }}>{row.CenterName}</td>
                    <td style={{ padding: 6 }}>{row.CashboxName}</td>
                    <td style={{ padding: 6 }}>{row.RoleName}</td>
                    <td>
                      <button onClick={() => handleRemoveCashRole(idx)} style={{
                        color: "#b54a1c", background: "none", border: "none", fontSize: 18, cursor: "pointer"
                      }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "extra" && (
          <div>
            <textarea placeholder="Примітки" value={form.Notes || ""} onChange={e => handleChange("Notes", e.target.value)} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={handleSave} style={{
            background: "#00b894", color: "#fff", border: "none", borderRadius: 7,
            fontWeight: 700, fontSize: 16, padding: "10px 34px"
          }}>Зберегти</button>
          <button onClick={() => onClose(false)} style={{
            background: "#ccc", color: "#333", border: "none", borderRadius: 7,
            fontWeight: 700, fontSize: 16, padding: "10px 34px"
          }}>Відміна</button>
        </div>
      </div>
    </div>
  );
}
