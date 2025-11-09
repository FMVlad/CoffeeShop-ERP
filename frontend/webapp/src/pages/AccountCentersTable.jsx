import React, { useEffect, useState } from "react";
import { api } from "../api";
import AccountCenterForm from "./AccountCenterForm";
import WarehouseForm from "./WarehouseForm";

export default function AccountCentersTable() {
  const [centers, setCenters] = useState([]);
  const [warehouses, setWarehouses] = useState({});
  const [showCenterForm, setShowCenterForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  useEffect(() => { api.getCenters().then(setCenters); }, []);

  useEffect(() => {
    centers.forEach(center =>
      api.getWarehouses(center.ID).then(ws =>
        setWarehouses(prev => ({ ...prev, [center.ID]: ws }))
      )
    );
  }, [centers]);

  const reloadCenters = () => api.getCenters().then(setCenters);

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 24, margin: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ color: "#613cb0" }}>Центри обліку</h2>
        <button style={{ background: "#07bc8b", color: "#fff", padding: "10px 28px", borderRadius: 8 }}
          onClick={() => { setEditingCenter(null); setShowCenterForm(true); }}>+ Додати</button>
      </div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Центр обліку</th>
            <th>Місто</th>
            <th>Телефон</th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          {centers.map(center => (
            <React.Fragment key={center.ID}>
              <tr>
                <td style={{ fontWeight: 700, color: "#7352b2" }}>{center.Name}</td>
                <td>{center.City}</td>
                <td>{center.Phone}</td>
                <td>
                  <button onClick={() => { setEditingCenter(center); setShowCenterForm(true); }}>✏️</button>
                  <button onClick={() => { api.deleteCenter(center.ID).then(reloadCenters); }}>🗑️</button>
                </td>
              </tr>
              {/* Склади */}
              {warehouses[center.ID] && warehouses[center.ID].map(wh => (
                <tr key={wh.ID}>
                  <td style={{ paddingLeft: 36, fontStyle: "italic", color: "#886cbe" }}>— {wh.Name}</td>
                  <td colSpan={2}></td>
                  <td>
                    <button onClick={() => setEditingWarehouse({ ...wh, CenterID: center.ID })}>✏️</button>
                    {wh.Type !== "main" && (
                      <button onClick={() => {
                        api.deleteWarehouse(wh.ID).then(() =>
                          api.getWarehouses(center.ID).then(ws => setWarehouses(prev => ({ ...prev, [center.ID]: ws })))
                        );
                      }}>🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <AccountCenterForm
        open={showCenterForm}
        center={editingCenter}
        onClose={() => setShowCenterForm(false)}
        onSaved={() => { setShowCenterForm(false); reloadCenters(); }}
      />
      <WarehouseForm
        warehouse={editingWarehouse}
        onClose={() => setEditingWarehouse(null)}
        onSaved={() => {
          setEditingWarehouse(null);
          reloadCenters();
        }}
      />
    </div>
  );
}
