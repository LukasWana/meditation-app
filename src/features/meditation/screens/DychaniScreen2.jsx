import React, { useState, useCallback, useMemo } from 'react';
import { BackButton, BackgroundShader } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useTheme } from '@hooks/useTheme';
import { useDychaniSounds } from '@hooks';
import { useDychaniPhase } from '@hooks/useDychaniPhase';
import { useCountdownSound } from '@hooks/useCountdownSound';
import { useFinalSound } from '@hooks/useFinalSound';
import { useDychaniTimer } from '@hooks/useDychaniTimer';
import { usePreparationTimer } from '@hooks/usePreparationTimer';
import PreparationSection from '@features/meditation/components/PreparationSection';
import DychaniSection from '@features/meditation/components/DychaniSection';
import DychaniModals from '@features/meditation/components/DychaniModals';

const DychaniScreen2 = ({
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
  const theme = useTheme();
  const { getShaderForSection } = useShaderSettings();

  // Memoizovat backgroundColor, aby se nevytvářel nový objekt při každém renderu
  const backgroundColor = useMemo(() => theme.colors.background, [theme.colors.background]);
  const [showPreparationPicker, setShowPreparationPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showRhythmPicker, setShowRhythmPicker] = useState(false);

  // Lokální state pro přípravný čas (vždy používáme lokální state pro DychaniScreen2)
  const [localIsPreparing, setLocalIsPreparing] = useState(false);
  const [localPreparationCountdown, setLocalPreparationCountdown] = useState(0);

  // Pro DychaniScreen2 vždy používáme lokální state (protože globální state z useAppState je pro meditaci)
  const currentIsPreparing = localIsPreparing;
  const currentPreparationCountdown = localPreparationCountdown;

  // Použij hook pro přehrávání zvuků dýchání
  useDychaniSounds(
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
  useDychaniPhase(isBreathing, breathTime, setBreathPhase, breathInDuration, breathOutDuration);

  // Použij hook pro countdown zvuk
  useCountdownSound(breathCountdownSound, currentIsPreparing, currentPreparationCountdown);

  // Použij hook pro finální zvuk
  const playFinalSound = useFinalSound(breathFinalSound, isBreathing);

  // Použij hook pro timer dýchání
  const { waitingForCycleCompletionRef, completionTimeoutRef } = useDychaniTimer(
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

  // Handler pro play/pause s podporou přípravného času - memoizovaný
  const handlePlayPause = useCallback(() => {
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
      setLocalIsPreparing(true);
      setLocalPreparationCountdown(preparationTime);
      return;
    }

    // Jinak spusť dýchání přímo (pokud není příprava nebo je preparationTime 0)
    if (breathTime <= 0) {
      const newTime = breathDuration * 60;
      setBreathTime(newTime);
    }
    setIsBreathing(true);
  }, [isBreathing, currentIsPreparing, preparationTime, breathTime, breathDuration, waitingForCycleCompletionRef, completionTimeoutRef, setIsBreathing, setBreathTime]);


  // Handler pro reset
  const handleReset = useCallback(() => {
    setIsBreathing(false);
    setBreathTime(breathDuration * 60);
  }, [breathDuration, setIsBreathing, setBreathTime]);

  // Vypočítat progress pro CircularProgress (0-100)
  const totalTime = useMemo(() => breathDuration * 60, [breathDuration]); // v sekundách
  const progress = useMemo(() => {
    return totalTime > 0 ? ((totalTime - breathTime) / totalTime) * 100 : 0;
  }, [totalTime, breathTime]);

  // Formátování času (mm:ss) - memoizované, aby se nevytvářela nová funkce při každém renderu
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Formátování času přípravy (v sekundách -> mm:ss) - memoizované
  const formatPreparationTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handler funkce pro modaly - memoizované
  const handlePreparationClick = useCallback(() => {
    setShowDurationPicker(false);
    setShowRhythmPicker(false);
    setShowPreparationPicker(true);
  }, []);

  const handleDurationClick = useCallback(() => {
    setShowPreparationPicker(false);
    setShowRhythmPicker(false);
    setShowDurationPicker(true);
  }, []);

  const handleRhythmClick = useCallback(() => {
    setShowPreparationPicker(false);
    setShowDurationPicker(false);
    setShowRhythmPicker(true);
  }, []);

  const handleGalleryClick = useCallback(() => {
    onNavigateToScreen('sound-theme-gallery');
  }, [onNavigateToScreen]);

  const handleProfilesClick = useCallback(() => {
    onNavigateToScreen('breath-profiles');
  }, [onNavigateToScreen]);

  return (
    <div className="w-full h-full max-w-full overflow-x-hidden">
      {/* Vrstvení:
          - Pozadí (bg-[#f4ddc4]): zIndex 0 (nejnižší)
          - BackgroundShader: zIndex 1 (nad pozadím, pod obsahem)
          - Obsah: zIndex 10 (nad shaderem)
      */}
      {/* Pozadí stránky - pod shaderem - průhledné při dýchání, aby shader prosvítal */}
      <div
        className="fixed max-w-full"
        style={{
          zIndex: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: '-20px',
          height: 'calc(100dvh + 20px)',
          backgroundColor: backgroundColor
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
        style={{ position: 'relative', zIndex: 10, backgroundColor: backgroundColor }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="w-full max-w-md mt-12 md:mt-16 pb-10 relative flex flex-col items-stretch">
          {/* Sekce přípravy */}
          {currentIsPreparing && (
            <PreparationSection
              key="preparation-section"
              preparationCountdown={currentPreparationCountdown}
              preparationTime={preparationTime}
              onStop={handlePlayPause}
              onGalleryClick={handleGalleryClick}
              onProfilesClick={handleProfilesClick}
              formatTime={formatTime}
              t={t}
            />
          )}

          {/* Sekce dýchání */}
          {!currentIsPreparing && (
            <DychaniSection
              key="breathing-section"
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
              onPreparationClick={handlePreparationClick}
              onDurationClick={handleDurationClick}
              onRhythmClick={handleRhythmClick}
              onGalleryClick={handleGalleryClick}
              onProfilesClick={handleProfilesClick}
              formatTime={formatTime}
              formatPreparationTime={formatPreparationTime}
              t={t}
            />
          )}
        </div>

        {/* Modaly */}
        <DychaniModals
          showPreparationPicker={showPreparationPicker}
          showDurationPicker={showDurationPicker}
          showRhythmPicker={showRhythmPicker}
          preparationTime={preparationTime}
          breathDuration={breathDuration}
          breathInDuration={breathInDuration}
          breathOutDuration={breathOutDuration}
          onClosePreparation={useCallback(() => setShowPreparationPicker(false), [])}
          onCloseDuration={useCallback(() => setShowDurationPicker(false), [])}
          onCloseRhythm={useCallback(() => setShowRhythmPicker(false), [])}
          onPreparationChange={onPreparationTimeChange}
          onDurationChange={useCallback((duration) => {
            onBreathDurationChange(duration);
            setBreathTime(duration * 60);
          }, [onBreathDurationChange, setBreathTime])}
          onRhythmChange={onBreathRhythmChange}
          onSoundButtonClick={handleGalleryClick}
          t={t}
        />
      </div>
    </div>
  );
};

export default DychaniScreen2;