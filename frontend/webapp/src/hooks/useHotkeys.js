// src/hooks/useHotkeys.js
import { useEffect } from "react";

/**
 * Глобальні хоткеї для форми.
 *
 * Підтримує:
 * - Ctrl/Cmd + S       -> onSave()
 * - Ctrl/Cmd + Enter   -> onAddRow()
 * - Esc                -> onCancel()
 * - Ctrl + B або F1    -> onFocusBarcode()
 *
 * enabled — вмикає/вимикає слухач (наприклад, тільки коли форма відкрита).
 */
export default function useHotkeys({
  enabled = true,
  onSave,
  onAddRow,
  onCancel,
  onFocusBarcode,
}) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      const key = e.key?.toLowerCase?.() || "";

      // Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        onAddRow?.();
        return;
      }

      // Esc
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
        return;
      }

      // Ctrl + B або F1
      if ((e.ctrlKey && key === "b") || e.key === "F1") {
        e.preventDefault();
        onFocusBarcode?.();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onSave, onAddRow, onCancel, onFocusBarcode]);
}
