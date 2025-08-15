import React, { useRef, useState } from "react";
import { api } from "../api";

export default function BarcodeInput({
  onResolve,
  onNotFound,
  placeholder = "Скануй або введи та натисни Enter",
  autoFocus = false,
  className = "",
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
        onResolve?.(p);
      } else {
        if (typeof onNotFound === "function") onNotFound(s);
        else alert("Штрихкод не знайдено");
        onResolve?.(null); // НЕ додаємо пустий рядок
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
