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
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
