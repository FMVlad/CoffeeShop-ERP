@echo off
echo ========================================
echo      Git Repository Setup
echo ========================================
echo.

echo Перевірка Git...
git --version
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Git не встановлений!
    echo.
    echo Будь ласка, завантажте та встановіть Git:
    echo https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo.
echo 🔧 Ініціалізація Git репозиторію...
git init

echo.
echo 🔗 Додавання remote origin...
git remote add origin https://github.com/FMVlad/CoffeeBOT.git

echo.
echo 📁 Додавання файлів...
git add .

echo.
echo 📝 Створення першого комміту...
git commit -m "Initial commit: CoffeeBot fullstack project

- ⚛️ React frontend with PWA support
- 🚀 FastAPI backend with CORS
- 🤖 Telegram bot integration  
- 📦 Batch files for easy startup
- 📋 Complete project documentation"

echo.
echo 📤 Пуш на GitHub...
git branch -M main
git push -u origin main

echo.
echo ✅ Готово! Репозиторій налаштований і запушений на GitHub!
echo.
echo 🌐 Ваш проект: https://github.com/FMVlad/CoffeeBOT
echo.
pause 