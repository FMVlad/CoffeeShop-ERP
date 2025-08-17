import React from "react";
import SearchPicker from "./SearchPicker";
import { api } from "../api";

/**
 * Вибір товару з пошуку.
 * На виході onSelect -> { ProductID, ProductName } з ПОВНОЮ назвою.
 */
export default function ProductPicker({ value, onSelect, onSelectRaw, ...rest }) {
  const normalizedValue = value
    ? {
        ...value,
        ID: value.ID ?? value.ProductID ?? value.id,
        FullName:
          value.FullName ??
          value.ProductName ??
          value.fullName ??
          value.Name ??
          value.name ??
          "",
        Name: value.Name ?? value.ProductName ?? value.name ?? "",
        Barcode: value.Barcode ?? value.barcode ?? "",
        Sku: value.Sku ?? value.sku ?? "",
      }
    : null;

  return (
    <SearchPicker
      value={normalizedValue}
      searchFn={api.searchProducts}
      getKey={(p) => p?.ID ?? p?.ProductID ?? ""}
      getLabel={(p) => p?.FullName ?? p?.ProductName ?? p?.Name ?? ""}
      renderItem={(p) => (
        <div>
          <div className="text-sm text-coffee-900">
            {p.FullName || p.ProductName || p.Name || "—"}
          </div>
          <div className="text-xs text-coffee-500">
            {p.Barcode ? `Штрихкод: ${p.Barcode}` : "—"}
            {p.Article ? ` • Артикул: ${p.Article}` : (p.Sku ? ` • SKU: ${p.Sku}` : "")}
          </div>
        </div>
      )}
      onSelect={(p) => {
        if (!p) {
          onSelectRaw?.(null);
          onSelect?.({ ProductID: "", ProductName: "" });
          return;
        }
        onSelectRaw?.(p);
        onSelect?.({
          ProductID: p.ID ?? p.ProductID,
          ProductName: p.FullName || p.ProductName || p.Name || "",
        });
      }}
      placeholder="Пошук товару за назвою/штрихкодом…"
      minChars={3}
      {...rest}
    />
  );
}
