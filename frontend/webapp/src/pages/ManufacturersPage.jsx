import React, { useEffect, useState } from "react";
import { api } from '../api'

export default function ManufacturersPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");

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

  return (
    <div style={{marginLeft: 240, padding: 32}}>
      <h2>Виробники</h2>
      <div style={{marginBottom: 24}}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Назва" style={{marginRight: 8}} />
        <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Країна" style={{marginRight: 8}} />
        <button onClick={add}>Додати</button>
      </div>
      <ul>
        {items.map(m => (
          <li key={m.ID}>
            {m.Name} ({m.Country}){" "}
            <button onClick={() => remove(m.ID)} style={{color: "red"}}>Видалити</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
