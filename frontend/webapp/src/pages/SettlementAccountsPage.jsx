import React, { useEffect, useState } from 'react';
import { api } from '../api'

export default function SettlementAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({
    AccountName: '', AccountNumber: '', BankName: '', BankCity: '', MFO: '', IsActive: true
  });
  const [editingAccount, setEditingAccount] = useState(null);

  useEffect(() => {
    api.getSettlementAccounts().then(data => setAccounts(data));
  }, []);

  const addAccount = async () => {
    if (!newAccount.AccountName || !newAccount.AccountNumber || !newAccount.BankName) return;
    await api.addSettlementAccount(newAccount);
    setNewAccount({ AccountName: '', AccountNumber: '', BankName: '', BankCity: '', MFO: '', IsActive: true });
    api.getSettlementAccounts().then(setAccounts);
  };

  const saveEditAccount = async () => {
    if (!editingAccount) return;
    await api.updateSettlementAccount(editingAccount.ID, editingAccount);
    setEditingAccount(null);
    api.getSettlementAccounts().then(setAccounts);
  };

  const deleteAccount = async (id) => {
    await api.deleteSettlementAccount(id);
    api.getSettlementAccounts().then(setAccounts);
  };

  return (
    <div style={{ marginLeft: 280, padding: 32, maxWidth: 900 }}>
      <h2>Розрахункові рахунки</h2>
      {editingAccount ? (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32, maxWidth: 600 }}>
          <h3 style={{marginBottom: 18, fontWeight: 700}}>Редагувати рахунок</h3>
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div>
              <label style={{fontWeight:500}}>Назва:</label>
              <input value={editingAccount.AccountName} onChange={e=>setEditingAccount({...editingAccount,AccountName:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
            </div>
            <div>
              <label style={{fontWeight:500}}>Рахунок:</label>
              <input value={editingAccount.AccountNumber} onChange={e=>setEditingAccount({...editingAccount,AccountNumber:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
            </div>
            <div>
              <label style={{fontWeight:500}}>Банк:</label>
              <input value={editingAccount.BankName} onChange={e=>setEditingAccount({...editingAccount,BankName:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
            </div>
            <div>
              <label style={{fontWeight:500}}>Місто:</label>
              <input value={editingAccount.BankCity} onChange={e=>setEditingAccount({...editingAccount,BankCity:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
            </div>
            <div>
              <label style={{fontWeight:500}}>МФО:</label>
              <input value={editingAccount.MFO} onChange={e=>setEditingAccount({...editingAccount,MFO:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
              <button onClick={saveEditAccount} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>Зберегти</button>
              <button onClick={()=>setEditingAccount(null)} style={{background:'#6c757d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16,marginLeft:12}}>Відміна</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32, maxWidth: 600 }}>
          <h3 style={{marginBottom: 18, fontWeight: 700}}>Додати рахунок</h3>
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div>
              <label style={{fontWeight:500}}>Назва:</label>
              <input placeholder="Назва" value={newAccount.AccountName} onChange={e => setNewAccount(a => ({ ...a, AccountName: e.target.value }))} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
            </div>
            <div>
              <label style={{fontWeight:500}}>Рахунок:</label>
              <input placeholder="Рахунок" value={newAccount.AccountNumber} onChange={e => setNewAccount(a => ({ ...a, AccountNumber: e.target.value }))} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
            </div>
            <div>
              <label style={{fontWeight:500}}>Банк:</label>
              <input placeholder="Банк" value={newAccount.BankName} onChange={e => setNewAccount(a => ({ ...a, BankName: e.target.value }))} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
            </div>
            <div>
              <label style={{fontWeight:500}}>Місто:</label>
              <input placeholder="Місто" value={newAccount.BankCity} onChange={e => setNewAccount(a => ({ ...a, BankCity: e.target.value }))} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
            </div>
            <div>
              <label style={{fontWeight:500}}>МФО:</label>
              <input placeholder="МФО" value={newAccount.MFO} onChange={e => setNewAccount(a => ({ ...a, MFO: e.target.value }))} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
              <button onClick={addAccount} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>Додати</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 24, marginTop: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e0c9a0', background: '#fff', marginTop: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0c9a0' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', borderRight: '1px solid #e0c9a0' }}>Назва</th>
              <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Рахунок</th>
              <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Банк</th>
              <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Місто</th>
              <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>МФО</th>
              <th style={{ textAlign: 'left' }}>Дії</th>
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
                <td>
                  <button onClick={()=>setEditingAccount(a)} style={{marginRight:8}}>✏️</button>
                  <button onClick={()=>deleteAccount(a.ID)} style={{marginRight:8}}>🗑️</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
