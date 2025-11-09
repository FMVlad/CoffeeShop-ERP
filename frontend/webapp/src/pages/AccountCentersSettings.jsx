import React, { useState, useEffect } from "react";
import { api } from "../api";
import CashboxesTab from "../components/CashboxesTab";
import AccountCenterCompaniesTab from "../components/AccountCenterCompaniesTab";

// --- Модальна форма для додавання/редагування центру обліку ---
function CenterCardModal({ open, onClose, onSave, initial }) {
  const [tab, setTab] = useState("main");
  const [form, setForm] = useState({
    Name: "",
    City: "",
    FullAddress: "",
    Phone: ""
  });
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoaded, setWarehousesLoaded] = useState(false);

  useEffect(() => {
    setTab("main");
    setForm(initial ? {
      Name: initial.Name || "",
      City: initial.City || "",
      FullAddress: initial.FullAddress || "",
      Phone: initial.Phone || ""
    } : {
      Name: "",
      City: "",
      FullAddress: "",
      Phone: ""
    });
    setWarehouses([]);
    setWarehousesLoaded(false);
    if (initial && initial.ID) {
      api.getWarehouses(initial.ID).then(ws => {
        setWarehouses(ws);
        setWarehousesLoaded(true);
      });
    }
  }, [open, initial]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleWarehouseChange = (id, field, value) => {
    setWarehouses(ws =>
      ws.map(w => w.ID === id ? { ...w, [field]: value } : w)
    );
  };

  const handleWarehouseSave = (w) => {
    if (w.ID) {
      api.updateWarehouse(w.ID, w).then(() => {
        api.getWarehouses(initial.ID).then(setWarehouses);
      });
    }
  };

  const canSave = form.Name.trim();

  return !open ? null : (
    <div className="modal-backdrop" style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.18)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div className="modal-card" style={{
        width: 600, background: "#fff", borderRadius: 24,
        boxShadow: "0 12px 48px #0002", overflow: "hidden", position: "relative", padding: 0
      }}>
        <div style={{ background: "#f7ede2", padding: "24px 40px 10px", textAlign: "center" }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 25 }}>
            {initial && initial.ID ? "Редагувати центр обліку" : "Новий центр обліку"}
          </h2>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #ececec", background: "#f8f9fa" }}>
          {[
            { k: "main", t: "Основні дані" },
            { k: "warehouses", t: "Склади" },
            { k: "cashboxes", t: "Каси" },
            { k: "companies", t: "Підприємства" }
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              disabled={t.k !== "main" && !initial?.ID}
              style={{
                flex: 1, padding: "13px 0", background: tab === t.k ? "#fff" : "transparent",
                border: "none", borderBottom: tab === t.k ? "2px solid #a37c2d" : "2px solid transparent",
                fontWeight: 600, color: tab === t.k ? "#a37c2d" : "#888", fontSize: 16, cursor: "pointer",
                opacity: (t.k !== "main" && !initial?.ID) ? 0.3 : 1
              }}>
              {t.t}
            </button>
          ))}
        </div>
        <div style={{ padding: 32 }}>
          {tab === "main" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <input name="Name" placeholder="Назва центру обліку *" value={form.Name} onChange={handleChange} style={inputStyle} />
              <input name="City" placeholder="Місто" value={form.City} onChange={handleChange} style={inputStyle} />
              <input name="FullAddress" placeholder="Повна адреса" value={form.FullAddress} onChange={handleChange} style={inputStyle} />
              <input name="Phone" placeholder="Телефон" value={form.Phone} onChange={handleChange} style={inputStyle} />
            </div>
          )}
          {tab === "warehouses" && (
            !warehousesLoaded ? <div>Завантаження...</div> : (
              <table style={{
                width: "100%",
                marginTop: 10,
                borderCollapse: "separate",
                borderSpacing: 0,
                border: "2px solid #000",
                borderRadius: 14,
                overflow: "hidden"
              }}>
                <thead>
                  <tr>
                    <th style={headerCellStyle}>Назва складу</th>
                    <th style={headerCellStyle}>Тип</th>
                    <th style={{ ...headerCellStyle, textAlign: 'center' }}>Активний</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map(w => (
                    <tr key={w.ID}>
                      <td style={cellStyle}>
                        <input
                          value={w.Name}
                          onChange={e => handleWarehouseChange(w.ID, "Name", e.target.value)}
                          onBlur={() => handleWarehouseSave(w)}
                          style={inputStyle}
                        />
                      </td>
                      <td style={cellStyle}>{w.Type}</td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!w.IsActive}
                          onChange={e => handleWarehouseChange(w.ID, "IsActive", e.target.checked ? 1 : 0)}
                          onBlur={() => handleWarehouseSave(w)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {tab === "cashboxes" && (
            initial?.ID ? <CashboxesTab centerId={initial.ID} /> : <div>Додайте спочатку центр обліку.</div>
          )}
          {tab === "companies" && (
            initial?.ID ? <AccountCenterCompaniesTab centerId={initial.ID} /> : <div>Додайте спочатку центр обліку.</div>
          )}
        </div>
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 12,
          padding: "0 32px 32px 32px"
        }}>
          <button onClick={onClose} style={cancelBtnStyle}>Скасувати</button>
          <button
            onClick={() => onSave(form)}
            style={saveBtnStyle}
            disabled={!canSave}
          >Зберегти</button>
        </div>
      </div>
    </div>
  );
}

// --- Основна сторінка Центрів обліку ---
export default function AccountCentersSettings() {
  const [centers, setCenters] = useState([]);
  const [warehousesMap, setWarehousesMap] = useState({});
  const [openModal, setOpenModal] = useState(false);
  const [editCenter, setEditCenter] = useState(null);

  const refreshCenters = () => api.getCenters().then(data => {
    setCenters(Array.isArray(data) ? data : []);
    if (Array.isArray(data)) {
      data.forEach(center => {
        api.getWarehouses(center.ID).then(ws => {
          setWarehousesMap(prev => ({
            ...prev,
            [center.ID]: ws.filter(w => w.IsActive)
          }));
        });
      });
    }
  });

  useEffect(() => {
    refreshCenters();
  }, []);

  const handleSave = (form) => {
    const save = editCenter && editCenter.ID
      ? api.updateCenter(editCenter.ID, form)
      : api.addCenter(form);
    save.then(() => {
      refreshCenters();
      setOpenModal(false);
      setEditCenter(null);
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Видалити центр обліку?")) {
      api.deleteCenter(id).then(refreshCenters);
    }
  };

  return (
    <div style={{ maxWidth: 1150, margin: "40px auto", padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: ".02em" }}>Центри обліку</h2>
        <button onClick={() => { setOpenModal(true); setEditCenter(null); }}
          style={addBtnStyle}>+ Додати</button>
      </div>
      <div style={{
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 4px 32px #0002",
        padding: 0,
        margin: 0,
        overflow: "hidden"
      }}>
        <table style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          fontFamily: "inherit",
          borderRadius: 18,
          overflow: "hidden",
          margin: 0,
          boxShadow: "0 0 0 2px #000"
        }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Центр обліку</th>
              <th style={headerCellStyle}>Склади центру</th>
              <th style={{ ...headerCellStyle, textAlign: "center", width: 120 }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {centers.map(center => (
              <tr key={center.ID} style={{
                borderBottom: "2px solid #000",
                background: "#f9f8fe"
              }}>
                <td style={{
                  padding: "16px 18px",
                  fontWeight: 700,
                  color: "#392275",
                  border: "2px solid #000",
                  fontSize: 18,
                  verticalAlign: "top",
                  minWidth: 180
                }}>
                  {center.Name}
                  <div style={{
                    color: "#767696",
                    fontSize: 15,
                    fontWeight: 400,
                    marginTop: 6
                  }}>{center.City}</div>
                </td>
                <td style={{
                  padding: "16px 18px",
                  fontSize: 17,
                  color: "#1d1d1d",
                  border: "2px solid #000",
                  verticalAlign: "top"
                }}>
                  {warehousesMap[center.ID] && warehousesMap[center.ID].length > 0
                    ? warehousesMap[center.ID].map(w => w.Name).join(", ")
                    : <span style={{ color: "#bbb" }}>—</span>
                  }
                </td>
                <td style={{
                  textAlign: "center",
                  padding: "12px",
                  border: "2px solid #000",
                  verticalAlign: "top"
                }}>
                  <button
                    onClick={() => { setOpenModal(true); setEditCenter(center); }}
                    style={{
                      background: "#fff8c5",
                      border: "2px solid #c0b31c",
                      borderRadius: 8,
                      color: "#856800",
                      fontWeight: 700,
                      padding: "7px 14px",
                      marginRight: 10,
                      fontSize: 22,
                      cursor: "pointer"
                    }}
                    title="Редагувати"
                  >✏️</button>
                  <button
                    onClick={() => handleDelete(center.ID)}
                    style={{
                      background: "#ffe3e3",
                      border: "2px solid #d64040",
                      borderRadius: 8,
                      color: "#d64040",
                      fontWeight: 700,
                      padding: "7px 14px",
                      fontSize: 22,
                      cursor: "pointer"
                    }}
                    title="Видалити"
                  >🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CenterCardModal
        open={openModal}
        onClose={() => { setOpenModal(false); setEditCenter(null); }}
        onSave={handleSave}
        initial={editCenter}
      />
    </div>
  );
}

// --- Styles ---
const headerCellStyle = {
  background: "#e6d7fa",
  color: "#22105a",
  fontWeight: 700,
  fontSize: 18,
  padding: "14px 18px",
  border: "2px solid #000",
  textAlign: "left",
  minWidth: 140
};
const cellStyle = {
  padding: "12px 18px",
  border: "2px solid #000",
  fontSize: 15,
  color: "#22105a",
  background: "#fff"
};
const inputStyle = {
  fontSize: 17, padding: "13px", borderRadius: 9, border: "1px solid #ccc",
  width: "100%", boxSizing: "border-box", marginBottom: 0
};
const addBtnStyle = {
  background: "#208f41", color: "#fff", padding: "12px 32px",
  borderRadius: 10, fontSize: 18, border: "none", fontWeight: 700, cursor: "pointer",
  boxShadow: "0 2px 8px #0001"
};
const cancelBtnStyle = {
  background: "#eee", color: "#444", border: "none", borderRadius: 8,
  padding: "13px 27px", fontWeight: 600, cursor: "pointer", fontSize: 16
};
const saveBtnStyle = {
  background: "#208f41", color: "#fff", border: "none", borderRadius: 8,
  padding: "13px 27px", fontWeight: 600, cursor: "pointer", fontSize: 16
};
