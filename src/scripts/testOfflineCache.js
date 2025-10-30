/**
 * Test script pro offline cache funkcionalitu
 *
 * Použití:
 * 1. V konzoli prohlížeče: import('./scripts/testOfflineCache.js').then(m => m.runOfflineTest())
 * 2. Nebo spusť jako samostatný script
 */

import offlineCacheService from '../services/offlineCacheService';
import { serviceWorkerUtils } from '../services/serviceWorker';

/**
 * Hlavní test funkce
 */
export async function runOfflineTest() {
  console.log('🧪 ========================================');
  console.log('🧪 OFFLINE CACHE TEST');
  console.log('🧪 ========================================\n');

  const results = {
    serviceWorker: false,
    cacheAPI: false,
    cacheService: false,
    cacheStats: null,
    errors: []
  };

  // Test 1: Service Worker
  console.log('📋 Test 1: Service Worker Status');
  console.log('----------------------------------------');
  try {
    const isActive = serviceWorkerUtils.isServiceWorkerActive();
    results.serviceWorker = isActive;

    if (isActive) {
      console.log('✅ Service Worker is ACTIVE');
    } else {
      console.log('❌ Service Worker is NOT active');
      console.log('💡 Tip: Reload page or check if SW is registered');
    }

    // Zobraz info o cache
    const cacheInfo = await serviceWorkerUtils.getCacheInfo();
    console.log('📊 Cache Info:', cacheInfo);

    // Zobraz velikost cache
    const cacheSize = await serviceWorkerUtils.getCacheSize();
    console.log('💾 Total Cache Size:', formatBytes(cacheSize));
  } catch (error) {
    console.error('❌ Service Worker test failed:', error);
    results.errors.push({ test: 'serviceWorker', error: error.message });
  }
  console.log('\n');

  // Test 2: Cache API dostupnost
  console.log('📋 Test 2: Cache API Availability');
  console.log('----------------------------------------');
  try {
    if ('caches' in window) {
      results.cacheAPI = true;
      console.log('✅ Cache API is AVAILABLE');

      // Zobraz všechny cache
      const cacheNames = await caches.keys();
      console.log(`📦 Found ${cacheNames.length} caches:`, cacheNames);
    } else {
      console.log('❌ Cache API is NOT available');
    }
  } catch (error) {
    console.error('❌ Cache API test failed:', error);
    results.errors.push({ test: 'cacheAPI', error: error.message });
  }
  console.log('\n');

  // Test 3: offlineCacheService inicializace
  console.log('📋 Test 3: Offline Cache Service');
  console.log('----------------------------------------');
  try {
    const initialized = await offlineCacheService.initialize();
    results.cacheService = initialized;

    if (initialized) {
      console.log('✅ Offline Cache Service is INITIALIZED');

      // Získej statistiky
      const stats = await offlineCacheService.getCacheStats();
      results.cacheStats = stats;

      if (stats) {
        console.log('📊 Cache Statistics:');
        console.log(`   - Total Files: ${stats.totalFiles}`);
        console.log(`   - Total Size: ${stats.totalSizeFormatted}`);
        console.log(`   - Offline Ready: ${stats.isOfflineReady ? '✅ YES' : '❌ NO'}`);

        if (stats.files && stats.files.length > 0) {
          console.log(`\n📁 Sample cached files (first 5):`);
          stats.files.slice(0, 5).forEach((file, idx) => {
            console.log(`   ${idx + 1}. ${file.fileName} (${file.sizeFormatted})`);
          });
        } else {
          console.log('⚠️  No audio files cached yet');
        }
      }
    } else {
      console.log('❌ Offline Cache Service failed to initialize');
    }
  } catch (error) {
    console.error('❌ Offline Cache Service test failed:', error);
    results.errors.push({ test: 'cacheService', error: error.message });
  }
  console.log('\n');

  // Test 4: Zkontroluj konkrétní soubor
  console.log('📋 Test 4: Check Sample File');
  console.log('----------------------------------------');
  try {
    // Zkus najít nějaký MP3 soubor v cache
    const allCaches = await caches.keys();
    let foundFile = false;

    for (const cacheName of allCaches) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      for (const request of keys) {
        if (request.url.includes('.mp3')) {
          console.log('✅ Found cached audio file:');
          console.log(`   URL: ${request.url}`);

          const response = await cache.match(request);
          console.log(`   Response type: ${response.type}`);
          console.log(`   Response status: ${response.status}`);

          foundFile = true;
          break;
        }
      }

      if (foundFile) break;
    }

    if (!foundFile) {
      console.log('⚠️  No audio files found in cache');
      console.log('💡 Tip: Try downloading files from admin panel first');
    }
  } catch (error) {
    console.error('❌ File check failed:', error);
    results.errors.push({ test: 'fileCheck', error: error.message });
  }
  console.log('\n');

  // Závěrečné shrnutí
  console.log('🧪 ========================================');
  console.log('🧪 TEST SUMMARY');
  console.log('🧪 ========================================');

  const allPassed = results.serviceWorker && results.cacheAPI && results.cacheService;

  console.log(`\n📊 Results:`);
  console.log(`   - Service Worker: ${results.serviceWorker ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Cache API: ${results.cacheAPI ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Cache Service: ${results.cacheService ? '✅ PASS' : '❌ FAIL'}`);

  if (results.errors.length > 0) {
    console.log(`\n❌ Errors (${results.errors.length}):`);
    results.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.test}: ${err.error}`);
    });
  }

  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  // Návod co dál
  console.log('\n📖 Next Steps:');
  if (!results.serviceWorker) {
    console.log('   1. Reload the page to activate Service Worker');
  }
  if (results.cacheStats && !results.cacheStats.isOfflineReady) {
    console.log('   2. Go to Admin Panel → Download Files for Offline');
  }
  if (allPassed && results.cacheStats?.isOfflineReady) {
    console.log('   ✅ Your app is ready for offline use!');
    console.log('   💡 Try: Turn off WiFi and play audio');
  }

  console.log('\n');

  return results;
}

/**
 * Rychlý test - jen základní informace
 */
export async function quickTest() {
  console.log('⚡ Quick Offline Test\n');

  const swActive = serviceWorkerUtils.isServiceWorkerActive();
  console.log(`Service Worker: ${swActive ? '✅' : '❌'}`);

  const initialized = await offlineCacheService.initialize();
  console.log(`Cache Service: ${initialized ? '✅' : '❌'}`);

  if (initialized) {
    const stats = await offlineCacheService.getCacheStats();
    if (stats) {
      console.log(`Files Cached: ${stats.totalFiles}`);
      console.log(`Total Size: ${stats.totalSizeFormatted}`);
      console.log(`Offline Ready: ${stats.isOfflineReady ? '✅' : '❌'}`);
    }
  }
}

/**
 * Test stažení jednoho souboru
 */
export async function testDownloadSingleFile(fileName, fileUrl) {
  console.log(`🧪 Testing download: ${fileName}`);

  try {
    const initialized = await offlineCacheService.initialize();
    if (!initialized) {
      console.error('❌ Cache service not initialized');
      return false;
    }

    console.log(`📥 Downloading ${fileName}...`);
    const success = await offlineCacheService.cacheFile(fileName, fileUrl);

    if (success) {
      console.log(`✅ Successfully cached: ${fileName}`);

      // Ověř že soubor je v cache
      const isCached = await offlineCacheService.isFileCached(fileName);
      console.log(`🔍 Verification: ${isCached ? '✅ Found in cache' : '❌ Not found in cache'}`);

      return isCached;
    } else {
      console.error(`❌ Failed to cache: ${fileName}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Download test failed:`, error);
    return false;
  }
}

/**
 * Vymaž všechny cache (užitečné pro debugging)
 */
export async function clearAllCache() {
  console.log('🗑️  Clearing all caches...');

  try {
    await serviceWorkerUtils.clearAllCaches();
    await offlineCacheService.clearCache();
    console.log('✅ All caches cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
    return false;
  }
}

/**
 * Helper: Formátování velikosti v bajtech
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export pro použití v konzoli
if (typeof window !== 'undefined') {
  window.offlineTest = {
    run: runOfflineTest,
    quick: quickTest,
    testDownload: testDownloadSingleFile,
    clear: clearAllCache
  };

  console.log('💡 Offline test utilities loaded!');
  console.log('   Usage:');
  console.log('   - offlineTest.run()         // Full test');
  console.log('   - offlineTest.quick()       // Quick test');
  console.log('   - offlineTest.clear()       // Clear all cache');
}
