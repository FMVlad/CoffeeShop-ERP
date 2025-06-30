@echo off
echo ========================================
echo       React Development Server
echo ========================================
echo.
echo Запуск React dev сервера...
echo.

cd /d "%~dp0frontend\webapp"

echo Поточна директорія: %CD%
echo.

npm start

echo.
echo React dev сервер зупинено.
pause 