import React, { useEffect, useState } from "react";
import { api } from '../api'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [newCompany, setNewCompany] = useState({
    Name: "", ShortName: "", EDRPOU: "", INN: "", Address: "", RegistrationInfo: "", TaxInfo: "", MainAccountID: ""
  });
  const [editingCompany, setEditingCompany] = useState(null);

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

  const saveEditCompany = async () => {
    if (!editingCompany) return;
    await api.updateCompany(editingCompany);
    setEditingCompany(null);
    api.getCompanies().then(setCompanies);
  };

  const deleteCompany = async (id) => {
    await api.deleteCompany(id);
    api.getCompanies().then(setCompanies);
  };

  return (
    <div style={{ marginLeft: 280, padding: 32 }}>
      <h2>Підприємства</h2>
      {editingCompany ? (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32, maxWidth: 600 }}>
          <h3 style={{marginBottom: 18, fontWeight: 700}}>Редагувати підприємство</h3>
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div style={{display:'flex', gap:16}}>
              <div style={{flex:1}}>
                <label style={{fontWeight:500}}>Скорочено:</label>
                <input value={editingCompany.ShortName} onChange={e=>setEditingCompany({...editingCompany,ShortName:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
              <div style={{flex:2}}>
                <label style={{fontWeight:500}}>Назва:</label>
                <input value={editingCompany.Name} onChange={e=>setEditingCompany({...editingCompany,Name:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
            </div>
            <div style={{display:'flex', gap:16}}>
              <div style={{flex:1}}>
                <label style={{fontWeight:500}}>ЄДРПОУ:</label>
                <input value={editingCompany.EDRPOU} onChange={e=>setEditingCompany({...editingCompany,EDRPOU:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{fontWeight:500}}>ІПН:</label>
                <input value={editingCompany.IPN} onChange={e=>setEditingCompany({...editingCompany,IPN:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
            </div>
            <div style={{display:'flex', gap:16}}>
              <div style={{flex:2}}>
                <label style={{fontWeight:500}}>Адреса:</label>
                <input value={editingCompany.Address} onChange={e=>setEditingCompany({...editingCompany,Address:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
              <div style={{flex:2}}>
                <label style={{fontWeight:500}}>Розрахунковий рахунок:</label>
                <select value={editingCompany.MainAccountID} onChange={e=>setEditingCompany({...editingCompany,MainAccountID:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}>
                  <option value="">— Розрахункові —</option>
                  {accounts.map(acc => (
                    <option key={acc.ID} value={acc.ID}>{acc.AccountNumber} {acc.BankName ? `(${acc.BankName})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
              <button onClick={saveEditCompany} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>Зберегти</button>
              <button onClick={()=>setEditingCompany(null)} style={{background:'#6c757d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16,marginLeft:12}}>Відміна</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32, maxWidth: 600 }}>
          <h3 style={{marginBottom: 18, fontWeight: 700}}>Додати підприємство</h3>
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div style={{display:'flex', gap:16}}>
              <div style={{flex:1}}>
                <label style={{fontWeight:500}}>Скорочено:</label>
                <input value={newCompany.ShortName} onChange={e=>setNewCompany({...newCompany,ShortName:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
              <div style={{flex:2}}>
                <label style={{fontWeight:500}}>Назва:</label>
                <input value={newCompany.Name} onChange={e=>setNewCompany({...newCompany,Name:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
            </div>
            <div style={{display:'flex', gap:16}}>
              <div style={{flex:1}}>
                <label style={{fontWeight:500}}>ЄДРПОУ:</label>
                <input value={newCompany.EDRPOU} onChange={e=>setNewCompany({...newCompany,EDRPOU:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{fontWeight:500}}>ІПН:</label>
                <input value={newCompany.IPN} onChange={e=>setNewCompany({...newCompany,IPN:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
            </div>
            <div style={{display:'flex', gap:16}}>
              <div style={{flex:2}}>
                <label style={{fontWeight:500}}>Адреса:</label>
                <input value={newCompany.Address} onChange={e=>setNewCompany({...newCompany,Address:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
              </div>
              <div style={{flex:2}}>
                <label style={{fontWeight:500}}>Розрахунковий рахунок:</label>
                <select value={newCompany.MainAccountID} onChange={e=>setNewCompany({...newCompany,MainAccountID:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}}>
                  <option value="">— Розрахункові —</option>
                  {accounts.map(acc => (
                    <option key={acc.ID} value={acc.ID}>{acc.AccountNumber} {acc.BankName ? `(${acc.BankName})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
              <button onClick={addCompany} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>Додати</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 24, marginTop: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e0c9a0', background: '#fff', marginTop: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0c9a0' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', borderRight: '1px solid #e0c9a0' }}>Назва</th>
              <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>ЄДРПОУ</th>
              <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>ІПН</th>
              <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Адреса</th>
              <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Рахунок</th>
              <th style={{ textAlign: 'left' }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c =>
              <tr key={c.ID}>
                <td>{c.Name}</td>
                <td>{c.EDRPOU}</td>
                <td>{c.INN}</td>
                <td>{c.Address}</td>
                <td>{accounts.find(a => a.ID === c.MainAccountID)?.AccountNumber || ''}</td>
                <td>
                  <button onClick={()=>setEditingCompany(c)} style={{marginRight:8}}>✏️</button>
                  <button onClick={()=>deleteCompany(c.ID)} style={{marginRight:8}}>🗑️</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
