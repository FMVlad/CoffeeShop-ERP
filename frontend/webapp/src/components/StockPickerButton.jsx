import React from "react";
import { useNavigate } from "react-router-dom";

export default function StockPickerButton({
  selectionKey = "stock",
  label = "Обрати зі складу",
  centerId = "",
  warehouseId = "",
  priceCategoryId = "",
  categoryId = "",
  className = "",
  style = {},
}) {
  const navigate = useNavigate();
  const onClick = () => {
    const back = window.location.pathname + window.location.search;
    const params = new URLSearchParams();
    params.set("select", "1");
    params.set("back", back);
    params.set("key", selectionKey);
    if (centerId) params.set("center_id", centerId);
    if (warehouseId) params.set("warehouse_id", warehouseId);
    if (priceCategoryId) params.set("price_category_id", priceCategoryId);
    if (categoryId) params.set("category_id", categoryId);
    
    // Додаємо логування для відладки
    if (selectionKey === 'discount_doc') {
      console.log('🔍 StockPickerButton: Перехід до StockStatePage з параметрами:', {
        selectionKey,
        centerId,
        warehouseId,
        priceCategoryId,
        categoryId,
        url: `/stock/state?${params.toString()}`
      });
      console.log('🔍 StockPickerButton: Детальні параметри URL:', params.toString());
      console.log('🔍 StockPickerButton: centerId тип:', typeof centerId, 'значення:', centerId);
      console.log('🔍 StockPickerButton: warehouseId тип:', typeof warehouseId, 'значення:', warehouseId);
      
      // Додатково перевіряємо, чи правильно передається warehouseId
      if (warehouseId) {
        console.log('🔍 StockPickerButton: warehouseId передається в URL:', warehouseId);
      } else {
        console.log('🔍 StockPickerButton: ПРОБЛЕМА: warehouseId НЕ передається!');
      }
    }
    
    navigate(`/stock/state?${params.toString()}`);
  };
  return (
    <button onClick={onClick} className={className} style={style}>
      {label}
    </button>
  );
}



