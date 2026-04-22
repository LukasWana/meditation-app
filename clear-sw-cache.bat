@echo off
echo ========================================
echo Clear Service Worker Cache
echo ========================================
echo.
echo This script will help you clear the Service Worker cache
echo to get fresh data from Firebase.
echo.
echo Steps to follow:
echo 1. The app will open in your browser
echo 2. Open DevTools (F12)
echo 3. Go to Application tab
echo 4. Click "Clear site data" button
echo 5. Hard refresh the page (Ctrl+Shift+R)
echo.
echo Alternatively, in the browser console run:
echo   navigator.serviceWorker.getRegistrations().then(registrations =^>
echo     registrations.forEach(registration =^> registration.unregister())
echo   );
echo.
pause
start http://localhost:3000
