import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Image as ImageIcon } from 'lucide-react';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import CircularProgress from '@features/audio/components/CircularProgress';
import PlayPauseButton from '@features/audio/components/PlayPauseButton';
import { useLanguage } from '@contexts/LanguageContext';
import { useBreathSounds } from '@hooks';

// Lazy loading modálů pro lepší performance
const WheelPickerModal = lazy(() => import('@components/TimePickerModal').then(m => ({ default: m.WheelPickerModal })));
const SoundThemeGallery = lazy(() => import('@components/SoundThemeGallery'));

const MeditationScreen = ({
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
  isPreparing,
  preparationCountdown,
  preparationTime
}) => {
  const { t } = useLanguage();
  const [showGallery, setShowGallery] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [breathCycleTime, setBreathCycleTime] = useState(0); // Čas v aktuálním cyklu dýchání (0 až breathInDuration + breathOutDuration)

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

  // Pro výpočet, kde jsme v cyklu (nádech nebo výdech část)
  const inPhaseProgress = cycleDuration > 0 ? (breathInDuration / cycleDuration) * 100 : 50; // Procenta pro nádech část

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

  // Formátování času
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Pokud probíhá příprava, zobraz odpočítávání přípravy
  if (isPreparing) {
    return (
      <FramerPageTransition screenKey="meditation">
        <div
          className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
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
                  {t('pripravaNaMeditaci')}
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
    <FramerPageTransition screenKey="meditation">
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
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
                {t('meditacia')}
              </h1>
            </div>
            <div className="flex justify-center gap-2 mt-4 mb-4">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <div className="w-2 h-2 bg-black rounded-full"></div>
            </div>
            {/* Zobrazení aktuálního rytmu dýchání z nastavení */}
            <div className="mt-4 text-sm text-gray-600">
              <span className="font-medium">{t('rytmusDychania')}:</span>{' '}
              <span className="font-light">
                {breathInDuration}:{breathOutDuration} ({t('nadech')}:{t('vydech')})
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
                      opacity: 0.9,
                      scale: breathPhase === 'in' ? 0.5 : 1.5
                    }}
                    animate={isPlaying ? {
                      scale: breathPhase === 'in'
                        ? [0.5, 1.5]  // Nádech - zvětšování až na 120%
                        : breathPhase === 'out'
                        ? [1.5, 0.5]  // Výdech - zmenšování až na 20%
                        : 1.5,
                      opacity: [0.9, 1, 0.9]
                    } : {
                      scale: 1.0,
                      opacity: 0.8
                    }}
                    exit={{ opacity: 0 }}
                    transition={isPlaying ? {
                      duration: breathPhase === 'in' ? breathInDuration : breathOutDuration,
                      delay: breathPhase === 'out' ? 3 : 0,  // Pozdržení výdechu, aby počkal na zvuk
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "reverse"
                    } : {
                      duration: 0.5
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
              <div className="flex justify-center">
                <button
                  onClick={() => setShowDurationPicker(true)}
                  className="text-4xl font-light text-gray-800 hover:text-black transition-colors cursor-pointer px-6 py-4"
                >
                  {selectedDuration}
                </button>
                <span className="text-3xl font-light text-gray-600 pt-4 px-2">
                  {t('minut')}
                </span>
              </div>

              {(showDurationPicker || showGallery) && (
                <Suspense fallback={null}>
                  {showDurationPicker && (
                    <WheelPickerModal
                      isOpen={showDurationPicker}
                      onClose={() => setShowDurationPicker(false)}
                      value={selectedDuration}
                      onChange={onDurationChange}
                      min={1}
                      max={60}
                      step={1}
                      label={t('dlzkaMeditacie')}
                      title={t('dlzkaMeditacie')}
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
    </FramerPageTransition>
  );
};

export default MeditationScreen;
