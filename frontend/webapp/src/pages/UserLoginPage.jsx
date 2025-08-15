import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { sha256 } from "js-sha256";
import { useUser } from "../UserContext";

export default function UserLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useUser();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      // ВАЖЛИВО: password_hash!
      const user = await api.loginUser({ username, password_hash: sha256(password) });
      login(user);
      navigate("/employee-select");
    } catch (err) {
      setError("Невірний логін або пароль");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", background: "#fff", borderRadius: 18, boxShadow: "0 4px 32px #0002", padding: 40 }}>
      <h2 style={{ textAlign: "center", marginBottom: 32 }}>Вхід у систему</h2>
      <form onSubmit={handleLogin}>
        <div>
          <input
            type="text"
            placeholder="Логін"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>
        {error && <div style={{ color: "#c4282d", marginBottom: 16 }}>{error}</div>}
        <button type="submit" style={loginBtnStyle}>Увійти</button>
      </form>
    </div>
  );
}

const inputStyle = { width: "100%", padding: 14, fontSize: 18, borderRadius: 7, marginBottom: 20, border: "1px solid #ccc" };
const loginBtnStyle = { width: "100%", background: "#208f41", color: "#fff", padding: "12px", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 19, cursor: "pointer" };
