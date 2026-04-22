/**
 * Test celého flow od inicializace po UI pro diagnostiku problému
 * s chybějícími audio soubory
 */

// výsledky testů
const results = {
  phase1_initialization: { status: 'pending', details: [] },
  phase2_metadata: { status: 'pending', details: [] },
  phase3_hooks: { status: 'pending', details: [] },
  phase4_filters: { status: 'pending', details: [] },
  phase5_ui: { status: 'pending', details: [] },
  summary: []
};

function log(phase, message, data = null) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const entry = `[${timestamp}] [${phase}] ${message}`;
  console.log(entry);
  if (data) {
    console.log('  Data:', JSON.stringify(data, null, 2));
  }
  results.summary.push({ timestamp, phase, message, data });
  if (results[phase]) {
    results[phase].details.push({ timestamp, message, data });
  }
}

function success(phase, message, data = null) {
  log(phase, `✅ ${message}`, data);
  if (results[phase]) results[phase].successCount = (results[phase].successCount || 0) + 1;
}

function error(phase, message, data = null) {
  const now = new Date().toISOString();
  console.error(`❌ [${phase}] ${message}`);
  if (data) console.error('  Data:', JSON.stringify(data, null, 2));
  results.summary.push({ timestamp: now, phase, message: `❌ ${message}`, data, isError: true });
  if (results[phase]) {
    results[phase].details.push({ timestamp: now, message: `❌ ${message}`, data, isError: true });
    results[phase].errorCount = (results[phase].errorCount || 0) + 1;
    results[phase].status = 'failed';
  }
}

function warning(phase, message, data = null) {
  const now = new Date().toISOString();
  console.warn(`⚠️ [${phase}] ${message}`);
  if (data) console.warn('  Data:', JSON.stringify(data, null, 2));
  results.summary.push({ timestamp: now, phase, message: `⚠️ ${message}`, data, isWarning: true });
}

// PHASE 1: Test Firebase a Service inicializace
async function test1_Initialization() {
  log('phase1_initialization', '========== PHASE 1: FIREBASE & SERVICE INITIALIZATION ==========');
  results.phase1_initialization.status = 'running';

  try {
    // Test 1.1: Firebase inicializace
    log('phase1_initialization', 'Test 1.1: Načítání Firebase config');
    const secureFirebase = await import('./src/config/secure-firebase.js');
    success('phase1_initialization', 'Firebase config načten', {
      hasApp: !!secureFirebase.app,
      hasStorage: !!secureFirebase.storage,
      hasDatabase: !!secureFirebase.database
    });

    // Test 1.2: Service Registry
    log('phase1_initialization', 'Test 1.2: Service Registry');
    const serviceRegistry = await import('./src/services/serviceRegistry.js');
    const { getAllServices, SERVICE_REGISTRY } = serviceRegistry;
    const allServices = getAllServices();
    success('phase1_initialization', 'Service Registry načten', {
      totalServices: allServices.length,
      categories: Object.keys(SERVICE_REGISTRY)
    });

    // Test 1.3: Metadata services v registry
    log('phase1_initialization', 'Test 1.3: Hledám metadata services v registry');

    // SERVICE_REGISTRY je objekt s kategoriemi, každá kategorie má services
    const metadataServices = [];

    Object.keys(SERVICE_REGISTRY).forEach(category => {
      if (category === 'metadata') {
        Object.values(SERVICE_REGISTRY[category]).forEach(entry => {
          metadataServices.push(entry);
        });
      }
    });

    log('phase1_initialization', 'Nalezené metadata services:', {
      count: metadataServices.length,
      services: metadataServices.map(s => s.service?.name || s.service?.constructor?.name || 'unknown')
    });

    log('phase1_initialization', 'Metadata services nalezeny:', {
      count: metadataServices.length,
      services: metadataServices.map(s => s.name || s.entry?.name || 'unknown')
    });

    if (metadataServices.length === 0) {
      error('phase1_initialization', 'Žádné metadata services v registry!');
      return false;
    }
    success('phase1_initialization', 'Metadata services existují');

    // Test 1.4: Načtení service instancí
    log('phase1_initialization', 'Test 1.4: Načítání service instancí');
    const { fastMetadataService } = await import('./src/services/fastMetadataService.js');
    const { realtimeMetadataService } = await import('./src/services/realtimeMetadataService.js');

    success('phase1_initialization', 'Service instance načteny', {
      fastMetadata: {
        isInitialized: fastMetadataService.isInitialized,
        isLoading: fastMetadataService.isLoading,
        metadataSize: fastMetadataService.metadata?.size || 0
      },
      hasRealtime: !!realtimeMetadataService
    });

    results.phase1_initialization.status = 'passed';
    return true;

  } catch (err) {
    error('phase1_initialization', 'Inicializace selhala', {
      error: err.message,
      stack: err.stack
    });
    results.phase1_initialization.status = 'failed';
    return false;
  }
}

// PHASE 2: Test načítání a dostupnosti metadata
async function test2_MetadataAvailability() {
  log('phase2_metadata', '========== PHASE 2: METADATA AVAILABILITY ==========');
  results.phase2_metadata.status = 'running';

  try {
    const { fastMetadataService } = await import('./src/services/fastMetadataService.js');

    // Test 2.1: Stav metadata service
    log('phase2_metadata', 'Test 2.1: Stav fastMetadataService');
    const stateBefore = {
      isInitialized: fastMetadataService.isInitialized,
      isLoading: fastMetadataService.isLoading,
      metadataSize: fastMetadataService.metadata?.size || 0
    };
    log('phase2_metadata', 'Stav PŘED inicializací:', stateBefore);

    // Test 2.2: Inicializace pokud není inicializovaná
    if (!fastMetadataService.isInitialized) {
      log('phase2_metadata', 'Test 2.2: Inicializuji fastMetadataService...');
      await fastMetadataService.initialize();
      success('phase2_metadata', 'Inicializace dokončena');
    } else {
      success('phase2_metadata', 'Již inicializována');
    }

    // Test 2.3: Kontrola počtu metadata PO inicializaci
    const metadataSize = fastMetadataService.metadata?.size || 0;
    log('phase2_metadata', 'Test 2.3: Počet metadata PO inicializaci', {
      size: metadataSize,
      isEmpty: metadataSize === 0
    });

    if (metadataSize === 0) {
      error('phase2_metadata', 'Metadata jsou prázdná PO inicializaci!');
      return false;
    }
    success('phase2_metadata', 'Metadata načtena', { count: metadataSize });

    // Test 2.4: Analýza metadata podle složek
    const metadataByFolder = {};
    const allFiles = [];

    for (const [key, value] of fastMetadataService.metadata) {
      const folder = value.folder || 'unknown';
      metadataByFolder[folder] = (metadataByFolder[folder] || 0) + 1;
      allFiles.push({ key, value });
    }

    log('phase2_metadata', 'Test 2.4: Metadata podle složek:', metadataByFolder);

    if (metadataByFolder['hudba']) {
      success('phase2_metadata', 'Hudba metadata existují', {
        count: metadataByFolder['hudba']
      });
    } else {
      error('phase2_metadata', 'Žádná metadata pro "hudba" složku!', {
        availableFolders: Object.keys(metadataByFolder)
      });
      return false;
    }

    // Test 2.5: Detailní analýza hudba souborů
    const hudbaFiles = allFiles.filter(f =>
      f.value.folder === 'hudba' || f.value.fileName?.startsWith('hudba/')
    );

    log('phase2_metadata', 'Test 2.5: Detailní analýza hudba souborů:', {
      totalCount: hudbaFiles.length,
      files: hudbaFiles.slice(0, 5).map(f => ({
        fileName: f.value.fileName,
        type: f.value.type,
        hasDownloadURL: !!f.value.downloadURL,
        downloadURL: f.value.downloadURL ? f.value.downloadURL.substring(0, 50) + '...' : null
      }))
    });

    if (hudbaFiles.length === 0) {
      error('phase2_metadata', 'Nalezeno 0 hudba souborů!');
      return false;
    }

    results.phase2_metadata.status = 'passed';
    return true;

  } catch (err) {
    error('phase2_metadata', 'Metadata test selhal', {
      error: err.message,
      stack: err.stack
    });
    results.phase2_metadata.status = 'failed';
    return false;
  }
}

// PHASE 3: Test React Hooků
async function test3_Hooks() {
  log('phase3_hooks', '========== PHASE 3: REACT HOOKS ==========');
  results.phase3_hooks.status = 'running';

  try {
    // Test 3.1: Načtení useFirebaseHudbaFilter
    log('phase3_hooks', 'Test 3.1: Načítám useFirebaseHudbaFilter hook');
    const { useFirebaseHudbaFilter } = await import('./src/features/audio/hooks/useFirebaseHudbaFilter.js');
    success('phase3_hooks', 'useFirebaseHudbaFilter načten');

    // Test 3.2: Simulace volání hooku
    log('phase3_hooks', 'Test 3.2: Simuluji volání hooku (jako by to udělal React)');

    // React hooks potřebují React runtime - nemůžeme je volat přímo
    // Místo toho otestujeme jestli exportují správné funkce
    const hookExports = Object.keys(useFirebaseHudbaFilter);
    log('phase3_hooks', 'Hook exportuje:', hookExports);

    if (hookExports.length === 0) {
      error('phase3_hooks', 'Hook neexportuje nic!');
      return false;
    }

    success('phase3_hooks', 'Hook exportuje funkce');

    // Test 3.3: Kontrola importů v hooku
    log('phase3_hooks', 'Test 3.3: Kontrola importů v hook souboru');

    // Načtení zdrojového kódu hooku
    const hookSource = await fetch('./src/features/audio/hooks/useFirebaseHudbaFilter.js');
    const hookCode = await hookSource.text();

    const hasFastMetadataImport = hookCode.includes("fastMetadataService");
    const hasInitializeCall = hookCode.includes(".initialize()");
    const hasMetadataAccess = hookCode.includes("fastMetadataService.metadata");

    log('phase3_hooks', 'Analýza zdrojového kódu hooku:', {
      importsFastMetadata: hasFastMetadataImport,
      callsInitialize: hasInitializeCall,
      accessesMetadata: hasMetadataAccess
    });

    if (!hasFastMetadataImport) {
      error('phase3_hooks', 'Hook neimportuje fastMetadataService!');
      return false;
    }
    success('phase3_hooks', 'Hook importuje fastMetadataService');

    if (!hasMetadataAccess) {
      error('phase3_hooks', 'Hook ne přistupuje k fastMetadataService.metadata!');
      return false;
    }
    success('phase3_hooks', 'Hook přistupuje k metadata');

    results.phase3_hooks.status = 'passed';
    return true;

  } catch (err) {
    error('phase3_hooks', 'Hook test selhal', {
      error: err.message,
      stack: err.stack
    });
    results.phase3_hooks.status = 'failed';
    return false;
  }
}

// PHASE 4: Testování filtrů
async function test4_FilterLogic() {
  log('phase4_filters', '========== PHASE 4: FILTER LOGIC ==========');
  results.phase4_filters.status = 'running';

  try {
    const { fastMetadataService } = await import('./src/services/fastMetadataService.js');

    // Test 4.1: Simulace logiky useFirebaseHudbaFilter
    log('phase4_filters', 'Test 4.1: Simuluji filtrovací logiku');

    // Přečtení zdrojového kódu pro pochopení logiky
    const hookSource = await fetch('./src/features/audio/hooks/useFirebaseHudbaFilter.js');
    const hookCode = await hookSource.text();

    // Analýza filtrační logiky
    const hasFolderFilter = hookCode.includes("file.folder === 'hudba'");
    const hasFileNameFilter = hookCode.includes("file.fileName.startsWith('hudba/')");

    log('phase4_filters', 'Filtrační podmínky v kódu:', {
      filtersByFolder: hasFolderFilter,
      filtersByFileName: hasFileNameFilter
    });

    // Test 4.2: Aplikace filtru na metadata
    log('phase4_filters', 'Test 4.2: Aplikuji filtr na skutečná metadata');

    const allFiles = Array.from(fastMetadataService.metadata.values());
    log('phase4_filters', 'Celkem metadata záznamů:', allFiles.length);

    // Stejná logika jako v hooku
    const hudbaFiles = allFiles.filter(file =>
      file.folder === 'hudba' || file.fileName?.startsWith('hudba/')
    );

    log('phase4_filters', 'Výsledek filtrace:', {
      before: allFiles.length,
      after: hudbaFiles.length,
      filtered: hudbaFiles.length
    });

    if (hudbaFiles.length === 0 && allFiles.length > 0) {
      error('phase4_filters', 'Filtrace vrátila prázdné pole!', {
        totalFiles: allFiles.length,
        sampleFiles: allFiles.slice(0, 3).map(f => ({
          fileName: f.fileName,
          folder: f.folder,
          type: f.type
        }))
      });
      return false;
    }

    success('phase4_filters', 'Filtrace funguje', {
      input: allFiles.length,
      output: hudbaFiles.length
    });

    // Test 4.3: Analýza TYPE atributu u hudba souborů
    log('phase4_filters', 'Test 4.3: Analýza TYPE atributu u hudba souborů');

    const hudbaFileTypes = {};
    hudbaFiles.forEach(f => {
      const type = f.type || 'unknown';
      hudbaFileTypes[type] = (hudbaFileTypes[type] || 0) + 1;
    });

    log('phase4_filters', 'TYPE distribuce u hudba souborů:', hudbaFileTypes);

    // Kontrola jestli nejsou všechny soubory označeny jako "hudba" místo "audio"
    const typeIssues = hudbaFiles.filter(f => {
      const fileName = f.fileName?.toLowerCase() || '';
      const isInHudbaFolder = fileName.startsWith('hudba/');
      const isCorrectType = f.type === 'audio' || f.type === 'album_track' || f.type === 'song';

      return isInHudbaFolder && !isCorrectType;
    });

    if (typeIssues.length > 0) {
      warning('phase4_filters', 'Některé hudba soubory mají špatný TYPE atribut!', {
        count: typeIssues.length,
        samples: typeIssues.slice(0, 3).map(f => ({
          fileName: f.fileName,
          wrongType: f.type
        }))
      });
    } else {
      success('phase4_filters', 'Všechny hudba soubory mají správný TYPE');
    }

    results.phase4_filters.status = 'passed';
    return true;

  } catch (err) {
    error('phase4_filters', 'Filter test selhal', {
      error: err.message,
      stack: err.stack
    });
    results.phase4_filters.status = 'failed';
    return false;
  }
}

// PHASE 5: Test UI komponent
async function test5_UIComponent() {
  log('phase5_ui', '========== PHASE 5: UI COMPONENT ==========');
  results.phase5_ui.status = 'running';

  try {
    // Test 5.1: Analýza AlbumGrid komponenty
    log('phase5_ui', 'Test 5.1: Analýza AlbumGrid komponenty');

    const albumGridSource = await fetch('./src/features/meditation/components/AlbumGrid.jsx');
    const albumGridCode = await albumGridSource.text();

    const hasEmptyCheck = albumGridCode.includes('hudbaItems.length === 0');
    const hasEmptyMessage = albumGridCode.includes('Žiadne skladby nie sú dostupné');

    log('phase5_ui', 'AlbumGrid analýza:', {
      checksEmptyArray: hasEmptyCheck,
      showsEmptyMessage: hasEmptyMessage
    });

    if (!hasEmptyCheck) {
      error('phase5_ui', 'AlbumGrid nekontroluje prázdné pole!');
      return false;
    }
    success('phase5_ui', 'AlbumGrid kontroluje prázdné pole');

    // Test 5.2: Analýza HudbaScreen komponenty
    log('phase5_ui', 'Test 5.2: Analýza HudbaScreen komponenty');

    const hudbaScreenSource = await fetch('./src/features/meditation/screens/HudbaScreen.jsx');
    const hudbaScreenCode = await hudbaScreenSource.text();

    const usesHook = hudbaScreenCode.includes('useHudbaScreenData');
    const passesToAlbumGrid = hudbaScreenCode.includes('hudbaItems={hudbaItems}');

    log('phase5_ui', 'HudbaScreen analýza:', {
      usesHook: usesHook,
      passesDataToGrid: passesToAlbumGrid
    });

    if (!usesHook) {
      error('phase5_ui', 'HudbaScreen nepoužívá useHudbaScreenData!');
      return false;
    }
    success('phase5_ui', 'HudbaScreen používá správný hook');

    if (!passesToAlbumGrid) {
      error('phase5_ui', 'HudbaScreen nepředává hudbaItems do AlbumGrid!');
      return false;
    }
    success('phase5_ui', 'HudbaScreen předává data do AlbumGrid');

    // Test 5.3: Kontrola toku dat
    log('phase5_ui', 'Test 5.3: Kontrola kompletního toku dat');

    const flowChecks = {
      step1_HudbaScreenUsesHook: usesHook,
      step2_HookCallsFilter: hudbaScreenCode.includes('useHudbaScreenData'),
      step3_FilterUsesMetadata: hudbaScreenCode.includes('useFirebaseHudbaFilter'),
      step4_DataFlowsToGrid: passesToAlbumGrid
    };

    log('phase5_ui', 'Tok dat:', flowChecks);

    const allChecksPassed = Object.values(flowChecks).every(v => v === true);
    if (allChecksPassed) {
      success('phase5_ui', 'Tok dat je kompletní');
    } else {
      error('phase5_ui', 'Tok dat je přerušený!', flowChecks);
      return false;
    }

    results.phase5_ui.status = 'passed';
    return true;

  } catch (err) {
    error('phase5_ui', 'UI test selhal', {
      error: err.message,
      stack: err.stack
    });
    results.phase5_ui.status = 'failed';
    return false;
  }
}

// HLAVNÍ FUNKCE PRO SPUSTĚNÍ TESTŮ
async function runAllDiagnosticTests() {
  console.clear();
  console.log('='.repeat(80));
  console.log('🧪 COMPREHENSIVE DATA FLOW DIAGNOSTICS');
  console.log('🔍 Hledám proč se neukazují audio soubory v UI');
  console.log('='.repeat(80));
  console.log('');

  const tests = [
    { name: 'Phase 1: Inicializace', fn: test1_Initialization },
    { name: 'Phase 2: Metadata Availability', fn: test2_MetadataAvailability },
    { name: 'Phase 3: React Hooks', fn: test3_Hooks },
    { name: 'Phase 4: Filter Logic', fn: test4_FilterLogic },
    { name: 'Phase 5: UI Component', fn: test5_UIComponent }
  ];

  const testResults = [];

  for (const test of tests) {
    console.log(`\n▶️  ${test.name}`);
    console.log('-'.repeat(80));

    try {
      const result = await test.fn();
      testResults.push({ name: test.name, result: result ? 'PASS' : 'FAIL' });

      if (!result) {
        console.log(`\n⚠️  ${test.name} SELHAL - další testy mohou být nepřesné`);
      }
    } catch (err) {
      console.error(`❌ ${test.name} VYHODIL VÝJIMKU:`, err);
      testResults.push({ name: test.name, result: 'ERROR', error: err.message });
    }

    console.log('-'.repeat(80));
  }

  // FINAL REPORT
  console.log('\n');
  console.log('='.repeat(80));
  console.log('📊 DIAGNOSTICKÝ REPORT');
  console.log('='.repeat(80));

  testResults.forEach(test => {
    const icon = test.result === 'PASS' ? '✅' : test.result === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${test.name}: ${test.result}`);
  });

  const passed = testResults.filter(t => t.result === 'PASS').length;
  const failed = testResults.filter(t => t.result !== 'PASS').length;

  console.log('');
  console.log(`CELKOVÝ VÝSLEDEK: ${passed}/${testResults.length} fází PROŠLO`);

  if (failed === 0) {
    console.log('');
    console.log('🎉 VŠECHNY TESTY PROŠLY - PROBLÉM MUSÍ BÝT JINDE!');
    console.log('');
    console.log('🔍 DALŠÍ KROKY:');
    console.log('   1. Zkontrolujte konzoli prohlížeče při běhu aplikace');
    console.log('   2. Hledejte logy s [HUDBA FILTER] prefixem');
    console.log('   3. Podívejte se do Network tab zda se načítají soubory');
  } else {
    console.log('');
    console.log('⚠️  NĚKTERÉ FÁZE SELHALY - viz detailní logy výše');
    console.log('');
    console.log('🔍 NALEZENÉ PROBLÉMY:');
    results.summary
      .filter(r => r.isError || r.isWarning)
      .forEach(r => {
        console.log(`   ❌ ${r.message}`);
        if (r.data) {
          console.log(`      Detail: ${JSON.stringify(r.data)}`);
        }
      });
  }

  console.log('='.repeat(80));

  // Uložení pro další analýzu
  window.diagnosticResults = {
    testResults,
    passed,
    failed,
    details: results,
    summary: results.summary
  };

  console.log('');
  console.log('💡 Kompletní výsledky uloženy v window.diagnosticResults');

  return { testResults, passed, failed, details: results };
}

// Spustit testy
runAllDiagnosticTests().then(results => {
  console.log('\n✨ Diagnostika dokončena');
}).catch(err => {
  console.error('❌ Kritická chyba při diagnostice:', err);
});

export { runAllDiagnosticTests };
