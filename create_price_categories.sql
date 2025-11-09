-- Створюємо таблицю PriceCategories, якщо її немає
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PriceCategories' AND xtype='U')
BEGIN
    CREATE TABLE PriceCategories (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        CategoryName NVARCHAR(255) NOT NULL,
        IsDefault BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table PriceCategories created';
END
ELSE
BEGIN
    PRINT 'Table PriceCategories already exists';
END

-- Додаємо тестові дані, якщо таблиця порожня
IF NOT EXISTS (SELECT 1 FROM PriceCategories)
BEGIN
    INSERT INTO PriceCategories (CategoryName, IsDefault) VALUES 
    ('Роздрібна', 1),
    ('Оптова', 0),
    ('Спеціальна', 0);
    PRINT 'Test data inserted';
END
ELSE
BEGIN
    PRINT 'Data already exists in PriceCategories';
END

-- Показуємо результат
SELECT ID, CategoryName, IsDefault FROM PriceCategories ORDER BY ID;

