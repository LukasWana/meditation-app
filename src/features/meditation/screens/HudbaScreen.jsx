import React, { useMemo, useState, lazy, Suspense } from 'react';
import { FramerSection, FramerPageTransition, BackButton, BackgroundShader, FramerButton } from '@components';
import { AlbumGrid } from '../components';
import { useHudbaScreenData } from '../hooks';
import { useLanguage } from '@contexts/LanguageContext';
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

const HudbaScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gender = 'none',
  onPlayerStateChange
}) => {
  const { t } = useLanguage();
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

  // Debug: Zkontroluj, jaký shader se používá
  // Prioritizace: 1. transitionState, 2. barva z colorSettings, 3. shader z shaderSettings
  const colorOverride = getColorForSection('hudba');

  const currentShader = useMemo(() => {
    // Pokud je v transitionState něco kromě BLACK, použij to (může být barva __COLOR__ nebo shader)
    if (transitionState?.toShaderKey && transitionState.toShaderKey !== '__BLACK__') {
      return transitionState.toShaderKey;
    }

    // Pokud není v transitionState, zkontroluj barvu (má prioritu před shaderem)
    if (colorOverride) {
      return `__COLOR__${colorOverride}`;
    }

    // Jinak použij shader z settings (může být null pokud byla nastavena barva)
    const shader = getShaderForSection('hudba');
    return shader;
  }, [transitionState?.toShaderKey, colorOverride, getShaderForSection]);

  React.useEffect(() => {
    console.log('🎨 HudbaScreen: Shader info', {
      currentShader,
      transitionState: transitionState?.toShaderKey,
      shaderFromSettings: getShaderForSection('hudba'),
      colorFromSettings: getColorForSection('hudba'),
      isColorMode: currentShader && currentShader.startsWith('__COLOR__')
    });
  }, [currentShader, transitionState, getShaderForSection, getColorForSection]);

  // Hlavní logika pro data HudbaScreen
  const {
    hudbaItems,
    isLoading,
    error,
    stats,
    isLoadingCovers,
    isLoadingDurations,
    getDisplayDuration
  } = useHudbaScreenData();

  const overlayConfig = getOverlaySettings('hudba') || {};
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
    setOverlaySettingsForSection('hudba', { opacity: Number(numeric.toFixed(2)) });
  };

  const handleShaderIntensityChange = (event) => {
    const numeric = Number(event.target.value) / 100;
    setOverlaySettingsForSection('hudba', { intensity: Number(numeric.toFixed(2)) });
  };

  const handleBlendModeChange = (event) => {
    setOverlaySettingsForSection('hudba', { blendMode: event.target.value });
  };

  const updateSectionColor = (value) => {
    if (!value) {
      clearColorForSection('hudba');
      return;
    }
    setColorForSection('hudba', value);
  };

  const handleColorChange = (event) => {
    updateSectionColor(event.target.value);
  };

  const handleColorInput = (event) => {
    updateSectionColor(event.target.value);
  };

  const handleColorClear = () => {
    clearColorForSection('hudba');
  };

  const storedShader = getShaderForSection('hudba') || 'hudba';

  const handleShaderSelect = (shaderId) => {
    setShaderForSection('hudba', shaderId);
    const from = { shaderKey: transitionState?.toShaderKey || storedShader || '__BLACK__' };
    const to = { shaderKey: shaderId || '__BLACK__' };
    startTransition?.(from, to);
    setShowShaderPicker(false);
  };

  const handleItemClick = (item) => {
    // Ulož data o vybrané skladbě do localStorage pro přehrávač
    let audioData = null;

    if (item.type === 'album') {
      // Spusť první skladbu z alba
      if (item.tracks && item.tracks.length > 0) {
        const firstTrack = item.tracks[0];
        audioData = {
          audioSrc: firstTrack.audioSrc,
          title: firstTrack.trackName,
          fileName: firstTrack.fileName,
          albumCover: item.coverImage,
          albumTracks: item.tracks,
          currentTrackIndex: 0
        };
      }
    } else if (item.type === 'song' || item.audioSrc) {
      // Pro samostatné skladby - vytvoř "album" s jednou skladbou pro autoplay
      audioData = {
        ...item,
        albumCover: item.coverImage,
        albumTracks: [{
          audioSrc: item.audioSrc,
          trackName: item.title,
          fileName: item.fileName
        }],
        currentTrackIndex: 0
      };
    }

    // Ulož do localStorage a naviguj na stránku s přehrávačem
    if (audioData) {
      try {
        localStorage.setItem('meditation-app-active-audio-hudba', JSON.stringify(audioData));
        localStorage.setItem('meditation-app-previous-screen', 'hudba'); // Ulož, odkud jsme přišli
        localStorage.setItem('meditation-app-before-player-screen', 'hudba');
        onPlayerStateChange?.(true);
        onNavigateToScreen('audio-player-hudba'); // Naviguj na stránku s přehrávačem
      } catch (e) {
        console.error('Failed to save audio data:', e);
      }
    }
  };

  // Loading state - Hidden, show content immediately
  // if (isLoading) {
  //   return (
  //     <FramerPageTransition screenKey="hudba">
  //       <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
  //         <BackButton onClick={() => onNavigateToScreen('home')} />
  //         <div className="text-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
  //           <p className="text-xl text-gray-700">Načítám hudbu...</p>
  //         </div>
  //       </div>
  //     </FramerPageTransition>
  //   );
  // }

  // Error state
  if (error) {
    return (
      <FramerPageTransition screenKey="hudba">
        <div
          className="fixed inset-0 min-h-screen max-w-full"
          style={{
            zIndex: 0,
            backgroundColor: baseBackgroundColor
          }}
        />
        <BackgroundShader
          variant={currentShader}
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
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">Chyba při načítání</p>
            <p className="text-gray-700">{error}</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  return (
    <FramerPageTransition screenKey="hudba">
      {/* Vrstvení:
          - Pozadí (bg-[#f4ddc4]): zIndex 0 (nejnižší)
          - BackgroundShader: zIndex 1 (nad pozadím, pod obsahem)
          - Obsah: zIndex 10 (nad shaderem)
      */}
      {/* Pozadí stránky */}
      <div
        className="min-h-screen w-full max-w-full fixed inset-0"
        style={{
          zIndex: 0,
          backgroundColor: baseBackgroundColor
        }}
      />

      <BackgroundShader
        variant={currentShader}
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

      {/* Hlavní obsah stránky */}
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton
          onClick={() => onNavigateToScreen('home')}
        />

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('hudba')}
              </h1>
            </div>

            {/* Loading indikátory - Hidden */}
            {/* {(isLoadingCovers || isLoadingDurations) && (
              <div className="mt-4 text-sm text-gray-600">
                {isLoadingCovers && <div>🖼️ Načítám obrázky alb...</div>}
                {isLoadingDurations && <div>⏱️ Načítám délky skladeb...</div>}
              </div>
            )} */}
            {/* <p className="text-xl text-center text-gray-700 mb-8">
              hudobné meditácie a relaxačné zvuky
            </p> */}

            {/* Zobraz statistiky - ZAKOMENTOVÁNO */}
            {/* {stats && (
              <div className="text-center mb-8 p-4 bg-white/30 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Dostupné skladby: {stats.availableFiles} z {stats.totalFiles}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  Hudební meditace a relaxační zvuky
                </p>
                {stats.lastUpdated && (
                  <p className="text-xs text-gray-400">
                    Aktualizováno: {new Date(stats.lastUpdated).toLocaleTimeString('sk-SK')}
                  </p>
                )}
              </div>
            )} */}
          </FramerSection>

          <AlbumGrid
            hudbaItems={hudbaItems}
            activeAudio={null} // Není žádný aktivní audio na této stránce
            onItemClick={handleItemClick}
            getDisplayDuration={getDisplayDuration}
            isLoadingCovers={isLoadingCovers}
          />

        <FramerSection
          className="w-full flex justify-center mb-8"
          animationType="fadeIn"
          delay={0.4}
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
                    {storedShader}
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
                          selectedVariant={storedShader}
                          onSelect={handleShaderSelect}
                          section="hudba"
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

        {/* Duration Tests - pouze v development módu */}
      </div>
    </FramerPageTransition>
  );
};

export default HudbaScreen;