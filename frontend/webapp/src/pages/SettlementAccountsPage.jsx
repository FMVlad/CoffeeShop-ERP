import React, { useEffect, useState } from 'react';
import { api } from '../api'

export default function SettlementAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({
    AccountName: '', AccountNumber: '', BankName: '', BankCity: '', MFO: '', IsActive: true
  });

  useEffect(() => {
    api.getSettlementAccounts().then(data => setAccounts(data));
  }, []);

  const addAccount = async () => {
    if (!newAccount.AccountName || !newAccount.AccountNumber || !newAccount.BankName) return;
    await api.addSettlementAccount(newAccount);
    setNewAccount({ AccountName: '', AccountNumber: '', BankName: '', BankCity: '', MFO: '', IsActive: true });
    api.getSettlementAccounts().then(setAccounts);
  };

  return (
    <div style={{ marginLeft: 240, padding: 32, maxWidth: 900 }}>
      <h2>Розрахункові рахунки</h2>
      <div style={{ marginBottom: 24, background: '#fff', padding: 18, borderRadius: 12 }}>
        <input placeholder="Назва" value={newAccount.AccountName}
          onChange={e => setNewAccount(a => ({ ...a, AccountName: e.target.value }))} style={{ width: 120, marginRight: 8 }} />
        <input placeholder="Рахунок" value={newAccount.AccountNumber}
          onChange={e => setNewAccount(a => ({ ...a, AccountNumber: e.target.value }))} style={{ width: 160, marginRight: 8 }} />
        <input placeholder="Банк" value={newAccount.BankName}
          onChange={e => setNewAccount(a => ({ ...a, BankName: e.target.value }))} style={{ width: 140, marginRight: 8 }} />
        <input placeholder="Місто" value={newAccount.BankCity}
          onChange={e => setNewAccount(a => ({ ...a, BankCity: e.target.value }))} style={{ width: 100, marginRight: 8 }} />
        <input placeholder="МФО" value={newAccount.MFO}
          onChange={e => setNewAccount(a => ({ ...a, MFO: e.target.value }))} style={{ width: 80, marginRight: 8 }} />
        <button onClick={addAccount}>Додати</button>
      </div>
      <table style={{ width: '100%', fontSize: 15, background: "#fff", borderRadius: 8 }}>
        <thead>
          <tr>
            <th>Назва</th><th>Рахунок</th><th>Банк</th><th>Місто</th><th>МФО</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(a =>
            <tr key={a.ID}>
              <td>{a.AccountName}</td>
              <td>{a.AccountNumber}</td>
              <td>{a.BankName}</td>
              <td>{a.BankCity}</td>
              <td>{a.MFO}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
