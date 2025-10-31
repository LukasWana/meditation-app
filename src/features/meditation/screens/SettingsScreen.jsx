import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import LanguageSwitcher from '@components/LanguageSwitcher';
import { useLanguage } from '@contexts/LanguageContext';
import { Download, Wifi, WifiOff, HardDrive, RefreshCw, Trash2, Wind, Clock, Volume2, Image as ImageIcon } from 'lucide-react';
import SoundThemeGallery from '@components/SoundThemeGallery';
import useOfflineCache from '@hooks/useOfflineCache';
import { useFirebaseHudbaScanner } from '@hooks/useFirebaseHudbaScanner';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

const SettingsScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange,
  breathInDuration,
  breathOutDuration,
  onBreathRhythmChange,
  preparationTime,
  onPreparationTimeChange,
  breathInSound,
  breathOutSound,
  onBreathSoundChange,
  breathSoundFadeEnabled,
  onBreathSoundFadeChange
}) => {
  const { t } = useLanguage();
  const [showGallery, setShowGallery] = useState(false);

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


            {/* Čas k přípravě */}
            <FramerSection
              animationType="slideInUp"
              delay={0.25}
            >
              <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4 flex items-center">
                  <Clock className="mr-3" size={24} />
                  {t('casKPriprave')}
                </h3>

                <p className="text-sm text-gray-600 mb-4">
                  Nastavte čas na přípravu před začátkem meditace
                </p>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    {[0, 5, 10, 15, 20, 30].map((seconds) => (
                      <FramerButton
                        key={seconds}
                        onClick={() => onPreparationTimeChange(seconds)}
                        variant={preparationTime === seconds ? 'rounded' : 'secondary'}
                        className="flex-1 py-3"
                      >
                        <div className="text-center">
                          <div className="text-lg font-medium">{seconds}</div>
                          <div className="text-xs text-gray-500">{t('sekund')}</div>
                        </div>
                      </FramerButton>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-black/10">
                    <label className="text-xs text-gray-600 mb-2 block">{t('vlastniRytmus')}:</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={preparationTime}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10) || 0;
                        onPreparationTimeChange(Math.max(0, Math.min(60, value)));
                      }}
                      className="w-full px-3 py-2 border border-black/20 rounded-none bg-white/50 text-center"
                    />
                  </div>
                </div>
              </div>
            </FramerSection>

            {/* Rytmus dýchání */}
            <FramerSection
              animationType="slideInUp"
              delay={0.3}
            >
              <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4 flex items-center">
                  <Wind className="mr-3" size={24} />
                  {t('rytmusDychania')}
                </h3>

                <p className="text-sm text-gray-600 mb-4">
                  {t('vyberteRytmus')}
                </p>

                <div className="space-y-3 mb-4">
                  {/* Přednastavené rytmy */}
                  <div className="flex gap-3">
                    <FramerButton
                      onClick={() => onBreathRhythmChange(6, 8)}
                      variant={breathInDuration === 6 && breathOutDuration === 8 ? 'rounded' : 'secondary'}
                      className="flex-1 py-3"
                    >
                      <div className="text-center">
                        <div className="text-lg font-medium">6:8</div>
                        <div className="text-xs text-gray-500">{t('nadech')}:{t('vydech')}</div>
                      </div>
                    </FramerButton>
                    <FramerButton
                      onClick={() => onBreathRhythmChange(4, 6)}
                      variant={breathInDuration === 4 && breathOutDuration === 6 ? 'rounded' : 'secondary'}
                      className="flex-1 py-3"
                    >
                      <div className="text-center">
                        <div className="text-lg font-medium">4:6</div>
                        <div className="text-xs text-gray-500">{t('nadech')}:{t('vydech')}</div>
                      </div>
                    </FramerButton>
                  </div>

                  {/* Vlastní rytmus */}
                  <div className="pt-3 border-t border-black/10">
                    <p className="text-sm font-medium mb-3">{t('vlastniRytmus')}:</p>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 mb-1 block">{t('nadech')}</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={breathInDuration}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10) || 1;
                            onBreathRhythmChange(value, breathOutDuration);
                          }}
                          className="w-full px-3 py-2 border border-black/20 rounded-none bg-white/50 text-center"
                        />
                      </div>
                      <div className="text-2xl font-light pt-6">:</div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 mb-1 block">{t('vydech')}</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={breathOutDuration}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10) || 1;
                            onBreathRhythmChange(breathInDuration, value);
                          }}
                          className="w-full px-3 py-2 border border-black/20 rounded-none bg-white/50 text-center"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {breathInDuration} {t('sekund')} : {breathOutDuration} {t('sekund')}
                    </p>
                  </div>
                </div>
              </div>
            </FramerSection>

            {/* Nastavení zvuku */}
            <FramerSection
              animationType="slideInUp"
              delay={0.35}
            >
              <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4 flex items-center">
                  <Volume2 className="mr-3" size={24} />
                  {t('nastaveniaZvuku')}
                </h3>

                <div className="space-y-4">
                  {/* Výběr zvuku pro nádech */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('zvolteZvukNadech')}
                    </label>
                    <div className="flex gap-2 mb-3">
                      <FramerButton
                        onClick={() => onBreathSoundChange('in', 'none')}
                        variant={breathInSound === 'none' ? 'rounded' : 'secondary'}
                        className="flex-1 py-2"
                      >
                        {t('ziadnyZvuk')}
                      </FramerButton>
                      <FramerButton
                        onClick={() => setShowGallery(true)}
                        variant="secondary"
                        className="flex-1 py-2"
                      >
                        <ImageIcon size={16} className="mr-2 inline" />
                        {t('zobrazitGaleriu')}
                      </FramerButton>
                    </div>
                    {breathInSound !== 'none' && (
                      <p className="text-xs text-gray-600 line-clamp-1">
                        Vybraný: {breathInSound.split('/').pop()}
                      </p>
                    )}
                  </div>

                  {/* Výběr zvuku pro výdech */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('zvolteZvukVydech')}
                    </label>
                    <div className="flex gap-2 mb-3">
                      <FramerButton
                        onClick={() => onBreathSoundChange('out', 'none')}
                        variant={breathOutSound === 'none' ? 'rounded' : 'secondary'}
                        className="flex-1 py-2"
                      >
                        {t('ziadnyZvuk')}
                      </FramerButton>
                      <FramerButton
                        onClick={() => setShowGallery(true)}
                        variant="secondary"
                        className="flex-1 py-2"
                      >
                        <ImageIcon size={16} className="mr-2 inline" />
                        {t('zobrazitGaleriu')}
                      </FramerButton>
                    </div>
                    {breathOutSound !== 'none' && (
                      <p className="text-xs text-gray-600 line-clamp-1">
                        Vybraný: {breathOutSound.split('/').pop()}
                      </p>
                    )}
                  </div>

                  {/* Fade in/out nastavení */}
                  <div className="pt-3 border-t border-black/10">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {t('fadeInOut')}
                      </label>
                      <FramerButton
                        onClick={() => onBreathSoundFadeChange(!breathSoundFadeEnabled)}
                        variant={breathSoundFadeEnabled ? 'rounded' : 'secondary'}
                        className="px-4 py-2"
                      >
                        {breathSoundFadeEnabled ? t('povolene') : t('zakazane')}
                      </FramerButton>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Plynulé zesilování a zeslabování zvuku při nádechu a výdechu
                    </p>
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

      {/* Galerie zvukových témat */}
      <SoundThemeGallery
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        onSelectSound={onBreathSoundChange}
        selectedInSound={breathInSound}
        selectedOutSound={breathOutSound}
      />
    </FramerPageTransition>
  );
};

export default SettingsScreen;
