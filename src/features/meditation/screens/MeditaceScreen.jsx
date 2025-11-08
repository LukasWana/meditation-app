import React, { useMemo, useEffect, useState, lazy, Suspense } from 'react';
import { FramerButton, FramerSection, FramerPageTransition, BackButton, BackgroundShader } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useRealtimeMeditaceFilter } from '@hooks/useRealtimeMeditaceFilter';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { AnimatePresence, motion } from 'framer-motion';

const ShaderGallery = lazy(() => import('@components/ShaderGallery'));

const BLEND_MODE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'shines', label: 'Shines' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

const BLEND_MODE_TO_CSS = {
  normal: 'normal',
  overlay: 'overlay',
  multiply: 'multiply',
  shines: 'screen',
  light: 'lighten',
  dark: 'darken'
};

const hexToRgba = (hex, alpha = 1) => {
  if (!hex) {
    return `rgba(244, 221, 196, ${alpha})`;
  }

  let normalized = hex.trim();
  if (normalized.startsWith('#')) {
    normalized = normalized.slice(1);
  }
  if (normalized.length === 3) {
    normalized = normalized.split('').map(char => `${char}${char}`).join('');
  }

  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const STORAGE_KEY = 'meditation-app-active-audio-meditace';

const MeditaceScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gender = 'none',
  onPlayerStateChange
}) => {
  const { t, language } = useLanguage();
  const {
    getShaderForSection,
    getColorForSection,
    setColorForSection,
    clearColorForSection,
    setShaderForSection,
    getOverlaySettings,
    setOverlaySettingsForSection
  } = useShaderSettings();
  const { transitionState, startTransition } = usePlayback();

  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-current-screen', 'meditace');
      localStorage.setItem('meditation-app-previous-screen', 'meditace');
    } catch (e) {
      console.warn('⚠️ MeditaceScreen: Failed to persist current screen', e);
    }
  }, []);

  console.log(`🔍 MeditaceScreen - Current language: ${language}`);
  console.log(`🔍 MeditaceScreen - Current gender: ${gender}`);

  const normalizedLanguage = useMemo(() => language.toLowerCase(), [language]);

  const { meditaceItems, isLoading, error } = useRealtimeMeditaceFilter(gender, normalizedLanguage);

  const colorOverride = getColorForSection('meditace');
  const overlayConfig = getOverlaySettings('meditace') || {};
  const shaderOpacity = Math.min(Math.max(overlayConfig.opacity ?? 0.75, 0), 1);
  const shaderIntensity = Math.min(Math.max(overlayConfig.intensity ?? 0.8, 0), 1);
  const blendMode = overlayConfig.blendMode || 'normal';
  const overlayBlendMode = BLEND_MODE_TO_CSS[blendMode] || 'normal';
  const baseBackgroundColor = colorOverride || '#f4ddc4';
  const overlayAlpha = blendMode === 'normal' ? 0.55 : 0.6;
  const overlayBackground = hexToRgba(baseBackgroundColor, overlayAlpha);
  const shaderOpacityPercent = Math.round(shaderOpacity * 100);
  const shaderIntensityPercent = Math.round(shaderIntensity * 100);

  const [showBackgroundSettings, setShowBackgroundSettings] = useState(false);
  const [showShaderPicker, setShowShaderPicker] = useState(false);
  const [shaderCategory, setShaderCategory] = useState('built-in');

  const meditaceShader = useMemo(() => {
    return getShaderForSection('meditace') || 'meditace';
  }, [getShaderForSection, transitionState?.toShaderKey]);

  const handleBackgroundToggle = () => {
    setShowBackgroundSettings(prev => {
      if (prev && showShaderPicker) {
        setShowShaderPicker(false);
      }
      return !prev;
    });
  };

  const handleOpenShaderSelection = () => {
    setShowShaderPicker(true);
  };

  const handleShaderOpacityChange = (event) => {
    const numeric = Number(event.target.value) / 100;
    setOverlaySettingsForSection('meditace', { opacity: Number(numeric.toFixed(2)) });
  };

  const handleShaderIntensityChange = (event) => {
    const numeric = Number(event.target.value) / 100;
    setOverlaySettingsForSection('meditace', { intensity: Number(numeric.toFixed(2)) });
  };

  const handleBlendModeChange = (event) => {
    setOverlaySettingsForSection('meditace', { blendMode: event.target.value });
  };

  const updateSectionColor = (value) => {
    if (!value) {
      clearColorForSection('meditace');
      return;
    }
    setColorForSection('meditace', value);
  };

  const handleColorChange = (event) => {
    updateSectionColor(event.target.value);
  };

  const handleColorInput = (event) => {
    updateSectionColor(event.target.value);
  };

  const handleColorClear = () => {
    clearColorForSection('meditace');
  };

  const handleShaderSelect = (shaderId) => {
    setShaderForSection('meditace', shaderId);
    const from = { shaderKey: transitionState?.toShaderKey || meditaceShader || '__BLACK__' };
    const to = { shaderKey: shaderId || '__BLACK__' };
    startTransition?.(from, to);
    setShowShaderPicker(false);
  };

  console.log(`🔍 MeditaceScreen - meditaceItems:`, meditaceItems);
  console.log(`🔍 MeditaceScreen - isLoading:`, isLoading);
  console.log(`🔍 MeditaceScreen - error:`, error);

  const handleItemClick = (item) => {
    const audioSrc = item.audioSrc || item.fileName;
    if (!audioSrc) {
      console.warn('⚠️ MeditaceScreen: Item nemá audioSrc ani fileName', item);
      return;
    }

    const payload = {
      audioSrc,
      title: item.title,
      fileName: item.fileName || item.audioSrc,
      albumTracks: [{
        audioSrc,
        trackName: item.title,
        fileName: item.fileName || item.audioSrc
      }],
      currentTrackIndex: 0,
      allFiles: item.allFiles || []
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem('meditation-app-previous-screen', 'meditace');
      localStorage.setItem('meditation-app-before-player-screen', 'meditace');
    } catch (e) {
      console.error('❌ MeditaceScreen: Failed to persist active audio', e);
    }

    onPlayerStateChange?.(true);
    onNavigateToScreen('audio-player-meditace');
  };

  if (isLoading) {
    return (
      <FramerPageTransition screenKey="meditace">
        <div
          className="fixed inset-0 min-h-screen max-w-full"
          style={{
            zIndex: 0,
            backgroundColor: baseBackgroundColor
          }}
        />
        <BackgroundShader
          variant={meditaceShader}
          intensity={shaderIntensity}
          enabled={true}
          opacity={shaderOpacity}
          zIndex={2}
        />
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 3,
            background: overlayBackground,
            mixBlendMode: overlayBlendMode,
            transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
          }}
        />
        <div className="min-h-screen w-full max-w-full flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative" style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}>
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center mt-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
            <p className="text-xl text-gray-700">{t('nacitamMeditace') || 'Načítám meditace...'}</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  if (error) {
    return (
      <FramerPageTransition screenKey="meditace">
        <div
          className="fixed inset-0 min-h-screen max-w-full"
          style={{
            zIndex: 0,
            backgroundColor: baseBackgroundColor
          }}
        />
        <BackgroundShader
          variant={meditaceShader}
          intensity={shaderIntensity}
          enabled={true}
          opacity={shaderOpacity}
          zIndex={2}
        />
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 3,
            background: overlayBackground,
            mixBlendMode: overlayBlendMode,
            transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
          }}
        />
        <div className="min-h-screen w-full max-w-full flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative" style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}>
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center mt-10">
            <p className="text-xl text-red-600 mb-4">{t('chybaPriNacitani') || 'Chyba při načítání'}</p>
            <p className="text-gray-700">{error}</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  return (
    <FramerPageTransition screenKey="meditace">
      <div
        className="fixed inset-0 min-h-screen max-w-full"
        style={{
          zIndex: 0,
          backgroundColor: baseBackgroundColor
        }}
      />

      <BackgroundShader
        variant={meditaceShader}
        intensity={shaderIntensity}
        enabled={true}
        opacity={shaderOpacity}
        zIndex={2}
      />

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          background: overlayBackground,
          mixBlendMode: overlayBlendMode,
          transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
        }}
      />

      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('meditace')}
              </h1>
            </div>
            <p className="text-xl text-center text-gray-700 mb-8">
              {t('mluvene')}
            </p>
          </FramerSection>

          <div className="space-y-4">
            {meditaceItems.length === 0 ? (
              <div className="text-center py-8 bg-white/50 rounded-3xl border border-black/10 backdrop-blur">
                <p className="text-gray-600 text-lg">{t('zadneMeditace') || 'Žiadne meditácie nie sú dostupné'}</p>
                <p className="text-gray-500 text-sm mt-2">{t('zkusteZmenitNastaveni') || 'Skúste zmeniť nastavenia v menu'}</p>
              </div>
            ) : (
              meditaceItems.map((item, idx) => (
                <FramerSection
                  key={item.key || idx}
                  animationType="slideInUp"
                  delay={0.2 + idx * 0.1}
                >
                  <FramerButton
                    variant="ghost"
                    className="w-full p-6 text-left bg-white/60 backdrop-blur rounded-3xl border border-black/10 transition-all duration-200 hover:-translate-y-1"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-light text-gray-900">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xl font-light text-gray-500">
                          {item.duration}
                        </span>
                      </div>
                    </div>
                  </FramerButton>
                </FramerSection>
              ))
            )}
          </div>

          <FramerSection
            className="w-full flex justify-center mt-10 mb-6"
            animationType="fadeIn"
            delay={0.35}
          >
            <FramerButton
              onClick={handleBackgroundToggle}
              variant="ghost"
              className="rounded-full border border-black/15 bg-white/70 px-6 py-3 text-xs uppercase tracking-[0.25em]"
            >
              {showBackgroundSettings ? 'Zavřít nastavení pozadí' : 'Změnit pozadí'}
            </FramerButton>
          </FramerSection>

          <AnimatePresence>
            {showBackgroundSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="mx-auto max-w-xl space-y-5 rounded-3xl border border-black/10 bg-white/80 p-6 shadow-lg backdrop-blur">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Barva</span>
                    <input
                      type="color"
                      value={colorOverride || '#f4ddc4'}
                      onChange={handleColorChange}
                      onInput={handleColorInput}
                      className="h-10 w-16 cursor-pointer rounded-lg border border-black/10 bg-white shadow-sm focus:outline-none"
                    />
                    <FramerButton
                      onClick={handleColorClear}
                      variant="ghost"
                      className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs uppercase tracking-[0.2em]"
                    >
                      Reset
                    </FramerButton>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Shader</span>
                    <FramerButton
                      onClick={handleOpenShaderSelection}
                      variant="ghost"
                      className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs uppercase tracking-[0.2em]"
                    >
                      {showShaderPicker ? 'Skrýt shadery' : 'Vybrat shader'}
                    </FramerButton>
                    <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
                      {meditaceShader}
                    </span>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-500">
                      <span>Průhlednost shaderu</span>
                      <span>{shaderOpacityPercent}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={shaderOpacityPercent}
                      onChange={handleShaderOpacityChange}
                      className="mt-2 w-full accent-black"
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-500">
                      <span>Intenzita shaderu</span>
                      <span>{shaderIntensityPercent}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={shaderIntensityPercent}
                      onChange={handleShaderIntensityChange}
                      className="mt-2 w-full accent-black"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-gray-500">
                      Efekt
                    </label>
                    <select
                      value={blendMode}
                      onChange={handleBlendModeChange}
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    >
                      {BLEND_MODE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <AnimatePresence>
                    {showShaderPicker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 p-4"
                      >
                        <div className="mb-3 flex gap-2">
                          <FramerButton
                            onClick={() => setShaderCategory('built-in')}
                            variant={shaderCategory === 'built-in' ? 'primary' : 'ghost'}
                            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]"
                          >
                            Vestavěné
                          </FramerButton>
                          <FramerButton
                            onClick={() => setShaderCategory('shaders')}
                            variant={shaderCategory === 'shaders' ? 'primary' : 'ghost'}
                            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]"
                          >
                            Shadery
                          </FramerButton>
                        </div>
                        <Suspense fallback={null}>
                          <ShaderGallery
                            selectedVariant={meditaceShader}
                            onSelect={handleShaderSelect}
                            section="meditace"
                            category={shaderCategory}
                          />
                        </Suspense>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default MeditaceScreen;
