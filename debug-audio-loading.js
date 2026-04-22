/**
 * Audio Loading Debug Script
 * Spusťte v konzoli prohlížeče pro diagnostiku problémů s načítáním audia
 */

(async function debugAudioLoading() {
  console.log('🔍 ===== Audio Loading Debug =====');

  // 1. Zkontroluj fastMetadataService
  console.log('\n📊 1. FastMetadataService Status:');
  if (window.fastMetadataService) {
    console.log('✅ fastMetadataService exists');
    console.log('   Is initialized:', window.fastMetadataService.isInitialized);
    console.log('   Is loading:', window.fastMetadataService.isLoading);
    console.log('   Metadata size:', window.fastMetadataService.metadata.size);
    console.log('   Last update:', window.fastMetadataService.lastUpdate);

    // Zobraz počet souborů podle folder
    const byFolder = {};
    window.fastMetadataService.metadata.forEach((value, key) => {
      const folder = value.folder || 'unknown';
      if (!byFolder[folder]) {
        byFolder[folder] = [];
      }
      byFolder[folder].push(value);
    });

    console.log('\n   Files by folder:');
    for (const [folder, files] of Object.entries(byFolder)) {
      console.log(`   - ${folder}: ${files.length} files`);
      if (files.length > 0 && files.length <= 10) {
        files.slice(0, 5).forEach(f => {
          console.log(`     * ${f.fileName}`);
        });
      } else if (files.length > 10) {
        files.slice(0, 3).forEach(f => {
          console.log(`     * ${f.fileName}`);
        });
        console.log(`     ... and ${files.length - 3} more`);
      }
    }
  } else {
    console.log('❌ fastMetadataService NOT found!');
  }

  // 2. Zkontroluj Firebase Storage
  console.log('\n🔥 2. Firebase Storage Status:');
  try {
    const { ref, listAll } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
    const { storage } = await import('/src/config/secure-firebase.js');

    const folders = ['hudba', 'meditacie', 'dychanie'];

    for (const folder of folders) {
      try {
        const folderRef = ref(storage, folder);
        const result = await listAll(folderRef);
        console.log(`✅ ${folder}:`, {
          items: result.items.length,
          subfolders: result.prefixes.length
        });

        if (result.items.length > 0) {
          console.log(`   First few files:`);
          result.items.slice(0, 5).forEach(item => {
            console.log(`   - ${item.name}`);
          });
        }

        if (result.prefixes.length > 0) {
          console.log(`   Subfolders:`);
          result.prefixes.forEach(p => {
            console.log(`   - ${p.name}/`);
          });
        }
      } catch (error) {
        console.error(`❌ ${folder}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Firebase Storage check failed:', error);
  }

  // 3. Zkontroluj cache
  console.log('\n💾 3. Cache Status:');
  try {
    const cacheKey = 'fast-metadata-cache';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const ageInHours = (age / (1000 * 60 * 60)).toFixed(2);
      console.log('✅ Cache found');
      console.log('   Age:', ageInHours, 'hours');
      console.log('   Records:', Object.keys(data).length);

      // Zobraz sampling dat
      const sampleKeys = Object.keys(data).slice(0, 5);
      console.log('   Sample records:');
      sampleKeys.forEach(key => {
        console.log(`   - ${key}:`, data[key]);
      });
    } else {
      console.log('❌ No cache found');
    }
  } catch (error) {
    console.error('❌ Cache check failed:', error);
  }

  // 4. Zkontroluj UI state (pokud existuje)
  console.log('\n🎨 4. React State (if accessible):');
  // Toto nelze přímo zkontrolovat z konzole, ale můžeme zkusit najít debug info
  const debugElements = document.querySelectorAll('[data-debug]');
  if (debugElements.length > 0) {
    debugElements.forEach(el => {
      console.log('   Debug element:', el.dataset.debug);
    });
  } else {
    console.log('   No debug elements found');
  }

  // 5. Nabídni akce
  console.log('\n🔧 Available Actions:');
  console.log('   - window.fastMetadataService.clearCache() - Clear cache and reload');
  console.log('   - window.fastMetadataService.initialize() - Reinitialize metadata');
  console.log('   - localStorage.clear() - Clear all local storage (WARNING!)');

  console.log('\n✨ ===== Debug Complete =====\n');
})();
