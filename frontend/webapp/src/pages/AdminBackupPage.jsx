import React, { useState } from "react";

export default function AdminBackupPage() {
  const [out, setOut] = useState("");
  return (
    <div>
      <h2 className="text-lg font-semibold text-coffee-800 mb-4">Бекап бази даних</h2>
      <p className="text-sm text-coffee-700 mb-3">Тут з'явиться запуск резервного копіювання (скоро). Поки що сторінка-заготовка.</p>
      <pre className="text-xs bg-coffee-50 border rounded p-3">{out}</pre>
    </div>
  );
}


