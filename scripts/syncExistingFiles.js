/**
 * Skript pro synchronizaci všech existujících souborů v Firebase Storage
 * Vytvoří metadata pro všechny soubory, které byly nahrány před nasazením automatického skriptu
 *
 * Spuštění:
 * node scripts/syncExistingFiles.js
 *
 * Nebo z Node.js konzole:
 * require('./scripts/syncExistingFiles.js')
 */

const admin = require('firebase-admin');
const path = require('path');

// Načti service account key
const serviceAccountPath = path.join(__dirname, '..', 'meditations-audio-09c55489f807.json');

try {
  const serviceAccount = require(serviceAccountPath);

  // Inicializuj Firebase Admin, pokud ještě není inicializován
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'meditations-audio.firebasestorage.app',
      databaseURL: 'https://meditations-audio-default-rtdb.europe-west1.firebasedatabase.app'
    });
  }

  const functions = require('firebase-functions');
  const httpsCallable = functions.https.onCall;

  async function syncAllExistingFiles() {
    console.log('🚀 Spouštím synchronizaci všech existujících souborů...');
    console.log('📁 Složky, které budou zpracovány:');
    console.log('   - hudba/');
    console.log('   - slova/');
    console.log('   - dychanie/');
    console.log('   - background/');
    console.log('   - meditacie/CZ/, meditacie/SK/, meditacie/EN/');
    console.log('   - CZ/, SK/, EN/');
    console.log('');

    try {
      // Použij Firebase Functions emulator nebo přímé volání
      // Pro produkci použijeme httpsCallable
      const { getFunctions, httpsCallable } = require('firebase/functions');

      console.log('⚠️  Pro spuštění z Node.js použijte Firebase CLI:');
      console.log('   firebase functions:call syncAllFiles');
      console.log('');
      console.log('Nebo použijte admin panel v aplikaci:');
      console.log('   1. Otevřete aplikaci');
      console.log('   2. Přejděte do Admin panelu');
      console.log('   3. Klikněte na "🚀 Automatická synchronizace všech souborů"');
      console.log('');
      console.log('Nebo z konzole prohlížeče:');
      console.log('   import("./src/utils/syncAllFilesViaFunction.js").then(m => m.syncAllFilesViaFunction())');

    } catch (error) {
      console.error('❌ Chyba:', error.message);
      console.log('');
      console.log('💡 Alternativní řešení:');
      console.log('   1. Použijte Firebase Console: https://console.firebase.google.com');
      console.log('   2. Přejděte na Functions > syncAllFiles > Test');
      console.log('   3. Nebo použijte admin panel v aplikaci');
    }
  }

  // Spusť synchronizaci
  if (require.main === module) {
    syncAllExistingFiles().catch(console.error);
  }

  module.exports = { syncAllExistingFiles };

} catch (error) {
  console.error('❌ Chyba při načítání service account:', error.message);
  console.log('');
  console.log('💡 Použijte místo toho admin panel v aplikaci nebo Firebase Console');
}
