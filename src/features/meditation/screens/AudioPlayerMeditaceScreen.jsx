import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { FramerPageTransition, BackgroundShader, FramerButton } from '@components';
import { AudioPlayer } from '@features/audio';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useAudioAnalysis } from '@contexts/AudioAnalysisContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { shouldUseDarkMode } from '@utils/colorUtils';
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

const AudioPlayerMeditaceScreen = ({
  onNavigateToScreen,
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
  const { audioData } = useAudioAnalysis();
  const { transitionState, startTransition } = usePlayback();

  const [activeAudio, setActiveAudio] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load activeAudio for meditace from localStorage:', e);
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-current-screen', 'audio-player-meditace');
    } catch (error) {
      console.warn('⚠️ AudioPlayerMeditaceScreen: Failed to persist current screen', error);
    }

    if (activeAudio) {
      onPlayerStateChange?.(true);
    }
  }, [activeAudio, onPlayerStateChange]);

  const getPreviousScreen = useCallback(() => {
    try {
      return localStorage.getItem('meditation-app-previous-screen') || 'meditace';
    } catch (error) {
      console.warn('⚠️ AudioPlayerMeditaceScreen: Failed to read previous screen', error);
      return 'meditace';
    }
  }, []);

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

  // const handleBackgroundToggle = () => {
  //   setShowBackgroundSettings(prev => {
  //     if (prev && showShaderPicker) {
  //       setShowShaderPicker(false);
  //     }
  //     return !prev;
  //   });
  // };

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

  const currentShader = useMemo(() => {
    if (transitionState?.toShaderKey && transitionState.toShaderKey !== '__BLACK__') {
      return transitionState.toShaderKey;
    }

    if (colorOverride) {
      return `__COLOR__${colorOverride}`;
    }

    const shader = getShaderForSection('meditace');
    if (shader) {
      return shader;
    }

    return 'default';
  }, [transitionState?.toShaderKey, colorOverride, getShaderForSection]);

  const storedShader = getShaderForSection('meditace') || 'meditace';

  const handleShaderSelect = (shaderId) => {
    setShaderForSection('meditace', shaderId);
    const from = { shaderKey: transitionState?.toShaderKey || storedShader || '__BLACK__' };
    const to = { shaderKey: shaderId || '__BLACK__' };
    startTransition?.(from, to);
    setShowShaderPicker(false);
  };

  const handleCloseAudio = () => {
    try {
      setActiveAudio(null);
      localStorage.removeItem(STORAGE_KEY);
      onPlayerStateChange?.(false);
      onNavigateToScreen(getPreviousScreen());
    } catch (e) {
      console.error('Failed to clear meditace active audio:', e);
    }
  };

  const handleTrackChange = (newIndex) => {
    if (activeAudio?.albumTracks && activeAudio.albumTracks[newIndex]) {
      const track = activeAudio.albumTracks[newIndex];
      const updatedAudio = {
        ...activeAudio,
        audioSrc: track.audioSrc,
        title: track.trackName,
        fileName: track.fileName,
        currentTrackIndex: newIndex
      };
      setActiveAudio(updatedAudio);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAudio));
      } catch (e) {
        console.error('Failed to persist meditace track change:', e);
      }
    }
  };

  const isColorMode = currentShader && currentShader.startsWith('__COLOR__');
  const backgroundColor = isColorMode ? currentShader.replace('__COLOR__', '') : null;
  const overlayColor = colorOverride;

  const blendedOverlayColor = useMemo(() => {
    if (overlayColor) {
      return overlayColor;
    }
    if (backgroundColor) {
      return backgroundColor;
    }
    // Jemný béžový filtr pro sjednocení se základní paletou
    return 'rgba(244, 221, 196, 0.55)';
  }, [overlayColor, backgroundColor]);

  const isDarkMode = useMemo(() => {
    const colorForDarkMode = overlayColor || backgroundColor;
    return shouldUseDarkMode(currentShader, colorForDarkMode);
  }, [currentShader, backgroundColor, overlayColor]);

  useEffect(() => {
    if (!activeAudio) {
      onPlayerStateChange?.(false);
      onNavigateToScreen(getPreviousScreen());
    }
  }, [activeAudio, onNavigateToScreen, getPreviousScreen, onPlayerStateChange]);

  if (!activeAudio) {
    return null;
  }

  return (
    <FramerPageTransition screenKey='audio-player-meditace' animation="fade">
      <div
        className='min-h-screen w-full max-w-full fixed inset-0'
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
        audioData={audioData}
        forceSquare={currentShader?.startsWith('shader-') ? true : null}
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

      <AudioPlayer
        sectionKey="meditace"
        audioSrc={activeAudio.audioSrc}
        title={activeAudio.title}
        onClose={handleCloseAudio}
        albumTracks={activeAudio.albumTracks}
        currentTrackIndex={activeAudio.currentTrackIndex}
        onTrackChange={handleTrackChange}
        allFiles={activeAudio.allFiles || []}
        autoplayEnabled={true}
        className='pointer-events-auto'
        isDarkMode={isDarkMode}
        backgroundColor={blendedOverlayColor}
        onNavigateToScreen={onNavigateToScreen}
      />

      {/* <div className="pointer-events-none fixed bottom-8 left-0 right-0 flex justify-center z-50">
        <FramerButton
          onClick={handleBackgroundToggle}
          variant="ghost"
          className="pointer-events-auto rounded-full border border-black/20 bg-white/75 px-6 py-3 text-xs uppercase tracking-[0.25em] shadow-lg backdrop-blur"
        >
          {showBackgroundSettings ? 'Zavřít nastavení pozadí' : 'Změnit pozadí'}
        </FramerButton>
      </div> */}

      <AnimatePresence>
        {showBackgroundSettings && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 px-4 pb-8 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pointer-events-auto w-full max-w-xl rounded-3xl border border-black/10 bg-white/85 p-6 shadow-2xl backdrop-blur"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium tracking-[0.3em] uppercase text-gray-600">
                  {t('nastaveniPozadi') || 'Nastavení pozadí'}
                </h3>
                <FramerButton
                  onClick={() => setShowBackgroundSettings(false)}
                  variant="ghost"
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs uppercase tracking-[0.2em]"
                >
                  Zavřít
                </FramerButton>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-4">
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

              <div className="flex flex-wrap items-center gap-3 mb-4">
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

              <div className="mb-4">
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

              <div className="mb-4">
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

              <div className="mb-4">
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
                        section="meditace"
                        category={shaderCategory}
                      />
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FramerPageTransition>
  );
};

export default AudioPlayerMeditaceScreen;

