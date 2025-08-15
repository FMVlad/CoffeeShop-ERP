import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

const emptySupplier = {
  Name: "",
  Barcode: "",   // Штрихкод
  BankAccount: "",
  BankName: "",
  MFO: "",
  Code: "",
  Address: "",
  Phone: "",
  Email: "",
  IsVATPayer: false,
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupplier);
  const navigate = useNavigate();

  useEffect(() => {
    loadSuppliers();
  }, []);

  function loadSuppliers() {
    api.getSuppliers().then(data => setSuppliers(Array.isArray(data) ? data : []));
  }

  const startAdd = () => {
    setForm(emptySupplier);
    setEditing(null);
    setShowForm(true);
  };

  const startEdit = (s) => {
    setForm(s);
    setEditing(s.ID);
    setShowForm(true);
  };

  const handleFormChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.Name.trim()) return;
    if (editing) {
      await api.updateSupplier(editing, form);
    } else {
      await api.addSupplier(form);
    }
    setShowForm(false);
    setEditing(null);
    loadSuppliers();
  };

  const handleDelete = (id) => {
    if (window.confirm("Видалити постачальника?")) {
      api.deleteSupplier(id).then(loadSuppliers);
    }
  };

  return (
    <div style={{
      background:'linear-gradient(135deg,#e2c7a6 0%,#c7a77a 100%)',
      minHeight:'100vh', width:'100vw', padding: '32px 0'
    }}>
      <div style={{maxWidth:950, margin:'0 auto'}}>
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'linear-gradient(90deg,#7b6eea 0%,#a37c2d 100%)',
          borderRadius:18, padding:'18px 32px',marginBottom:32,boxShadow:'0 2px 12px #0001'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:32}}>🚚</span>
            <span style={{fontSize:24,fontWeight:700,color:'#fff',letterSpacing:0.5}}>Постачальники</span>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={() => navigate("/")}
              style={{
                background:'#e9ecef',color:'#333',border:'none',borderRadius:10,
                padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'
              }}>← На головну</button>
            <button onClick={startAdd}
              style={{
                background:'#00b894',color:'#fff',border:'none',borderRadius:10,
                padding:'12px 32px',fontWeight:700,fontSize:18,cursor:'pointer',boxShadow:'0 2px 8px #0002'
              }}>+ Додати</button>
          </div>
        </div>

        {(showForm) && (
          <div style={{
            background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001',
            padding: 32, marginBottom: 32, maxWidth: 600
          }}>
            <h3 style={{marginBottom: 18, fontWeight: 700}}>{editing ? 'Редагувати постачальника' : 'Додати постачальника'}</h3>
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:2}}>
                  <label style={{fontWeight:500}}>Назва:</label>
                  <input value={form.Name} onChange={e => handleFormChange("Name", e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}} />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Телефон:</label>
                  <input value={form.Phone} onChange={e => handleFormChange("Phone", e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}} />
                </div>
              </div>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Email:</label>
                  <input value={form.Email} onChange={e => handleFormChange("Email", e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}} />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Код:</label>
                  <input value={form.Code} onChange={e => handleFormChange("Code", e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}} />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Штрихкод:</label>
                  <input value={form.Barcode || ""} readOnly
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #eee',fontSize:16,background:'#f7f7f7'}} />
                </div>
              </div>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Платник ПДВ:</label>
                  <input type="checkbox" checked={!!form.IsVATPayer}
                    onChange={e => handleFormChange("IsVATPayer", e.target.checked)} style={{marginLeft:10}} />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Банківський рахунок:</label>
                  <input value={form.BankAccount} onChange={e => handleFormChange("BankAccount", e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}} />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>Банк:</label>
                  <input value={form.BankName} onChange={e => handleFormChange("BankName", e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}} />
                </div>
              </div>
              <div style={{display:'flex', gap:16}}>
                <div style={{flex:1}}>
                  <label style={{fontWeight:500}}>МФО:</label>
                  <input value={form.MFO} onChange={e => handleFormChange("MFO", e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}} />
                </div>
                <div style={{flex:2}}>
                  <label style={{fontWeight:500}}>Адреса:</label>
                  <input value={form.Address} onChange={e => handleFormChange("Address", e.target.value)}
                    style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #ccc',fontSize:16}} />
                </div>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
              <button onClick={handleSubmit}
                style={{background:'#c4282d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16}}>
                {editing ? 'Зберегти' : 'Додати'}
              </button>
              <button onClick={()=>{ setEditing(null); setShowForm(false); }}
                style={{background:'#6c757d',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontWeight:600,fontSize:16,marginLeft:12}}>
                Відміна
              </button>
            </div>
          </div>
        )}

        {/* Таблиця постачальників */}
        <div style={{
          background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001',
          padding: 24, marginTop: 0, overflowX: 'auto'
        }}>
          <table style={{
            width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff',
            fontSize: 18, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px #0001'
          }}>
            <thead>
              <tr style={{ background: '#ede7fb' }}>
                <th style={{border: '1px solid #d1c4e9', padding: '10px 14px', fontWeight:700, fontSize:20}}>Назва</th>
                <th style={{border: '1px solid #d1c4e9'}}>Телефон</th>
                <th style={{border: '1px solid #d1c4e9'}}>Email</th>
                <th style={{border: '1px solid #d1c4e9'}}>Код</th>
                <th style={{border: '1px solid #d1c4e9'}}>Штрихкод</th>
                <th style={{border: '1px solid #d1c4e9'}}>ПДВ</th>
                <th style={{border: '1px solid #d1c4e9'}}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.ID}>
                  <td style={{border: '1px solid #d1c4e9', color: '#764ee3', fontWeight: 700, fontSize: 20, background:'#f8f6ff', padding:'10px 14px'}}>{s.Name}</td>
                  <td style={{border: '1px solid #d1c4e9'}}>{s.Phone}</td>
                  <td style={{border: '1px solid #d1c4e9'}}>{s.Email}</td>
                  <td style={{border: '1px solid #d1c4e9'}}>{s.Code}</td>
                  <td style={{border: '1px solid #d1c4e9', fontFamily: 'monospace', color: '#ba7112', textAlign:'center'}}>{s.Barcode}</td>
                  <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>{s.IsVATPayer ? "✅" : ""}</td>
                  <td style={{border: '1px solid #d1c4e9',textAlign:'center'}}>
                    <button onClick={()=>startEdit(s)} style={{fontSize:22,marginRight:8}}>✏️</button>
                    <button onClick={()=>handleDelete(s.ID)} style={{fontSize:22}}>🗑️</button>
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
