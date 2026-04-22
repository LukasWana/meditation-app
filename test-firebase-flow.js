/**
 * Automatizovaný test Firebase flow pro diagnostiku problémů s načítáním audio
 *
 * Tento skript testuje celý flow od inicializace Firebase po načtení audio souborů
 * a vytváří detailní report o problémech.
 */

// Načítání dependencies
let firebaseApp, storage, database, firestore;
let fastMetadataService, realtimeMetadataService;
let initializationManager;

const results = {
  firebase: { status: 'pending', details: [] },
  services: { status: 'pending', details: [] },
  metadata: { status: 'pending', details: [] },
  audio: { status: 'pending', details: [] },
  summary: []
};

function log(category, message, data = null) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const entry = `[${timestamp}] [${category}] ${message}`;
  console.log(entry);
  if (data) {
    console.log('  Data:', JSON.stringify(data, null, 2));
  }
  results.summary.push({ timestamp, category, message, data });

  if (results[category]) {
    results[category].details.push({ timestamp, message, data });
  }
}

function success(category, message, data = null) {
  log(category, `✅ ${message}`, data);
  if (results[category]) results[category].successCount = (results[category].successCount || 0) + 1;
}

function error(category, message, data = null) {
  console.error(`❌ [${category}] ${message}`);
  if (data) console.error('  Data:', data);
  results.summary.push({ timestamp: new Date().toISOString(), category, message: `❌ ${message}`, data, isError: true });

  if (results[category]) {
    results[category].details.push({ timestamp: new Date().toISOString(), message: `❌ ${message}`, data, isError: true });
    results[category].errorCount = (results[category].errorCount || 0) + 1;
    results[category].status = 'failed';
  }
}

function warning(category, message, data = null) {
  console.warn(`⚠️ [${category}] ${message}`);
  if (data) console.warn('  Data:', data);
  results.summary.push({ timestamp: new Date().toISOString(), category, message: `⚠️ ${message}`, data, isWarning: true });
}

async function test1_FirebaseInitialization() {
  log('firebase', 'TEST 1: Firebase Inicializace');
  results.firebase.status = 'running';

  try {
    // Dynamický import Firebase modulů
    log('firebase', 'Načítám Firebase moduly...');

    const secureFirebase = await import('./src/config/secure-firebase.js');
    log('firebase', 'Firebase config modul načten');

    firebaseApp = secureFirebase.app;
    storage = secureFirebase.storage;
    database = secureFirebase.database;
    firestore = secureFirebase.db;

    if (!firebaseApp) {
      error('firebase', 'Firebase app není inicializována');
      return false;
    }
    success('firebase', 'Firebase app inicializována', { name: firebaseApp.name });

    if (!storage) {
      error('firebase', 'Firebase Storage není inicializována');
      return false;
    }
    success('firebase', 'Firebase Storage inicializován');

    if (!database) {
      error('firebase', 'Firebase Database není inicializován');
      return false;
    }
    success('firebase', 'Firebase Database inicializován');

    if (!firestore) {
      error('firebase', 'Firebase Firestore není inicializován');
      return false;
    }
    success('firebase', 'Firebase Firestore inicializován');

    results.firebase.status = 'passed';
    return true;
  } catch (err) {
    error('firebase', 'Inicializace Firebase selhala', { error: err.message, stack: err.stack });
    results.firebase.status = 'failed';
    return false;
  }
}

async function test2_ServiceRegistry() {
  log('services', 'TEST 2: Service Registry');
  results.services.status = 'running';

  try {
    log('services', 'Načítám service registry...');
    const serviceRegistry = await import('./src/services/serviceRegistry.js');
    success('services', 'Service registry načten');

    const { SERVICE_REGISTRY, getAllServices } = serviceRegistry;
    log('services', 'Kontroluji SERVICE_REGISTRY...');

    const allServices = getAllServices();
    log('services', `Počet services v registry: ${allServices.length}`);

    const metadataServices = allServices.filter(s => {
      const serviceName = getServiceName(s);
      return serviceName.includes('metadata') || serviceName.includes('Metadata');
    });

    log('services', `Metadata services: ${metadataServices.length}`, metadataServices.map(s => getServiceName(s)));

    if (metadataServices.length === 0) {
      error('services', 'Žádné metadata services v registry');
      return false;
    }

    success('services', 'Metadata services nalezeny', {
      count: metadataServices.length,
      services: metadataServices.map(s => getServiceName(s))
    });

    results.services.status = 'passed';
    return true;
  } catch (err) {
    error('services', 'Service registry test selhal', { error: err.message, stack: err.stack });
    results.services.status = 'failed';
    return false;
  }
}

function getServiceName(entry) {
  if (!entry || !entry.service) return 'unknown';
  const serviceName = entry.service.name || entry.service.constructor?.name || 'unknown';
  return serviceName;
}

async function test3_InitializationManager() {
  log('services', 'TEST 3: Initialization Manager');
  results.services.status = 'running';

  try {
    log('services', 'Načítám initialization manager...');
    const initManagerModule = await import('./src/services/initializationManager.js');
    initializationManager = initManagerModule.default;
    success('services', 'Initialization manager načten');

    log('services', 'Načítám fastMetadataService...');
    const fastMetaModule = await import('./src/services/fastMetadataService.js');
    fastMetadataService = fastMetaModule.fastMetadataService;
    success('services', 'fastMetadataService načten', {
      isInitialized: fastMetadataService.isInitialized,
      isLoading: fastMetadataService.isLoading,
      metadataSize: fastMetadataService.metadata?.size || 0
    });

    log('services', 'Načítám realtimeMetadataService...');
    const realtimeMetaModule = await import('./src/services/realtimeMetadataService.js');
    realtimeMetadataService = realtimeMetaModule.realtimeMetadataService;
    success('services', 'realtimeMetadataService načten');

    results.services.status = 'passed';
    return true;
  } catch (err) {
    error('services', 'Inicializace services selhala', { error: err.message, stack: err.stack });
    results.services.status = 'failed';
    return false;
  }
}

async function test4_MetadataInitialization() {
  log('metadata', 'TEST 4: Metadata Inicializace');
  results.metadata.status = 'running';

  try {
    if (!fastMetadataService) {
      error('metadata', 'fastMetadataService není načtena');
      return false;
    }

    log('metadata', 'Stav fastMetadataService:', {
      isInitialized: fastMetadataService.isInitialized,
      isLoading: fastMetadataService.isLoading,
      metadataSize: fastMetadataService.metadata?.size || 0
    });

    if (fastMetadataService.isInitialized) {
      success('metadata', 'fastMetadataService je již inicializována');
    } else {
      log('metadata', 'Inicializuji fastMetadataService...');
      await fastMetadataService.initialize();
      success('metadata', 'fastMetadataService inicializována');
    }

    const metadataSize = fastMetadataService.metadata?.size || 0;
    log('metadata', `Počet metadata záznamů: ${metadataSize}`);

    if (metadataSize === 0) {
      error('metadata', 'Žádná metadata nebyla načtena', {
        isInitialized: fastMetadataService.isInitialized,
        metadataSize
      });
      return false;
    }

    success('metadata', 'Metadata načtena', { count: metadataSize });

    // Analyze metadata by folder
    const metadataByFolder = {};
    for (const [key, value] of fastMetadataService.metadata) {
      const folder = value.folder || 'unknown';
      metadataByFolder[folder] = (metadataByFolder[folder] || 0) + 1;
    }

    log('metadata', 'Metadata podle složek:', metadataByFolder);

    results.metadata.status = 'passed';
    return true;
  } catch (err) {
    error('metadata', 'Inicializace metadata selhala', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    results.metadata.status = 'failed';
    return false;
  }
}

async function test5_AudioFilesAccess() {
  log('audio', 'TEST 5: Přístup k Audio Souborům');
  results.audio.status = 'running';

  try {
    if (!fastMetadataService || fastMetadataService.metadata.size === 0) {
      error('audio', 'Metadata nejsou k dispozici');
      return false;
    }

    // Najdi audio soubory
    const audioFiles = [];
    for (const [key, value] of fastMetadataService.metadata) {
      if (value.type === 'audio' || value.type === 'album_track') {
        audioFiles.push({ key, value });
      }
    }

    log('audio', `Nalezeno audio souborů: ${audioFiles.length}`);

    if (audioFiles.length === 0) {
      error('audio', 'Žádné audio soubory v metadata');
      return false;
    }

    success('audio', 'Audio soubory nalezeny', { count: audioFiles.length });

    // Zkontroluj první audio soubor
    const firstAudio = audioFiles[0];
    log('audio', 'Testuji první audio soubor:', {
      fileName: firstAudio.value.fileName,
      hasDownloadURL: !!firstAudio.value.downloadURL,
      folder: firstAudio.value.folder
    });

    if (!firstAudio.value.downloadURL) {
      error('audio', 'Audio soubor nemá downloadURL', {
        fileName: firstAudio.value.fileName
      });
      return false;
    }

    success('audio', 'Audio soubor má downloadURL');

    // Test načtení URL (bez skutečného stahování)
    try {
      const response = await fetch(firstAudio.value.downloadURL, { method: 'HEAD' });
      log('audio', `HEAD request na downloadURL: ${response.status}`);

      if (response.ok) {
        success('audio', 'DownloadURL je přístupná', { status: response.status });
      } else {
        warning('audio', 'DownloadURL vrací chybu', { status: response.status, statusText: response.statusText });
      }
    } catch (fetchErr) {
      warning('audio', 'HEAD request selhal (CORS nebo síť)', { error: fetchErr.message });
    }

    results.audio.status = 'passed';
    return true;
  } catch (err) {
    error('audio', 'Test audio souborů selhal', { error: err.message, stack: err.stack });
    results.audio.status = 'failed';
    return false;
  }
}

async function runAllTests() {
  console.clear();
  console.log('='.repeat(80));
  console.log('🧪 FIREBASE FLOW AUTOMATED TESTS');
  console.log('='.repeat(80));
  console.log('');

  const tests = [
    { name: 'Firebase Inicializace', fn: test1_FirebaseInitialization },
    { name: 'Service Registry', fn: test2_ServiceRegistry },
    { name: 'Inicialization Manager', fn: test3_InitializationManager },
    { name: 'Metadata Inicializace', fn: test4_MetadataInitialization },
    { name: 'Audio Soubory', fn: test5_AudioFilesAccess }
  ];

  const testResults = [];

  for (const test of tests) {
    console.log(`\n▶️  Spouštím: ${test.name}`);
    console.log('-'.repeat(80));

    try {
      const result = await test.fn();
      testResults.push({ name: test.name, result: result ? 'PASS' : 'FAIL' });
    } catch (err) {
      console.error(`❌ Test "${test.name}" vyhodil výjimku:`, err);
      testResults.push({ name: test.name, result: 'ERROR', error: err.message });
    }

    console.log('-'.repeat(80));
  }

  // Final Report
  console.log('\n');
  console.log('='.repeat(80));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(80));

  const passed = testResults.filter(t => t.result === 'PASS').length;
  const failed = testResults.filter(t => t.result === 'FAIL' || t.result === 'ERROR').length;

  testResults.forEach(test => {
    const icon = test.result === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${test.result}`);
  });

  console.log('');
  console.log(`CELKOVÝ VÝSLEDEK: ${passed}/${testResults.length} testů PROŠLO`);

  if (failed > 0) {
    console.log('');
    console.log('⚠️  NĚKTERÉ TESTY SELHALY - více detailů v logách výše');
  } else {
    console.log('');
    console.log('🎉 VŠECHNY TESTY PROŠLY!');
  }

  console.log('='.repeat(80));

  return { testResults, passed, failed, details: results };
}

// Spustit testy
runAllTests().then(results => {
  // Uložit výsledky do window pro další inspekci
  window.firebaseTestResults = results;
  console.log('\n💡 Výsledky testů jsou uloženy v window.firebaseTestResults');
}).catch(err => {
  console.error('❌ Kritická chyba při spouštění testů:', err);
});

export { runAllTests };
