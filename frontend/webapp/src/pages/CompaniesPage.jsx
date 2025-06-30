import React, { useEffect, useState } from "react";
import { api } from '../api'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [newCompany, setNewCompany] = useState({
    Name: "", ShortName: "", EDRPOU: "", INN: "", Address: "", RegistrationInfo: "", TaxInfo: "", MainAccountID: ""
  });

  useEffect(() => {
    api.getCompanies().then(setCompanies);
    api.getSettlementAccounts().then(setAccounts);
  }, []);

  const addCompany = async () => {
    if (!newCompany.Name) return;
    await api.addCompany(newCompany);
    setNewCompany({ Name: '', ShortName: '', EDRPOU: '', INN: '', Address: '', RegistrationInfo: '', TaxInfo: '', MainAccountID: '' });
    api.getCompanies().then(setCompanies);
  };

  return (
    <div style={{ marginLeft: 0, padding: 20, maxWidth: 900 }}>
      <h2>Підприємства</h2>
      <div style={{ marginBottom: 24, background: '#fff', padding: 18, borderRadius: 12 }}>
        <input placeholder="Скорочено" value={newCompany.ShortName}
          onChange={e => setNewCompany(a => ({ ...a, ShortName: e.target.value }))} style={{ width: 100, marginRight: 8 }} />
        <input placeholder="Назва" value={newCompany.Name}
          onChange={e => setNewCompany(a => ({ ...a, Name: e.target.value }))} style={{ width: 170, marginRight: 8 }} />
        <input placeholder="ЄДРПОУ" value={newCompany.EDRPOU}
          onChange={e => setNewCompany(a => ({ ...a, EDRPOU: e.target.value }))} style={{ width: 80, marginRight: 8 }} />
        <input placeholder="ІПН" value={newCompany.INN}
          onChange={e => setNewCompany(a => ({ ...a, INN: e.target.value }))} style={{ width: 80, marginRight: 8 }} />
        <input placeholder="Адреса" value={newCompany.Address}
          onChange={e => setNewCompany(a => ({ ...a, Address: e.target.value }))} style={{ width: 140, marginRight: 8 }} />
        <select value={newCompany.MainAccountID}
          onChange={e => setNewCompany(a => ({ ...a, MainAccountID: e.target.value }))} style={{ width: 180, marginRight: 8 }}>
          <option value="">— Розрахунковий рахунок —</option>
          {accounts.map(a => <option key={a.ID} value={a.ID}>{a.AccountName} ({a.AccountNumber})</option>)}
        </select>
        <button onClick={addCompany}>Додати</button>
      </div>
      <table style={{ width: '100%', fontSize: 15, background: "#fff", borderRadius: 8 }}>
        <thead>
          <tr>
            <th>Назва</th><th>ЄДРПОУ</th><th>ІПН</th><th>Адреса</th><th>Рахунок</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(c =>
            <tr key={c.ID}>
              <td>{c.Name}</td>
              <td>{c.EDRPOU}</td>
              <td>{c.INN}</td>
              <td>{c.Address}</td>
              <td>
                {accounts.find(a => a.ID === c.MainAccountID)?.AccountNumber || ''}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
