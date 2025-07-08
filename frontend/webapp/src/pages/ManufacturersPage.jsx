import React, { useEffect, useState } from "react";
import { api } from '../api';

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
    setShowForm(false);
  };

  const remove = async (id) => {
    await api.deleteManufacturer(id);
    api.getManufacturers().then(setItems);
  };

  const startEdit = (m) => {
    setEditing({
      ID: m.ID,
      Name: m.ManufacturerName || m.Name || m.name || "",
      Country: m.Country || m.country || ""
    });
    setShowForm(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await api.updateManufacturer(editing.ID, {
      Name: editing.Name,
      Country: editing.Country
    });
    setEditing(null);
    setShowForm(false);
    api.getManufacturers().then(setItems);
  };

  const cancelForm = () => {
    setEditing(null);
    setShowForm(false);
    setName(""); setCountry("");
  };

  return (
    <div style={{
      background:'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',
      minHeight:'100vh', width:'100vw', padding:'32px 0'
    }}>
      <div style={{maxWidth:600, margin:'0 auto'}}>
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'linear-gradient(90deg,#7b6eea 0%,#a37c2d 100%)',
          borderRadius:18,padding:'18px 32px',marginBottom:32,boxShadow:'0 2px 12px #0001'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:32}}>🏭</span>
            <span style={{fontSize:24,fontWeight:700,color:'#fff',letterSpacing:0.5}}>Виробники</span>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={() => window.location.assign('/webapp')}
              style={{
                background:'#e9ecef',color:'#333',border:'none',borderRadius:10,
                padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'
              }}>← На головну</button>
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              style={{
                background:'#00b894',color:'#fff',border:'none',borderRadius:10,
                padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'
              }}>+ Додати</button>
          </div>
        </div>

        {(showForm || editing) && (
          <div style={{
            background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32
          }}>
            <h3 style={{marginBottom: 18, fontWeight: 700, fontSize: 22}}>
              {editing ? 'Редагувати виробника' : 'Додати виробника'}
            </h3>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div>
                <label style={{fontWeight:500}}>Назва:</label>
                <input
                  value={editing ? editing.Name : name}
                  onChange={e => editing
                    ? setEditing({...editing, Name: e.target.value})
                    : setName(e.target.value)}
                  placeholder="Назва"
                  style={{width:'100%',padding:12,borderRadius:6,border:'1px solid #ccc',fontSize:18}}
                />
              </div>
              <div>
                <label style={{fontWeight:500}}>Країна:</label>
                <input
                  value={editing ? editing.Country : country}
                  onChange={e => editing
                    ? setEditing({...editing, Country: e.target.value})
                    : setCountry(e.target.value)}
                  placeholder="Країна"
                  style={{width:'100%',padding:12,borderRadius:6,border:'1px solid #ccc',fontSize:18}}
                />
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
                <button onClick={editing ? saveEdit : add}
                  style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:17}}>
                  {editing ? 'Зберегти' : 'Додати'}
                </button>
                <button onClick={cancelForm}
                  style={{background:'#6c757d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:17,marginLeft:12}}>
                  Відміна
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблиця виробників */}
        <div style={{
          background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 24, marginTop: 0
        }}>
          <table style={{
            width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff',
            fontSize: 18, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px #0001'
          }}>
            <thead>
              <tr style={{ background: '#ede7fb' }}>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:20}}>Назва</th>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:20}}>Країна</th>
                <th style={{border: '1px solid #d1c4e9', fontWeight:700, fontSize:20}}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {items.map(m => (
                <tr key={m.ID} style={{background:'#f8f6ff'}}>
                  <td style={{
                    border: '1px solid #d1c4e9',
                    color: '#764ee3',
                    fontWeight: 700,
                    fontSize: 18,
                    padding:'10px 14px'
                  }}>
                    {m.ManufacturerName || m.Name || m.name || <span style={{ color: "#bbb" }}>—</span>}
                  </td>
                  <td style={{
                    border: '1px solid #d1c4e9',
                    fontSize: 18,
                    padding:'10px 14px'
                  }}>
                    {m.Country || m.country || <span style={{ color: "#bbb" }}>—</span>}
                  </td>
                  <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>
                    <button onClick={() => startEdit(m)} style={{fontSize:22,marginRight:8}}>✏️</button>
                    <button onClick={() => remove(m.ID)} style={{fontSize:22}}>🗑️</button>
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
