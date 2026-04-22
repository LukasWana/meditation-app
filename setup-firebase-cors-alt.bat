@echo off
echo ========================================
echo Nastaveni CORS pro Firebase Storage
echo ========================================
echo.
echo Pro nastaveni CORS potrebuji gsutil (Google Cloud Storage tool).
echo.
echo 1. Pokud mas nainstalovane Google Cloud SDK:
echo    gsutil cors set cors.json gs://meditations-audio.appspot.com
echo.
echo 2. Pokud nemas Google Cloud SDK:
echo    - Stahni ho z: https://cloud.google.com/sdk/docs/install
echo    - Nebo pouzij Firebase Console:
echo      1. Otevri https://console.firebase.google.com/project/meditations-audio/storage
echo      2. Klikni na "Browser" nebo "Files"
echo      3. Klikni na menu (tri tecky) vedle názvu bucketu
echo      4. Vyber "Edit bucket configuration"
echo      5. pridej CORS pravidla:
echo         Origin: *
echo         Methods: GET
echo         Max-Age: 3600
echo.
echo ========================================
pause
