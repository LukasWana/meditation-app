/**
 * Skript pro spuštění synchronizace všech existujících souborů
 *
 * Spuštění: node scripts/runSyncAllFiles.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Načti service account
const serviceAccountPath = path.join(__dirname, '..', 'meditations-audio-09c55489f807.json');

try {
  const serviceAccount = require(serviceAccountPath);

  // Inicializuj Firebase Admin
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'meditations-audio.firebasestorage.app',
      databaseURL: 'https://meditations-audio-default-rtdb.europe-west1.firebasedatabase.app'
    });
  }

  const functions = require('firebase-functions');

  // Importuj metadataSync modul
  const metadataSync = require('../functions/metadataSync');

  async function runSync() {
    console.log('🚀 Spouštím synchronizaci všech existujících souborů...');
    console.log('📁 Složky, které budou zpracovány:');
    console.log('   - hudba/');
    console.log('   - slova/');
    console.log('   - dychanie/');
    console.log('   - background/');
    console.log('   - meditacie/CZ/, meditacie/SK/, meditacie/EN/');
    console.log('   - CZ/, SK/, EN/');
    console.log('');
    console.log('⏳ Toto může trvat několik minut...');
    console.log('');

    try {
      // Zavolej syncAllFiles funkci přímo
      const result = await metadataSync.syncAllFiles.run({
        data: {},
        auth: null,
        rawRequest: null
      });

      console.log('');
      console.log('✅ Synchronizace dokončena!');
      console.log('📊 Výsledky:', JSON.stringify(result, null, 2));

      process.exit(0);
    } catch (error) {
      console.error('❌ Chyba při synchronizaci:', error);
      process.exit(1);
    }
  }

  // Spusť synchronizaci
  runSync();

} catch (error) {
  console.error('❌ Chyba při inicializaci:', error.message);
  console.log('');
  console.log('💡 Alternativní řešení:');
  console.log('   Použijte admin panel v aplikaci nebo Firebase Console');
  process.exit(1);
}
