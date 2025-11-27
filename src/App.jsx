import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageManager } from '@features/navigation';
import { useNavigation, useTouchNavigation, useAppState, useTimer, useBreathPhase } from '@hooks';
import { useAppInitialization } from '@hooks/useAppInitialization';
import { LazyIntroScreen, NewAdminScreen } from '@config/lazyComponents';
import { LanguageProvider } from '@contexts/LanguageContext';
import { UIConfigProvider } from '@contexts/UIConfigContext';
import { ThemeProvider } from '@contexts/ThemeContext';
import MonitoringDashboard from '@components/MonitoringDashboard';
import OfflineIndicator from '@components/OfflineIndicator';

import ErrorBoundary from '@components/ErrorBoundary';

// Hlavní aplikace s routingem
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<MeditationApp />} />
      </Routes>
    </BrowserRouter>
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

  // App state
  const {
    time,
    setTime,
    selectedDuration,
    isPlaying,
    setIsPlaying,
    breathPhase,
    setBreathPhase,
    breathInDuration,
    breathOutDuration,
    gender,
    voicePreference,
    isPlayerActive,
    activeAudio,
    selectedAlbum,
    handleDurationChange,
    handlePlayPause,
    handleReset,
    handleGenderChange,
    handleVoicePreferenceChange,
    handlePlayerStateChange,
    handleCloseAudio,
    handleAlbumClose,
    handleBreathRhythmChange,
    preparationTime,
    handlePreparationTimeChange,
    breathInSound,
    breathOutSound,
    breathClickSound,
    breathFinalSound,
    breathCountdownSound,
    handleBreathSoundChange,
    breathSoundFadeEnabled,
    handleBreathSoundFadeChange,
    isPreparing,
    preparationCountdown,
    breathDuration,
    breathTime,
    setBreathTime,
    isBreathing,
    setIsBreathing,
    handleBreathDurationChange
  } = useAppState();

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
  useTimer(isPlaying, time, setTime, setIsPlaying);

  // Breath phase logika
  useBreathPhase(isPlaying, time, setBreathPhase, breathInDuration, breathOutDuration);

  // Development-only debug utilities
  React.useEffect(() => {
    // Načti database viewer pro development
    if (import.meta.env.MODE === 'development') {
      import('./scripts/consoleDbViewer.js').then(() => {
        console.log('🔍 Database viewer je k dispozici v konzoli');
      });

      // Debug funkce pro slova soubory
      window.debugSlovaFiles = async () => {
        console.log('🔍 Debugging slova files...');
        try {
          const { realtimeMetadataService } = await import('./services/realtimeMetadataService');
          const metadata = await realtimeMetadataService.getAllMetadata();

          console.log('📊 All metadata keys:', Object.keys(metadata).length);
          console.log('📊 All metadata:', metadata);

          const slovaFiles = Object.values(metadata).filter(file =>
            file.fileName && file.fileName.includes('slova/')
          );
          console.log('🎤 Slova files found:', slovaFiles.length);
          console.log('🎤 Slova files:', slovaFiles);

          return { totalFiles: Object.keys(metadata).length, slovaFiles: slovaFiles.length };
        } catch (error) {
          console.error('❌ Error debugging slova files:', error);
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
        console.log(`🔧 Log level nastaven na: ${level}`);
        console.log('Dostupné úrovně: silent, error, warn, info, debug');
      };

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

      // Funkce pro kontrolu waveformů v databázi
      window.checkWaveforms = async () => {
        console.log('🔍 Kontroluji waveformy v databázi...');
        try {
          const { realtimeMetadataService } = await import('./services/realtimeMetadataService');
          const allMetadata = await realtimeMetadataService.getAllMetadata();

          // Filtruj hudební soubory
          const hudbaFiles = Object.values(allMetadata).filter(file =>
            file.fileName && file.fileName.startsWith('hudba/')
          );

          // Filtruj soubory s waveformy
          const hudbaFilesWithWaveform = hudbaFiles.filter(file =>
            file.waveformData && Array.isArray(file.waveformData) && file.waveformData.length > 0
          );

          // Filtruj soubory bez waveformů
          const hudbaFilesWithoutWaveform = hudbaFiles.filter(file =>
            !file.waveformData || !Array.isArray(file.waveformData) || file.waveformData.length === 0
          );

          console.log('🎵 Hudební soubory v databázi:');
          console.log(`   Celkem: ${hudbaFiles.length}`);
          console.log(`   S waveformy: ${hudbaFilesWithWaveform.length}`);
          console.log(`   Bez waveformů: ${hudbaFilesWithoutWaveform.length}`);

          if (hudbaFilesWithWaveform.length > 0) {
            console.log('✅ Příklady souborů s waveformy:', hudbaFilesWithWaveform.slice(0, 5).map(f => ({
              fileName: f.fileName,
              waveformSamples: f.waveformData?.length || 0,
              waveformGenerated: f.waveformGenerated
            })));
          }

          if (hudbaFilesWithoutWaveform.length > 0) {
            console.log('⚠️ Příklady souborů bez waveformů:', hudbaFilesWithoutWaveform.slice(0, 5).map(f => ({
              fileName: f.fileName,
              hasWaveformData: !!f.waveformData,
              hasWaveform: !!f.waveform
            })));
          }

          // Stejně pro dychanie
          const dychanieFiles = Object.values(allMetadata).filter(file =>
            file.fileName && file.fileName.startsWith('dychanie/')
          );
          const dychanieFilesWithWaveform = dychanieFiles.filter(file =>
            file.waveformData && Array.isArray(file.waveformData) && file.waveformData.length > 0
          );

          console.log('🫁 Dýchací soubory v databázi:');
          console.log(`   Celkem: ${dychanieFiles.length}`);
          console.log(`   S waveformy: ${dychanieFilesWithWaveform.length}`);
          console.log(`   Bez waveformů: ${dychanieFiles.length - dychanieFilesWithWaveform.length}`);

          return {
            hudba: {
              total: hudbaFiles.length,
              withWaveform: hudbaFilesWithWaveform.length,
              withoutWaveform: hudbaFilesWithoutWaveform.length
            },
            dychanie: {
              total: dychanieFiles.length,
              withWaveform: dychanieFilesWithWaveform.length,
              withoutWaveform: dychanieFiles.length - dychanieFilesWithWaveform.length
            }
          };
        } catch (error) {
          console.error('❌ Chyba při kontrole waveformů:', error);
          return { success: false, error: error.message };
        }
      };

      // Funkce pro kontrolu struktury waveform dat v databázi
      window.checkWaveformStructure = async () => {
        console.log('🔍 Kontroluji strukturu waveform dat v databázi...');
        try {
          const { realtimeMetadataService } = await import('./services/realtimeMetadataService');
          const allMetadata = await realtimeMetadataService.getAllMetadata();

          // Najdi soubory s waveformy
          const filesWithWaveform = Object.values(allMetadata).filter(file =>
            file.waveformData && file.fileName?.startsWith('dychanie/')
          ).slice(0, 5);

          console.log(`📊 Našel ${filesWithWaveform.length} souborů s waveformy:`);

          filesWithWaveform.forEach((file, index) => {
            const waveformData = file.waveformData;
            console.log(`\n📄 ${index + 1}. ${file.fileName}:`);
            console.log(`   - waveformData type: ${typeof waveformData}`);
            console.log(`   - Is Array: ${Array.isArray(waveformData)}`);
            console.log(`   - Is Object: ${typeof waveformData === 'object' && !Array.isArray(waveformData)}`);

            if (Array.isArray(waveformData)) {
              console.log(`   - Length: ${waveformData.length}`);
              console.log(`   - First 5 values:`, waveformData.slice(0, 5));
              console.log(`   - Last 5 values:`, waveformData.slice(-5));
              const max = Math.max(...waveformData);
              const min = Math.min(...waveformData);
              const avg = waveformData.reduce((a, b) => a + b, 0) / waveformData.length;
              console.log(`   - Max: ${max.toFixed(4)} ${max > 1 ? '(ABSOLUTNÍ 0-32768) ✅' : '(NORMALIZOVANÉ 0-1) ⚠️'}`);
              console.log(`   - Min: ${min.toFixed(4)}`);
              console.log(`   - Avg: ${avg.toFixed(4)}`);
              console.log(`   - Range: ${(max - min).toFixed(4)}`);
              console.log(`   - Metadata: waveformMax=${file.waveformMax?.toFixed(4) || 'NULL'}, waveformMin=${file.waveformMin?.toFixed(4) || 'NULL'}, waveformAvg=${file.waveformAvg?.toFixed(4) || 'NULL'}`);
              console.log(`   - waveformGenerated: ${file.waveformGenerated || 'NULL'}`);
              console.log(`   - waveformSamples: ${file.waveformSamples || 'NULL'}`);
            } else if (typeof waveformData === 'object' && waveformData !== null) {
              console.log(`   - Object keys count: ${Object.keys(waveformData).length}`);
              console.log(`   - First 5 keys:`, Object.keys(waveformData).slice(0, 5));
              console.log(`   - Sample values:`, Object.values(waveformData).slice(0, 5));

              // Zkus převést na array
              const asArray = Object.values(waveformData);
              console.log(`   - Converted to array length: ${asArray.length}`);
              const max = Math.max(...asArray);
              const min = Math.min(...asArray);
              console.log(`   - Converted max: ${max.toFixed(4)} ${max > 1 ? '(ABSOLUTNÍ)' : '(NORMALIZOVANÉ)'}`);
              console.log(`   - Converted min: ${min.toFixed(4)}`);
            }
          });

          return { success: true, filesChecked: filesWithWaveform.length };
        } catch (error) {
          console.error('❌ Chyba při kontrole struktury waveform dat:', error);
          return { success: false, error: error.message };
        }
      };

      // Funkce pro analýzu waveform dat - zkontroluje, zda jsou absolutní nebo normalizovaná
      window.analyzeWaveformData = async () => {
        console.log('🔬 Analýza waveform dat v databázi...');
        try {
          const { realtimeMetadataService } = await import('./services/realtimeMetadataService');
          const allMetadata = await realtimeMetadataService.getAllMetadata();

          const dychanieFiles = Object.values(allMetadata).filter(file =>
            file.waveformData && file.fileName?.startsWith('dychanie/')
          );

          console.log(`📊 Celkem souborů s waveformy: ${dychanieFiles.length}`);

          let absoluteCount = 0;
          let normalizedCount = 0;
          let absoluteFiles = [];
          let normalizedFiles = [];

          dychanieFiles.forEach(file => {
            const waveformData = file.waveformData;
            if (!Array.isArray(waveformData) || waveformData.length === 0) return;

            const max = Math.max(...waveformData);
            const min = Math.min(...waveformData);
            const avg = waveformData.reduce((a, b) => a + b, 0) / waveformData.length;

            if (max > 1.5) {
              absoluteCount++;
              absoluteFiles.push({
                fileName: file.fileName,
                max: max.toFixed(2),
                min: min.toFixed(2),
                avg: avg.toFixed(2),
                samples: waveformData.length
              });
            } else {
              normalizedCount++;
              normalizedFiles.push({
                fileName: file.fileName,
                max: max.toFixed(4),
                min: min.toFixed(4),
                avg: avg.toFixed(4),
                samples: waveformData.length,
                waveformGenerated: file.waveformGenerated
              });
            }
          });

          console.log(`\n📊 VÝSLEDKY:`);
          console.log(`   ✅ Absolutní hodnoty (0-32768): ${absoluteCount} souborů`);
          console.log(`   ⚠️  Normalizované hodnoty (0-1): ${normalizedCount} souborů`);

          if (absoluteFiles.length > 0) {
            console.log(`\n✅ Soubory s ABSOLUTNÍMI hodnotami (správné):`);
            absoluteFiles.slice(0, 3).forEach(f => {
              console.log(`   - ${f.fileName}: max=${f.max}, min=${f.min}, avg=${f.avg}, samples=${f.samples}`);
            });
          }

          if (normalizedFiles.length > 0) {
            console.log(`\n⚠️  Soubory s NORMALIZOVANÝMI hodnotami (potřebují regenerovat):`);
            normalizedFiles.slice(0, 5).forEach(f => {
              console.log(`   - ${f.fileName}: max=${f.max}, min=${f.min}, avg=${f.avg}, generated=${f.waveformGenerated || 'NULL'}`);
            });
          }

          return {
            success: true,
            total: dychanieFiles.length,
            absolute: absoluteCount,
            normalized: normalizedCount,
            absoluteFiles: absoluteFiles.slice(0, 5),
            normalizedFiles: normalizedFiles.slice(0, 5)
          };
        } catch (error) {
          console.error('❌ Chyba při analýze waveform dat:', error);
          return { success: false, error: error.message };
        }
      };

      console.log('🔍 Debug funkce dostupné v konzoli:');
      console.log('  - showDatabaseData() - zobrazí database viewer');
      console.log('  - debugSlovaFiles() - zobrazí slova soubory v Realtime Database');
      console.log('  - debugCache() - zobrazí detaily cache');
      console.log('  - syncAllFiles() - synchronizuje všechny soubory pomocí Firebase Function');
      console.log('  - checkWaveforms() - zkontroluje, které soubory mají waveformy v databázi');
      console.log('  - checkWaveformStructure() - kontroluje strukturu waveform dat v databázi');
      console.log('  - analyzeWaveformData() - analýzuje waveform dat v databázi');
      console.log('  - clearCache() - vymaže cache');
      console.log('  - testAudioPlayback(fileName) - otestuje přehrávání konkrétního souboru');
      console.log('  - setLogLevel(level) - nastaví úroveň logování (silent, error, warn, info, debug)');
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
                >
                  <PageManager
                    // Navigation
                    currentScreen={currentScreen}
                    onNavigateToScreen={navigateToScreen}

                    // Touch handling
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}

                    // Global state
                    gender={gender}
                    onGenderChange={handleGenderChange}
                    voicePreference={voicePreference}
                    onVoicePreferenceChange={handleVoicePreferenceChange}
                    isPlayerActive={isPlayerActive}

                    // Meditace specifické
                    time={time}
                    selectedDuration={selectedDuration}
                    isPlaying={isPlaying}
                    onDurationChange={handleDurationChange}
                    onPlayPause={handlePlayPause}
                    onReset={handleReset}
                    breathPhase={breathPhase}
                    setBreathPhase={setBreathPhase}
                    breathInDuration={breathInDuration}
                    breathOutDuration={breathOutDuration}
                    onBreathRhythmChange={handleBreathRhythmChange}
                    preparationTime={preparationTime}
                    onPreparationTimeChange={handlePreparationTimeChange}
                    breathInSound={breathInSound}
                    breathOutSound={breathOutSound}
                    breathClickSound={breathClickSound}
                    breathFinalSound={breathFinalSound}
                    breathCountdownSound={breathCountdownSound}
                    onBreathSoundChange={handleBreathSoundChange}
                    breathSoundFadeEnabled={breathSoundFadeEnabled}
                    onBreathSoundFadeChange={handleBreathSoundFadeChange}
                    isPreparing={isPreparing}
                    preparationCountdown={preparationCountdown}
                    breathDuration={breathDuration}
                    breathTime={breathTime}
                    setBreathTime={setBreathTime}
                    isBreathing={isBreathing}
                    setIsBreathing={setIsBreathing}
                    onBreathDurationChange={handleBreathDurationChange}

                    // Audio player specifické
                    activeAudio={activeAudio}
                    selectedAlbum={selectedAlbum}
                    onPlayerStateChange={handlePlayerStateChange}
                    onCloseAudio={handleCloseAudio}
                    onAlbumClose={handleAlbumClose}
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