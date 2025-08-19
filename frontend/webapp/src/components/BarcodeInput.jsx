import React, { useRef, useState } from "react";
import { api } from "../api";
import { setSelection } from "../utils/selectionBridge";

export default function BarcodeInput({
  onResolve,
  onNotFound,
  placeholder = "Скануй або введи та натисни Enter",
  autoFocus = false,
  className = "",
  // Універсальний режим: якщо товар знайдено і задано selectionKey — повертаємо в документ через bridge
  universal = false,
  selectionKey = null,
  backUrl = null,
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  async function resolve() {
    const s = code.trim();
    if (!s) return;
    setLoading(true);
    try {
      const p = await api.getProductByBarcode(s);
      if (p) {
        // Пріоритет: якщо надано onResolve — додаємо в поточний документ без навігації
        if (typeof onResolve === "function") {
          onResolve(p);
        } else if (universal && selectionKey && backUrl) {
          const name = p.FullName || p.fullName || p.ProductName || p.Name || p.name || "";
          const id = p.ID ?? p.Id ?? p.id ?? p.ProductID ?? p.product_id ?? undefined;
          if (id) {
            setSelection(selectionKey, { items: [{ id, qty: 1, name }], meta: { source: 'barcode' } });
            window.location.assign(backUrl);
            return;
          }
        }
      } else {
        if (universal) {
          try { sessionStorage.setItem('prefill_barcode', s); } catch {}
          const back = backUrl || (window.location.pathname + window.location.search);
          const target = `/products?mode=add&source=selector&back=${encodeURIComponent(back)}`;
          window.location.assign(target);
          return;
        } else {
          if (typeof onNotFound === "function") onNotFound(s);
          // без alert — передаємо керування зовнішній логіці
          onResolve?.(null); // НЕ додаємо пустий рядок
        }
      }
    } catch (e) {
      console.error(e);
      onResolve?.(null);
    } finally {
      setLoading(false);
      setCode("");
      inputRef.current?.focus();
    }
  }

  return (
    <input
      ref={inputRef}
      className={`border rounded p-2 w-full ${className}`}
      value={code}
      onChange={(e) => setCode(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !loading) {
          e.preventDefault();
          resolve();
        }
      }}
      placeholder={loading ? "Пошук…" : placeholder}
      autoFocus={autoFocus}
      disabled={loading}
      inputMode="numeric"
    />
  );
}
