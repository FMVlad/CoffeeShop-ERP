import React, { useEffect, useState } from "react";
import { useUser } from "../UserContext";

export default function StatusBar() {
  const { user, employee, centersRoles, centerId, setCenterId } = useUser();
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const days = [
    "Неділя", "Понеділок", "Вівторок", "Середа",
    "Четвер", "Пʼятниця", "Субота"
  ];
  const formattedDate = dateTime.toLocaleDateString();
  const formattedTime = dateTime.toLocaleTimeString();
  const dayOfWeek = days[dateTime.getDay()];

  // Знайти роль та касу для поточного центру обліку
  const current = centersRoles?.find(
    c => String(c.CenterID) === String(centerId)
  );

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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src="/webapp/vyshnia_logo.png"
          alt="VYSHNIA"
          style={{ height: 26, width: "auto" }}
          draggable="false"
        />
        <b>{formattedDate} {formattedTime}</b> ({dayOfWeek})
      </div>
      <div>
        {user && (
          <span style={{ marginRight: 18 }}>
            <b>{user.username}</b> (користувач)
          </span>
        )}
        {employee && (
          <span style={{ marginRight: 18 }}>
            <b>{employee.LastName} {employee.FirstName}</b> (співробітник)
          </span>
        )}
        {current && (
          <>
            <span style={{ marginRight: 18 }}>
              Роль: <b>{current.RoleName}</b>
            </span>
            <span style={{ marginRight: 18 }}>
              Каса: <b>{current.CashboxName}</b>
            </span>
          </>
        )}
      </div>
      <div>
        {centersRoles && centersRoles.length > 1 ? (
          <select
            value={centerId}
            onChange={e => setCenterId(e.target.value)}
            style={{
              fontSize: 17,
              padding: "4px 10px",
              borderRadius: 7,
              border: "1px solid #bdbdbd",
              marginLeft: 16,
              background: "#fff",
              minWidth: 180
            }}
          >
            {centersRoles.map(c => (
              <option key={c.CenterID} value={c.CenterID}>
                {c.CenterName}
              </option>
            ))}
          </select>
        ) : centersRoles && centersRoles.length === 1 ? (
          <span style={{ marginLeft: 12, color: "#8e630e" }}>
            Центр обліку: <b>{centersRoles[0].CenterName}</b>
          </span>
        ) : (
          <span style={{ marginLeft: 12, color: "#c4282d" }}>
            Немає доступних центрів обліку!
          </span>
        )}
      </div>
    </div>
  );
}
