import pyodbc
import os

# Підключення до бази
conn = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL Server};SERVER=DESKTOP-OV5OFM6;DATABASE=CoffeeBotDB;Trusted_Connection=yes;TrustServerCertificate=yes;')
cursor = conn.cursor()

print("🔍 Перевіряю системні параметри для фото...")

# Перевіряємо існуючі параметри
cursor.execute("SELECT ParamKey, ParamValue FROM SystemParameters WHERE ParamKey IN ('PhotoPath', 'PreviewPath')")
params = cursor.fetchall()

print("\n📋 Існуючі параметри:")
for row in params:
    print(f"  {row[0]}: {row[1]}")
    
    # Перевіряємо чи існує папка
    if os.path.exists(row[1]):
        print(f"    ✅ Папка існує")
    else:
        print(f"    ❌ Папка НЕ існує")

# Якщо параметрів немає, додаємо їх
if len(params) == 0:
    print("\n⚠️ Параметрів PhotoPath та PreviewPath не знайдено!")
    print("➕ Додаю параметри...")
    
    # Шляхи відносно проекту
    project_root = r"C:\Users\Vlad\PycharmProjects\ReactBotCoffee"
    photo_path = os.path.join(project_root, "Photos")
    preview_path = os.path.join(project_root, "Photos", "Preview")
    
    # Створюємо папки якщо не існують
    os.makedirs(photo_path, exist_ok=True)
    os.makedirs(preview_path, exist_ok=True)
    
    # Додаємо в базу
    cursor.execute("INSERT INTO SystemParameters (ParamKey, ParamValue) VALUES ('PhotoPath', ?)", photo_path)
    cursor.execute("INSERT INTO SystemParameters (ParamKey, ParamValue) VALUES ('PreviewPath', ?)", preview_path)
    conn.commit()
    
    print(f"✅ PhotoPath: {photo_path}")
    print(f"✅ PreviewPath: {preview_path}")
    print("✅ Папки створено та параметри додано!")

elif len(params) == 1:
    print("\n⚠️ Знайдено тільки один параметр!")
    existing_key = params[0][0]
    
    if existing_key == "PhotoPath":
        print("➕ Додаю PreviewPath...")
        preview_path = os.path.join(params[0][1], "Preview")
        os.makedirs(preview_path, exist_ok=True)
        cursor.execute("INSERT INTO SystemParameters (ParamKey, ParamValue) VALUES ('PreviewPath', ?)", preview_path)
        conn.commit()
        print(f"✅ PreviewPath додано: {preview_path}")
    else:
        print("➕ Додаю PhotoPath...")
        project_root = r"C:\Users\Vlad\PycharmProjects\ReactBotCoffee"
        photo_path = os.path.join(project_root, "Photos")
        os.makedirs(photo_path, exist_ok=True)
        cursor.execute("INSERT INTO SystemParameters (ParamKey, ParamValue) VALUES ('PhotoPath', ?)", photo_path)
        conn.commit()
        print(f"✅ PhotoPath додано: {photo_path}")

print("\n🎉 Перевірка завершена!")
conn.close() 