import React from "react";
import { api } from "../api";

export default function MainProgramSettings() {
  const [main, setMain] = React.useState({
    mainCurrency: "UAH",
    secondaryCurrency: "USD",
    companyName: "Ваша компанія",
    priceModel: "global", // global | by_center
  });

  // Завантажити поточні значення з ProgrammParameters
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await api.getProgrammParameters();
        if (!mounted || !Array.isArray(list)) return;
        const byKey = new Map(list.map((p) => [p.ParamKey, p]));
        const priceModel = (byKey.get("PriceModel")?.ParamValue || "global").trim();
        setMain((m) => ({ ...m, priceModel }));
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{
      background: "#fff8ee",
      borderRadius: 12,
      padding: 32,
      maxWidth: 550,
      boxShadow: "0 2px 12px #dac7a5aa"
    }}>
      <h2 style={{ color: "#a37c2d", fontWeight: 700 }}>Головні параметри</h2>
      <div style={{ marginBottom: 16 }}>
        <label>Основна валюта:</label><br />
        <select value={main.mainCurrency}
          onChange={e => setMain(m => ({ ...m, mainCurrency: e.target.value }))}
          style={{ padding: 8, borderRadius: 6, width: 200, marginTop: 3 }}
        >
          <option value="UAH">UAH Гривня</option>
          <option value="USD">USD Долар</option>
          <option value="EUR">EUR Євро</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>Додаткова валюта:</label><br />
        <select value={main.secondaryCurrency}
          onChange={e => setMain(m => ({ ...m, secondaryCurrency: e.target.value }))}
          style={{ padding: 8, borderRadius: 6, width: 200, marginTop: 3 }}
        >
          <option value="USD">USD Долар</option>
          <option value="EUR">EUR Євро</option>
          <option value="UAH">UAH Гривня</option>
        </select>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label>Назва підприємства:</label><br />
        <input
          value={main.companyName}
          onChange={e => setMain(m => ({ ...m, companyName: e.target.value }))}
          style={{ padding: 8, borderRadius: 6, width: 300, marginTop: 3 }}
        />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label>Модель цін:</label><br />
        <select
          value={main.priceModel}
          onChange={e => setMain(m => ({ ...m, priceModel: e.target.value }))}
          style={{ padding: 8, borderRadius: 6, width: 260, marginTop: 3 }}
        >
          <option value="global">Однакові для всіх центрів</option>
          <option value="by_center">Окремі по центрах</option>
        </select>
      </div>
      <button
        style={{
          background: "#a37c2d",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 32px",
          fontSize: 16,
          fontWeight: 600,
        }}
        onClick={async () => {
          try {
            await api.upsertProgrammParameter({ ParamKey: "PriceModel", ParamValue: main.priceModel });
            alert("Збережено!");
          } catch (e) {
            // Показуємо детальніше повідомлення і лог у консоль
            alert(`Помилка збереження параметрів: ${e?.message || "невідома"}`);
            try { console.error(e?.diagText || e); } catch {}
          }
        }}
      >
        Зберегти
      </button>
    </div>
  );
}
