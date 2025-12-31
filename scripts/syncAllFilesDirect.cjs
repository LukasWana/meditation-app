/**
 * Skript pro přímé volání synchronizace pomocí Firebase Admin SDK
 *
 * Spuštění: node scripts/syncAllFilesDirect.cjs
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

  // Importuj logiku přímo z metadataSync
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
      // Zavolej syncAllFiles jako callable funkci
      // Simuluj context a data
      const mockData = {};
      const mockContext = {
        auth: null,
        rawRequest: null
      };

      // Zavolej funkci přímo
      const result = await metadataSync.syncAllFiles.run(mockData, mockContext);

      console.log('');
      console.log('✅ Synchronizace dokončena!');
      console.log('📊 Výsledky:');

      if (result && result.success) {
        console.log(`   - Zpracováno audio souborů: ${result.results?.processedAudio || 0}`);
        console.log(`   - Zpracováno obrázků: ${result.results?.processedImages || 0}`);
        console.log(`   - Celkem souborů: ${result.results?.totalFiles || 0}`);
        console.log(`   - Chyby: ${result.results?.errors?.length || 0}`);

        if (result.results?.errors?.length > 0) {
          console.log('');
          console.log('⚠️  Některé soubory měly chyby:');
          result.results.errors.slice(0, 5).forEach((error, i) => {
            console.log(`   ${i + 1}. ${error.file}: ${error.error}`);
          });
        }
      } else {
        console.log('   Výsledek:', JSON.stringify(result, null, 2));
      }

      process.exit(0);
    } catch (error) {
      console.error('');
      console.error('❌ Chyba při synchronizaci:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
  }

  // Spusť synchronizaci
  runSync();

} catch (error) {
  console.error('❌ Chyba při inicializaci:', error.message);
  process.exit(1);
}
