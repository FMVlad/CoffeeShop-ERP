import React, { useState, useEffect } from "react";
import { api } from '../api';

export default function TaxDirectoryPage() {
  const [taxes, setTaxes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyTax = { Name: "", TaxRate: "", IsFixed: false, CurrencyID: "", Notes: "" };
  const [newTax, setNewTax] = useState(emptyTax);

  useEffect(() => {
    api.getTaxes().then(setTaxes);
  }, []);

  const handleFormChange = (k, v) =>
    editing ? setEditing({ ...editing, [k]: v }) : setNewTax({ ...newTax, [k]: v });

  const handleAdd = () => {
    setEditing(null); setNewTax(emptyTax); setShowForm(true);
  };

  const handleEdit = t => { setEditing(t); setShowForm(true); };

  const handleSubmit = async () => {
    editing
      ? await api.updateTax(editing.ID, editing)
      : await api.addTax(newTax);
    setShowForm(false); setEditing(null);
    api.getTaxes().then(setTaxes);
  };

  const handleDelete = async id => {
    if (window.confirm("Видалити податок?")) {
      await api.deleteTax(id);
      api.getTaxes().then(setTaxes);
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Довідник податків</h2>
      <button onClick={handleAdd} style={{ marginBottom: 18 }}>+ Додати податок</button>
      {showForm && (
        <div>
          <input value={(editing ? editing.Name : newTax.Name) || ""} onChange={e => handleFormChange('Name', e.target.value)} placeholder="Назва" />
          {/* ...інші поля... */}
          <button onClick={handleSubmit}>Зберегти</button>
          <button onClick={() => setShowForm(false)}>Відміна</button>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>Назва</th><th>Ставка</th><th>Фіксований</th><th>Валюта</th><th>Дії</th>
          </tr>
        </thead>
        <tbody>
          {taxes.map(t => (
            <tr key={t.ID}>
              <td>{t.Name}</td>
              <td>{t.TaxRate}</td>
              <td>{t.IsFixed ? "Так" : "Ні"}</td>
              <td>{t.CurrencyID}</td>
              <td>
                <button onClick={() => handleEdit(t)}>✏️</button>
                <button onClick={() => handleDelete(t.ID)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
