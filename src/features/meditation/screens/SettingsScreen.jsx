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
    if (window.confirm(t('potvrditVymazaniCache'))) {
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
            <h1 className="text-6xl font-light">
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
                <h3 className="text-2xl font-light mb-4">
                  {t('selectLanguage')}
                </h3>
                <LanguageSwitcher />
              </div>
            </FramerSection>


            {/* Informace */}
            <FramerSection
              animationType="slideInUp"
              delay={0.25}
            >
              <div className="w-full p-6 bg-white/30 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4">
                  {t('informacie')}
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('informacieText')}
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
