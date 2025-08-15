// src/sections/arrival/ArrivalDocActions.jsx
import React from "react";

export default function ArrivalDocActions({
  total,
  canSave,
  saving,
  posting,
  hasId,
  onSave,
  onPostings,
  onCancel,
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-4">
      <div className="text-lg">
        Разом (позиції): <b>{Number(total || 0).toFixed(2)}</b>
      </div>

      <button
        className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-60"
        onClick={onPostings}
        disabled={posting || !hasId}
        title={!hasId ? "Спочатку збережи документ" : undefined}
      >
        {posting ? "Проводжу…" : "Провести"}
      </button>

      <button
        className="bg-green-700 text-white px-5 py-2 rounded disabled:opacity-60"
        onClick={onSave}
        disabled={saving || !canSave}
        title={
          !canSave
            ? "Обери постачальника, компанію, центр і додай хоча б одну позицію"
            : undefined
        }
      >
        {saving ? "Збереження…" : "Зберегти (Ctrl+S)"}
      </button>

      <button
        className="bg-gray-500 text-white px-5 py-2 rounded"
        onClick={onCancel}
        disabled={saving || posting}
        title="Esc"
      >
        Відміна
      </button>
    </div>
  );
}
