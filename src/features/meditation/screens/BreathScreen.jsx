import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FramerPageTransition, BackButton, BackgroundShader } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useBreathSounds } from '@hooks';
import { useBreathPhase } from '@hooks/useBreathPhase';
import { useCountdownSound } from '@hooks/useCountdownSound';
import { useFinalSound } from '@hooks/useFinalSound';
import { useBreathTimer } from '@hooks/useBreathTimer';
import { usePreparationTimer } from '@hooks/usePreparationTimer';
import PreparationSection from '@features/meditation/components/PreparationSection';
import BreathingSection from '@features/meditation/components/BreathingSection';
import BreathModals from '@features/meditation/components/BreathModals';

const BreathScreen = ({
  breathPhase,
  setBreathPhase,
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  breathInDuration,
  breathOutDuration,
  onBreathRhythmChange,
  preparationTime,
  onPreparationTimeChange,
  breathDuration,
  breathTime,
  setBreathTime,
  isBreathing,
  setIsBreathing,
  onBreathDurationChange,
  breathInSound,
  breathOutSound,
  breathClickSound,
  breathFinalSound,
  breathCountdownSound,
  breathSoundFadeEnabled
}) => {
  const { t } = useLanguage();
  const { getShaderForSection } = useShaderSettings();
  const [showPreparationPicker, setShowPreparationPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showRhythmPicker, setShowRhythmPicker] = useState(false);

  // Lokální state pro přípravný čas (vždy používáme lokální state pro BreathScreen)
  const [localIsPreparing, setLocalIsPreparing] = useState(false);
  const [localPreparationCountdown, setLocalPreparationCountdown] = useState(0);

  // Pro BreathScreen vždy používáme lokální state (protože globální state z useAppState je pro meditaci)
  const currentIsPreparing = localIsPreparing;
  const currentPreparationCountdown = localPreparationCountdown;

  // Použij hook pro přehrávání zvuků dýchání
  useBreathSounds(
    isBreathing,
    breathPhase,
    breathInSound || 'none',
    breathOutSound || 'none',
    breathClickSound || 'none',
    breathSoundFadeEnabled !== false,
    breathInDuration,
    breathOutDuration
  );

  // Použij hook pro správu fází dýchání
  useBreathPhase(isBreathing, breathTime, setBreathPhase, breathInDuration, breathOutDuration);

  // Použij hook pro countdown zvuk
  useCountdownSound(breathCountdownSound, currentIsPreparing, currentPreparationCountdown);

  // Použij hook pro finální zvuk
  const playFinalSound = useFinalSound(breathFinalSound, isBreathing);

  // Použij hook pro timer dýchání
  const { waitingForCycleCompletionRef, completionTimeoutRef } = useBreathTimer(
    isBreathing,
    breathTime,
    setBreathTime,
    breathPhase,
    breathInDuration,
    breathOutDuration,
    breathFinalSound,
    playFinalSound,
    setIsBreathing
  );

  // Použij hook pro timer přípravy
  usePreparationTimer(
    currentIsPreparing,
    currentPreparationCountdown,
    setLocalPreparationCountdown,
    setLocalIsPreparing,
    breathTime,
    breathDuration,
    setBreathTime,
    setIsBreathing
  );

  // Handler pro play/pause s podporou přípravného času
  const handlePlayPause = () => {
    // Debug logy deaktivovány - příliš mnoho výpisů
    // const DEBUG_BREATH_SCREEN = false;
    // if (DEBUG_BREATH_SCREEN) console.log('🔊 handlePlayPause called', { isBreathing, currentIsPreparing, preparationTime });

    // Pokud už dýchání probíhá, zastav ho
    if (isBreathing) {
      // Vyčisti timeout a flagy, pokud čekáme na dokončení cyklu
      if (waitingForCycleCompletionRef?.current) {
        waitingForCycleCompletionRef.current = false;
      }
      if (completionTimeoutRef?.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
      setIsBreathing(false);
      setLocalIsPreparing(false);
      setLocalPreparationCountdown(0);
      return;
    }

    // Pokud probíhá příprava, zastav ji
    if (currentIsPreparing) {
      setLocalIsPreparing(false);
      setLocalPreparationCountdown(0);
      return;
    }

    // Pokud je nastaven čas přípravy a dýchání neprobíhá, spusť přípravu
    if (preparationTime > 0 && !isBreathing && !currentIsPreparing) {
      // if (DEBUG_BREATH_SCREEN) console.log('🔄 Starting preparation', preparationTime);
      setLocalIsPreparing(true);
      setLocalPreparationCountdown(preparationTime);
      return;
    }

    // Jinak spusť dýchání přímo (pokud není příprava nebo je preparationTime 0)
    // if (DEBUG_BREATH_SCREEN) console.log('▶️ Starting breathing directly');
    if (breathTime <= 0) {
      const newTime = breathDuration * 60;
      setBreathTime(newTime);
    }
    setIsBreathing(true);
  };


  // Handler pro reset
  const handleReset = () => {
    setIsBreathing(false);
    setBreathTime(breathDuration * 60);
  };

  // Vypočítat progress pro CircularProgress (0-100)
  const totalTime = breathDuration * 60; // v sekundách
  const progress = totalTime > 0 ? ((totalTime - breathTime) / totalTime) * 100 : 0;

  // Formátování času (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Formátování času přípravy (v sekundách -> mm:ss)
  const formatPreparationTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <FramerPageTransition screenKey="breath">
      {/* Vrstvení:
          - Pozadí (bg-[#f4ddc4]): zIndex 0 (nejnižší)
          - BackgroundShader: zIndex 1 (nad pozadím, pod obsahem)
          - Obsah: zIndex 10 (nad shaderem)
      */}
      {/* Pozadí stránky - pod shaderem - průhledné při dýchání, aby shader prosvítal */}
      <div
        className="fixed max-w-full bg-[#f4ddc4]"
        style={{
          zIndex: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: '-20px',
          height: 'calc(100dvh + 20px)'
        }}
      />

      {/* BackgroundShader - zobraz pouze při dýchání s plynulým prolnutím */}
      <BackgroundShader
        variant={getShaderForSection('dychani')}
        intensity={0.4}
        enabled={true}
        opacity={isBreathing ? 0.6 : 0.0}
        breathPhase={isBreathing ? breathPhase : null}
        breathInDuration={breathInDuration}
        breathOutDuration={breathOutDuration}
        zIndex={2}
      />

      {/* Hlavní obsah */}
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start px-4 sm:px-6 pb-16 pt-12 overflow-x-hidden overflow-y-auto"
        style={{ position: 'relative', zIndex: 10, backgroundColor: '#f4ddc4' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="w-full max-w-md mt-12 md:mt-16 pb-10 relative flex flex-col items-stretch">
          <AnimatePresence>
            {/* Sekce přípravy */}
            {currentIsPreparing && (
              <PreparationSection
                preparationCountdown={currentPreparationCountdown}
                preparationTime={preparationTime}
                onStop={handlePlayPause}
                onGalleryClick={() => onNavigateToScreen('sound-theme-gallery')}
                onProfilesClick={() => onNavigateToScreen('breath-profiles')}
                formatTime={formatTime}
                t={t}
              />
            )}

            {/* Sekce dýchání */}
            {!currentIsPreparing && (
              <BreathingSection
                isBreathing={isBreathing}
                breathPhase={breathPhase}
                breathTime={breathTime}
                totalTime={totalTime}
                progress={progress}
                preparationTime={preparationTime}
                breathDuration={breathDuration}
                breathInDuration={breathInDuration}
                breathOutDuration={breathOutDuration}
                onPlayPause={handlePlayPause}
                onReset={handleReset}
                onPreparationClick={() => {
                  setShowDurationPicker(false);
                  setShowRhythmPicker(false);
                  setShowPreparationPicker(true);
                }}
                onDurationClick={() => {
                  setShowPreparationPicker(false);
                  setShowRhythmPicker(false);
                  setShowDurationPicker(true);
                }}
                onRhythmClick={() => {
                  setShowPreparationPicker(false);
                  setShowDurationPicker(false);
                  setShowRhythmPicker(true);
                }}
                onGalleryClick={() => onNavigateToScreen('sound-theme-gallery')}
                onProfilesClick={() => onNavigateToScreen('breath-profiles')}
                formatTime={formatTime}
                formatPreparationTime={formatPreparationTime}
                t={t}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Modaly */}
        <BreathModals
          showPreparationPicker={showPreparationPicker}
          showDurationPicker={showDurationPicker}
          showRhythmPicker={showRhythmPicker}
          preparationTime={preparationTime}
          breathDuration={breathDuration}
          breathInDuration={breathInDuration}
          breathOutDuration={breathOutDuration}
          onClosePreparation={() => setShowPreparationPicker(false)}
          onCloseDuration={() => setShowDurationPicker(false)}
          onCloseRhythm={() => setShowRhythmPicker(false)}
          onPreparationChange={onPreparationTimeChange}
          onDurationChange={(duration) => {
            onBreathDurationChange(duration);
            setBreathTime(duration * 60);
          }}
          onRhythmChange={onBreathRhythmChange}
          onSoundButtonClick={() => onNavigateToScreen('sound-theme-gallery')}
          t={t}
        />
      </div>
    </FramerPageTransition>
  );
};

export default BreathScreen;