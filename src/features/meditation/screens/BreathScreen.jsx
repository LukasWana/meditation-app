import React, { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FramerSection, FramerPageTransition, BackButton } from '@components';
import CircularProgress from '@features/audio/components/CircularProgress';
import CurrentTimeDisplay from '@features/audio/components/CurrentTimeDisplay';
import { useLanguage } from '@contexts/LanguageContext';
import { useBreathSounds } from '@hooks';
import { useBreathPhase } from '@hooks/useBreathPhase';
import { useCountdownSound } from '@hooks/useCountdownSound';
import { useFinalSound } from '@hooks/useFinalSound';
import { useBreathTimer } from '@hooks/useBreathTimer';
import { usePreparationTimer } from '@hooks/usePreparationTimer';
import BreathHeader from '@features/meditation/components/BreathHeader';
import BreathProgressCircle from '@features/meditation/components/BreathProgressCircle';
import BreathParameters from '@features/meditation/components/BreathParameters';
import BreathActionButtons from '@features/meditation/components/BreathActionButtons';

// Lazy loading modálů pro lepší performance
const WheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.WheelPickerModal })));
const DualWheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.DualWheelPickerModal })));

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
    console.log('🔊 handlePlayPause called', { isBreathing, currentIsPreparing, preparationTime });

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
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch', minHeight: '600px' }}>
          <AnimatePresence>
            {/* Sekce přípravy */}
            {currentIsPreparing && (
              <motion.div
                key="preparation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, width: '100%' }}
              >
            {/* Nadpis - přesně stejná struktura jako obrazovka dýchání */}
            <div
              className="text-center flex flex-col justify-start"
              style={{ height: 'calc(3.5rem + clamp(32px, 3.5vw, 40px) + 1rem + 0.5rem)', paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: '1.5rem', position: 'relative', top: 0 }}
            >
              <motion.h1
                className="text-4xl font-serif text-gray-800 leading-normal overflow-visible"
                style={{ height: '3.5rem', minHeight: '3.5rem', maxHeight: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2', marginTop: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                {t('priprava') || 'příprava'}
              </motion.h1>
              {/* Current Time Display - pod nadpisem - stejná struktura jako na obrazovce dýchání, ale skryté */}
              <div className="flex items-center justify-center mt-4 mb-2 pointer-events-auto w-full gap-4" style={{ height: 'clamp(32px, 3.5vw, 40px)', minHeight: 'clamp(32px, 3.5vw, 40px)', maxHeight: 'clamp(32px, 3.5vw, 40px)' }}>
                <div className="pointer-events-none z-10 text-center" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <CurrentTimeDisplay
                    currentTime={0}
                    formatTime={formatTime}
                    className="text-black font-medium text-center text-clamp-time"
                    style={{ height: '100%', display: 'flex', alignItems: 'center', visibility: 'hidden' }}
                  />
                </div>
              </div>
            </div>

            {/* CircularProgress - přesně stejná struktura jako obrazovka dýchání */}
            <div
              className="flex flex-col items-center"
              style={{ marginTop: 0, marginBottom: '1.5rem' }}
            >
              {/* Circular Progress - stejná struktura jako na obrazovce dýchání */}
              <div className="relative flex-shrink-0">
                <CircularProgress
                  progress={currentPreparationCountdown > 0 && preparationTime > 0 ? ((preparationTime - currentPreparationCountdown) / preparationTime) * 100 : 0}
                  onSeek={null}
                  className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
                />

                {/* Odpočítávání v centru - stejná struktura jako Play/Pause tlačítko na obrazovce dýchání */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div
                    key={currentPreparationCountdown}
                    className="text-6xl font-light text-black"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                  >
                    {currentPreparationCountdown}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Prázdná sekce s parametry - pro zachování stejné struktury jako na stránce dýchání */}
            <FramerSection
              className="mb-6"
              animationType="fadeIn"
              delay={0.3}
            >
              <div className="flex justify-center items-start gap-8 md:gap-12 mb-4">
                {/* Příprava - prázdné */}
                <div className="flex flex-col items-center" style={{ opacity: 0, pointerEvents: 'none' }}>
                  <div className="text-4xl md:text-5xl font-sans font-medium mb-1" style={{ height: 'clamp(2.5rem, 5vw, 3rem)' }}>
                    &nbsp;
                  </div>
                  <div className="text-base md:text-lg font-serif" style={{ height: '1.25rem' }}>
                    &nbsp;
                  </div>
                </div>

                {/* Délka - prázdné */}
                <div className="flex flex-col items-center" style={{ opacity: 0, pointerEvents: 'none' }}>
                  <div className="text-4xl md:text-5xl font-sans font-medium mb-1" style={{ height: 'clamp(2.5rem, 5vw, 3rem)' }}>
                    &nbsp;
                  </div>
                  <div className="text-base md:text-lg font-serif" style={{ height: '1.25rem' }}>
                    &nbsp;
                  </div>
                </div>

                {/* Rytmus - prázdné */}
                <div className="flex flex-col items-center" style={{ opacity: 0, pointerEvents: 'none' }}>
                  <div className="text-4xl md:text-5xl font-sans font-medium mb-1" style={{ height: 'clamp(2.5rem, 5vw, 3rem)' }}>
                    &nbsp;
                  </div>
                  <div className="text-base md:text-lg font-serif" style={{ height: '1.25rem' }}>
                    &nbsp;
                  </div>
                </div>
              </div>
            </FramerSection>

            {/* Reset tlačítko, tlačítko pro zvukovou galerii a tlačítko pro profily - vedle sebe - stejná struktura jako na stránce dýchání */}
            <BreathActionButtons
              onReset={handlePlayPause}
              onGalleryClick={() => onNavigateToScreen('sound-theme-gallery')}
              onProfilesClick={() => onNavigateToScreen('breath-profiles')}
              t={t}
            />
              </motion.div>
            )}

            {/* Sekce dýchání */}
            {!currentIsPreparing && (
              <motion.div
                key="breathing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, width: '100%' }}
              >
          {/* Nadpis a zobrazení času */}
          <BreathHeader
            isBreathing={isBreathing}
            breathPhase={breathPhase}
            currentTime={totalTime - breathTime}
            totalTime={totalTime}
            formatTime={formatTime}
            t={t}
          />

          {/* CircularProgress s play button a animací */}
          <div
            className="flex flex-col items-center"
            style={{ marginTop: 0, marginBottom: '1.5rem' }}
          >
            <BreathProgressCircle
              progress={progress}
              isBreathing={isBreathing}
              breathPhase={breathPhase}
              breathInDuration={breathInDuration}
              breathOutDuration={breathOutDuration}
              onPlayPause={handlePlayPause}
            />
          </div>

          {/* Tři parametry: příprava, délka, rytmus */}
          <BreathParameters
            preparationTime={preparationTime}
            breathDuration={breathDuration}
            breathInDuration={breathInDuration}
            breathOutDuration={breathOutDuration}
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
            formatTime={formatTime}
            formatPreparationTime={formatPreparationTime}
            t={t}
          />

          {/* Reset tlačítko, tlačítko pro zvukovou galerii a tlačítko pro profily */}
          <BreathActionButtons
            onReset={handleReset}
            onGalleryClick={() => onNavigateToScreen('sound-theme-gallery')}
            onProfilesClick={() => onNavigateToScreen('breath-profiles')}
            t={t}
          />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modaly - lazy loaded */}
        {(showPreparationPicker || showDurationPicker || showRhythmPicker) && (
          <Suspense fallback={null}>
            {showPreparationPicker && (
              <WheelPickerModal
                isOpen={showPreparationPicker}
                onClose={() => setShowPreparationPicker(false)}
                value={preparationTime}
                onChange={onPreparationTimeChange}
                min={0}
                max={60}
                step={1}
                label={t('sekund')}
                title={t('priprava') || 'příprava'}
                onSoundButtonClick={() => {
                  setShowPreparationPicker(false);
                  onNavigateToScreen('sound-theme-gallery');
                }}
              />
            )}

            {showDurationPicker && (
              <WheelPickerModal
                isOpen={showDurationPicker}
                onClose={() => setShowDurationPicker(false)}
                value={breathDuration}
                onChange={(duration) => {
                  onBreathDurationChange(duration);
                  setBreathTime(duration * 60);
                }}
                min={1}
                max={60}
                step={1}
                label={t('minut')}
                title={t('dlzka') || 'délka'}
                onSoundButtonClick={() => {
                  setShowDurationPicker(false);
                  onNavigateToScreen('sound-theme-gallery');
                }}
              />
            )}

            {showRhythmPicker && (
              <DualWheelPickerModal
                isOpen={showRhythmPicker}
                onClose={() => setShowRhythmPicker(false)}
                leftValue={breathInDuration}
                rightValue={breathOutDuration}
                onChange={(leftValue, rightValue) => onBreathRhythmChange(leftValue, rightValue)}
                leftLabel={t('nadech') || 'nádech'}
                rightLabel={t('vydech') || 'výdech'}
                leftMin={1}
                leftMax={20}
                leftStep={1}
                rightMin={1}
                rightMax={20}
                rightStep={1}
                title={t('rytmus') || 'rytmus'}
                onSoundButtonClick={() => {
                  setShowRhythmPicker(false);
                  onNavigateToScreen('sound-theme-gallery');
                }}
              />
            )}
          </Suspense>
        )}
      </div>
    </FramerPageTransition>
  );
};

export default BreathScreen;