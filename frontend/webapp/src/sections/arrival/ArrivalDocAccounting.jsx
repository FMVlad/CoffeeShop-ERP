import React from "react";

export default function ArrivalDocAccounting({ postings = [] }) {
  return (
    <div className="mt-4">
      <div className="text-sm text-gray-600 mb-2">
        Проводки сформовано за типовою операцією після натискання «Провести».
      </div>
      <table className="min-w-full bg-white border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border w-16">№</th>
            <th className="p-2 border">Дт</th>
            <th className="p-2 border">Кт</th>
            <th className="p-2 border w-32">Сума</th>
            <th className="p-2 border">Коментар</th>
          </tr>
        </thead>
        <tbody>
          {postings.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-3 text-center text-gray-500">
                Проводок ще нема
              </td>
            </tr>
          ) : (
            postings.map((p, i) => (
              <tr key={i}>
                <td className="p-2 border text-right">{p.LineNo}</td>
                <td className="p-2 border">{p.DebitAccount}</td>
                <td className="p-2 border">{p.CreditAccount}</td>
                <td className="p-2 border text-right">{Number(p.Amount || 0).toFixed(2)}</td>
                <td className="p-2 border">{p.Comment || ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
