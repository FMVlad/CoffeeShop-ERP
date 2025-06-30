import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function PriceListPage() {
  const [products, setProducts] = useState([]);
  const [priceCategories, setPriceCategories] = useState([]);
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    api.getProducts && api.getProducts().then(data => {
      console.log('products:', data);
      setProducts(Array.isArray(data) ? data : []);
    });
    api.getPriceCategories().then(setPriceCategories);
    api.getProductPrices().then(setPrices);
  }, []);

  // Функція для отримання ціни для товару і категорії цін
  const getPrice = (productId, priceCategoryId) => {
    const found = prices.find(p => p.ProductID === productId && p.PriceCategoryID === priceCategoryId);
    return found ? found.Price : '';
  };

  return (
    <div style={{marginLeft: 240, padding: 32}}>
      <h2 style={{fontSize: 24, marginBottom: 24}}>Прайс-лист</h2>
      <table border={1} cellPadding={8} style={{fontSize: 16, borderCollapse: 'collapse'}}>
        <thead>
          <tr>
            <th>Товар</th>
            {priceCategories.map(cat => (
              <th key={cat.ID}>{cat.CategoryName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(products) && products.map(prod => (
            <tr key={prod.ID}>
              <td>{prod.Name}</td>
              {priceCategories.map(cat => (
                <td key={cat.ID}>{getPrice(prod.ID, cat.ID)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 