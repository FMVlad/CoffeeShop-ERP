// src/pages/OperationsTab.jsx

import React from "react";

export default function OperationsTab() {
  return (
    <div className="p-8 rounded-xl bg-white shadow-lg max-w-3xl mx-auto mt-10 border-2 border-purple-200">
      <h2 className="text-3xl font-extrabold text-purple-900 mb-5">Типові операції</h2>
      <div className="text-lg text-gray-600 italic">
        😴 Ще трошки магії — і тут зʼявляться круті операції...
      </div>
      <div className="mt-6 text-center">
        <span className="inline-block px-4 py-2 bg-purple-100 rounded-xl text-purple-800 font-bold">
          (Тут буде CRUD-табличка для типових операцій)
        </span>
      </div>
    </div>
  );
}
