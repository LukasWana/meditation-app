/**
 * 🔧 FIX PROVED: Firebase Storage Diagnostika
 * SPUSŤ TENTO SCRIPT PŘÍMO V BROWSER CONSOLE (F12)
 */

(async function testFirebaseStorageFixed() {
  console.log('🔍 Testuji Firebase Storage přístup...\n');

  try {
    // 1. Zkontroluj, jestli Firebase je inicializované v aplikaci
    const firebaseCheck = window.firebaseServices ||
                         (window.app && window.app.firebase) ||
                         null;

    if (firebaseCheck) {
      console.log('✅ Firebase nalezeno v aplikaci:', firebaseCheck);
    } else {
      console.log('⚠️ Firebase není v window objectu - zkouším přímo import...');
    }

    // 2. Zkontroluj FastMetadataService
    const { fastMetadataService } = await import('/src/services/fastMetadataService.js');

    console.log('📊 FastMetadataService status:');
    console.log('   Inicializováno:', fastMetadataService.isInitialized);
    console.log('   Loading:', fastMetadataService.isLoading);
    console.log('   Metadata velikost:', fastMetadataService.metadata.size);

    if (fastMetadataService.metadata.size > 0) {
      console.log('\n📁 Metadata přehled:');

      const byFolder = {};
      fastMetadataService.metadata.forEach((value, key) => {
        const folder = value.folder || 'unknown';
        if (!byFolder[folder]) byFolder[folder] = [];
        byFolder[folder].push({ fileName: key, hasURL: !!value.downloadURL });
      });

      Object.entries(byFolder).forEach(([folder, files]) => {
        const withURL = files.filter(f => f.hasURL).length;
        const withoutURL = files.filter(f => !f.hasURL).length;
        console.log(`   ${folder}: ${files.length} souborů (${withURL} s URL, ${withoutURL} bez URL)`);
      });

      // 3. Najdi příklady souborů bez downloadURL
      console.log('\n❌ Soubory BEZ downloadURL:');
      let nullCount = 0;
      fastMetadataService.metadata.forEach((metadata, key) => {
        if ((metadata.type === 'audio' || metadata.type === 'album_track') && !metadata.downloadURL) {
          console.log(`   - ${metadata.fileName}`);
          nullCount++;
          if (nullCount >= 5) {
            console.log('   ... (a další)');
          }
        }
      });

      if (nullCount === 0) {
        console.log('   Žádné takové soubory nenalezeny ✅');
      }
    } else {
      console.warn('⚠️ FastMetadataService nemá žádná metadata!');
    }

    // 4. Zkus přehrát testovací audio
    console.log('\n🔊 Testuji přehrávání audia...');

    // Najdi nějaký audio soubor s downloadURL
    const testAudio = Array.from(fastMetadataService.metadata.values())
      .find(m => (m.type === 'audio' || m.type === 'album_track') && m.downloadURL);

    if (testAudio) {
      console.log(`Testuji soubor: ${testAudio.fileName}`);
      console.log(`URL: ${testAudio.downloadURL.substring(0, 60)}...`);

      const audio = new Audio();
      audio.crossOrigin = 'anonymous';

      const result = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve('timeout'), 10000);

        audio.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          resolve('success');
        });

        audio.addEventListener('error', (e) => {
          clearTimeout(timeout);
          resolve(`error: ${e.message || 'unknown'}`);
        });

        audio.src = testAudio.downloadURL;
      });

      if (result === 'success') {
        console.log(`✅ Audio se podařilo načíst (${audio.duration.toFixed(2)}s)`);
      } else {
        console.log(`❌ Audio se nepodařilo načíst: ${result}`);
      }
    } else {
      console.warn('⚠️ Žádný audio soubor s downloadURL nenalezen pro test');
    }

    console.log('\n✅ Diagnostika dokončena!');

  } catch (error) {
    console.error('❌ Diagnostika selhala:', error.message);
    console.error('Detaily:', error);
  }
})();
