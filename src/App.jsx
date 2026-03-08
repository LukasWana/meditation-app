import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageManager } from '@features/navigation';
import { useNavigation, useTouchNavigation } from '@features/navigation/hooks';
import { useTimer } from '@features/meditation/hooks';
import { useAppInitialization } from '@hooks/useAppInitialization';
import { LazyIntroScreen, NewAdminScreen } from '@config/lazyComponents';
import { LanguageProvider } from '@contexts/LanguageContext';
import { UIConfigProvider } from '@contexts/UIConfigContext';
import { ThemeProvider } from '@contexts/ThemeContext';
import { AuthProvider } from '@contexts/AuthContext';
import { useAudioPlayerStore } from '@stores/audioPlayerStore';
import MonitoringDashboard from '@components/MonitoringDashboard';
import OfflineIndicator from '@components/OfflineIndicator';
import AdminGuard from '@components/AdminGuard';

import ErrorBoundary from '@components/ErrorBoundary';

// Hlavní aplikace s routingem
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin" element={<AdminGuard><AdminApp /></AdminGuard>} />
          <Route path="/admin/*" element={<AdminGuard><AdminApp /></AdminGuard>} />
          <Route path="/*" element={<MeditationApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Meditační aplikace
function MeditationApp() {
  // Intro state
  const [showIntro, setShowIntro] = useState(true);

  // Inicializace dat z Firebase
  const initialization = useAppInitialization();

  // Navigation state
  const { currentScreen, navigateToScreen } = useNavigation('intro');


  const {
    activeAudio,
    selectedAlbum,
  } = useAudioPlayerStore();

  // Touch navigation
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchNavigation({
    minSwipeDistance: 30,
    onSwipeLeft: () => {
      // Navigace zpět při swipe vlevo
      if (currentScreen !== 'home') {
        navigateToScreen('home');
      }
    },
    onSwipeRight: () => {
      // Navigace zpět při swipe vpravo
      if (currentScreen !== 'home') {
        navigateToScreen('home');
      }
    }
  });


  // Timer logika
  useTimer();


  // Development-only debug utilities
  React.useEffect(() => {
    // Načti database viewer pro development
    if (import.meta.env.MODE === 'development') {
      import('./scripts/consoleDbViewer.js').then(() => {
        console.log('🔍 Database viewer je k dispozici v konzoli');
      });

      // Debug funkce pro meditacie soubory
      window.debugMeditacieFiles = async () => {
        console.log('🔍 Debugging meditacie files...');
        try {
          const { realtimeMetadataService } = await import('./services/realtimeMetadataService');
          const metadata = await realtimeMetadataService.getAllMetadata();

          console.log('📊 All metadata keys:', Object.keys(metadata).length);
          console.log('📊 All metadata:', metadata);

          const meditacieFiles = Object.values(metadata).filter(file =>
            file.fileName && file.fileName.includes('meditacie/')
          );
          console.log('🎤 Meditacie files found:', meditacieFiles.length);
          console.log('🎤 Meditacie files:', meditacieFiles);

          return { totalFiles: Object.keys(metadata).length, meditacieFiles: meditacieFiles.length };
        } catch (error) {
          console.error('❌ Error debugging meditacie files:', error);
          return null;
        }
      };

      // Debug funkce pro cache
      window.debugCache = async () => {
        console.log('🔍 Debugging cache...');
        try {
          const { default: offlineCacheService } = await import('./services/offlineCacheService');
          await offlineCacheService.initialize();

          const keys = await offlineCacheService.cache.keys();
          console.log('📊 All cache keys:', keys.length);
          console.log('📊 Cache keys:', keys.map(k => k.url));

          const audioKeys = keys.filter(key => key.url.includes('/audio/'));
          console.log('🎵 Audio files in cache:', audioKeys.length);

          // Zkontroluj první pár souborů
          for (let i = 0; i < Math.min(3, audioKeys.length); i++) {
            const key = audioKeys[i];
            const response = await offlineCacheService.cache.match(key);
            if (response) {
              const contentLength = response.headers.get('content-length');
              console.log(`📁 File ${i + 1}: ${key.url.split('/audio/')[1]}`);
              console.log(`   Content-Length: ${contentLength}`);
              console.log(`   Headers:`, [...response.headers.entries()]);

              try {
                const blob = await response.blob();
                console.log(`   Blob size: ${blob.size} bytes`);
              } catch (e) {
                console.log(`   Blob error:`, e.message);
              }
            }
          }

          const stats = await offlineCacheService.getCacheStats();
          console.log('📊 Cache stats:', stats);

          return stats;
        } catch (error) {
          console.error('❌ Error debugging cache:', error);
          return null;
        }
      };

      // Debug funkce pro image cache (Cache Storage)
      window.debugImageCache = async () => {
        console.log('🔍 Debugging image cache...');
        try {
          if (!('caches' in window)) {
            console.warn('⚠️ Cache Storage API not supported');
            return null;
          }
          const cache = await caches.open('meditation-image-cache-v1');
          const keys = await cache.keys();
          console.log('🖼️ Image cache entries:', keys.length);
          console.log('🖼️ Image cache keys:', keys.map(k => k.url));
          return { total: keys.length, keys: keys.map(k => k.url) };
        } catch (error) {
          console.error('❌ Error debugging image cache:', error);
          return null;
        }
      };

      window.clearImageCache = async () => {
        console.log('🧹 Clearing image cache...');
        try {
          if (!('caches' in window)) return false;
          const ok = await caches.delete('meditation-image-cache-v1');
          console.log('✅ Image cache cleared:', ok);
          return ok;
        } catch (error) {
          console.error('❌ Error clearing image cache:', error);
          return false;
        }
      };

      // Funkce pro vymazání cache
      window.clearCache = async () => {
        console.log('🧹 Clearing cache...');
        try {
          const { default: offlineCacheService } = await import('./services/offlineCacheService');
          await offlineCacheService.initialize();
          const result = await offlineCacheService.clearCache();
          console.log('✅ Cache cleared:', result);
          return result;
        } catch (error) {
          console.error('❌ Error clearing cache:', error);
          return false;
        }
      };

      // Funkce pro testování přehrávání
      window.testAudioPlayback = async (fileName) => {
        console.log('🎵 Testing audio playback for:', fileName);
        try {
          const { default: offlineCacheService } = await import('./services/offlineCacheService');
          await offlineCacheService.initialize();

          const isCached = await offlineCacheService.isFileCached(fileName);
          console.log('📊 Is cached:', isCached);

          if (isCached) {
            const cachedFile = await offlineCacheService.getFile(fileName);
            console.log('📊 Cached file type:', cachedFile ? cachedFile.type : 'unknown');
            console.log('📊 Cached file headers:', cachedFile ? [...cachedFile.headers.entries()] : []);
          }

          return { isCached, fileName };
        } catch (error) {
          console.error('❌ Error testing audio playback:', error);
          return null;
        }
      };

      // Funkce pro nastavení log levelu
      window.setLogLevel = async (level) => {
        const { default: log } = await import('./services/logger');
        log.setLogLevel(level);
        // Použij originální console pro tento log, aby se vždy zobrazil
        const originalConsole = window.console;
        originalConsole.log(`🔧 Log level nastaven na: ${level}`);
        originalConsole.log('Dostupné úrovně: silent, error, warn, info, debug');
        originalConsole.log('Poznámka: console.error() a console.warn() se vždy zobrazí');
      };

<<<<<<< HEAD
      // Funkce pro synchronizaci všech souborů pomocí Firebase Function
      window.syncAllFiles = async () => {
        console.log('🚀 Spouštím synchronizaci všech souborů...');
        try {
          const { syncAllFilesViaFunction } = await import('./utils/syncAllFilesViaFunction');
          const result = await syncAllFilesViaFunction((current, total) => {
            console.log(`🔄 Synchronizuji... ${current}/${total} souborů`);
          });
          if (result.success) {
            console.log('✅ Synchronizace dokončena!', result.message);
            console.log('📊 Results:', result.results);
            return result;
          } else {
            console.error('❌ Chyba při synchronizaci:', result.error);
            return result;
          }
        } catch (error) {
          console.error('❌ Chyba:', error);
          return { success: false, error: error.message };
        }
      };

    console.log('🔍 Debug funkce dostupné v konzoli:');
    console.log('  - showDatabaseData() - zobrazí database viewer');
    console.log('  - debugMeditacieFiles() - zobrazí meditacie soubory v Realtime Database');
    console.log('  - debugCache() - zobrazí detaily cache');
    console.log('  - clearCache() - vymaže cache');
    console.log('  - testAudioPlayback(fileName) - otestuje přehrávání konkrétního souboru');
    console.log('  - setLogLevel(level) - nastaví úroveň logování (silent, error, warn, info, debug)');
=======
      console.log('🔍 Debug funkce dostupné v konzoli:');
      console.log('  - showDatabaseData() - zobrazí database viewer');
      console.log('  - debugMeditacieFiles() - zobrazí meditacie soubory v Realtime Database');
      console.log('  - debugCache() - zobrazí detaily cache');
      console.log('  - clearCache() - vymaže cache');
      console.log('  - testAudioPlayback(fileName) - otestuje přehrávání konkrétního souboru');
      console.log('  - setLogLevel(level) - nastaví úroveň logování (silent, error, warn, info, debug)');
>>>>>>> 5586763 (Phase 3: Hook Consolidation & Service Refactoring (Finalized))
    }
  }, []);

  // Intro completion handler
  const handleIntroComplete = () => {
    setShowIntro(false);
    navigateToScreen('home');
  };

  return (
    <ErrorBoundary>
      <LanguageProvider initialTranslations={initialization.uiData?.translations}>
        <UIConfigProvider
          initialConfig={initialization.uiData?.config}
          initialTexts={initialization.uiData?.texts}
        >
          <ThemeProvider>
            <div className="min-h-screen w-full bg-[#f4ddc4] overflow-x-hidden">
              {/* Intro animace s písmem "Meditácia" */}
              {showIntro && (
                <LazyIntroScreen onIntroComplete={handleIntroComplete} />
              )}

              {/* Hlavní aplikace - zobrazí se s fade-in po intro */}
              {!showIntro && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="app-content-container"
                >
                  <PageManager
                    // Navigation
                    currentScreen={currentScreen}
                    onNavigateToScreen={navigateToScreen}

                    // Touch handling
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}

                    // Audio player specifické (ponecháno pro nyní)
                    activeAudio={activeAudio}
                    selectedAlbum={selectedAlbum}
                  />
                </motion.div>
              )}

              {/* Offline Indicator */}
              <OfflineIndicator />

            </div>
          </ThemeProvider>
        </UIConfigProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

// Admin aplikace - jednoduchá verze
export function AdminApp() {
  // Monitoring state
  const [showMonitoring, setShowMonitoring] = useState(false);

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <Suspense fallback={<div className="min-h-screen bg-[#f4ddc4] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
            <p className="text-xl text-gray-700">Načítám admin panel...</p>
          </div>
        </div>}>
          <NewAdminScreen />
        </Suspense>

        {/* Monitoring Dashboard - pouze v admin */}
        {
          import.meta.env.MODE === 'development' && (
            <>
              <button
                onClick={() => setShowMonitoring(!showMonitoring)}
                className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm shadow-lg hover:bg-blue-600 transition-colors z-50"
              >
                📊 Monitor
              </button>
              <MonitoringDashboard
                isVisible={showMonitoring}
                onClose={() => setShowMonitoring(false)}
              />
            </>
          )
        }
      </LanguageProvider >
    </ErrorBoundary >
  );
}
