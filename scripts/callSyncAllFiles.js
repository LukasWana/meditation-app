/**
 * Skript pro volání Firebase Function syncAllFiles přes HTTP
 *
 * Spuštění: node scripts/callSyncAllFiles.js
 */

const https = require('https');

// Firebase Functions endpoint pro callable funkce
const projectId = 'meditations-audio';
const region = 'us-central1';
const functionName = 'syncAllFiles';

const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

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

// Data pro callable funkci
const data = JSON.stringify({
  data: {}
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(url, options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);

      if (result.result) {
        const functionResult = result.result;

        if (functionResult.success) {
          console.log('');
          console.log('✅ Synchronizace dokončena!');
          console.log('📊 Výsledky:');
          console.log(`   - Zpracováno audio souborů: ${functionResult.results?.processedAudio || 0}`);
          console.log(`   - Zpracováno obrázků: ${functionResult.results?.processedImages || 0}`);
          console.log(`   - Celkem souborů: ${functionResult.results?.totalFiles || 0}`);
          console.log(`   - Chyby: ${functionResult.results?.errors?.length || 0}`);

          if (functionResult.results?.errors?.length > 0) {
            console.log('');
            console.log('⚠️  Některé soubory měly chyby:');
            functionResult.results.errors.slice(0, 5).forEach((error, i) => {
              console.log(`   ${i + 1}. ${error.file}: ${error.error}`);
            });
          }
        } else {
          console.error('❌ Synchronizace selhala:', functionResult.error);
          process.exit(1);
        }
      } else {
        console.error('❌ Neplatná odpověď:', responseData);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Chyba při parsování odpovědi:', error.message);
      console.log('Raw response:', responseData);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Chyba při volání funkce:', error.message);
  console.log('');
  console.log('💡 Alternativní řešení:');
  console.log('   1. Použijte admin panel v aplikaci');
  console.log('   2. Nebo Firebase Console: https://console.firebase.google.com');
  process.exit(1);
});

req.write(data);
req.end();
