import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { FramerSection, FramerPageTransition, BackButton, FramerButton, WheelPickerModal, DualWheelPickerModal, SoundThemeGallery } from '@components';
import CircularProgress from '@features/audio/components/CircularProgress';
import PlayPauseButton from '@features/audio/components/PlayPauseButton';
import CurrentTimeDisplay from '@features/audio/components/CurrentTimeDisplay';
import { useLanguage } from '@contexts/LanguageContext';
import { useBreathSounds } from '@hooks';
import { useBreathPhase } from '@hooks/useBreathPhase';

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
  onReset,
  breathInSound,
  breathOutSound,
  breathSoundFadeEnabled,
  onBreathSoundChange
}) => {
  const { t } = useLanguage();
  const [showPreparationPicker, setShowPreparationPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showRhythmPicker, setShowRhythmPicker] = useState(false);
  const [showSoundGallery, setShowSoundGallery] = useState(false);

  // Použij hook pro přehrávání zvuků dýchání
  useBreathSounds(
    isBreathing,
    breathPhase,
    breathInSound || 'none',
    breathOutSound || 'none',
    breathSoundFadeEnabled !== false,
    breathInDuration,
    breathOutDuration
  );

  // Použij hook pro správu fází dýchání
  useBreathPhase(isBreathing, breathTime, setBreathPhase, breathInDuration, breathOutDuration);

  // Timer logika pro dýchání - odpočítávání času
  useEffect(() => {
    let interval;
    if (isBreathing) {
      interval = setInterval(() => {
        setBreathTime(prev => {
          if (prev <= 0) {
            setIsBreathing(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isBreathing, setBreathTime, setIsBreathing]);

  // Handler pro play/pause
  const handlePlayPause = () => {
    if (isBreathing) {
      setIsBreathing(false);
    } else {
      // Pokud je čas 0 nebo menší, resetuj na celkovou délku
      if (breathTime <= 0) {
        const newTime = breathDuration * 60;
        setBreathTime(newTime);
      }
      setIsBreathing(true);
    }
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
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full mt-16">
          {/* Nadpis - velký elegantní serif font */}
          <FramerSection
            className="text-center mb-16"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-5xl font-serif text-gray-800 mb-2">
              {t('dychanie') || 'dýchání'}
            </h1>
          </FramerSection>

          {/* CircularProgress s tmavě šedým kruhem a bílou play ikonou - stejný jako v hudbě */}
          <FramerSection
            className="mb-12 flex flex-col items-center"
            animationType="scaleIn"
            delay={0.2}
          >

            {/* Circular Progress with Play Button - Always Centered - stejný design jako v hudbě a meditaci */}
            <div className="relative flex-shrink-0">
              <CircularProgress
                progress={progress}
                onSeek={null}
                className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
              />

              {/* Play/Pause Button - Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <PlayPauseButton
                  isPlaying={isBreathing}
                  onToggle={handlePlayPause}
                  className="w-[18vw] h-[18vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px] sm:w-[16vw] sm:h-[16vw] sm:max-w-[140px] sm:max-h-[140px] sm:min-w-[100px] sm:min-h-[100px]"
                />
              </div>

              {/* Dýchací animace během dýchání - overlay */}
              {isBreathing && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="w-[45vw] h-[45vw] max-w-[330px] max-h-[330px] min-w-[200px] min-h-[200px] rounded-full bg-black/5"
                    animate={isBreathing ? {
                      scale: breathPhase === 'in'
                        ? [1.0, 0.2]
                        : breathPhase === 'out'
                        ? [0.2, 1.0]
                        : 1.0,
                      opacity: [0.6, 1, 0.6]
                    } : {
                      scale: 1.0,
                      opacity: 0.6
                    }}
                    transition={isBreathing ? {
                      duration: breathPhase === 'in' ? breathInDuration : breathOutDuration,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "reverse"
                    } : {
                      duration: 0.5
                    }}
                  />
                </motion.div>
              )}
            </div>

            {/* Current Time Display - pod CircularProgress - s informací o fázi dýchání vpravo */}
            <div className="flex items-center justify-center mt-6 mb-4 pointer-events-auto w-full gap-4">
              <div className="pointer-events-none z-10 text-center">
                <CurrentTimeDisplay
                  currentTime={totalTime - breathTime}
                  formatTime={formatTime}
                  className="text-black font-medium text-center text-clamp-time"
                />
              </div>
              {/* Textový indikátor fáze dýchání - vpravo vedle času */}
              {isBreathing && (
                <motion.div
                  key={breathPhase}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                  className="pointer-events-none z-10 text-black font-medium text-clamp-time"
                >
                  {breathPhase === 'in' ? t('nadech') || 'nádech' : t('vydech') || 'výdech'}
                </motion.div>
              )}
            </div>
          </FramerSection>

          {/* Tři parametry: příprava, délka, rytmus - horizontálně pod kruhem */}
          <FramerSection
            className="mb-12"
            animationType="fadeIn"
            delay={0.3}
          >
            <div className="flex justify-center items-start gap-8 md:gap-12 mb-8">
              {/* Příprava */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    setShowDurationPicker(false);
                    setShowRhythmPicker(false);
                    setShowPreparationPicker(true);
                  }}
                  className="text-4xl md:text-5xl font-sans font-medium text-gray-800 hover:text-black transition-colors cursor-pointer mb-2"
                >
                  {formatPreparationTime(preparationTime)}
                </button>
                <span className="text-base md:text-lg font-serif text-gray-800 font-light">
                  {t('priprava') || 'příprava'}
                </span>
              </div>

              {/* Délka */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    setShowPreparationPicker(false);
                    setShowRhythmPicker(false);
                    setShowDurationPicker(true);
                  }}
                  className="text-4xl md:text-5xl font-sans font-medium text-gray-800 hover:text-black transition-colors cursor-pointer mb-2"
                >
                  {formatTime(totalTime)}
                </button>
                <span className="text-base md:text-lg font-serif text-gray-800 font-light">
                  {t('dlzka') || 'délka'}
                </span>
              </div>

              {/* Rytmus */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    setShowPreparationPicker(false);
                    setShowDurationPicker(false);
                    setShowRhythmPicker(true);
                  }}
                  className="text-4xl md:text-5xl font-sans font-medium text-gray-800 hover:text-black transition-colors cursor-pointer mb-2"
                >
                  {breathInDuration} : {breathOutDuration}
                </button>
                <span className="text-base md:text-lg font-serif text-gray-800 font-light">
                  {t('rytmus') || 'rytmus'}
                </span>
              </div>
            </div>
          </FramerSection>

          {/* Reset tlačítko - bílé kulaté tlačítko s dark grey refresh ikonou */}
          <FramerSection
            className="flex justify-center"
            animationType="fadeIn"
            delay={0.4}
          >
            <button
              onClick={handleReset}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <RotateCcw size={28} className="text-gray-800" />
            </button>
          </FramerSection>
        </div>

        {/* Modaly */}
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
            setShowSoundGallery(true);
          }}
        />

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
            setShowSoundGallery(true);
          }}
        />

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
            setShowSoundGallery(true);
          }}
        />

        {/* Galerie zvuků */}
        <SoundThemeGallery
          isOpen={showSoundGallery}
          onClose={() => setShowSoundGallery(false)}
          onSelectSound={onBreathSoundChange}
          selectedInSound={breathInSound}
          selectedOutSound={breathOutSound}
        />
      </div>
    </FramerPageTransition>
  );
};

export default BreathScreen;