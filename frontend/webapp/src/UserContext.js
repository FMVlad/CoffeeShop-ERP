import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  // --- Ініціалізація зі сховища (sessionStorage) ---
  const [user, setUser] = useState(() => {
    const u = sessionStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  const [employee, setEmployee] = useState(() => {
    const e = sessionStorage.getItem("employee");
    return e ? JSON.parse(e) : null;
  });

  const [centersRoles, setCentersRoles] = useState(() => {
    const c = sessionStorage.getItem("centersRoles");
    return c ? JSON.parse(c) : [];
  });

  const [centerId, setCenterId] = useState(() => {
    const id = sessionStorage.getItem("centerId");
    return id || "";
  });

  // Компанії / Company scope
  const [companies, setCompanies] = useState(() => {
    const v = sessionStorage.getItem("companies");
    return v ? JSON.parse(v) : [];
  });
  const [companyId, setCompanyId] = useState(() => {
    const v = sessionStorage.getItem("companyId");
    return v || null;
  });

  // --- Синхронізація зі сховищем ---
  useEffect(() => {
    if (user) sessionStorage.setItem("user", JSON.stringify(user));
    else sessionStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    if (employee) sessionStorage.setItem("employee", JSON.stringify(employee));
    else sessionStorage.removeItem("employee");
  }, [employee]);

  useEffect(() => {
    if (centersRoles && centersRoles.length)
      sessionStorage.setItem("centersRoles", JSON.stringify(centersRoles));
    else sessionStorage.removeItem("centersRoles");
  }, [centersRoles]);

  useEffect(() => {
    if (centerId) sessionStorage.setItem("centerId", centerId);
    else sessionStorage.removeItem("centerId");
  }, [centerId]);

  useEffect(() => {
    if (companies && companies.length)
      sessionStorage.setItem("companies", JSON.stringify(companies));
    else sessionStorage.removeItem("companies");
  }, [companies]);
  useEffect(() => {
    if (companyId) sessionStorage.setItem("companyId", companyId);
    else sessionStorage.removeItem("companyId");
  }, [companyId]);

  // --- Функції ---
  const login = (userObj) => setUser(userObj);

  const selectEmployee = (employeeObj, centers, preferId) => {
    setEmployee(employeeObj);
    setCentersRoles(centers || []);
    if (centers && centers.length) {
      const found = centers.find(c => String(c.CenterID) === String(preferId));
      setCenterId(found ? found.CenterID : centers[0].CenterID);
    } else {
      setCenterId("");
    }
    // компанії очистимо — нехай підтягнуться окремим запитом після логіну
    setCompanies([]);
    setCompanyId(null);
  };

  const logout = () => {
    setUser(null);
    setEmployee(null);
    setCentersRoles([]);
    setCenterId("");
    // Повне очищення sessionStorage (тільки наші ключі!)
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("employee");
    sessionStorage.removeItem("centersRoles");
    sessionStorage.removeItem("centerId");
    sessionStorage.removeItem("companies");
    sessionStorage.removeItem("companyId");
  };

  return (
    <UserContext.Provider value={{
      user,
      login,
      logout,
      employee,
      setEmployee,
      selectEmployee,
      centersRoles,
      setCentersRoles,
      centerId,
      setCenterId,
      companies,
      setCompanies,
      companyId,
      setCompanyId,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
