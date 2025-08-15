import React, { useEffect, useState, useRef } from "react";
import { api } from "../api";
import { useUser } from "../UserContext";
import { useNavigate } from "react-router-dom";

export default function EmployeeSelectPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const { user, setEmployee, setCentersRoles, setCenterId } = useUser();
  const navigate = useNavigate();
  const inputRef = useRef();

  useEffect(() => {
    api.getEmployees().then(all => {
      setEmployees(all);
    });
  }, []);

  useEffect(() => {
    const s = search.trim().toLowerCase();
    setFiltered(
      employees.filter(e =>
        (e.Barcode && e.Barcode.toLowerCase().includes(s)) ||
        [e.LastName, e.FirstName, e.MiddleName].join(" ").toLowerCase().includes(s)
      )
    );
  }, [search, employees]);

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      if (filtered.length === 1) {
        handleSelect(filtered[0]);
      } else if (filtered.length === 0) {
        window.alert("Не знайдено співробітника за цим штрихкодом або ПІБ.");
      }
    }
  }

  function handleSelect(emp) {
    setEmployee(emp);

    // --- ГОЛОВНЕ: Встановлюємо центри та активний центр обліку ---
    const centers = emp.CentersRoles || [];
    setCentersRoles(centers);

    // 1. Якщо user.center_id є серед доступних центрів співробітника — вибираємо його
    let chosenCenter = "";
    if (centers.length > 0) {
      const preferred = user?.center_id
        ? centers.find(c => String(c.CenterID) === String(user.center_id))
        : null;
      chosenCenter = preferred ? preferred.CenterID : centers[0].CenterID;
    }
    setCenterId(chosenCenter);

    navigate("/");
  }

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: "0 auto" }}>
      <h2>Вибір співробітника</h2>
      <input
        ref={inputRef}
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Введіть ПІБ або відскануйте штрихкод"
        style={{ width: "100%", padding: 12, fontSize: 18, borderRadius: 8, marginBottom: 24 }}
        autoFocus
      />
      <div>
        {filtered.map(emp => (
          <div key={emp.ID} style={{
            padding: "12px 16px",
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>
              {emp.LastName} {emp.FirstName} {emp.MiddleName}
              {emp.Barcode && <span style={{ color: "#999", fontSize: 15 }}> ({emp.Barcode})</span>}
            </span>
            <button onClick={() => handleSelect(emp)} style={{
              background: "#208f41", color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px",
              fontWeight: 700, fontSize: 16, marginLeft: 10, cursor: "pointer"
            }}>
              Обрати
            </button>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div style={{ color: "#c4282d", marginTop: 24 }}>Не знайдено співробітників</div>
      )}
    </div>
  );
}
