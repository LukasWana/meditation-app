import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import LanguageSwitcher from '@components/LanguageSwitcher';
import { useLanguage } from '@contexts/LanguageContext';
import { Download, Wifi, WifiOff, HardDrive, RefreshCw, Trash2 } from 'lucide-react';
import useOfflineCache from '@hooks/useOfflineCache';
import { useFirebaseHudbaScanner } from '@hooks/useFirebaseHudbaScanner';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

const SettingsScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange
}) => {
  const { t } = useLanguage();

  // Offline cache hook
  const {
    isInitialized,
    cacheStats,
    isOfflineReady,
    isCaching,
    cacheProgress,
    loadCacheStats,
    cacheAllFiles,
    clearCache
  } = useOfflineCache();

  // Získej audio soubory pro cache
  const { audioFiles } = useFirebaseHudbaScanner();
  const [allAudioFiles, setAllAudioFiles] = useState([]);

  // Debug: Sleduj změny cache stats
  useEffect(() => {
    console.log('📊 SettingsScreen: Cache stats changed:', cacheStats);
  }, [cacheStats]);

  // Načti všechny audio soubory z metadata
  useEffect(() => {
    const loadAllAudioFiles = async () => {
      try {
        const metadata = await realtimeMetadataService.getAllMetadata();
        console.log('📊 All metadata from realtimeMetadataService:', Object.keys(metadata).length);

        // Debug: zobraz slova soubory
        const slovaFiles = Object.values(metadata).filter(file =>
          file.fileName && file.fileName.includes('slova/')
        );
        console.log('🎤 Slova files found:', slovaFiles.length);
        console.log('🎤 Sample slova files:', slovaFiles.slice(0, 3).map(f => ({
          fileName: f.fileName,
          downloadURL: f.downloadURL || f.audioSrc,
          folder: f.folder
        })));

        // Debug: zobraz všechny soubory s 'slova' v názvu
        const allSlovaFiles = Object.values(metadata).filter(file =>
          file.fileName && file.fileName.toLowerCase().includes('slova')
        );
        console.log('🎤 All files with "slova" in name:', allSlovaFiles.length);
        console.log('🎤 Sample files with "slova":', allSlovaFiles.slice(0, 5).map(f => ({
          fileName: f.fileName,
          hasDownloadURL: !!(f.downloadURL || f.audioSrc)
        })));

        const files = Object.values(metadata).map(file => ({
          fileName: file.fileName,
          downloadURL: file.downloadURL || file.audioSrc,
          size: file.size || 0
        })).filter(file => file.downloadURL);

        setAllAudioFiles(files);
        console.log('📊 Loaded audio files for cache:', files.length);
      } catch (error) {
        console.error('❌ Failed to load audio files:', error);
        // Fallback na data z useFirebaseHudbaScanner
        if (audioFiles && audioFiles.length > 0) {
          setAllAudioFiles(audioFiles);
        }
      }
    };

    loadAllAudioFiles();
  }, [audioFiles]);

  // Spusť stahování všech souborů
  const handleCacheAllFiles = async () => {
    console.log('🔄 handleCacheAllFiles called:', {
      isInitialized,
      isCaching,
      allAudioFilesLength: allAudioFiles.length,
      audioFilesLength: audioFiles?.length || 0
    });

    const filesToCache = allAudioFiles.length > 0 ? allAudioFiles : audioFiles;
    if (filesToCache && filesToCache.length > 0) {
      console.log('🚀 Starting cache with files:', filesToCache.length);

      // Debug: zobraz slova soubory v filesToCache
      const slovaFilesToCache = filesToCache.filter(file =>
        file.fileName && file.fileName.includes('slova/')
      );
      console.log('🎤 Slova files to cache:', slovaFilesToCache.length);
      console.log('🎤 Sample slova files to cache:', slovaFilesToCache.slice(0, 3).map(f => ({
        fileName: f.fileName,
        hasDownloadURL: !!(f.downloadURL || f.audioSrc)
      })));

      const result = await cacheAllFiles(filesToCache);
      console.log('📊 Cache result:', result);
    } else {
      console.warn('⚠️ No audio files available for caching');
    }
  };

  // Vymaž cache
  const handleClearCache = async () => {
    if (window.confirm('Opravdu chcete vymazat všechny stažené soubory?')) {
      await clearCache();
    }
  };

  return (
    <FramerPageTransition screenKey="settings">
      <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full mt-16">
          <FramerSection
            className="text-center mb-8"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-6xl font-light" style={{fontFamily: 'Playfair Display'}}>
              {t('nastavenie')}
            </h1>
          </FramerSection>

          <div className="space-y-4">
            {/* Language Settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.2}
            >
              <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4" style={{fontFamily: 'Playfair Display'}}>
                  {t('selectLanguage')}
                </h3>
                <LanguageSwitcher />
              </div>
            </FramerSection>


            {/* Offline Cache Settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.3}
            >
              <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4 flex items-center" style={{fontFamily: 'Playfair Display'}}>
                  <HardDrive className="mr-3" size={24} />
                  Offline režim
                </h3>

                {/* Offline stav */}
                <div className={`p-4 rounded-lg mb-4 ${isOfflineReady ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <div className="flex items-center mb-2">
                    {isOfflineReady ? <Wifi className="text-green-500 mr-2" size={20} /> : <WifiOff className="text-yellow-500 mr-2" size={20} />}
                    <span className="font-semibold">
                      {isOfflineReady ? 'Připraveno pro offline' : 'Není připraveno pro offline'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {isOfflineReady
                      ? 'Aplikace bude fungovat i bez internetového připojení.'
                      : 'Pro offline použití stáhněte audio soubory do cache.'
                    }
                  </p>
                </div>

                   {/* Cache statistiky */}
                   {cacheStats ? (
                     <div className="grid grid-cols-2 gap-4 mb-4">
                       <div className="p-3 bg-blue-50 rounded-lg">
                         <div className="flex items-center mb-1">
                           <Download className="text-blue-500 mr-2" size={16} />
                           <span className="text-sm font-medium">Stažené soubory</span>
                         </div>
                         <p className="text-lg font-bold text-blue-600">
                           {cacheStats.totalFiles}
                         </p>
                       </div>

                       <div className="p-3 bg-purple-50 rounded-lg">
                         <div className="flex items-center mb-1">
                           <HardDrive className="text-purple-500 mr-2" size={16} />
                           <span className="text-sm font-medium">Velikost cache</span>
                         </div>
                         <p className="text-lg font-bold text-purple-600">
                           {cacheStats.totalSizeFormatted || '0 B'}
                         </p>
                       </div>
                     </div>
                   ) : (
                     <div className="p-4 bg-gray-50 rounded-lg mb-4">
                       <div className="flex items-center">
                         <RefreshCw className="text-gray-500 mr-2 animate-spin" size={16} />
                         <span className="text-sm text-gray-600">
                           {isInitialized ? 'Načítání statistik cache...' : 'Inicializace cache...'}
                         </span>
                       </div>
                     </div>
                   )}

                {/* Progress bar pro stahování */}
                {isCaching && cacheProgress && (
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Stahování souborů...</span>
                      <span className="text-sm text-gray-500">
                        {cacheProgress.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${cacheProgress.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {cacheProgress.current} / {cacheProgress.total} - {cacheProgress.fileName}
                    </p>
                  </div>
                )}

                {/* Tlačítka */}
                <div className="space-y-3">
                  <FramerButton
                    onClick={handleCacheAllFiles}
                    disabled={isCaching || (allAudioFiles.length === 0 && (!audioFiles || audioFiles.length === 0))}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    animationType="fadeIn"
                    delay={0.1}
                  >
                    <Download className="mr-2" size={16} />
                    {isCaching ? 'Stahování...' : `Stáhnout vše do cache (${allAudioFiles.length || audioFiles?.length || 0} souborů)`}
                  </FramerButton>

                  <div className="flex gap-2">
                    <FramerButton
                      onClick={loadCacheStats}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                      animationType="fadeIn"
                      delay={0.2}
                    >
                      <RefreshCw className="mr-2" size={16} />
                      Aktualizovat
                    </FramerButton>

                    <FramerButton
                      onClick={handleClearCache}
                      disabled={!cacheStats || cacheStats.totalFiles === 0}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                      animationType="fadeIn"
                      delay={0.3}
                    >
                      <Trash2 className="mr-2" size={16} />
                      Vymazat cache
                    </FramerButton>
                  </div>
                </div>
              </div>
            </FramerSection>

            {/* Informace */}
            <FramerSection
              animationType="slideInUp"
              delay={0.4}
            >
              <div className="w-full p-6 bg-white/30 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4" style={{fontFamily: 'Playfair Display'}}>
                  {t('informacie')}
                </h3>
                <p className="text-lg text-gray-600">
                  {t('verziaAplikacieDesc')}
                </p>
              </div>
            </FramerSection>
          </div>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default SettingsScreen;
