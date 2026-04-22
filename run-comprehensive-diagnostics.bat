@echo off
echo ========================================
echo Kompletni Diagnostika Toku Dat
echo ========================================
echo.
echo Tento skript spusti komplexni testy ktere:
echo 1. Testuji Firebase inicializaci
echo 2. Testuji metadata services
echo 3. Testuji React hooky
echo 4. Testuji filtrační logiku
echo 5. Testuji UI komponenty
echo.
echo ========================================
echo 1. Testovaci stranka se otevre v prohlizeci
echo 2. Stisknete "Spustit kompletni diagnostiku"
echo 3. Pockejte na dokonceni vsech 5 fazi
echo 4. Prezente mi vysledky (screenshot nebo export)
echo ========================================
echo.

start http://localhost:3000/test-full-data-flow.html

echo.
echo Testovaci stranka by se mela otevrit v prohlizeci.
echo Postupujte podle instrukci na strance.
echo.
pause
