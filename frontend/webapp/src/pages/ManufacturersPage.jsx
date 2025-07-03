import React, { useEffect, useState } from "react";
import { api } from '../api'

export default function ManufacturersPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(90deg,#7b6eea 0%,#a37c2d 100%)',borderRadius:18,padding:'18px 32px',marginBottom:32,boxShadow:'0 2px 12px #0001'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:32}}>🏭</span>
            <span style={{fontSize:24,fontWeight:700,color:'#fff',letterSpacing:0.5}}>Виробники</span>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={() => window.location.assign('/webapp')} style={{background:'#e9ecef',color:'#333',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>← На головну</button>
            <button onClick={() => { setEditing(null); setShowForm(true); }} style={{background:'#00b894',color:'#fff',border:'none',borderRadius:10,padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'}}>+ Додати</button>
          </div>
        </div>
        {(showForm || editing) && (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32 }}>
            <h3 style={{marginBottom: 18, fontWeight: 700}}>{editing ? 'Редагувати виробника' : 'Додати виробника'}</h3>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div>
                <label style={{fontWeight:500}}>Назва:</label>
                <input value={editing ? (editing.ManufacturerName || "") : (name || "")} onChange={e=>editing ? setEditing({...editing,ManufacturerName:e.target.value}) : setName(e.target.value)} placeholder="Назва" style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
              </div>
              <div>
                <label style={{fontWeight:500}}>Країна:</label>
                <input value={editing ? (editing.Country || "") : (country || "")} onChange={e=>editing ? setEditing({...editing,Country:e.target.value}) : setCountry(e.target.value)} placeholder="Країна" style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc'}} />
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
                <button onClick={editing ? saveEdit : add} style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>{editing ? 'Зберегти' : 'Додати'}</button>
                <button onClick={()=>{ setEditing(null); setShowForm(false); }} style={{background:'#6c757d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16,marginLeft:12}}>Відміна</button>
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
