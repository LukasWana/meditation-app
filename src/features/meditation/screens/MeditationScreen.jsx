import React, { useEffect, useRef, Suspense, lazy, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Image as ImageIcon } from 'lucide-react';
import { FramerButton, FramerSection, FramerPageTransition, BackButton, BackgroundShader } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useBreathSounds, useAdaptiveTextColors, useCountdownSound, useFinalSound } from '@hooks';
import BackgroundSettingsControls from '@features/meditation/components/BackgroundSettingsControls';
import MeditationTimer, { MeditationTimeDisplay } from '@features/meditation/components/MeditationTimer';
import MeditationControls from '@features/meditation/components/MeditationControls';
import MeditationSettings from '@features/meditation/components/MeditationSettings';
import { useMeditationState } from '@features/meditation/hooks/useMeditationState';
import CircularProgress from '@features/audio/components/CircularProgress';

// Lazy loading modálů pro lepší performance
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
    getColorForSection,
    getOverlaySettings
  } = useShaderSettings();

  // Získej shader pro sekci dýchání - reaguje na změny v nastavení
  const breathShader = useMemo(() => {
    // Použij přímo shaderSettings místo getShaderForSection, aby se shader načetl hned při prvním renderu
    const shader = shaderSettings?.dychani;
    if (shader === null) {
      return null; // Barva má prioritu
    }
    return shader || 'dychani';
  }, [shaderSettings]);

  // Použij custom hook pro state management
  const meditationState = useMeditationState({
    isPlaying,
    breathPhase,
    breathInDuration,
    breathOutDuration
  });

  const {
    showGallery,
    setShowGallery,
    showDurationPicker,
    setShowDurationPicker,
    showPreparationPicker,
    setShowPreparationPicker,
    showRhythmPicker,
    setShowRhythmPicker,
    breathCycleTime,
    breathRhythmProgress,
    inPhaseProgress,
    animationDuration,
    initialScale,
    minScale,
    maxScale
  } = meditationState;

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
      // Debug log deaktivován - příliš mnoho výpisů
      // console.log('🔊 Dýchání dokončeno, přehrávám finální zvuk');
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

  // Vypočítat progress pro CircularProgress (0-100)
  const totalTime = selectedDuration * 60; // v sekundách
  const progress = totalTime > 0 ? ((totalTime - time) / totalTime) * 100 : 0;

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

  // Debug logování - deaktivováno pro produkci (příliš mnoho výpisů)
  // Pro debugování odkomentujte a nastavte DEBUG_BREATH_RHYTHM na true
  const DEBUG_BREATH_RHYTHM = false;
  useEffect(() => {
    if (DEBUG_BREATH_RHYTHM && isPlaying) {
      const cycleDuration = breathInDuration + breathOutDuration;
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
  }, [isPlaying, breathPhase, breathCycleTime, breathRhythmProgress, inPhaseProgress, breathInDuration, breathOutDuration]);

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
            <div className="relative flex-shrink-0 flex items-center justify-center" style={{ isolation: 'isolate', overflow: 'visible', width: '50vw', height: '50vw', maxWidth: '400px', maxHeight: '400px', minWidth: '250px', minHeight: '250px', margin: '0 auto' }}>
              <MeditationTimer
                time={time}
                selectedDuration={selectedDuration}
                isPlaying={isPlaying}
                breathPhase={breathPhase}
                progress={progress}
                breathCycleTime={breathCycleTime}
                breathInDuration={breathInDuration}
                breathOutDuration={breathOutDuration}
                breathRhythmProgress={breathRhythmProgress}
                inPhaseProgress={inPhaseProgress}
                animationDuration={animationDuration}
                initialScale={initialScale}
                minScale={minScale}
                maxScale={maxScale}
                textColors={textColors}
              />
              <MeditationControls
                isPlaying={isPlaying}
                onPlayPause={onPlayPause}
                textColors={textColors}
              />
            </div>
            <MeditationTimeDisplay time={time} textColors={textColors} />
          </FramerSection>

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

          <MeditationSettings
            isPlaying={isPlaying}
            selectedDuration={selectedDuration}
            breathInDuration={breathInDuration}
            breathOutDuration={breathOutDuration}
            preparationTime={preparationTime}
            showDurationPicker={showDurationPicker}
            showPreparationPicker={showPreparationPicker}
            showRhythmPicker={showRhythmPicker}
            onShowDurationPicker={() => setShowDurationPicker(true)}
            onShowPreparationPicker={() => setShowPreparationPicker(true)}
            onShowRhythmPicker={() => setShowRhythmPicker(true)}
            onHideDurationPicker={() => setShowDurationPicker(false)}
            onHidePreparationPicker={() => setShowPreparationPicker(false)}
            onHideRhythmPicker={() => setShowRhythmPicker(false)}
            onDurationChange={onDurationChange}
            onBreathRhythmChange={onBreathRhythmChange}
            onPreparationTimeChange={onPreparationTimeChange}
            textColors={textColors}
          />

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
