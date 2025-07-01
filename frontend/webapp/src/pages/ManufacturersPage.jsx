import React, { useEffect, useState } from "react";
import { api } from '../api'

export default function ManufacturersPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    api.getManufacturers().then(setItems);
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    await api.addManufacturer({ Name: name, Country: country });
    setName(""); setCountry("");
    api.getManufacturers().then(setItems);
  };

  const remove = async (id) => {
    await api.deleteManufacturer(id);
    api.getManufacturers().then(setItems);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await api.addManufacturer({ ID: editing.ID, ManufacturerName: editing.ManufacturerName, Country: editing.Country }); // або updateManufacturer, якщо є
    setEditing(null);
    api.getManufacturers().then(setItems);
  };

  return (
    <div style={{background:'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',minHeight:'100vh',width:'100vw',padding:'32px 0'}}>
      <div style={{maxWidth:600, margin:'0 auto'}}>
        <button onClick={() => window.location.assign('/webapp')} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:8,padding:'8px 20px',fontWeight:600,cursor:'pointer',marginBottom:18}}>← На головну</button>
        <h2 style={{fontSize: 24, marginBottom: 24}}>Виробники</h2>
        {editing ? (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32 }}>
            <h3 style={{marginBottom: 18, fontWeight: 700}}>Редагувати виробника</h3>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div>
                <label style={{fontWeight:500}}>Назва:</label>
                <input value={editing.ManufacturerName || ""} onChange={e=>setEditing({...editing,ManufacturerName:e.target.value})} placeholder="Назва" style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
              </div>
              <div>
                <label style={{fontWeight:500}}>Країна:</label>
                <input value={editing.Country || ""} onChange={e=>setEditing({...editing,Country:e.target.value})} placeholder="Країна" style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
                <button onClick={saveEdit} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>Зберегти</button>
                <button onClick={()=>setEditing(null)} style={{background:'#6c757d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16,marginLeft:12}}>Відміна</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32 }}>
            <h3 style={{marginBottom: 18, fontWeight: 700}}>Додати виробника</h3>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div>
                <label style={{fontWeight:500}}>Назва:</label>
                <input value={name || ""} onChange={e => setName(e.target.value)} placeholder="Назва" style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
              </div>
              <div>
                <label style={{fontWeight:500}}>Країна:</label>
                <input value={country || ""} onChange={e => setCountry(e.target.value)} placeholder="Країна" style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
                <button onClick={add} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>Додати</button>
              </div>
            </div>
          </div>
        )}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 24, marginTop: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e0c9a0', background: '#fff', marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0c9a0' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', borderRight: '1px solid #e0c9a0' }}>Назва</th>
                <th style={{ textAlign: 'left', borderRight: '1px solid #e0c9a0' }}>Країна</th>
                <th style={{ textAlign: 'left' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {items.map(m => (
                <tr key={m.ID}>
                  <td style={{borderRight:'1px solid #e0c9a0'}}>{m.ManufacturerName}</td>
                  <td style={{borderRight:'1px solid #e0c9a0'}}>{m.Country}</td>
                  <td>
                    <button onClick={()=>setEditing(m)} style={{marginRight:8}}>✏️</button>
                    <button onClick={()=>remove(m.ID)} style={{color: "red"}}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
