import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Music2 } from 'lucide-react';
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
  isPreparing,
  preparationCountdown,
  breathDuration,
  breathTime,
  setBreathTime,
  isBreathing,
  setIsBreathing,
  onBreathDurationChange,
  onReset,
  breathInSound,
  breathOutSound,
  breathClickSound,
  breathFinalSound,
  breathCountdownSound,
  breathSoundFadeEnabled,
  onBreathSoundChange
}) => {
  const { t } = useLanguage();
  const [showPreparationPicker, setShowPreparationPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showRhythmPicker, setShowRhythmPicker] = useState(false);
  const [showSoundGallery, setShowSoundGallery] = useState(false);

  // Lokální state pro přípravný čas (vždy používáme lokální state pro BreathScreen)
  const [localIsPreparing, setLocalIsPreparing] = useState(false);
  const [localPreparationCountdown, setLocalPreparationCountdown] = useState(0);
  const previousIsPreparingRef = useRef(isPreparing);
  const countdownSoundRef = useRef(null);
  const [countdownSoundUrl, setCountdownSoundUrl] = useState(null);
  const previousCountdownRef = useRef(null);

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

  // Načtení URL pro countdown zvuk
  useEffect(() => {
    console.log('🔊 Loading countdown sound:', breathCountdownSound);
    if (breathCountdownSound === 'none' || !breathCountdownSound) {
      console.log('🔊 Countdown sound is "none" or empty, setting URL to null');
      setCountdownSoundUrl(null);
      return;
    }

    const loadCountdownSoundUrl = async () => {
      try {
        const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
        const metadata = await realtimeMetadataService.getFileMetadata(breathCountdownSound);
        console.log('🔊 Countdown sound metadata:', metadata);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          const url = metadata.downloadURL || metadata.audioSrc;
          console.log('🔊 Setting countdown sound URL:', url);
          setCountdownSoundUrl(url);
        } else {
          console.warn('⚠️ Countdown sound metadata missing downloadURL or audioSrc');
          setCountdownSoundUrl(null);
        }
      } catch (error) {
        console.error('Failed to load countdown sound URL:', error);
        setCountdownSoundUrl(null);
      }
    };

    loadCountdownSoundUrl();
  }, [breathCountdownSound]);

  // Přehrání countdown zvuku při změně odpočítávání
  useEffect(() => {
    // Debug logování
    console.log('🔊 Countdown sound effect:', {
      localIsPreparing,
      countdownSoundUrl,
      localPreparationCountdown,
      breathCountdownSound,
      previousCountdown: previousCountdownRef.current
    });

    // Reset previousCountdownRef když se příprava zastaví
    if (!localIsPreparing) {
      previousCountdownRef.current = null;
      // Zastav a zruš audio element při zastavení přípravy
      if (countdownSoundRef.current) {
        countdownSoundRef.current.pause();
        countdownSoundRef.current.src = '';
        countdownSoundRef.current = null;
      }
      return;
    }

    // Přehrát zvuk při každé změně countdownu, pokud je zvuk nastaven
    if (localIsPreparing && localPreparationCountdown > 0 && countdownSoundUrl) {
      // Přehrát zvuk pouze když se countdown změní (ne při každém renderu)
      if (previousCountdownRef.current !== localPreparationCountdown) {
        console.log('🔊 Playing countdown sound for countdown:', localPreparationCountdown);

        // Vytvoř nový audio element pro každé přehrání (podobně jako finální zvuk)
        // Zastav předchozí přehrávání, pokud běží
        if (countdownSoundRef.current) {
          countdownSoundRef.current.pause();
          countdownSoundRef.current.src = '';
          countdownSoundRef.current = null;
        }

        try {
          // Vytvoř nový audio element a přehraj ho
          const audio = new Audio(countdownSoundUrl);
          audio.volume = 1;
          countdownSoundRef.current = audio;

          audio.play().catch((error) => {
            console.warn('Failed to play countdown sound:', error);
            countdownSoundRef.current = null;
          });
        } catch (error) {
          console.warn('Error playing countdown sound:', error);
          countdownSoundRef.current = null;
        }

        previousCountdownRef.current = localPreparationCountdown;
      }
    } else {
      // Debug proč se zvuk nepřehrává
      if (localIsPreparing && localPreparationCountdown > 0) {
        if (!countdownSoundUrl) {
          console.log('⚠️ Countdown sound not playing: no sound URL (breathCountdownSound:', breathCountdownSound, ')');
        }
      }
    }
  }, [localIsPreparing, localPreparationCountdown, countdownSoundUrl, breathCountdownSound]);

  // Timer logika pro dýchání - odpočítávání času
  useEffect(() => {
    let interval;
    if (isBreathing) {
      interval = setInterval(() => {
        setBreathTime(prev => {
          if (prev <= 1) {
            // Přehrát finální zvuk, když meditace končí
            if (prev === 1 && breathFinalSound && breathFinalSound !== 'none') {
              playFinalSound();
            }
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
  }, [isBreathing, setBreathTime, setIsBreathing, breathFinalSound]);

  // Funkce pro přehrání finálního zvuku
  const playFinalSound = async () => {
    if (!breathFinalSound || breathFinalSound === 'none') return;

    try {
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
      const metadata = await realtimeMetadataService.getFileMetadata(breathFinalSound);
      if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
        const audio = new Audio(metadata.downloadURL || metadata.audioSrc);
        audio.volume = 1;
        audio.play().catch((error) => {
          console.warn('Failed to play final sound:', error);
        });
      }
    } catch (error) {
      console.error('Error playing final sound:', error);
    }
  };

  // Handler pro play/pause s podporou přípravného času
  const handlePlayPause = () => {
    console.log('🔊 handlePlayPause called', { isBreathing, currentIsPreparing, preparationTime });

    // Pokud už dýchání probíhá, zastav ho
    if (isBreathing) {
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

  // Odpočítávání času přípravy
  useEffect(() => {
    let interval;
    if (localIsPreparing && localPreparationCountdown > 0) {
      interval = setInterval(() => {
        setLocalPreparationCountdown(prev => {
          const newCountdown = prev - 1;
          if (newCountdown <= 0) {
            // Po dokončení přípravy spusť dýchání
            setLocalIsPreparing(false);
            if (breathTime <= 0) {
              const newTime = breathDuration * 60;
              setBreathTime(newTime);
            }
            setIsBreathing(true);
            return 0;
          }
          return newCountdown;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [localIsPreparing, localPreparationCountdown, breathTime, breathDuration, setBreathTime, setIsBreathing]);

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

  // Pokud probíhá příprava, zobraz odpočítávání přípravy
  if (currentIsPreparing) {
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
            <FramerSection
              className="text-center mb-16"
              animationType="fadeIn"
              delay={0.1}
            >
              <h1 className="text-5xl font-light mb-2">
                {t('priprava') || 'příprava'}
              </h1>
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
                  progress={currentPreparationCountdown > 0 && preparationTime > 0 ? ((preparationTime - currentPreparationCountdown) / preparationTime) * 100 : 0}
                  onSeek={null}
                  className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
                />

                {/* Odpočítávání v centru */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
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

              {/* Text pod odpočítáváním */}
              <div className="mt-6 text-center">
                <div className="text-black font-medium text-xl">
                  {t('pripravaNaMeditaci') || 'Příprava na meditaci'}
                </div>
              </div>
            </FramerSection>

            <FramerSection
              className="flex justify-center gap-6 mb-6"
              animationType="fadeIn"
              delay={0.3}
            >
              <FramerButton
                onClick={handlePlayPause}
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
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-5xl font-serif text-gray-800 leading-normal pb-3 overflow-visible" style={{ lineHeight: '1.2' }}>
              {t('dychanie') || 'dýchání'}
            </h1>
          </FramerSection>

          {/* CircularProgress s tmavě šedým kruhem a bílou play ikonou - stejný jako v hudbě */}
          <FramerSection
            className="mb-6 flex flex-col items-center"
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
                <div className="pointer-events-auto">
                  <PlayPauseButton
                    isPlaying={isBreathing}
                    onToggle={handlePlayPause}
                    className="w-[18vw] h-[18vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px] sm:w-[16vw] sm:h-[16vw] sm:max-w-[140px] sm:max-h-[140px] sm:min-w-[100px] sm:min-h-[100px]"
                  />
                </div>
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
            <div className="flex items-center justify-center mt-4 mb-2 pointer-events-auto w-full gap-4">
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
            className="mb-6"
            animationType="fadeIn"
            delay={0.3}
          >
            <div className="flex justify-center items-start gap-8 md:gap-12 mb-4">
              {/* Příprava */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    setShowDurationPicker(false);
                    setShowRhythmPicker(false);
                    setShowPreparationPicker(true);
                  }}
                  className="text-4xl md:text-5xl font-sans font-medium text-gray-800 hover:text-black transition-colors cursor-pointer mb-1"
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
                  className="text-4xl md:text-5xl font-sans font-medium text-gray-800 hover:text-black transition-colors cursor-pointer mb-1"
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
                  className="text-4xl md:text-5xl font-sans font-medium text-gray-800 hover:text-black transition-colors cursor-pointer mb-1"
                >
                  {breathInDuration} : {breathOutDuration}
                </button>
                <span className="text-base md:text-lg font-serif text-gray-800 font-light">
                  {t('rytmus') || 'rytmus'}
                </span>
              </div>
            </div>
          </FramerSection>

          {/* Reset tlačítko a tlačítko pro zvukovou galerii - vedle sebe */}
          <FramerSection
            className="flex justify-center gap-4"
            animationType="fadeIn"
            delay={0.4}
          >
            {/* Reset tlačítko - bílé kulaté tlačítko s dark grey refresh ikonou */}
            <button
              onClick={handleReset}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              title={t('reset') || 'Reset'}
            >
              <RotateCcw size={28} className="text-gray-800" />
            </button>

            {/* Tlačítko pro zvukovou galerii - bílé kulaté tlačítko s dark grey notičkou */}
            <button
              onClick={() => setShowSoundGallery(true)}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              title={t('zvukovaGalerie') || 'Zvuková galerie'}
            >
              <Music2 size={28} className="text-gray-800" />
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
          selectedClickSound={breathClickSound}
          selectedFinalSound={breathFinalSound}
          selectedCountdownSound={breathCountdownSound}
        />
      </div>
    </FramerPageTransition>
  );
};

export default BreathScreen;