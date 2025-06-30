# 🚀 Інструкція по налаштуванню CoffeeBot з MSSQL

## Що ми створили:

✨ **Сучасний веб-інтерфейс:**
- Красивий дизайн з Tailwind CSS
- Пошук та фільтрація товарів
- Модальні вікна для додавання/редагування
- Toast сповіщення
- Адаптивний дизайн

🗄️ **База даних MSSQL:**
- Таблиця товарів з усіма полями
- Підтримка фото
- EAN13 коди
- Категорії
- Склад

🔧 **API FastAPI:**
- CRUD операції
- Завантаження фото
- Статистика
- Генерація EAN13

## 📋 Крок 1: Налаштування MSSQL

### Варіант А: SQL Server (рекомендовано)
1. Встановіть SQL Server або SQL Server Express
2. Створіть базу даних `CoffeeBotDB`
3. Створіть користувача або використовуйте sa

### Варіант Б: LocalDB (для розробки)
```bash
# Встановлення SQL Server Express LocalDB
# Завантажте з Microsoft і встановіть
```

## 📋 Крок 2: Налаштування підключення

Відредагуйте файл `backend/app/config.py`:

```python
class DatabaseConfig:
    # Ваші налаштування MSSQL
    SERVER = "localhost"  # або назва вашого сервера
    DATABASE = "CoffeeBotDB"
    USERNAME = "sa"  # ваш логін
    PASSWORD = "YourPassword123!"  # ваш пароль
    
    # Для Windows Authentication розкоментуйте:
    # USE_WINDOWS_AUTH = True
```

### Для Windows Authentication:
```python
class DatabaseConfig:
    SERVER = "localhost\\SQLEXPRESS"
    DATABASE = "CoffeeBotDB"
    USE_WINDOWS_AUTH = True
```

## 📋 Крок 3: Встановлення залежностей

```bash
# Бекенд
cd backend/app
pip install -r requirements.txt

# Фронтенд (якщо потрібно)
cd ../../frontend/webapp
npm install
```

## 📋 Крок 4: Ініціалізація бази даних

```bash
cd backend/app
python init_db.py
```

Ви побачите:
```
🚀 Початок ініціалізації бази даних...
📊 Створення таблиць...
✅ Таблиці створені успішно!
📝 Додавання тестових товарів...
✅ Додано: Еспресо - 35.0 ₴
✅ Додано: Капучино - 55.0 ₴
...
🎉 Ініціалізація завершена успішно!
```

## 📋 Крок 5: Запуск

### Запуск бекенду:
```bash
cd backend/app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Запуск фронтенду (окремо):
```bash
cd frontend/webapp
npm start
```

### Або використовуйте готові .bat файли:
- `start_api.bat` - запуск API
- `start_react.bat` - запуск React

## 🎯 Що працює:

### API Endpoints:
- `GET /api/menu` - список товарів з фільтрацією
- `POST /api/menu` - створити товар
- `PUT /api/menu/{id}` - оновити товар
- `DELETE /api/menu/{id}` - видалити товар
- `POST /api/menu/{id}/upload-image` - завантажити фото
- `GET /api/categories` - список категорій
- `POST /api/generate-ean13` - згенерувати EAN13
- `GET /api/stats` - статистика

### Веб-інтерфейс:
- Перегляд товарів (картки/таблиця)
- Пошук та фільтрація
- Додавання/редагування товарів
- Видалення товарів
- Красиві анімації

## 🔧 Налаштування для продакшену:

1. **Змініть пароль бази даних**
2. **Налаштуйте HTTPS**
3. **Створіть системного користувача для БД**
4. **Налаштуйте бекапи**

## 🐛 Можливі проблеми:

### "Cannot connect to database"
- Перевірте чи працює SQL Server
- Перевірте логін/пароль в config.py
- Перевірте назву сервера

### "ODBC Driver not found"
- Встановіть ODBC Driver 17 for SQL Server
- Або змініть на іншу версію в database.py

### "Permission denied"
- Надайте права користувачу на базу даних
- Або використовуйте Windows Authentication

## 📚 Структура бази даних:

### Таблиця menu_items:
- `id` - первинний ключ
- `name` - назва товару
- `price` - ціна
- `emoji` - емодзі
- `category` - категорія
- `description` - опис
- `image_url` - URL фото
- `stock` - кількість на складі
- `ean13` - штрих-код
- `is_active` - активний товар
- `created_at` - дата створення
- `updated_at` - дата оновлення

## 🎉 Готово!

Тепер у вас є повноцінна система управління меню з:
- ✅ Красивим веб-інтерфейсом
- ✅ MSSQL базою даних
- ✅ RESTful API
- ✅ Завантаженням фото
- ✅ EAN13 кодами
- ✅ Пошуком та фільтрацією

Від "Ланоса" до "Тесли"! 🚗⚡ 