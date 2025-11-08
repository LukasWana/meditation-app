import React, { useState, useEffect, useRef, Suspense, lazy, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Image as ImageIcon } from 'lucide-react';
import { FramerButton, FramerSection, FramerPageTransition, BackButton, BackgroundShader, ShaderGallery } from '@components';
import CircularProgress from '@features/audio/components/CircularProgress';
import PlayPauseButton from '@features/audio/components/PlayPauseButton';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useBreathSounds } from '@hooks';
import { usePlayback } from '@contexts/ShaderPlaybackContext';

// Lazy loading modálů pro lepší performance
const WheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.WheelPickerModal })));
const DualWheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.DualWheelPickerModal })));
const SoundThemeGallery = lazy(() => import('@components/SoundThemeGallery'));

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

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPreparationTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const MetricButton = ({ label, value, onClick, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-left shadow-sm transition-all duration-200 ${
      disabled
        ? 'cursor-not-allowed opacity-50'
        : 'hover:-translate-y-1 hover:bg-white'
    }`}
  >
    <span className="block text-[0.68rem] uppercase tracking-[0.2em] text-gray-500">
      {label}
    </span>
    <span className="mt-1 block text-2xl font-light text-gray-800">
      {value}
    </span>
  </button>
);

const DychaniScreen = ({
  time,
  selectedDuration,
  isPlaying,
  breathPhase,
  breathInDuration,
  breathOutDuration,
  breathInSound,
  breathOutSound,
  breathClickSound,
  breathFinalSound,
  breathSoundFadeEnabled,
  onDurationChange,
  onPlayPause,
  onReset,
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onBreathSoundChange,
  onBreathRhythmChange,
  onPreparationTimeChange,
  isPreparing,
  preparationCountdown,
  preparationTime
}) => {
  const { t } = useLanguage();
  const {
    shaderSettings,
    getShaderForSection,
    getColorForSection,
    setColorForSection,
    clearColorForSection,
    getOverlaySettings,
    setOverlaySettingsForSection,
    setShaderForSection
  } = useShaderSettings();
  const { transitionState, startTransition } = usePlayback();

  // Získej shader pro sekci dýchání - reaguje na změny v nastavení
  const breathShader = useMemo(() => {
    return getShaderForSection('dychani') || shaderSettings?.dychani || 'dychani';
  }, [shaderSettings, getShaderForSection]);

  const [showGallery, setShowGallery] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showPreparationPicker, setShowPreparationPicker] = useState(false);
  const [showRhythmPicker, setShowRhythmPicker] = useState(false);
  const [breathCycleTime, setBreathCycleTime] = useState(0); // Čas v aktuálním cyklu dýchání (0 až breathInDuration + breathOutDuration)
  const [showBackgroundSettings, setShowBackgroundSettings] = useState(false);
  const [showShaderPicker, setShowShaderPicker] = useState(false);
  const [shaderCategory, setShaderCategory] = useState('built-in');

  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-current-screen', 'dychani');
      localStorage.setItem('meditation-app-previous-screen', 'dychani');
    } catch (e) {
      console.warn('⚠️ DychaniScreen: Failed to persist current screen', e);
    }
  }, []);

  // Použij hook pro přehrávání zvuků dýchání
  useBreathSounds(
    isPlaying,
    breathPhase,
    breathInSound || 'none',
    breathOutSound || 'none',
    breathClickSound || 'none',
    breathSoundFadeEnabled,
    breathInDuration,
    breathOutDuration
  );

  // Sledování času v cyklu dýchání - synchronizováno s fázemi
  const phaseStartTimeRef = useRef(Date.now());
  const previousPhaseRef = useRef(breathPhase);

  useEffect(() => {
    if (!isPlaying) {
      setBreathCycleTime(0);
      return;
    }

    // Pokud se změnila fáze, resetuj čas začátku fáze
    if (previousPhaseRef.current !== breathPhase) {
      phaseStartTimeRef.current = Date.now();
      previousPhaseRef.current = breathPhase;

      // Pokud začínáme nový cyklus (nádech), resetuj čas cyklu
      if (breathPhase === 'in') {
        setBreathCycleTime(0);
      } else {
        // Pokud začíná výdech, nastav čas na začátek výdechové části
        setBreathCycleTime(breathInDuration);
      }
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - phaseStartTimeRef.current) / 1000; // sekundy
      const cycleDuration = breathInDuration + breathOutDuration;

      if (breathPhase === 'in') {
        // Během nádechu: čas cyklu = elapsed (0 až breathInDuration)
        setBreathCycleTime(Math.min(elapsed, breathInDuration));
      } else {
        // Během výdechu: čas cyklu = breathInDuration + elapsed (breathInDuration až cycleDuration)
        setBreathCycleTime(Math.min(breathInDuration + elapsed, cycleDuration));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, breathPhase, breathInDuration, breathOutDuration]);

  // Vypočítat progress pro CircularProgress (0-100)
  const totalTime = selectedDuration * 60; // v sekundách
  const progress = totalTime > 0 ? ((totalTime - time) / totalTime) * 100 : 0;

  // Vypočítat progress pro rytmus dýchání (vnitřní kruhový ukazatel)
  const cycleDuration = breathInDuration + breathOutDuration;
  const breathRhythmProgress = isPlaying && cycleDuration > 0 ? (breathCycleTime / cycleDuration) * 100 : 0;
  const breathPhaseProgress = useMemo(() => {
    if (!isPlaying || cycleDuration <= 0) {
      return 0;
    }
    if (breathPhase === 'in') {
      const inhaleDuration = Math.max(breathInDuration, 0.001);
      return Math.min(breathCycleTime / inhaleDuration, 1);
    }
    const exhaleElapsed = Math.max(breathCycleTime - breathInDuration, 0);
    const exhaleDuration = Math.max(breathOutDuration, 0.001);
    return Math.min(exhaleElapsed / exhaleDuration, 1);
  }, [isPlaying, cycleDuration, breathPhase, breathCycleTime, breathInDuration, breathOutDuration]);

  // Pro výpočet, kde jsme v cyklu (nádech nebo výdech část)
  const inPhaseProgress = cycleDuration > 0 ? (breathInDuration / cycleDuration) * 100 : 50; // Procenta pro nádech část
  const minScale = 0.55;
  const maxScale = 1.45;
  const targetScale = useMemo(() => {
    if (!isPlaying) {
      return 1;
    }
    if (breathPhase === 'in') {
      return minScale + (maxScale - minScale) * breathPhaseProgress;
    }
    return maxScale - (maxScale - minScale) * breathPhaseProgress;
  }, [isPlaying, breathPhase, breathPhaseProgress]);
  const targetOpacity = useMemo(() => {
    if (!isPlaying) {
      return 0.8;
    }
    const progressFactor = breathPhase === 'in' ? breathPhaseProgress : 1 - breathPhaseProgress;
    return 0.65 + 0.35 * progressFactor;
  }, [isPlaying, breathPhase, breathPhaseProgress]);

  const colorOverride = getColorForSection('dychani');
  const overlayConfig = getOverlaySettings('dychani') || {};
  const shaderOpacity = Math.min(Math.max(overlayConfig.opacity ?? 0.75, 0), 1);
  const shaderIntensity = Math.min(Math.max(overlayConfig.intensity ?? 0.8, 0), 1);
  const blendMode = overlayConfig.blendMode || 'normal';
  const overlayBlendMode = BLEND_MODE_TO_CSS[blendMode] || 'normal';
  const baseBackgroundColor = colorOverride || '#f4ddc4';
  const overlayAlpha =
    blendMode === 'normal'
      ? (isPlaying ? 0.45 : 0.55)
      : 0.6;
  const overlayBackground = hexToRgba(baseBackgroundColor, overlayAlpha);
  const formattedTotalTime = totalTime > 0 ? formatTime(totalTime) : '00:00';
  const shaderOpacityPercent = Math.round(shaderOpacity * 100);
  const shaderIntensityPercent = Math.round(shaderIntensity * 100);
  const metricsDisabled = isPlaying;

  const handleShaderOpacityChange = (event) => {
    const numeric = Number(event.target.value) / 100;
    setOverlaySettingsForSection('dychani', { opacity: Number(numeric.toFixed(2)) });
  };

  const handleShaderIntensityChange = (event) => {
    const numeric = Number(event.target.value) / 100;
    setOverlaySettingsForSection('dychani', { intensity: Number(numeric.toFixed(2)) });
  };

  const handleBlendModeChange = (event) => {
    setOverlaySettingsForSection('dychani', { blendMode: event.target.value });
  };

  const handleBackgroundToggle = () => {
    setShowBackgroundSettings(prev => !prev);
  };

  const handleOpenShaderSelection = () => {
    setShowShaderPicker(true);
  };

  const updateSectionColor = (value) => {
    if (!value) {
      clearColorForSection('dychani');
      return;
    }
    setColorForSection('dychani', value);
  };

  const handleColorChange = (event) => {
    updateSectionColor(event.target.value);
  };

  const handleColorInput = (event) => {
    updateSectionColor(event.target.value);
  };

  const handleColorClear = () => {
    clearColorForSection('dychani');
  };

  const handleShaderSelect = (shaderId) => {
    setShaderForSection('dychani', shaderId);
    const from = { shaderKey: transitionState?.toShaderKey || breathShader || '__BLACK__' };
    const to = { shaderKey: shaderId || '__BLACK__' };
    startTransition(from, to);
    setShowShaderPicker(false);
  };

  // Debug logování
  useEffect(() => {
    if (isPlaying) {
      console.log('🔵 Breath Rhythm:', {
        breathPhase,
        breathCycleTime: breathCycleTime.toFixed(2),
        cycleDuration,
        breathRhythmProgress: breathRhythmProgress.toFixed(2),
        inPhaseProgress: inPhaseProgress.toFixed(2),
        breathInDuration,
        breathOutDuration
      });
    }
  }, [isPlaying, breathPhase, breathCycleTime, cycleDuration, breathRhythmProgress, inPhaseProgress, breathInDuration, breathOutDuration]);

  // Pokud probíhá příprava, zobraz odpočítávání přípravy
  if (isPreparing) {
    return (
      <FramerPageTransition screenKey="dychani">
        <div
          className="fixed inset-0 min-h-screen max-w-full"
          style={{
            zIndex: 0,
            backgroundColor: baseBackgroundColor
          }}
        />

        <BackgroundShader
          variant={breathShader}
          intensity={shaderIntensity}
          enabled={true}
          opacity={shaderOpacity}
          breathPhase={null}
          breathInDuration={breathInDuration}
          breathOutDuration={breathOutDuration}
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

          <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <FramerSection
              className="text-center mb-6"
              animationType="fadeIn"
              delay={0.1}
            >
              <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t('priprava')}
                </h1>
              </div>
              <div className="flex justify-center gap-2 mt-4 mb-4">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
            </FramerSection>

            <FramerSection
              className="mb-12"
              animationType="scaleIn"
              delay={0.2}
            >
              {/* CircularProgress pro přípravu */}
              <div className="relative flex-shrink-0 flex items-center justify-center">
                <CircularProgress
                  progress={preparationCountdown > 0 && preparationTime > 0 ? ((preparationTime - preparationCountdown) / preparationTime) * 100 : 0}
                  onSeek={null}
                  className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
                />

                {/* Odpočítávání v centru */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <motion.div
                    key={preparationCountdown}
                    className="text-6xl font-light text-black"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                  >
                    {preparationCountdown}
                  </motion.div>
                </div>
              </div>

              {/* Text pod odpočítáváním */}
              <div className="mt-6 text-center">
                <div className="text-black font-medium text-xl">
                  {t('pripravaNaDychanie')}
                </div>
              </div>
            </FramerSection>

            <FramerSection
              className="flex justify-center gap-6 mb-6"
              animationType="fadeIn"
              delay={0.3}
            >
              <FramerButton
                onClick={onPlayPause}
                variant="secondary"
                className="w-20 h-20 rounded-full flex items-center justify-center p-0"
              >
                <RotateCcw size={28} />
              </FramerButton>
            </FramerSection>
          </div>
        </div>
      </FramerPageTransition>
    );
  }
  return (
    <FramerPageTransition screenKey="dychani">
      {/* Vrstvení:
          - Pozadí (bg-[#f4ddc4]): zIndex 0 (nejnižší)
          - BackgroundShader: zIndex 1 (nad pozadím, pod obsahem)
          - Obsah: zIndex 10 (nad shaderem)
      */}
      {/* Pozadí stránky - pod shaderem - průhledné při přehrávání, aby shader prosvítal */}
      <div
        className="fixed inset-0 min-h-screen max-w-full"
        style={{
          zIndex: 0,
          backgroundColor: baseBackgroundColor
        }}
      />

      {/* BackgroundShader - zobraz pouze při přehrávání s plynulým prolnutím */}
      <BackgroundShader
        variant={breathShader}
        intensity={shaderIntensity}
        enabled={true}
        opacity={shaderOpacity}
        breathPhase={isPlaying ? breathPhase : null}
        breathInDuration={breathInDuration}
        breathOutDuration={breathOutDuration}
        zIndex={2}
      />

      {/* Jemný barevný overlay pro sjednocení se zbytkem UI */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          background: overlayBackground,
          mixBlendMode: overlayBlendMode,
          transition: 'background 0.6s ease, mix-blend-mode 0.6s ease'
        }}
      />

      {/* Hlavní obsah stránky - nad shaderem - průhledné pozadí, aby shader prosvítal */}
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-5xl font-light tracking-wide text-gray-900 sm:text-6xl">
              {t('dychani')}
            </h1>
            <div className="mt-5 flex flex-col items-center space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
                {t('dlzkaDychania')}
              </span>
              <span className="text-4xl font-light text-gray-800 sm:text-5xl">
                {formattedTotalTime}
              </span>
            </div>
          </FramerSection>

          <FramerSection
            className="mb-12"
            animationType="scaleIn"
            delay={0.2}
          >
            {/* Title a Duration nad CircularProgress */}
            <div className="mb-6 z-10 w-full flex flex-col items-center space-y-0">
              {/* Duration - Total Time */}
              {totalTime > 0 && (
                <div className="text-gray-600 text-center mb-2 text-lg">
                  {formatTime(totalTime)}
                </div>
              )}
              {/* Textový indikátor fáze dýchání */}
              {isPlaying && (
                <motion.p
                  key={breathPhase}
                  className="text-2xl font-light text-gray-600"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {breathPhase === 'in' ? t('nadech') : t('vydech')}
                </motion.p>
              )}
            </div>

            {/* CircularProgress s Play/Pause Button - stejný jako v přehrávači */}
            <div className="relative flex-shrink-0 flex items-center justify-center" style={{ isolation: 'isolate' }}>
              {/* Dýchací animace během meditace - SPODNÍ vrstva - pod kruhovým ukazatelem */}
              {isPlaying && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    zIndex: 0,
                    isolation: 'isolate',
                    transform: 'translateZ(0)' // Force hardware acceleration and create stacking context
                  }}
                >
                  {/* Animace s maskou - bílý kruh uprostřed, černý okolo, vycentrovaná na tlačítko */}
                  <motion.div
                    key={breathPhase}
                    className="rounded-full"
                    style={{
                      width: '45vw',
                      height: '45vw',
                      maxWidth: '350px',
                      maxHeight: '350px',
                      minWidth: '220px',
                      minHeight: '220px',
                      background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 25%, rgba(255,255,255,1) 25%, rgba(255,255,255,1) 100%)',
                      transformOrigin: 'center center',
                      position: 'absolute',
                      zIndex: 0,
                      willChange: 'transform, opacity' // Optimize animation performance
                    }}
                    initial={{
                      opacity: targetOpacity,
                      scale: targetScale
                    }}
                    animate={{
                      scale: targetScale,
                      opacity: targetOpacity
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.18,
                      ease: 'easeOut'
                    }}
                  />
                </div>
              )}

              {/* CircularProgress - nad animací - vytvoří nový stacking context s vyšším z-index */}
              <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate', transform: 'translateZ(0)' }}>
                <CircularProgress
                  progress={progress}
                  onSeek={null} // Pro meditaci nepotřebujeme seek
                  className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
                  style={{ position: 'relative', zIndex: 10 }}
                />
                {/* Vnitřní kruhový ukazatel pro rytmus dýchání - tenký černý */}
                {isPlaying && cycleDuration > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
                    <svg
                      className="w-[40vw] h-[40vw] max-w-[320px] max-h-[320px] min-w-[200px] min-h-[200px] transform -rotate-90"
                      viewBox="0 0 450 450"
                      style={{ aspectRatio: '1/1', position: 'absolute' }}
                    >
                      {/* Pozadí - celý kruh */}
                      <circle
                        cx="225"
                        cy="225"
                        r="200"
                        stroke="rgba(0,0,0,0.15)"
                        strokeWidth="6"
                        fill="none"
                      />
                      {/* Nádech část - zvýrazněná podle poměru */}
                      <circle
                        cx="225"
                        cy="225"
                        r="200"
                        stroke="rgba(0,0,0,0.4)"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 200 * (inPhaseProgress / 100)} ${2 * Math.PI * 200}`}
                        strokeDashoffset="0"
                        style={{ strokeLinecap: 'butt' }}
                      />
                      {/* Progress - aktuální pozice v cyklu - černý */}
                      <motion.circle
                        cx="225"
                        cy="225"
                        r="200"
                        stroke="black"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 200}`}
                        strokeDashoffset={`${2 * Math.PI * 200 * (1 - breathRhythmProgress / 100)}`}
                        style={{ strokeLinecap: 'round' }}
                        transition={{ duration: 0.1 }}
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Play/Pause Button - Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>
                <PlayPauseButton
                  isPlaying={isPlaying}
                  onToggle={onPlayPause}
                  className="w-[18vw] h-[18vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px] sm:w-[16vw] sm:h-[16vw] sm:max-w-[140px] sm:max-h-[140px] sm:min-w-[100px] sm:min-h-[100px]"
                />
              </div>
            </div>

            {/* Current Time Display - pod CircularProgress */}
            <div className="mt-6 text-center">
              <div className="text-black font-medium text-2xl">
                {formatTime(time)}
              </div>
            </div>
          </FramerSection>

          {!isPlaying && (
            <FramerSection
              className="mb-12"
              animationType="fadeIn"
              delay={0.3}
            >
              <div className="flex justify-center items-start gap-8 md:gap-12 mb-4">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowPreparationPicker(true)}
                    className="text-4xl md:text-5xl font-sans font-medium text-gray-800 hover:text-black transition-colors cursor-pointer mb-1"
                  >
                    {formatPreparationTime(preparationTime)}
                  </button>
                  <span className="text-base md:text-lg font-serif text-gray-800 font-light">
                    {t('priprava') || 'příprava'}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowDurationPicker(true)}
                    className="text-4xl md:text-5xl font-sans font-medium text-gray-800 hover:text-black transition-colors cursor-pointer mb-1"
                  >
                    {selectedDuration}
                  </button>
                  <span className="text-base md:text-lg font-serif text-gray-800 font-light">
                    {t('dlzkaDychania') || 'délka'}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowRhythmPicker(true)}
                    className="text-4xl md:text-5xl font-sans font-medium text-gray-800 hover:text-black transition-colors cursor-pointer mb-1"
                  >
                    {breathInDuration} : {breathOutDuration}
                  </button>
                  <span className="text-base md:text-lg font-serif text-gray-800 font-light">
                    {t('rytmus') || 'rytmus'}
                  </span>
                </div>
              </div>

              {(showDurationPicker || showGallery || showPreparationPicker || showRhythmPicker) && (
                <Suspense fallback={null}>
                  {showPreparationPicker && (
                    <WheelPickerModal
                      isOpen={showPreparationPicker}
                      onClose={() => setShowPreparationPicker(false)}
                      value={preparationTime}
                      onChange={(value) => {
                        onPreparationTimeChange?.(value);
                      }}
                      min={0}
                      max={60}
                      step={1}
                      label={t('sekund')}
                      title={t('priprava') || 'příprava'}
                    />
                  )}

                  {showDurationPicker && (
                    <WheelPickerModal
                      isOpen={showDurationPicker}
                      onClose={() => setShowDurationPicker(false)}
                      value={selectedDuration}
                      onChange={onDurationChange}
                      min={1}
                      max={60}
                      step={1}
                      label={t('dlzkaDychania')}
                      title={t('dlzkaDychania')}
                    />
                  )}

                  {showRhythmPicker && (
                    <DualWheelPickerModal
                      isOpen={showRhythmPicker}
                      onClose={() => setShowRhythmPicker(false)}
                      leftValue={breathInDuration}
                      rightValue={breathOutDuration}
                      onChange={(inValue, outValue) => {
                        onBreathRhythmChange?.(inValue, outValue);
                      }}
                      leftLabel={t('nadech') || 'nádech'}
                      rightLabel={t('vydech') || 'výdech'}
                      leftMin={1}
                      leftMax={20}
                      leftStep={1}
                      rightMin={1}
                      rightMax={20}
                      rightStep={1}
                      title={t('rytmusDychania') || 'rytmus dýchání'}
                    />
                  )}
                </Suspense>
              )}
            </FramerSection>
          )}

          <FramerSection
            className="flex justify-center gap-6 mb-6"
            animationType="fadeIn"
            delay={0.4}
          >
            <FramerButton
              onClick={onReset}
              variant="secondary"
              className="w-20 h-20 rounded-full flex items-center justify-center p-0"
            >
              <RotateCcw size={28} />
            </FramerButton>
            <FramerButton
              onClick={() => setShowGallery(true)}
              variant="secondary"
              className="w-20 h-20 rounded-full flex items-center justify-center p-0"
            >
              <ImageIcon size={28} />
            </FramerButton>
          </FramerSection>

          <FramerSection
            className="w-full flex justify-center mb-8"
            animationType="fadeIn"
            delay={0.45}
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
                      {breathShader}
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
                        <ShaderGallery
                          selectedVariant={breathShader}
                          onSelect={handleShaderSelect}
                          section="dychani"
                          category={shaderCategory}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Galerie zvukových témat */}
        {(showDurationPicker || showGallery) && (
          <Suspense fallback={null}>
            {showGallery && (
              <SoundThemeGallery
                isOpen={showGallery}
                onClose={() => setShowGallery(false)}
                onSelectSound={onBreathSoundChange}
                selectedInSound={breathInSound}
                selectedOutSound={breathOutSound}
                selectedClickSound={breathClickSound}
                selectedFinalSound={breathFinalSound}
              />
            )}
          </Suspense>
        )}
      </div>

      <AnimatePresence>
        {showShaderPicker && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-4xl rounded-3xl border border-black/15 bg-white/90 p-6 shadow-2xl backdrop-blur"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Vyberte shader</h3>
                <FramerButton
                  onClick={() => setShowShaderPicker(false)}
                  variant="ghost"
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em]"
                >
                  Zavřít
                </FramerButton>
              </div>

              <div className="mt-4 flex gap-2">
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

              <div className="mt-6 max-h-[60vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-4">
                <ShaderGallery
                  selectedVariant={breathShader}
                  onSelect={handleShaderSelect}
                  section="dychani"
                  category={shaderCategory}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FramerPageTransition>
  );
};

export default DychaniScreen;
