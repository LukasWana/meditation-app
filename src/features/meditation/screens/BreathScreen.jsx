import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import FramerPageTransition from '@components/FramerPageTransition';
import BackButton from '@components/BackButton';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import {
  useBreathAudioEngine,
  useBreathPhase,
  useCountdownSound,
  useFinalSound,
  useBreathTimer,
  usePreparationTimer
} from '@features/meditation/hooks';
import { useActivityTracking } from '@features/meditation/hooks';
import { useBreathStore } from '@stores/breathStore';
import PreparationSection from '@features/meditation/components/PreparationSection';
import BreathingSection from '@features/meditation/components/BreathingSection';

const BreathScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  const { t } = useLanguage();

  // Čteme stav přímo ze store (místo prop-drillingu)
  const {
    breathPhase,
    setBreathPhase,
    breathInDuration,
    breathOutDuration,
    preparationTime,
    breathDuration,
    breathTime,
    setBreathTime,
    isBreathing,
    setIsBreathing,
    breathInSound,
    breathOutSound,
    breathClickSound,
    breathFinalSound,
    breathCountdownSound,
    breathSoundFadeEnabled,
  } = useBreathStore();

  // Lokální state pro přípravný čas (vždy používáme lokální state pro BreathScreen)
  const [localIsPreparing, setLocalIsPreparing] = useState(false);
  const [localPreparationCountdown, setLocalPreparationCountdown] = useState(0);

  // State pro aktivní parametr (pro vizuální indikaci)
  const [activeParameter, setActiveParameter] = useState(null);

  // State pro pokračování v počítání po skončení
  const [continueAfterEnd, setContinueAfterEnd] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-continue-after-end');
      return saved === 'true';
    } catch (error) {
      return false;
    }
  });

  // Uložit do localStorage při změně
  React.useEffect(() => {
    try {
      localStorage.setItem('meditation-app-continue-after-end', continueAfterEnd.toString());
    } catch (error) {
      console.warn('Failed to save continueAfterEnd to localStorage:', error);
    }
  }, [continueAfterEnd]);

  // Pro BreathScreen vždy používáme lokální state (protože globální state z useAppState je pro meditaci)
  const currentIsPreparing = localIsPreparing;
  const currentPreparationCountdown = localPreparationCountdown;

  // Použij nový audio engine pro přesné přehrávání zvuků dýchání
  const { getCurrentPhase, resetAudioEngine, initializeAudioContext } = useBreathAudioEngine(
    isBreathing,
    breathInDuration,
    breathOutDuration,
    breathInSound || 'none',
    breathOutSound || 'none',
    breathClickSound || 'none',
    breathSoundFadeEnabled !== false,
    setBreathPhase // onPhaseChange callback
  );

  // Použij hook pro aktualizaci UI fáze (fallback, pokud audio engine nefunguje)
  useBreathPhase(
    isBreathing,
    setBreathPhase,
    breathInDuration,
    breathOutDuration,
    getCurrentPhase
  );

  // Použij hook pro countdown zvuk (vrací funkci pro přehrání)
  const playCountdownSound = useCountdownSound(breathCountdownSound, currentIsPreparing);

  // Použij hook pro finální zvuk
  const playFinalSound = useFinalSound(breathFinalSound, isBreathing);

  // Použij hook pro timer dýchání
  const { waitingForCycleCompletionRef, completionTimeoutRef, extraTime } = useBreathTimer(
    isBreathing,
    breathTime,
    setBreathTime,
    breathPhase,
    breathInDuration,
    breathOutDuration,
    breathFinalSound,
    playFinalSound,
    setIsBreathing,
    continueAfterEnd
  );

  // Použij hook pro timer přípravy (předáme funkci pro přehrání countdown zvuku)
  usePreparationTimer(
    currentIsPreparing,
    currentPreparationCountdown,
    setLocalPreparationCountdown,
    setLocalIsPreparing,
    breathTime,
    breathDuration,
    setBreathTime,
    setIsBreathing,
    playCountdownSound
  );

  // Metadata pro trackování aktivity - použijeme useMemo, aby se aktualizovalo při změně extraTime
  const trackingMetadata = useMemo(() => ({
    breathDuration,
    breathInDuration,
    breathOutDuration,
    preparationTime,
    extraTime: extraTime || 0, // Čas navíc po skončení nastaveného času
    continueAfterEnd: continueAfterEnd || false
  }), [breathDuration, breathInDuration, breathOutDuration, preparationTime, extraTime, continueAfterEnd]);

  // Trackování aktivity dýchání
  useActivityTracking({
    section: 'breathing',
    isActive: isBreathing,
    metadata: trackingMetadata
  });

  // Handler pro play/pause s podporou přípravného času
  const handlePlayPause = () => {
    // DŮLEŽITÉ: Aktivuj AudioContext přímo při kliknutí (vyžadováno prohlížečem pro Android Chrome)
    initializeAudioContext();

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
      console.log('🔄 Starting preparation', preparationTime);
      setLocalIsPreparing(true);
      setLocalPreparationCountdown(preparationTime);
      // Zvuk pro počáteční hodnotu se přehraje v usePreparationTimer při startu
      return;
    }

    // Jinak spusť dýchání přímo (pokud není příprava nebo je preparationTime 0)
    console.log('▶️ Starting breathing directly');
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
    setLocalIsPreparing(false);
    setLocalPreparationCountdown(0);
    resetAudioEngine();
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

  const { getScreenBackgroundColor } = useTheme();

  // Handler pro tlačítko zpět - zastaví dýchání před navigací
  const handleBackClick = () => {
    // Zastav dýchání a přípravu
    if (isBreathing) {
      setIsBreathing(false);
    }
    if (currentIsPreparing) {
      setLocalIsPreparing(false);
      setLocalPreparationCountdown(0);
    }
    // Reset aktivního parametru
    setActiveParameter(null);
    // Naviguj zpět
    onNavigateToScreen('home');
  };

  return (
    <FramerPageTransition screenKey="dychani">
      <div
        className="h-dvh w-full max-w-full flex flex-col items-center justify-start overflow-hidden relative"
        style={{
          backgroundColor: getScreenBackgroundColor(),
          height: '100dvh',
          paddingTop: 'calc(5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={handleBackClick} />

        <div className="max-w-md w-full flex-1 flex flex-col items-stretch justify-center overflow-hidden" style={{ position: 'relative' }}>
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
                  setActiveParameter('preparation');
                  onNavigateToScreen('preparation-time-picker');
                }}
                onDurationClick={() => {
                  setActiveParameter('duration');
                  onNavigateToScreen('duration-picker');
                }}
                onRhythmClick={() => {
                  setActiveParameter('rhythm');
                  onNavigateToScreen('rhythm-picker');
                }}
                activeParameter={activeParameter}
                onGalleryClick={() => onNavigateToScreen('sound-theme-gallery')}
                onProfilesClick={() => onNavigateToScreen('breath-profiles')}
                formatTime={formatTime}
                formatPreparationTime={formatPreparationTime}
                continueAfterEnd={continueAfterEnd}
                onContinueAfterEndChange={setContinueAfterEnd}
                extraTime={extraTime || 0}
                t={t}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default BreathScreen;