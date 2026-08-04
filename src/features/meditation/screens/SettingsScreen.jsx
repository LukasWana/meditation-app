import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FramerButton from '@components/FramerButton';
import FramerSection from '@components/FramerSection';
import FramerPageTransition from '@components/FramerPageTransition';
import BackButton from '@components/BackButton';
import { Heading } from '@components/ui/Heading';
import LanguageSwitcher from '@components/LanguageSwitcher';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import { Download, Wifi, WifiOff, HardDrive, RefreshCw, Trash2, History } from 'lucide-react';
import { useOfflineCache } from '@features/audio/hooks';
import { useFirebaseHudbaFilter } from '@features/audio/hooks';
import { fastMetadataService } from '@services/fastMetadataService';
import { createSharedSettings, consumeSharedSettings } from '@services/sharedSettingsService';
import breathProfilesService from '@services/breathProfilesService';

import { useUserPrefsStore } from '@stores/userPrefsStore';

// Lazy loading ThemeSelector pro lepší pořadí načítání - načte se až po inicializaci ThemeProvider
const ThemeSelector = lazy(() => import('@components/ThemeSelector'));
const ColorModeSelector = lazy(() => import('@components/ColorModeSelector'));

const SettingsScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange,
}) => {
  const { gender, setGender: onGenderChange } = useUserPrefsStore();
  const { t, language, changeLanguage } = useLanguage();
  const { getScreenBackgroundColor, getCurrentThemeColors, colorMode, themeId, changeTheme, changeColorMode } = useTheme();
  const themeColors = getCurrentThemeColors?.() || {};

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
  const { audioFiles } = useFirebaseHudbaFilter();
  const [allAudioFiles, setAllAudioFiles] = useState([]);
  const [breathProfiles, setBreathProfiles] = useState([]);
  const [continueAfterEnd, setContinueAfterEnd] = useState(false);

  // Sdílení nastavení
  const [shareCodeInput, setShareCodeInput] = useState('');
  const [generatedShare, setGeneratedShare] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');

  // Debug: Sleduj změny cache stats
  useEffect(() => {
    console.log('📊 SettingsScreen: Cache stats changed:', cacheStats);
  }, [cacheStats]);

  // Načti všechny audio soubory z metadata
  useEffect(() => {
    const loadAllAudioFiles = async () => {
      try {
        if (!fastMetadataService.isInitialized) {
          await fastMetadataService.initialize();
        }

        const metadata = Array.from(fastMetadataService.metadata.values());
        console.log('📊 All metadata from fastMetadataService:', metadata.length);

        const files = metadata.map(file => ({
          fileName: file.fileName,
          downloadURL: file.downloadURL,
          size: file.size || 0
        })).filter(file => file.downloadURL);

        setAllAudioFiles(files);
        console.log('📊 Loaded audio files for cache:', files.length);
      } catch (error) {
        console.error('❌ Failed to load audio files:', error);
        // Fallback na data z useFirebaseHudbaFilter
        if (audioFiles && audioFiles.length > 0) {
          setAllAudioFiles(audioFiles);
        }
      }
    };

    loadAllAudioFiles();
  }, [audioFiles]);

  // Načti profily dýchání a continueAfterEnd
  useEffect(() => {
    const loadBreathing = async () => {
      try {
        const profiles = await breathProfilesService.getAllProfiles();
        setBreathProfiles(Array.isArray(profiles) ? profiles : []);
      } catch (error) {
        console.warn('Failed to load breath profiles for sharing:', error);
        setBreathProfiles([]);
      }
      try {
        const saved = localStorage.getItem('meditation-app-continue-after-end');
        setContinueAfterEnd(saved === 'true');
      } catch (error) {
        console.warn('Failed to load continueAfterEnd flag:', error);
      }
    };
    loadBreathing();
  }, []);

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

      // Debug: zobraz meditacie soubory v filesToCache
      const slovaFilesToCache = filesToCache.filter(file =>
        file.fileName && file.fileName.includes('meditacie/')
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

  const ensureProfileId = (profile) => {
    if (profile.id) return profile.id;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const buildSharePayload = () => {
    return {
      schemaVersion: 1,
      ui: {
        language,
        themeId,
        colorMode
      },
      breathing: {
        continueAfterEnd,
        breathProfiles
      }
    };
  };

  const mergeBreathProfiles = async (incomingProfiles = []) => {
    const existing = await breathProfilesService.getAllProfiles();
    const result = [...existing];

    for (const incoming of incomingProfiles) {
      const profile = { ...incoming };
      const profileId = ensureProfileId(profile);
      profile.id = profileId;

      let targetName = profile.name || 'Profil';
      const nameExists = (name) => result.some(p => p.name === name && p.id !== profileId);
      if (nameExists(targetName)) {
        let counter = 2;
        const baseName = targetName;
        while (nameExists(targetName)) {
          targetName = `${baseName} (${counter})`;
          counter += 1;
        }
      }
      profile.name = targetName;

      const idx = result.findIndex(p => p.id === profileId);
      if (idx >= 0) {
        result[idx] = { ...result[idx], ...profile };
      } else {
        result.push(profile);
      }

      await breathProfilesService.saveProfile(profile, profileId);
    }

    setBreathProfiles(result);
  };

  const handleGenerateShare = async () => {
    setShareError('');
    setShareSuccess('');
    setGeneratedShare(null);
    setShareLoading(true);
    try {
      const payload = buildSharePayload();
      const data = await createSharedSettings({
        payload,
        scope: { ui: true, breathing: true },
        ttlHours: 24,
        oneTime: true
      });
      setGeneratedShare(data);
      setShareSuccess(t('kodProSdileniBylVygenerovan'));
    } catch (error) {
      console.error('Failed to create shared settings:', error);
      setShareError(error?.message || t('nepodariloSeVytvoritSdileni'));
    } finally {
      setShareLoading(false);
    }
  };

  const handleLoadShare = async () => {
    setShareError('');
    setShareSuccess('');
    setImportPreview(null);
    if (!shareCodeInput.trim()) {
      setShareError(t('zadejKodSdileni'));
      return;
    }
    setImportLoading(true);
    try {
      const data = await consumeSharedSettings(shareCodeInput.trim());
      setImportPreview(data);
      setShareSuccess(t('nastaveniNacteno'));
    } catch (error) {
      console.error('Failed to load shared settings:', error);
      setShareError(error?.message || t('naciteniSdileniSeNepovedlo'));
    } finally {
      setImportLoading(false);
    }
  };

  const applyImportedSettings = async () => {
    if (!importPreview?.payload) return;
    setImportLoading(true);
    setShareError('');
    setShareSuccess('');
    try {
      const { ui, breathing } = importPreview.payload;
      if (ui) {
        if (ui.language) {
          changeLanguage(ui.language);
        }
        if (ui.themeId) {
          changeTheme(ui.themeId);
        }
        if (ui.colorMode) {
          changeColorMode(ui.colorMode);
        }
      }
      if (breathing) {
        if (Array.isArray(breathing.breathProfiles)) {
          await mergeBreathProfiles(breathing.breathProfiles);
        }
        if (breathing.continueAfterEnd !== undefined) {
          localStorage.setItem('meditation-app-continue-after-end', breathing.continueAfterEnd ? 'true' : 'false');
          setContinueAfterEnd(!!breathing.continueAfterEnd);
        }
      }
      setImportPreview(null);
      setShareSuccess('Nastavení bylo importováno.');
    } catch (error) {
      console.error('Failed to apply shared settings:', error);
      setShareError(error?.message || 'Import nastavení se nepovedl.');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <FramerPageTransition screenKey="settings">
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-y-auto relative"
        style={{
          backgroundColor: getScreenBackgroundColor()
        }}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full" style={{ marginTop: '5rem', paddingTop: 0, paddingBottom: '2rem', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <Heading level={1}>
                {t('nastavenie')}
              </Heading>
            </div>
          </FramerSection>

          <div className="space-y-4">
            {/* Language Settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.2}
            >
              <div
                className="glass-panel w-full p-6"
                style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
              >
                <Heading
                  level={3}
                  visual={2}
                  style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
                >
                  {t('selectLanguage')}
                </Heading>
                <LanguageSwitcher />
              </div>
            </FramerSection>

            {/* Theme Selection */}
            <Suspense fallback={
              <FramerSection
                animationType="slideInUp"
                delay={0.22}
              >
                <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
                    <div className="space-y-3">
                      <div className="h-16 bg-gray-200 rounded"></div>
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </FramerSection>
            }>
              <ThemeSelector />
            </Suspense>

            {/* Color Mode Selection */}
            <Suspense fallback={
              <FramerSection
                animationType="slideInUp"
                delay={0.23}
              >
                <div className="w-full p-6 bg-white/50 backdrop-blur rounded-none border border-black/10">
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
                    <div className="space-y-3">
                      <div className="h-16 bg-gray-200 rounded"></div>
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </FramerSection>
            }>
              <ColorModeSelector />
            </Suspense>

            {/* Sdílení nastavení */}
            <FramerSection
              animationType="slideInUp"
              delay={0.24}
            >
              <div
                className="glass-panel w-full p-6 space-y-3"
                style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
              >
                <Heading
                  level={3}
                  visual={2}
                  style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
                >
                  {t('sdileniNastaveni')}
                </Heading>

                {shareError && (
                  <div className="text-sm text-red-500">
                    {shareError}
                  </div>
                )}
                {shareSuccess && (
                  <div className="text-sm text-green-600">
                    {shareSuccess}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleGenerateShare}
                      disabled={shareLoading}
                      className="glass-button px-4 py-2 disabled:opacity-50"
                      style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                    >
                      {shareLoading ? t('generuji') : t('vygenerovatKod')}
                    </button>
                    {generatedShare?.shareId && (
                      <div className="flex-1 flex items-center gap-2">
                        <div className="glass-panel px-3 py-2 flex-1 truncate" style={{ padding: '0.5rem 0.75rem', borderRadius: '9999px' }}>
                          {generatedShare.shareId}
                        </div>
                        <button
                          onClick={() => navigator.clipboard?.writeText(generatedShare.shareId)}
                          className="glass-button px-3 py-2"
                          style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                        >
                          {t('kopirovat')}
                        </button>
                      </div>
                    )}
                  </div>
                  {generatedShare?.expiresAt && (
                    <div className="text-xs text-gray-500">
                      {t('platnostDo')} {new Date(generatedShare.expiresAt).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm text-gray-600">{t('importKodu')}</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={shareCodeInput}
                      onChange={(e) => setShareCodeInput(e.target.value)}
                      placeholder={t('zadejKod')}
                      className="glass-input flex-1 px-3 py-2 rounded-full"
                    />
                    <button
                      onClick={handleLoadShare}
                      disabled={importLoading}
                      className="glass-button px-4 py-2 disabled:opacity-50"
                      style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                    >
                      {importLoading ? t('nacitam') : t('nacist')}
                    </button>
                  </div>
                </div>

                {importPreview?.preview && (
                  <div className="glass-panel p-4 space-y-2 mt-4" style={{ borderRadius: '24px' }}>
                    <div className="text-sm font-semibold">{t('nahledImportu')}</div>
                    <div className="text-sm">{t('jazyk')}: {importPreview.preview.language || '—'}</div>
                    <div className="text-sm">{t('tema')}: {importPreview.preview.themeId || '—'}</div>
                    <div className="text-sm">{t('profilu')}: {importPreview.preview.profiles ?? 0}</div>
                    <div className="text-sm">{t('pokracovatPoKonce')}: {importPreview.preview.continueAfterEnd ? t('ano') : t('ne')}</div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={applyImportedSettings}
                        disabled={importLoading}
                        className="glass-button px-4 py-2 disabled:opacity-50"
                        style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                      >
                        {importLoading ? t('importuji') : t('pouzitNastaveni')}
                      </button>
                      <button
                        onClick={() => setImportPreview(null)}
                        className="glass-button px-4 py-2"
                        style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                      >
                        {t('zrusit')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </FramerSection>

            {/* Gender Settings */}
            <FramerSection
              animationType="slideInUp"
              delay={0.21}
            >
              <div
                className="glass-panel w-full p-6"
                style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
              >
                <Heading
                  level={3}
                  visual={2}
                  style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
                >
                  {t('pohlavie')}
                </Heading>
                <motion.div
                  className="inline-flex items-center gap-2 glass-panel p-1"
                  style={{ borderRadius: '9999px' }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <motion.button
                    onClick={() => onGenderChange && onGenderChange('male')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${gender === 'male'
                      ? 'glass-button'
                      : 'hover:opacity-80'
                      }`}
                    style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {t('jsemMuz')}
                  </motion.button>
                  <motion.button
                    onClick={() => onGenderChange && onGenderChange('female')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${gender === 'female'
                      ? 'glass-button'
                      : 'hover:opacity-80'
                      }`}
                    style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {t('jsemZena')}
                  </motion.button>
                  <motion.button
                    onClick={() => onGenderChange && onGenderChange('none')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${gender === 'none'
                      ? 'glass-button'
                      : 'hover:opacity-80'
                      }`}
                    style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {t('obecnyObsah')}
                  </motion.button>
                </motion.div>
              </div>
            </FramerSection>

            {/* Historie aktivity */}
            <FramerSection
              animationType="slideInUp"
              delay={0.24}
            >
              <div
                className="glass-panel w-full p-6"
                style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
              >
                <Heading
                  level={3}
                  visual={2}
                  style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
                >
                  {t('historieAktivity')}
                </Heading>
                <FramerButton
                  onClick={() => onNavigateToScreen('activity-history')}
                  variant="ghost"
                  className="w-full p-4 text-left flex items-center gap-3"
                  style={{
                    backgroundColor: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                  }}
                >
                  <History size={20} style={{ color: themeColors?.textSecondary || (colorMode === 'dark' ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)') }} />
                  <div className="flex-1">
                    <p className="text-base font-medium" style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}>
                      {t('zobrazitHistorie')}
                    </p>
                    <p className="text-sm" style={{ color: themeColors?.textSecondary || (colorMode === 'dark' ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)') }}>
                      {t('meditace')}, {t('hudba')}, {t('dychanie')}
                    </p>
                  </div>
                </FramerButton>
              </div>
            </FramerSection>

            {/* Informace */}
            <FramerSection
              animationType="slideInUp"
              delay={0.25}
            >
              <div
                className="glass-panel w-full p-6"
                style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
              >
                <Heading
                  level={3}
                  visual={2}
                  style={{ color: themeColors?.text || (colorMode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)') }}
                >
                  {t('informacie')}
                </Heading>
                <p
                  className="text-lg leading-relaxed whitespace-pre-line"
                  style={{ color: themeColors?.textSecondary || (colorMode === 'dark' ? 'rgba(180, 180, 180, 1)' : 'rgba(100, 100, 100, 1)') }}
                >
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
