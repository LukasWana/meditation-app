import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton, BackgroundShader, ShaderGallery } from '@components';
import ShaderCategorySelector from '@components/ShaderCategorySelector';
import LanguageSwitcher from '@components/LanguageSwitcher';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { Download, Wifi, WifiOff, HardDrive, RefreshCw, Trash2 } from 'lucide-react';
import useOfflineCache from '@hooks/useOfflineCache';
import { useFirebaseHudbaScanner } from '@hooks/useFirebaseHudbaScanner';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

const SettingsScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange,
  gender = 'none',
  onGenderChange
}) => {
  const { t } = useLanguage();
  const { shaderSettings, setShaderForSection, getShaderForSection } = useShaderSettings();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSection, setSelectedSection] = useState('');

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
      <BackgroundShader variant="settings" intensity={0.3} enabled={true} />
      <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative" style={{ position: 'relative', zIndex: 10 }}>
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('nastavenie')}
              </h1>
            </div>
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

            {/* Gender Settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.21}
            >
              <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4">
                  {t('pohlavie')}
                </h3>
                <motion.div
                  className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-1 shadow-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <motion.button
                    onClick={() => onGenderChange && onGenderChange('male')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      gender === 'male'
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {t('jsemMuz')}
                  </motion.button>
                  <motion.button
                    onClick={() => onGenderChange && onGenderChange('female')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      gender === 'female'
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {t('jsemZena')}
                  </motion.button>
                  <motion.button
                    onClick={() => onGenderChange && onGenderChange('none')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      gender === 'none'
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {t('obecnyObsah')}
                  </motion.button>
                </motion.div>
              </div>
            </FramerSection>

            {/* Shader Gallery */}
            <FramerSection
              animationType="slideInUp"
              delay={0.22}
            >
              <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                <h3 className="text-2xl font-light mb-4">
                  {t('shadery') || 'Shadery'}
                </h3>

                {!selectedCategory ? (
                  // Výběr kategorie
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-light mb-4">
                        {t('vyberteKategorii') || 'Vyberte kategorii shaderů'}
                      </h4>
                      <ShaderCategorySelector
                        selectedCategory={selectedCategory}
                        onSelect={setSelectedCategory}
                      />
                    </div>

                    {/* Rychlý výběr sekce */}
                    <div>
                      <h4 className="text-lg font-light mb-3">
                        {t('proSekci') || 'Pro sekci'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { key: 'meditace', label: t('meditace') || 'Meditace' },
                          { key: 'dychani', label: t('dychani') || 'Dýchání' },
                          { key: 'hudba', label: t('hudba') || 'Hudba' }
                        ].map(section => {
                          const isMeditaceSection = section.key === 'meditace';
                          const activeShader = getShaderForSection(section.key) || 'default';
                          return (
                            <button
                              key={section.key}
                              type="button"
                              onClick={() => {
                                setSelectedSection(section.key);
                                setSelectedCategory(selectedCategory || 'shaders');
                              }}
                              className={`w-full h-full text-left px-4 py-3 rounded-xl border border-black/10 bg-white/80 backdrop-blur hover:bg-white transition-shadow shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/20 ${
                                isMeditaceSection ? 'sm:col-span-1' : ''
                              }`}
                            >
                              <span className="block text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">
                                {section.label}
                              </span>
                              <span className="block text-xs text-gray-600">
                                {(t('aktualniShader') || 'Aktuální shader') + ':'}
                                <span className="block text-base font-light text-gray-800 mt-1 break-all">
                                  {activeShader}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Galerie shaderů
                  <div className="space-y-6">
                    <ShaderGallery
                      selectedVariant={selectedSection ? getShaderForSection(selectedSection) : null}
                      onSelect={(shaderId) => {
                        if (selectedSection) {
                          setShaderForSection(selectedSection, shaderId);
                          alert(`Shader přiřazen k sekci ${selectedSection}`);
                        } else {
                          alert('Nejdříve vyberte sekci pro přiřazení shaderu');
                        }
                      }}
                      section={selectedSection}
                      category={selectedCategory}
                    />
                  </div>
                )}
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
