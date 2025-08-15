import React, { useEffect, useState } from "react";
import { api } from "../api";
import EmployeeCard from "../components/EmployeeCard"; // Окрема форма-закладинка

export default function EmployeesSettings() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const list = await api.getEmployees();
    setEmployees(Array.isArray(list) ? list : []);
    setLoading(false);
  }

  function handleAdd() {
    setEditing(null);
    setShowForm(true);
  }

  async function handleEdit(employee) {
    const detailed = await api.getEmployeeById(employee.ID);
    setEditing(detailed);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm("Видалити співробітника?")) return;
    await api.deleteEmployee(id);
    load();
  }

  function handleFormClose(updated) {
    setShowForm(false);
    setEditing(null);
    if (updated) load();
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: ".02em" }}>Співробітники</h2>
        <button
          onClick={handleAdd}
          style={addBtnStyle}
        >
          + Додати співробітника
        </button>
      </div>
      {showForm && (
        <EmployeeCard
          employee={editing}
          onClose={handleFormClose}
        />
      )}

      {loading ? (
        <div>Завантаження...</div>
      ) : (
        <div style={{
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 4px 24px #0002",
          marginTop: 0,
          maxWidth: "100vw"
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
                <th style={headerCellStyle}>ПІБ</th>
                <th style={headerCellStyle}>Посада</th>
                <th style={headerCellStyle}>Штрихкод</th>
                <th style={headerCellStyle}>Центри обліку</th>
                <th style={{ ...headerCellStyle, textAlign: "center", width: 160 }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.ID}
                  style={{
                    borderBottom: "2px solid #000",
                    background: "#f9f8fe",
                    transition: "background 0.2s",
                    cursor: "pointer"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "#ede2fd"}
                  onMouseOut={e => e.currentTarget.style.background = "#f9f8fe"}
                >
                  <td style={cellStyle}>
                    {employee.LastName} {employee.FirstName} {employee.MiddleName}
                  </td>
                  <td style={cellStyle}>{employee.Position}</td>
                  <td style={cellStyle}>{employee.Barcode}</td>
                  <td style={cellStyle}>
                    {(employee.CentersNames && employee.CentersNames.length > 0)
                      ? employee.CentersNames.join(", ")
                      : <span style={{ color: "#bbb" }}>—</span>}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    <button
                      onClick={() => handleEdit(employee)}
                      style={editBtnStyle}
                      title="Редагувати"
                    >✏️</button>
                    <button
                      onClick={() => handleDelete(employee.ID)}
                      style={deleteBtnStyle}
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

// --- СТИЛІ --- //
const headerCellStyle = {
  background: "#e6d7fa",
  color: "#22105a",
  fontWeight: 700,
  fontSize: 18,
  padding: "14px 18px",
  border: "2px solid #000",
  textAlign: "left"
};
const cellStyle = {
  padding: "13px 18px",
  border: "2px solid #000",
  fontSize: 16,
  color: "#22105a",
  background: "#f9f8fe"
};
const addBtnStyle = {
  background: "#208f41", color: "#fff", padding: "12px 32px",
  borderRadius: 10, fontSize: 18, border: "none", fontWeight: 700, cursor: "pointer",
  boxShadow: "0 2px 8px #0001"
};
const editBtnStyle = {
  background: "#fff8c5",
  border: "2px solid #c0b31c",
  borderRadius: 8,
  color: "#856800",
  fontWeight: 700,
  padding: "7px 14px",
  marginRight: 10,
  fontSize: 22,
  cursor: "pointer"
};
const deleteBtnStyle = {
  background: "#ffe3e3",
  border: "2px solid #d64040",
  borderRadius: 8,
  color: "#d64040",
  fontWeight: 700,
  padding: "7px 14px",
  fontSize: 22,
  cursor: "pointer"
};
