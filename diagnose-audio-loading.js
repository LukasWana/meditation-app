/**
 * 🏥 Comprehensive Audio Loading Diagnostic Script
 * Run this in browser console to diagnose Firebase audio loading issues
 */

(async function diagnoseAudioLoading() {
  console.log('🏥 Starting comprehensive audio loading diagnostic...\n');

  // ============================================
  // TEST 1: Firebase Configuration Check
  // ============================================
  console.log('📋 TEST 1: Firebase Configuration');
  console.log('='.repeat(50));

  try {
    const { storage } = await import('/src/config/secure-firebase.js');
    console.log('✅ Firebase Storage initialized:', !!storage);

    // Test Firebase Storage access
    const { ref, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

    // Test with a known file
    const testFile = ref(storage, 'hudba/ambient-journey/Ambient Journey - 01 Zhooliox.mp3');
    const testUrl = await getDownloadURL(testFile);
    console.log('✅ Firebase Storage accessible:', testUrl ? 'YES' : 'NO');
    console.log('   Test URL:', testUrl);

  } catch (error) {
    console.error('❌ Firebase configuration error:', error.message);
    console.error('   Details:', error);
  }

  console.log('\n');

  // ============================================
  // TEST 2: FastMetadataService Status
  // ============================================
  console.log('📋 TEST 2: FastMetadataService Status');
  console.log('='.repeat(50));

  try {
    const { fastMetadataService } = await import('/src/services/fastMetadataService.js');

    console.log('Service exists:', !!fastMetadataService);
    console.log('Is initialized:', fastMetadataService?.isInitialized);
    console.log('Is loading:', fastMetadataService?.isLoading);
    console.log('Metadata size:', fastMetadataService?.metadata?.size || 0);
    console.log('Last update:', fastMetadataService?.lastUpdate);

    // Check metadata by folder
    if (fastMetadataService?.metadata?.size > 0) {
      const byFolder = {};
      fastMetadataService.metadata.forEach((value, key) => {
        const folder = value.folder || 'unknown';
        if (!byFolder[folder]) byFolder[folder] = [];
        byFolder[folder].push(key);
      });

      console.log('\n📊 Files by folder:');
      Object.entries(byFolder).forEach(([folder, files]) => {
        console.log(`   ${folder}: ${files.length} files`);
      });
    } else {
      console.warn('⚠️ No metadata found in FastMetadataService');
    }

  } catch (error) {
    console.error('❌ FastMetadataService error:', error.message);
  }

  console.log('\n');

  // ============================================
  // TEST 3: Cache Service Status
  // ============================================
  console.log('📋 TEST 3: Cache Service Status');
  console.log('='.repeat(50));

  try {
    const cacheService = await import('/src/services/cacheServiceRefactored.js');

    console.log('Cache service exists:', !!cacheService?.default);

    if (cacheService?.default) {
      const stats = cacheService.default.getStats();
      console.log('Cache stats:', stats);
    }

  } catch (error) {
    console.error('❌ Cache service error:', error.message);
  }

  console.log('\n');

  // ============================================
  // TEST 4: Firebase Storage Folder Check
  // ============================================
  console.log('📋 TEST 4: Firebase Storage Folder Access');
  console.log('='.repeat(50));

  try {
    const { storage } = await import('/src/config/secure-firebase.js');
    const { ref, listAll } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

    const folders = ['hudba', 'dychanie', 'meditacie', 'background'];

    for (const folder of folders) {
      try {
        const folderRef = ref(storage, folder);
        const result = await listAll(folderRef);
        console.log(`✅ ${folder}:`, {
          items: result.items.length,
          subfolders: result.prefixes.length
        });

        if (result.items.length > 0) {
          console.log(`   First few files:`, result.items.slice(0, 3).map(i => i.name));
        }
      } catch (error) {
        console.error(`❌ ${folder}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Firebase Storage check error:', error.message);
  }

  console.log('\n');

  // ============================================
  // TEST 5: Audio Loading Test
  // ============================================
  console.log('📋 TEST 5: Audio Loading Test');
  console.log('='.repeat(50));

  try {
    const { storage } = await import('/src/config/secure-firebase.js');
    const { ref, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

    // Test loading a few specific files
    const testFiles = [
      'hudba/ambient-journey/Ambient Journey - 01 Zhooliox.mp3',
      'dychanie/breath-1.ogg',
      'meditacie/SK/test-meditacie.mp3'
    ];

    for (const fileName of testFiles) {
      try {
        console.log(`\n🔍 Testing: ${fileName}`);

        const fileRef = ref(storage, fileName);
        const downloadURL = await getDownloadURL(fileRef);

        console.log(`   URL obtained: ${downloadURL ? 'YES' : 'NO'}`);

        if (downloadURL) {
          // Test if we can actually load the audio
          const audio = new Audio();
          audio.crossOrigin = 'anonymous';

          const canPlay = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              resolve('timeout');
            }, 5000);

            audio.addEventListener('canplaythrough', () => {
              clearTimeout(timeout);
              resolve('success');
            });

            audio.addEventListener('error', (e) => {
              clearTimeout(timeout);
              resolve(`error: ${e.message}`);
            });

            audio.src = downloadURL;
          });

          console.log(`   Audio load result: ${canPlay}`);
        }

      } catch (error) {
        console.error(`   ❌ Failed:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Audio loading test error:', error.message);
  }

  console.log('\n');

  // ============================================
  // TEST 6: CORS Check
  // ============================================
  console.log('📋 TEST 6: CORS Configuration Check');
  console.log('='.repeat(50));

  try {
    const { storage } = await import('/src/config/secure-firebase.js');
    const { ref, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

    const testFile = ref(storage, 'hudba/ambient-journey/Ambient Journey - 01 Zhooliox.mp3');
    const testUrl = await getDownloadURL(testFile);

    console.log('Testing CORS with fetch...');

    const response = await fetch(testUrl, {
      method: 'HEAD',
      mode: 'cors'
    });

    console.log('Response status:', response.status);
    console.log('CORS headers:');
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`   ${key}: ${value}`);
      }
    });

    if (response.ok) {
      console.log('✅ CORS is properly configured');
    } else {
      console.warn('⚠️ Possible CORS issue');
    }

  } catch (error) {
    console.error('❌ CORS check failed:', error.message);
    console.error('   This usually means CORS is not configured on Firebase Storage');
  }

  console.log('\n');

  // ============================================
  // TEST 7: Service Worker Check
  // ============================================
  console.log('📋 TEST 7: Service Worker Status');
  console.log('='.repeat(50));

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    console.log('Service Worker registered:', !!registration);
    console.log('Service Worker state:', registration?.active?.state);

    if (registration) {
      // Check cache
      const cacheNames = await caches.keys();
      console.log('Available caches:', cacheNames);

      // Check if audio is cached
      const cache = await caches.open('meditation-audio');
      const keys = await cache.keys();
      const audioKeys = keys.filter(request => request.url.includes('.mp3') || request.url.includes('.ogg'));

      console.log(`Cached audio files: ${audioKeys.length}`);
      if (audioKeys.length > 0) {
        console.log('Sample cached audio:', audioKeys.slice(0, 3).map(k => k.url));
      }
    }
  } else {
    console.warn('⚠️ Service Workers not supported');
  }

  console.log('\n');

  // ============================================
  // TEST 8: Browser Capabilities
  // ============================================
  console.log('📋 TEST 8: Browser Capabilities');
  console.log('='.repeat(50));

  console.log('User Agent:', navigator.userAgent);
  console.log('Platform:', navigator.platform);
  console.log('Supports Audio:', typeof Audio !== 'undefined');
  console.log('Supports fetch:', typeof fetch !== 'undefined');
  console.log('Supports CORS:', typeof Request !== 'undefined');

  const audio = new Audio();
  console.log('Supported audio formats:');
  console.log('   MP3:', audio.canPlayType('audio/mpeg') || 'no');
  console.log('   OGG:', audio.canPlayType('audio/ogg') || 'no');

  console.log('\n');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('📋 DIAGNOSTIC COMPLETE');
  console.log('='.repeat(50));
  console.log('\nPlease copy the output above and provide it for analysis.');
})();
