@echo off
echo ========================================
echo Nastaveni CORS pro Firebase Storage
echo ========================================
echo.
echo Tento skript nastavi CORS pro Firebase Storage bucket.
echo To opravi problemy s prehravanim audio a obrazku.
echo.
echo ========================================
echo.
echo 1. Instalace Firebase Tools (pokud neni nainstalovane)
echo 2. Nastaveni CORS pro Firebase Storage
echo.
echo ========================================
pause

REM Zkontroluj, jestli je nainstalované firebase-tools
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Firebase Tools neni nainstalovane. Instaluju...
    npm install -g firebase-tools
)

echo.
echo Nastavuji CORS pro Firebase Storage...
echo.

firebase storage:cors set cors.json

echo.
echo ========================================
echo CORS nastaveno!
echo ========================================
echo.
echo Audio by se melo nyni prehravat.
echo Stiskni klavesu pro zavreni...
pause
