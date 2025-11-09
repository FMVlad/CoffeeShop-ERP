-- Перевірка наявності категорій цін
SELECT COUNT(*) as TotalCount FROM PriceCategories;

-- Показуємо всі категорії цін
SELECT TOP 10 ID, CategoryName FROM PriceCategories ORDER BY ID;

-- Перевіряємо структуру таблиці
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'PriceCategories' 
ORDER BY ORDINAL_POSITION;

