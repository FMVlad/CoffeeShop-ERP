-- Видаляємо зайві документи-чернетки з нульовою сумою
-- Спочатку перевіряємо, що саме видаляємо
SELECT ID, Number, Date, TotalAmount, Status, Comment 
FROM SalesDocuments 
WHERE Status = 'draft' AND TotalAmount = 0;

-- Видаляємо документ ID 39 (чернетка з нульовою сумою)
DELETE FROM SalesDocuments 
WHERE ID = 39 AND Status = 'draft' AND TotalAmount = 0;

-- Перевіряємо результат
SELECT COUNT(*) as RemainingDrafts 
FROM SalesDocuments 
WHERE Status = 'draft';

