import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initConsoleWrapper } from './services/logger'
import { applyDeviceTier } from './utils/deviceTier'
import '@fontsource/petrona/400.css'
import '@fontsource/petrona/700.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/montserrat/300.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/quicksand/300.css'
import '@fontsource/quicksand/400.css'
import '@fontsource/quicksand/500.css'
import '@fontsource/quicksand/600.css'
import '@fontsource/quicksand/700.css'
import './index.css'

// Inicializuj console wrapper PŘED renderováním aplikace
// Tím se zachytí všechna console.log() volání a budou filtrována podle log levelu
initConsoleWrapper();

// Označ slabá zařízení (třída .low-gpu na <html>) PŘED prvním renderem,
// aby se drahý backdrop-filter blur nikdy nestihl vykreslit
applyDeviceTier();

// Globální potlačení neškodných "AbortError" (typické pro přerušené načítání audia nebo Firebase spojení)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.name === 'AbortError') {
    event.preventDefault(); // Zabrání výpisu červené chyby "Uncaught (in promise) AbortError" do konzole
  }
});

// Načti helper pro aktualizaci Firebase překladů pouze v developmentu (dostupný v konzoli)
if (import.meta.env.MODE === 'development') {
  import('./utils/updateFirebaseTranslationsHelper.js').catch(() => {
    // Ignoruj chyby při načítání (není kritické)
  });

  // Diagnostické funkce pro ladění (pouze development)
  window.runDiagnostics = async () => {
    console.log('🔍 Spouštím komplexní diagnostiku...');
    try {
      const { runAllDiagnosticTests } = await import('/test-full-data-flow.js');
      const results = await runAllDiagnosticTests();
      console.log('✅ Diagnostika dokončena:', results);
      return results;
    } catch (err) {
      console.error('❌ Diagnostika selhala:', err);
      throw err;
    }
  };

  window.quickDiagnose = () => {
    console.log('🔍 Rychlá diagnostika - stav služeb:');
    import('./services/fastMetadataService.js').then(({ fastMetadataService }) => {
      console.log('📊 fastMetadataService:', {
        isInitialized: fastMetadataService.isInitialized,
        isLoading: fastMetadataService.isLoading,
        metadataSize: fastMetadataService.metadata?.size || 0
      });
      console.log('📂 Metadata položky:', Array.from(fastMetadataService.metadata.entries()).slice(0, 5));
    });
  };

  console.log('🔧 Development diagnostika aktivní:');
  console.log('   - window.runDiagnostics() - Kompletní diagnostika');
  console.log('   - window.quickDiagnose() - Rychlý přehled stavu');
  console.log('   - window.clearServiceWorkerCache() - Vymazání SW cache');

  // Funkce pro vymazání Service Worker cache
  window.clearServiceWorkerCache = async () => {
    console.log('🧹 Clearing Service Worker cache...');

    try {
      // Zruš registraci všech Service Workerů
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} Service Worker registrations`);

      for (const registration of registrations) {
        await registration.unregister();
        console.log('✅ Unregistered Service Worker:', registration.scope);
      }

      // Vymaž všechny Cache Storage caches
      const cacheNames = await caches.keys();
      console.log(`Found ${cacheNames.length} caches`);

      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('✅ Deleted cache:', cacheName);
      }

      console.log('✅ Service Worker cache cleared successfully!');
      console.log('🔄 Please refresh the page (Ctrl+Shift+R) to reload fresh data');

      return true;
    } catch (error) {
      console.error('❌ Error clearing Service Worker cache:', error);
      return false;
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
