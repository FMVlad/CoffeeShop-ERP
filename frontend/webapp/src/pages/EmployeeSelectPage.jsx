import React, { useEffect, useState } from "react";
import { useUser } from "../UserContext";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function EmployeeSelectPage() {
  const { user, setEmployee } = useUser();
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.center_id) return;
    // Тут запитуємо всіх співробітників, які можуть працювати з цим центром обліку:
    api.getEmployees().then((all) => {
      // Фільтруємо по центру (якщо така логіка є в бекенді, краще робити це на сервері!)
      const emps = all.filter(e => (e.CenterIDs?.split(",").map(x => +x).includes(+user.center_id)) && e.IsActive);
      setEmployees(emps);
      setFiltered(emps);
    });
  }, [user]);

  useEffect(() => {
    const s = search.trim().toLowerCase();
    setFiltered(
      employees.filter(
        emp =>
          (emp.Barcode && emp.Barcode.toLowerCase().includes(s)) ||
          [emp.LastName, emp.FirstName, emp.MiddleName].join(" ").toLowerCase().includes(s)
      )
    );
  }, [search, employees]);

  function handleSelect(emp) {
    setEmployee(emp); // Функція для збереження вибраного співробітника у контексті
    navigate("/"); // або куди треба
  }

  function handleBarcodeEnter(e) {
    if (e.key === "Enter" && filtered.length === 1) {
      handleSelect(filtered[0]);
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: "0 auto" }}>
      <h2>Оберіть співробітника</h2>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={handleBarcodeEnter}
        placeholder="Введіть ПІБ або штрихкод"
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
              {emp.LastName} {emp.FirstName} {emp.MiddleName}{" "}
              {emp.Barcode ? <span style={{ color: "#999", fontSize: 15 }}>({emp.Barcode})</span> : ""}
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
      {filtered.length === 0 && <div style={{ color: "#c4282d", marginTop: 24 }}>Не знайдено співробітників</div>}
    </div>
  );
}
