import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function AdminServicePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [presetKey, setPresetKey] = useState("costing_manual");
  const [strategy, setStrategy] = useState("yesterday");
  const [enabled, setEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState("02:30");

  useEffect(() => {
    // load manual preset if exists
    (async () => {
      try {
        const t = await api.getServiceTask("costing_manual");
        setPresetKey(t.TaskKey || "costing_manual");
        setEnabled(!!t.Enabled);
        setDailyTime(t.DailyTime || "02:30");
        try {
          const p = JSON.parse(t.ParamsJson || "{}");
          setStrategy(p.strategy || "yesterday");
          setFrom(p.from || "");
          setTo(p.to || "");
        } catch {}
      } catch {}
    })();
  }, []);

  const runCosting = async () => {
    setBusy(true);
    setOut("");
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.post("/costing/run", params);
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(e?.diagText || e?.message || "Помилка");
    } finally {
      setBusy(false);
    }
  };

  const savePreset = async () => {
    setBusy(true);
    setOut("");
    try {
      const params = { strategy };
      if (strategy === "range") {
        if (from) params.from = from;
        if (to) params.to = to;
      }
      const payload = {
        TaskType: "costing_fifo",
        Enabled: enabled,
        DailyTime: dailyTime,
        ParamsJson: JSON.stringify(params),
      };
      const res = await api.upsertServiceTask(presetKey || "costing_manual", payload);
      setOut(JSON.stringify({ saved: true, res }, null, 2));
    } catch (e) {
      setOut(e?.diagText || e?.message || "Помилка збереження пресету");
    } finally {
      setBusy(false);
    }
  };

  const runPreset = async () => {
    setBusy(true);
    setOut("");
    try {
      const res = await api.runServiceTaskNow(presetKey || "costing_manual");
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(e?.diagText || e?.message || "Помилка запуску пресету");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-coffee-50 via-white to-coffee-100 px-4 py-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
        <h1 className="text-xl font-semibold text-coffee-800 mb-4">Адмін • Сервіс</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-sm text-coffee-600 mb-1">Стратегія</label>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="strat" value="yesterday" checked={strategy==='yesterday'} onChange={()=>setStrategy('yesterday')} /> Вчора
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="strat" value="range" checked={strategy==='range'} onChange={()=>setStrategy('range')} /> Діапазон дат
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="strat" value="dirty_from" checked={strategy==='dirty_from'} onChange={()=>setStrategy('dirty_from')} /> Із брудної дати
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm text-coffee-600 mb-1">З дати</label>
            <input type="date" className="w-full border rounded px-3 py-2" value={from} onChange={(e)=>setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-coffee-600 mb-1">По дату</label>
            <input type="date" className="w-full border rounded px-3 py-2" value={to} onChange={(e)=>setTo(e.target.value)} />
          </div>
          <div>
            <button
              onClick={runCosting}
              disabled={busy}
              className="w-full bg-coffee-600 hover:bg-coffee-700 text-white rounded px-4 py-2 disabled:opacity-60"
            >
              {busy ? "Перераховую…" : "Перерахувати собівартість (FIFO)"}
            </button>
          </div>
        </div>

        <hr className="my-6" />
        <h2 className="text-base font-semibold text-coffee-800 mb-3">Автоматичний перерахунок собівартості (за розкладом)</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm text-coffee-600 mb-1">Ключ завдання</label>
            <input className="w-full border rounded px-3 py-2" value={presetKey} onChange={(e)=>setPresetKey(e.target.value)} placeholder="costing_manual" />
          </div>
          <div>
            <label className="block text-sm text-coffee-600 mb-1">Час щоденного запуску</label>
            <input className="w-full border rounded px-3 py-2" value={dailyTime} onChange={(e)=>setDailyTime(e.target.value)} placeholder="02:30" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)} /> Увімкнути автозапуск за розкладом
          </label>
          <div className="flex gap-2">
            <button onClick={savePreset} disabled={busy} className="flex-1 bg-coffee-600 hover:bg-coffee-700 text-white rounded px-4 py-2 disabled:opacity-60">Зберегти розклад</button>
            <button onClick={runPreset} disabled={busy} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-2 disabled:opacity-60">Запустити зараз</button>
          </div>
        </div>
        <pre className="mt-6 text-xs bg-coffee-50 border rounded p-3 overflow-auto" style={{maxHeight: 320}}>{out}</pre>
      </div>
    </div>
  );
}


