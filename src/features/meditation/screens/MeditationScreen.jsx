import React, { useState, useEffect, useRef, Suspense, lazy, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Image as ImageIcon } from 'lucide-react';
import { FramerButton, FramerSection, FramerPageTransition, BackButton, BackgroundShader } from '@components';
import CircularProgress from '@features/audio/components/CircularProgress';
import PlayPauseButton from '@features/audio/components/PlayPauseButton';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useBreathSounds, useAdaptiveTextColors, useCountdownSound, useFinalSound } from '@hooks';
import BackgroundSettingsControls from '@features/meditation/components/BackgroundSettingsControls';

// Lazy loading modálů pro lepší performance
const WheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.WheelPickerModal })));
const DualWheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.DualWheelPickerModal })));
const SoundThemeGallery = lazy(() => import('@components/SoundThemeGallery'));

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
  breathCountdownSound,
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
    getOverlaySettings
  } = useShaderSettings();

  // Získej shader pro sekci dýchání - reaguje na změny v nastavení
  const breathShader = useMemo(() => {
    return getShaderForSection('dychani') || shaderSettings?.dychani || 'dychani';
  }, [shaderSettings, getShaderForSection]);

  const [showGallery, setShowGallery] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showPreparationPicker, setShowPreparationPicker] = useState(false);
  const [showRhythmPicker, setShowRhythmPicker] = useState(false);
  const [breathCycleTime, setBreathCycleTime] = useState(0); // Čas v aktuálním cyklu dýchání (0 až breathInDuration + breathOutDuration)

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

  // Použij hook pro countdown zvuk během přípravy
  useCountdownSound(breathCountdownSound, isPreparing, preparationCountdown);

  // Použij hook pro finální zvuk na konci dýchání
  const playFinalSound = useFinalSound(breathFinalSound, isPlaying);

  // Sledování dokončení dýchání - přehraj finální zvuk když se dokončí
  const finalSoundPlayedRef = useRef(false);
  useEffect(() => {
    if (isPlaying && time === 0 && !finalSoundPlayedRef.current) {
      console.log('🔊 Dýchání dokončeno, přehrávám finální zvuk');
      finalSoundPlayedRef.current = true;
      // Počkej na dokončení aktuální fáze dýchání + fade out zvuku + 1 sekunda ticha
      const currentPhaseDuration = breathPhase === 'in' ? breathInDuration : breathOutDuration;
      const fadeOutDuration = Math.max(currentPhaseDuration * 0.2, 0.5);
      const silenceDuration = 1.0;
      const totalWaitTime = (currentPhaseDuration * 1000) + (fadeOutDuration * 1000) + (silenceDuration * 1000);

      const timeout = setTimeout(() => {
        playFinalSound();
        // Zastav přehrávání po přehrání finálního zvuku
        if (onPlayPause) {
          onPlayPause();
        }
      }, totalWaitTime);

      return () => {
        clearTimeout(timeout);
      };
    }
    // Resetuj flag když se spustí nové dýchání
    if (!isPlaying) {
      finalSoundPlayedRef.current = false;
    }
  }, [isPlaying, time, breathPhase, breathInDuration, breathOutDuration, playFinalSound, onPlayPause]);

  // Sledování času v cyklu dýchání - synchronizováno s fázemi
  const phaseStartTimeRef = useRef(Date.now());
  const previousPhaseRef = useRef(breathPhase);
  const intervalRef = useRef(null);
  const breathPhaseRef = useRef(breathPhase);

  useEffect(() => {
    breathPhaseRef.current = breathPhase;
  }, [breathPhase]);

  useEffect(() => {
    if (!isPlaying) {
      setBreathCycleTime(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Pokud se změnila fáze, resetuj čas začátku fáze
    if (previousPhaseRef.current !== breathPhase) {
      // Zastav předchozí interval, pokud běží
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

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

    // Vyčisti předchozí interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const cycleDuration = breathInDuration + breathOutDuration;

    intervalRef.current = setInterval(() => {
      // Použij ref pro breathPhase, aby interval viděl aktuální hodnotu
      const currentPhase = breathPhaseRef.current;
      const now = Date.now();
      const elapsed = (now - phaseStartTimeRef.current) / 1000; // sekundy

      // DŮLEŽITÉ: Omezíme elapsed na délku fáze - když dosáhne maxima, zastavíme výpočet
      const currentPhaseDuration = currentPhase === 'in' ? breathInDuration : breathOutDuration;
      if (elapsed >= currentPhaseDuration) {
        // Fáze dosáhla maximální délky - nastav finální hodnotu a zastav interval
        if (currentPhase === 'in') {
          setBreathCycleTime(breathInDuration);
        } else {
          setBreathCycleTime(cycleDuration);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      if (currentPhase === 'in') {
        // Během nádechu: čas cyklu = elapsed (0 až breathInDuration)
        setBreathCycleTime(elapsed);
      } else {
        // Během výdechu: čas cyklu = breathInDuration + elapsed (breathInDuration až cycleDuration)
        setBreathCycleTime(breathInDuration + elapsed);
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, breathPhase, breathInDuration, breathOutDuration]);

  // Vypočítat progress pro CircularProgress (0-100)
  const totalTime = selectedDuration * 60; // v sekundách
  const progress = totalTime > 0 ? ((totalTime - time) / totalTime) * 100 : 0;

  // Vypočítat progress pro rytmus dýchání (vnitřní kruhový ukazatel)
  const cycleDuration = breathInDuration + breathOutDuration;
  const breathRhythmProgress = isPlaying && cycleDuration > 0 ? (breathCycleTime / cycleDuration) * 100 : 0;

  // Pro výpočet, kde jsme v cyklu (nádech nebo výdech část)
  const inPhaseProgress = cycleDuration > 0 ? (breathInDuration / cycleDuration) * 100 : 50; // Procenta pro nádech část

  // Rozsah zvětšení/zmenšení kolečka pro animaci dýchání
  const minScale = 0.55;
  const maxScale = 1.25; // Zmenšeno z 1.45, aby nezasahovalo do textových prvků

  // Délka trvání animace podle aktuální fáze dýchání - navázáno na rytmus dýchání
  const animationDuration = useMemo(() => {
    if (!isPlaying) {
      return 0.3;
    }
    return breathPhase === 'in' ? breathInDuration : breathOutDuration;
  }, [isPlaying, breathPhase, breathInDuration, breathOutDuration]);

  // Počáteční scale pro aktuální fázi
  const initialScale = useMemo(() => {
    if (!isPlaying) {
      return 1;
    }
    return breathPhase === 'in' ? minScale : maxScale;
  }, [isPlaying, breathPhase]);

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

  // Získej barvu pro pozadí (pokud je shader barva, použij ji, jinak použij baseBackgroundColor)
  const backgroundColorForText = useMemo(() => {
    if (breathShader?.startsWith('__COLOR__')) {
      return breathShader.replace('__COLOR__', '');
    }
    return baseBackgroundColor;
  }, [breathShader, baseBackgroundColor]);

  // Použij adaptivní barvy textů
  const textColors = useAdaptiveTextColors(backgroundColorForText, breathShader);

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
          className="fixed max-w-full"
          style={{
            zIndex: 0,
            backgroundColor: baseBackgroundColor,
            top: 0,
            left: 0,
            right: 0,
            bottom: '-20px',
            height: 'calc(100dvh + 20px)'
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
                <h1 className={`text-4xl font-light ${textColors.heading}`} style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t('priprava')}
                </h1>
              </div>
            </FramerSection>

            <FramerSection
              className="mb-12"
              animationType="scaleIn"
              delay={0.2}
            >
              {/* CircularProgress pro přípravu - stejné rozměry jako hlavní kruh */}
              <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: '50vw', height: '50vw', maxWidth: '400px', maxHeight: '400px', minWidth: '250px', minHeight: '250px', margin: '0 auto' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <CircularProgress
                    progress={preparationCountdown > 0 && preparationTime > 0 ? ((preparationTime - preparationCountdown) / preparationTime) * 100 : 0}
                    onSeek={null}
                    className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
                  />
                </div>

                {/* Odpočítávání v centru */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <motion.div
                    key={preparationCountdown}
                    className={`text-6xl font-light ${textColors.primary}`}
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
                <div className={`${textColors.primary} font-medium text-xl`}>
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
        className="fixed max-w-full"
        style={{
          zIndex: 0,
          backgroundColor: baseBackgroundColor,
          top: 0,
          left: 0,
          right: 0,
          bottom: '-20px',
          height: 'calc(100dvh + 20px)'
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
            <h1 className={`text-5xl font-light tracking-wide ${textColors.heading} sm:text-6xl`}>
              {t('dychani')}
            </h1>
          </FramerSection>

          <FramerSection
            className="mb-12"
            animationType="scaleIn"
            delay={0.2}
          >
            {/* Title a Duration nad CircularProgress */}
            <div className="mb-6 z-10 w-full flex flex-col items-center space-y-0">
              {/* Textový indikátor fáze dýchání */}
              {isPlaying && (
                <motion.p
                  key={breathPhase}
                  className={`text-2xl font-light ${textColors.secondary}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {breathPhase === 'in' ? t('nadech') : t('vydech')}
                </motion.p>
              )}
            </div>

            {/* CircularProgress s Play/Pause Button - všechny kruhové prvky zarovnané vertikálně */}
            <div className="relative flex-shrink-0 flex items-center justify-center" style={{ isolation: 'isolate', overflow: 'visible', width: '50vw', height: '50vw', maxWidth: '400px', maxHeight: '400px', minWidth: '250px', minHeight: '250px', margin: '0 auto' }}>
              {/* Dýchací animace během meditace - SPODNÍ vrstva - pod kruhovým ukazatelem */}
              {isPlaying && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    zIndex: 0,
                    isolation: 'isolate',
                    transform: 'translateZ(0)', // Force hardware acceleration and create stacking context
                    overflow: 'visible'
                  }}
                >
                  {/* Animace kolečka - nafukuje se při nádechu, vyfukuje při výdechu */}
                  {/* Barvy: světlý režim = bílá, tmavý režim = černá/tmavá */}
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
                      background: textColors.isDark
                        ? 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,1) 25%, rgba(0,0,0,1) 100%)'
                        : 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 25%, rgba(255,255,255,1) 25%, rgba(255,255,255,1) 100%)',
                      transformOrigin: 'center center',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      zIndex: 0,
                      willChange: 'transform' // Optimize animation performance
                    }}
                    initial={{
                      scale: initialScale,
                      x: '-50%',
                      y: '-50%'
                    }}
                    animate={{
                      scale: breathPhase === 'in' ? maxScale : minScale,
                      x: '-50%',
                      y: '-50%'
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: animationDuration,
                      ease: 'easeInOut'
                    }}
                  />
                </div>
              )}

              {/* CircularProgress - nad animací - vytvoří nový stacking context s vyšším z-index */}
              <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10, isolation: 'isolate', transform: 'translateZ(0)' }}>
                <CircularProgress
                  progress={progress}
                  onSeek={null} // Pro meditaci nepotřebujeme seek
                  className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
                  style={{ position: 'relative', zIndex: 10 }}
                />
                {/* Vnitřní kruhový ukazatel pro rytmus dýchání - adaptivní barvy podle dark mode */}
                {isPlaying && cycleDuration > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
                    <svg
                      className="w-[40vw] h-[40vw] max-w-[320px] max-h-[320px] min-w-[200px] min-h-[200px] transform -rotate-90"
                      viewBox="0 0 450 450"
                      style={{ aspectRatio: '1/1' }}
                    >
                      {/* Pozadí - celý kruh */}
                      <circle
                        cx="225"
                        cy="225"
                        r="200"
                        stroke={textColors.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}
                        strokeWidth="6"
                        fill="none"
                      />
                      {/* Nádech část - zvýrazněná podle poměru */}
                      <circle
                        cx="225"
                        cy="225"
                        r="200"
                        stroke={textColors.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 200 * (inPhaseProgress / 100)} ${2 * Math.PI * 200}`}
                        strokeDashoffset="0"
                        style={{ strokeLinecap: 'butt' }}
                      />
                      {/* Progress - aktuální pozice v cyklu */}
                      <motion.circle
                        cx="225"
                        cy="225"
                        r="200"
                        stroke={textColors.isDark ? 'white' : 'black'}
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
              {/* Pro sekci dýchání:
                  - Bílá animace (světlý režim) → černé tlačítko s bílou ikonou
                  - Černá animace (tmavý režim) → bílé tlačítko s černou ikonou */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  zIndex: 30,
                  isolation: 'isolate'
                }}
              >
                <PlayPauseButton
                  isPlaying={isPlaying}
                  onToggle={onPlayPause}
                  className="w-[18vw] h-[18vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px] sm:w-[16vw] sm:h-[16vw] sm:max-w-[140px] sm:max-h-[140px] sm:min-w-[100px] sm:min-h-[100px]"
                  isDarkMode={textColors.isDark}
                />
              </div>
            </div>

            {/* Current Time Display - pod CircularProgress */}
            <div className="mt-6 text-center">
              <div className={`${textColors.primary} font-medium text-2xl`}>
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
                    className={`text-4xl md:text-5xl font-sans font-medium ${textColors.secondary} ${textColors.isDark ? 'hover:text-white' : 'hover:text-black'} transition-colors cursor-pointer mb-1`}
                  >
                    {formatPreparationTime(preparationTime)}
                  </button>
                  <span className={`text-base md:text-lg font-serif ${textColors.secondary} font-light`}>
                    {t('priprava') || 'příprava'}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowDurationPicker(true)}
                    className={`text-4xl md:text-5xl font-sans font-medium ${textColors.secondary} ${textColors.isDark ? 'hover:text-white' : 'hover:text-black'} transition-colors cursor-pointer mb-1`}
                  >
                    {selectedDuration}
                  </button>
                  <span className={`text-base md:text-lg font-serif ${textColors.secondary} font-light`}>
                    {t('dlzkaDychania') || 'délka'}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowRhythmPicker(true)}
                    className={`text-4xl md:text-5xl font-sans font-medium ${textColors.secondary} ${textColors.isDark ? 'hover:text-white' : 'hover:text-black'} transition-colors cursor-pointer mb-1`}
                  >
                    {breathInDuration} : {breathOutDuration}
                  </button>
                  <span className={`text-base md:text-lg font-serif ${textColors.secondary} font-light`}>
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

          {/* Tlačítka Reset a Gallery - zobraz pouze když NEPROBÍHÁ přehrávání */}
          {!isPlaying && (
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
          )}

          <FramerSection
            className="w-full flex justify-center mt-10 mb-6"
            animationType="fadeIn"
            delay={0.45}
          >
            <BackgroundSettingsControls section="dychani" />
          </FramerSection>

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
                selectedCountdownSound={breathCountdownSound}
              />
            )}
          </Suspense>
        )}
      </div>
    </FramerPageTransition>
  );
};

export default DychaniScreen;
