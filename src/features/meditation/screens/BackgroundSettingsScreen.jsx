import React, { useState, useMemo, lazy, Suspense } from 'react';
import { FramerPageTransition, BackButton, FramerButton, BackgroundShader } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdaptiveTextColors } from '@hooks';

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

const DEFAULT_CATEGORIES = [
  { key: 'built-in', label: 'Vestavěné' },
  { key: 'shaders', label: 'Shadery' }
];

const BackgroundSettingsScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  section = 'hudba'
}) => {
  const { t } = useLanguage();
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [shaderCategory, setShaderCategory] = useState(DEFAULT_CATEGORIES[0]?.key ?? 'built-in');

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

  const colorOverride = getColorForSection(section);
  const overlaySettings = getOverlaySettings(section) || {};
  const shaderOpacityPercent = Math.round((overlaySettings.opacity ?? 0.75) * 100);
  const shaderIntensityPercent = Math.round((overlaySettings.intensity ?? 0.8) * 100);
  const blendMode = overlaySettings.blendMode || 'normal';

  const selectedShader = useMemo(
    () => getShaderForSection(section) || section,
    [getShaderForSection, section]
  );

  const defaultColor = '#f4ddc4';
  const colorValue = colorOverride || defaultColor;

  // Urči, zda je shader pouze barva
  const isColorOnly = useMemo(() => {
    return !selectedShader ||
           selectedShader === 'default' ||
           selectedShader.startsWith('__COLOR__');
  }, [selectedShader]);

  // Získej barvu pro pozadí (pokud je shader barva, použij ji, jinak použij colorValue)
  const baseBackgroundColor = useMemo(() => {
    if (selectedShader?.startsWith('__COLOR__')) {
      return selectedShader.replace('__COLOR__', '');
    }
    return colorValue;
  }, [selectedShader, colorValue]);

  // Použij adaptivní barvy textů
  const textColors = useAdaptiveTextColors(baseBackgroundColor, selectedShader);

  // Overlay settings
  const overlayBlendMode = BLEND_MODE_TO_CSS[blendMode] || 'normal';
  const overlayAlpha = blendMode === 'normal' ? 0.55 : 0.6;
  const overlayBackground = useMemo(() => {
    return hexToRgba(baseBackgroundColor, overlayAlpha);
  }, [baseBackgroundColor, overlayAlpha]);

  // Získej cílovou obrazovku na základě sekce
  const getTargetScreen = () => {
    const previousScreen = localStorage.getItem('meditation-app-previous-screen') || '';

    if (previousScreen === 'audio-player-hudba') {
      return 'audio-player-hudba';
    }
    if (previousScreen === 'audio-player-meditace') {
      return 'audio-player-meditace';
    }

    const screenMap = {
      'hudba': 'hudba',
      'meditace': 'meditace',
      'dychani': 'dychani'
    };
    return screenMap[section] || 'hudba';
  };

  const handleColorChange = (value) => {
    if (!value) {
      clearColorForSection(section);
      return;
    }
    setColorForSection(section, value);
  };

  const handleShaderOpacityChange = (event) => {
    const numeric = Number(event.target.value) / 100;
    setOverlaySettingsForSection(section, { opacity: Number(numeric.toFixed(2)) });
  };

  const handleShaderIntensityChange = (event) => {
    const numeric = Number(event.target.value) / 100;
    setOverlaySettingsForSection(section, { intensity: Number(numeric.toFixed(2)) });
  };

  const handleBlendModeChange = (event) => {
    setOverlaySettingsForSection(section, { blendMode: event.target.value });
  };

  const handleShaderSelect = (shaderId) => {
    const fromKey = transitionState?.toShaderKey || selectedShader || '__BLACK__';
    setShaderForSection(section, shaderId);
    startTransition?.({ shaderKey: fromKey }, { shaderKey: shaderId || '__BLACK__' });
    setIsGalleryVisible(false);
  };

  const sectionLabel = t(section) || section;

  return (
    <FramerPageTransition screenKey="background-settings">
      {/* Vrstvení:
          - Pozadí (barva): zIndex 0 (nejnižší)
          - BackgroundShader: zIndex 1 (nad pozadím, pod obsahem)
          - Obsah: zIndex 10 (nad shaderem)
      */}
      {/* Pozadí stránky - barva */}
      <div
        className="fixed max-w-full"
        style={{
          zIndex: 0,
          backgroundColor: baseBackgroundColor,
          transition: 'background-color 0.3s ease',
          top: 0,
          left: 0,
          right: 0,
          bottom: '-20px',
          height: 'calc(100dvh + 20px)'
        }}
      />

      {/* BackgroundShader - zobraz pouze pokud není pouze barva */}
      {!isColorOnly && (
        <BackgroundShader
          variant={selectedShader}
          intensity={overlaySettings.intensity ?? 0.8}
          enabled={true}
          opacity={overlaySettings.opacity ?? 0.75}
          zIndex={2}
        />
      )}

      {/* Overlay s blend mode */}
      {!isColorOnly && (
        <div
          className="fixed pointer-events-none"
          style={{
            zIndex: 3,
            top: 0,
            left: 0,
            right: 0,
            bottom: '-20px',
            height: 'calc(100dvh + 20px)',
            background: overlayBackground,
            mixBlendMode: overlayBlendMode,
            transition: 'background 0.3s ease, mix-blend-mode 0.3s ease'
          }}
        />
      )}

      {/* Hlavní obsah stránky */}
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => {
          const targetScreen = getTargetScreen();
          onNavigateToScreen(targetScreen);
        }} />

        <div className="max-w-2xl w-full mt-20">
          <h1 className={`text-4xl font-light text-center mb-8 ${textColors.heading}`}>
            {t('zmenitPozadi') || 'Změnit pozadí'} - {sectionLabel}
          </h1>

          <div className={`mx-auto max-w-xl space-y-5 rounded-3xl border ${textColors.border} ${textColors.bgCard} p-6 shadow-lg backdrop-blur`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-sm font-medium ${textColors.label}`}>Barva</span>
              <input
                type="color"
                value={colorValue}
                onChange={(event) => handleColorChange(event.target.value)}
                onInput={(event) => handleColorChange(event.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-black/10 bg-white shadow-sm focus:outline-none"
              />
              <FramerButton
                onClick={() => clearColorForSection(section)}
                variant="ghost"
                className={`rounded-full border ${textColors.border} ${textColors.bgCard} px-3 py-1.5 text-xs uppercase tracking-[0.2em] ${textColors.primary}`}
              >
                Reset
              </FramerButton>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-sm font-medium ${textColors.label}`}>Shader</span>
              <FramerButton
                onClick={() => setIsGalleryVisible(prev => !prev)}
                variant="ghost"
                className={`rounded-full border ${textColors.border} ${textColors.bgCard} px-4 py-2 text-xs uppercase tracking-[0.2em] ${textColors.primary}`}
              >
                {isGalleryVisible ? 'Skrýt shadery' : 'Vybrat shader'}
              </FramerButton>
              <span className={`text-xs uppercase tracking-[0.3em] ${textColors.muted}`}>
                {selectedShader}
              </span>
            </div>

            <div>
              <label className={`flex items-center justify-between text-xs uppercase tracking-[0.3em] ${textColors.muted}`}>
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
                className={`mt-2 w-full ${textColors.isDark ? 'accent-white' : 'accent-black'}`}
              />
            </div>

            <div>
              <label className={`flex items-center justify-between text-xs uppercase tracking-[0.3em] ${textColors.muted}`}>
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
                className={`mt-2 w-full ${textColors.isDark ? 'accent-white' : 'accent-black'}`}
              />
            </div>

            <div>
              <label className={`mb-2 block text-xs uppercase tracking-[0.3em] ${textColors.muted}`}>
                Efekt
              </label>
              <select
                value={blendMode}
                onChange={handleBlendModeChange}
                className={`w-full rounded-2xl border ${textColors.border} ${textColors.bgCard} px-3 py-2 text-sm focus:outline-none focus:ring-2 ${textColors.isDark ? 'focus:ring-white/20' : 'focus:ring-black/10'} ${textColors.primary}`}
                style={{
                  color: textColors.isDark ? '#ffffff' : '#000000',
                  backgroundColor: textColors.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)'
                }}
              >
                {BLEND_MODE_OPTIONS.map(option => (
                  <option
                    key={option.value}
                    value={option.value}
                    style={{
                      color: textColors.isDark ? '#ffffff' : '#000000',
                      backgroundColor: textColors.isDark ? '#1a1a1a' : '#ffffff'
                    }}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence>
              {isGalleryVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`overflow-hidden rounded-2xl border ${textColors.border} ${textColors.bgCard} p-4`}
                >
                  <div className="mb-3 flex gap-2">
                    {DEFAULT_CATEGORIES.map(({ key, label }) => (
                      <FramerButton
                        key={key}
                        onClick={() => setShaderCategory(key)}
                        variant={shaderCategory === key ? 'primary' : 'ghost'}
                        className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]"
                      >
                        {label}
                      </FramerButton>
                    ))}
                  </div>
                  <Suspense fallback={null}>
                    <ShaderGallery
                      selectedVariant={selectedShader}
                      onSelect={handleShaderSelect}
                      section={section}
                      category={shaderCategory}
                    />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default BackgroundSettingsScreen;

