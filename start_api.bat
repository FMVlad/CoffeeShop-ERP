@echo off
echo ========================================
echo       CoffeeBot FastAPI Server
echo ========================================
echo.
echo Запуск сервера...
echo.

cd /d "%~dp0backend"

echo Поточна директорія: %CD%
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo Сервер зупинено.
pause
