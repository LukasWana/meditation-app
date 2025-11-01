import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import SoundThemeGallery from '@components/SoundThemeGallery';
import CircularProgress from '@features/audio/components/CircularProgress';
import PlayPauseButton from '@features/audio/components/PlayPauseButton';
import { useLanguage } from '@contexts/LanguageContext';
import { useBreathSounds } from '@hooks';

const MeditationScreen = ({
  time,
  selectedDuration,
  isPlaying,
  breathPhase,
  breathInDuration,
  breathOutDuration,
  breathInSound,
  breathOutSound,
  breathSoundFadeEnabled,
  onDurationChange,
  onPlayPause,
  onReset,
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onBreathSoundChange
}) => {
  const { t } = useLanguage();
  const [showGallery, setShowGallery] = useState(false);

  // Použij hook pro přehrávání zvuků dýchání
  useBreathSounds(
    isPlaying,
    breathPhase,
    breathInSound,
    breathOutSound,
    breathSoundFadeEnabled,
    breathInDuration,
    breathOutDuration
  );

  // Vypočítat progress pro CircularProgress (0-100)
  const totalTime = selectedDuration * 60; // v sekundách
  const progress = totalTime > 0 ? ((totalTime - time) / totalTime) * 100 : 0;

  // Formátování času
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  return (
    <FramerPageTransition screenKey="meditation">
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('home')} />

        <div className="max-w-md w-full mt-16">
          <FramerSection
            className="text-center mb-16"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-5xl font-light mb-2">
              {t('meditacia')}
            </h1>
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
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <CircularProgress
                progress={progress}
                onSeek={null} // Pro meditaci nepotřebujeme seek
                className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
              />

              {/* Play/Pause Button - Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <PlayPauseButton
                  isPlaying={isPlaying}
                  onToggle={onPlayPause}
                  className="w-[18vw] h-[18vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px] sm:w-[16vw] sm:h-[16vw] sm:max-w-[140px] sm:max-h-[140px] sm:min-w-[100px] sm:min-h-[100px]"
                />
              </div>

              {/* Dýchací animace během meditace - overlay na CircularProgress */}
              {isPlaying && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="w-[45vw] h-[45vw] max-w-[350px] max-h-[350px] min-w-[220px] min-h-[220px] rounded-full bg-black/5"
                    animate={isPlaying ? {
                      scale: breathPhase === 'in'
                        ? [1.0, 0.2]  // Nádech - zmenšování až na 20%
                        : breathPhase === 'out'
                        ? [0.2, 1.0]  // Výdech - zvětšování
                        : 1.0,
                      opacity: [0.6, 1, 0.6]
                    } : {
                      scale: 1.0,
                      opacity: 0.6
                    }}
                    transition={isPlaying ? {
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

            {/* Current Time Display - pod CircularProgress */}
            <div className="mt-6 text-center">
              <div className="text-black font-medium text-2xl">
                {formatTime(time)}
              </div>
            </div>
          </FramerSection>

          {!isPlaying && (
            <FramerSection
              className="flex justify-center gap-4 mb-12 flex-wrap"
              animationType="fadeIn"
              delay={0.3}
            >
              {[3, 7, 9, 16, 21].map((mins, index) => (
                <FramerButton
                  key={mins}
                  onClick={() => onDurationChange(mins)}
                  variant={selectedDuration === mins ? 'rounded' : 'secondary'}
                  className="w-16 h-16 rounded-full flex items-center justify-center p-0"
                >
                  <span>
                    {mins}
                  </span>
                </FramerButton>
              ))}
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
        <SoundThemeGallery
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onSelectSound={onBreathSoundChange}
          selectedInSound={breathInSound}
          selectedOutSound={breathOutSound}
          layout="list"
        />
      </div>
    </FramerPageTransition>
  );
};

export default MeditationScreen;
