import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function AccountCenterCompaniesTab({ centerId }) {
  const [companies, setCompanies] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!centerId) return;
    api.getCenterCompanies(centerId).then(data => setCompanies(Array.isArray(data) ? data : []));
    api.getCompanies().then(data => setAllCompanies(Array.isArray(data) ? data : []));
  }, [centerId, adding]);

  const handleAdd = async () => {
    if (!selectedCompany) return;
    await api.addCompanyToCenter(centerId, selectedCompany);
    setAdding(false);
    setSelectedCompany("");
    api.getCenterCompanies(centerId).then(setCompanies);
  };

  const handleRemove = async (companyId) => {
    await api.removeCompanyFromCenter(centerId, companyId);
    api.getCenterCompanies(centerId).then(setCompanies);
  };

  const available = allCompanies.filter(
    c => !companies.some(cc => cc.ID === c.ID)
  );

  return (
    <div>
      <h3 style={{ fontSize: 21, fontWeight: 700, marginBottom: 18 }}>
        Підприємства, прив'язані до центру обліку
      </h3>
      <ul style={{ marginBottom: 20 }}>
        {(!companies || companies.length === 0) && (
          <li style={{ color: "#888" }}>Поки що не прив’язано жодного підприємства.</li>
        )}
        {companies && companies.map(c => (
          <li key={c.ID} style={{
            background: "#f9f7ff",
            padding: "10px 18px",
            margin: "6px 0",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span>
              <span style={{ fontWeight: 700 }}>{c.Name}</span> &nbsp;
              <span style={{ color: "#888", fontSize: 13 }}>
                ({c.ShortName || "без скорочення"})
              </span>
            </span>
            <button style={{background: "#e04747", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer"}}
                    onClick={() => handleRemove(c.ID)}>Відв’язати</button>
          </li>
        ))}
      </ul>
      {adding ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            style={{ padding: 8, fontSize: 16, borderRadius: 8, minWidth: 220 }}
          >
            <option value="">Виберіть підприємство…</option>
            {available.map(c => (
              <option key={c.ID} value={c.ID}>
                {c.Name} ({c.ShortName || "—"})
              </option>
            ))}
          </select>
          <button style={{background: "#00885a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 18px", cursor: "pointer"}}
                  onClick={handleAdd} disabled={!selectedCompany}>Додати</button>
          <button style={{background: "#eee", color: "#444", border: "1px solid #bbb", borderRadius: 6, padding: "6px 14px", cursor: "pointer"}}
                  onClick={() => setAdding(false)}>Скасувати</button>
        </div>
      ) : (
        <button style={{background: "#5553bb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 24px", marginTop: 8, cursor: "pointer"}}
                onClick={() => setAdding(true)}>
          + Додати підприємство до центру
        </button>
      )}
    </div>
  );
}
