import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function AdminSystemParameters() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.getSystemParameters();
        setRows(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemParameters();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const addParam = async () => {
    if (!newKey.trim()) return;
    setSaving(true);
    try {
      await api.post("/system-parameters", null, { ParamKey: newKey.trim(), ParamValue: newVal });
      setNewKey("");
      setNewVal("");
      await reload();
    } catch (e) {
      alert(e?.message || "Помилка додавання");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-coffee-800 mb-4">Системні параметри</h2>
      {loading ? (
        <div>Завантаження…</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-sm text-coffee-600 mb-1">Ключ</label>
              <input className="w-full border rounded px-3 py-2" value={newKey} onChange={(e)=>setNewKey(e.target.value)} placeholder="ParamKey" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-coffee-600 mb-1">Значення</label>
              <input className="w-full border rounded px-3 py-2" value={newVal} onChange={(e)=>setNewVal(e.target.value)} placeholder="ParamValue" />
            </div>
            <div>
              <button onClick={addParam} disabled={saving || !newKey.trim()} className="w-full bg-coffee-600 hover:bg-coffee-700 text-white rounded px-4 py-2 disabled:opacity-60">Додати</button>
            </div>
          </div>
          <table className="min-w-full bg-white border rounded">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Ключ</th>
                <th className="p-2 border">Значення</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ID}>
                  <td className="p-2 border whitespace-nowrap">{r.ParamKey}</td>
                  <td className="p-2 border">{r.ParamValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


