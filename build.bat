call npm run build
call npx cap sync android
cd android
call gradlew assembleDebug
cd ..
