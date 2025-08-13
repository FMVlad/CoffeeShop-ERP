import React, { useEffect, useState } from "react";
import { useUser } from "../UserContext";

export default function StatusBar() {
  const { user, employee, role, centers, centerId, setCenterId } = useUser();
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const days = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "Пʼятниця", "Субота"];
  const formattedDate = dateTime.toLocaleDateString();
  const formattedTime = dateTime.toLocaleTimeString();
  const dayOfWeek = days[dateTime.getDay()];

  return (
    <div style={{
      background: "#faf6f0",
      borderBottom: "2px solid #ebd9b3",
      fontSize: 18,
      padding: "7px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }}>
      <div>
        <b>{formattedDate} {formattedTime}</b> ({dayOfWeek})
      </div>
      <div>
        {user && <span style={{marginRight:18}}><b>{user.username}</b> (користувач)</span>}
        {employee && <span style={{marginRight:18}}><b>{employee.LastName} {employee.FirstName}</b> (співробітник)</span>}
        {role && <span style={{marginRight:18}}>Роль: <b>{role}</b></span>}
        {/* Ось це — перемикач центру обліку */}
        {centers && centers.length > 1 ? (
          <select
            value={centerId || ""}
            onChange={e => setCenterId(e.target.value)}
            style={{
              fontSize: 17,
              padding: "4px 10px",
              borderRadius: 7,
              border: "1px solid #bdbdbd",
              marginLeft: 16,
              background: "#fff",
              minWidth: 130
            }}
          >
            <option value="">— Центр обліку —</option>
            {centers.map(c => (
              <option key={c.ID} value={c.ID}>{c.Name}</option>
            ))}
          </select>
        ) : centers && centers.length === 1 ? (
          <span style={{marginLeft: 12, color: "#8e630e"}}>Центр обліку: <b>{centers[0].Name}</b></span>
        ) : null}
      </div>
    </div>
  );
}
