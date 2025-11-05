import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Music2, Bookmark } from 'lucide-react';
import { FramerSection, FramerPageTransition, BackButton, FramerButton } from '@components';
import CircularProgress from '@features/audio/components/CircularProgress';
import PlayPauseButton from '@features/audio/components/PlayPauseButton';
import CurrentTimeDisplay from '@features/audio/components/CurrentTimeDisplay';
import { useLanguage } from '@contexts/LanguageContext';
import { useBreathSounds } from '@hooks';
import { useBreathPhase } from '@hooks/useBreathPhase';

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
        const { ref, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('@services/firebase');

        const metadata = await realtimeMetadataService.getFileMetadata(breathCountdownSound);
        console.log('🔊 Countdown sound metadata:', metadata);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          const url = metadata.downloadURL || metadata.audioSrc;
          console.log('🔊 Setting countdown sound URL:', url);
          setCountdownSoundUrl(url);
        } else {
          // Pokud není v metadata, zkus načíst přímo z Firebase Storage
          console.log('🔊 Metadata missing URL, trying Firebase Storage directly');
          try {
            const audioRef = ref(storage, breathCountdownSound);
            const url = await getDownloadURL(audioRef);
            console.log('🔊 Setting countdown sound URL from Firebase Storage:', url);
            setCountdownSoundUrl(url);
          } catch (storageError) {
            console.warn('⚠️ Failed to load countdown sound from Firebase Storage:', storageError);
            setCountdownSoundUrl(null);
          }
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
        const audio = countdownSoundRef.current;
        // Vyčisti fade out timeout, pokud existuje
        if (audio._fadeOutTimeout) {
          clearTimeout(audio._fadeOutTimeout);
        }
        audio.pause();
        audio.src = '';
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
          audio.volume = 1; // Začni na plné hlasitosti (bez fade in)
          countdownSoundRef.current = audio;

          // Funkce pro nastavení fade out na konci zvuku
          const setupFadeOut = () => {
            const soundDuration = audio.duration;
            if (!soundDuration || isNaN(soundDuration) || soundDuration <= 0) {
              return;
            }

            // Fade out trvá 0.3 sekundy (pro krátké zvuky)
            const fadeOutDuration = Math.min(0.3, soundDuration * 0.5); // Max 30% délky zvuku nebo 0.3s
            const fadeOutStartTime = soundDuration - fadeOutDuration;

            // Spusť fade out před koncem zvuku
            const fadeOutTimeout = setTimeout(() => {
              if (audio && !audio.paused) {
                const startVolume = audio.volume || 1;
                const fps = 60;
                const stepTime = 1000 / fps;
                const totalSteps = Math.max(5, Math.floor((fadeOutDuration * 1000) / stepTime));
                let currentStep = 0;

                const fadeOutInterval = setInterval(() => {
                  currentStep++;
                  const progress = Math.min(1, currentStep / totalSteps);
                  audio.volume = Math.max(0, startVolume * (1 - progress));

                  if (currentStep >= totalSteps || audio.volume <= 0) {
                    clearInterval(fadeOutInterval);
                    audio.volume = 0;
                  }
                }, stepTime);
              }
            }, fadeOutStartTime * 1000);

            // Ulož timeout pro případné vyčištění
            audio._fadeOutTimeout = fadeOutTimeout;
          };

          // Zjisti délku zvuku a nastav fade out
          audio.addEventListener('loadedmetadata', setupFadeOut, { once: true });

          // Pokud už jsou metadata načtená, zavolej okamžitě
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            setupFadeOut();
          }

          audio.play().catch((error) => {
            console.warn('Failed to play countdown sound:', error);
            if (audio._fadeOutTimeout) {
              clearTimeout(audio._fadeOutTimeout);
            }
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

  // Ref pro kontrolu, zda už byl finální zvuk přehrán
  const finalSoundPlayedRef = useRef(false);
  // Ref pro označení, že čekáme na dokončení dýchacího cyklu před finálním zvukem
  const waitingForCycleCompletionRef = useRef(false);
  // Ref pro timeout dokončení cyklu
  const completionTimeoutRef = useRef(null);
  // Ref pro uložení aktuální fáze při začátku čekání
  const waitingPhaseRef = useRef(null);
  // Ref pro uložení aktuální breathPhase (aby se useEffect nespouštěl při každé změně)
  const currentPhaseRef = useRef(breathPhase);

  // Aktualizuj ref při změně fáze
  useEffect(() => {
    currentPhaseRef.current = breathPhase;
  }, [breathPhase]);

  // Funkce pro přehrání finálního zvuku
  const playFinalSound = useCallback(async () => {
    console.log('🔊 playFinalSound called', { breathFinalSound, alreadyPlayed: finalSoundPlayedRef.current });

    if (!breathFinalSound || breathFinalSound === 'none') {
      console.log('⚠️ No final sound configured');
      return;
    }

    if (finalSoundPlayedRef.current) {
      console.log('⚠️ Final sound already played');
      return;
    }

    // Označ, že finální zvuk byl přehrán
    finalSoundPlayedRef.current = true;

    try {
      console.log('🔍 Loading final sound metadata:', breathFinalSound);
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
      const { ref, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('@services/firebase');

      let url = null;

      // Zkus načíst z metadata
      const metadata = await realtimeMetadataService.getFileMetadata(breathFinalSound);
      console.log('📦 Final sound metadata:', metadata);

      if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
        url = metadata.downloadURL || metadata.audioSrc;
        console.log('✅ Found URL in metadata:', url);
      } else {
        // Pokud není v metadata, zkus načíst přímo z Firebase Storage (fallback)
        console.log('⚠️ Metadata missing, trying Firebase Storage directly');
        try {
          const audioRef = ref(storage, breathFinalSound);
          url = await getDownloadURL(audioRef);
          console.log('✅ Found URL from Firebase Storage:', url);
        } catch (storageError) {
          console.error('❌ Failed to load final sound from Firebase Storage:', storageError);
          finalSoundPlayedRef.current = false;
          return;
        }
      }

      if (url) {
        console.log('▶️ Playing final sound from URL:', url);
        const audio = new Audio(url);
        audio.volume = 1;
        audio.play().catch((error) => {
          console.error('❌ Failed to play final sound:', error);
          // Resetuj flag při chybě, aby se mohl zkusit znovu
          finalSoundPlayedRef.current = false;
        });
        console.log('✅ Final sound playback started');
      } else {
        console.warn('⚠️ No download URL found');
        finalSoundPlayedRef.current = false;
      }
    } catch (error) {
      console.error('❌ Error playing final sound:', error);
      // Resetuj flag při chybě
      finalSoundPlayedRef.current = false;
    }
  }, [breathFinalSound]);

  // Resetuj flagy když se spustí nové dýchání
  useEffect(() => {
    if (isBreathing) {
      finalSoundPlayedRef.current = false;
      waitingForCycleCompletionRef.current = false;
      waitingPhaseRef.current = null;
    }
  }, [isBreathing]);

  // Ref pro interval timeru
  const breathTimerIntervalRef = useRef(null);

  // Timer logika pro dýchání - odpočítávání času
  useEffect(() => {
    // Vyčisti předchozí interval, pokud existuje
    if (breathTimerIntervalRef.current) {
      clearInterval(breathTimerIntervalRef.current);
      breathTimerIntervalRef.current = null;
    }

    if (isBreathing && !waitingForCycleCompletionRef.current) {
      breathTimerIntervalRef.current = setInterval(() => {
        // Zkontroluj na začátku každého ticku, zda už čekáme (ochrana proti duplicitnímu spuštění)
        if (waitingForCycleCompletionRef.current) {
          // Pokud už čekáme, zastav interval a ukonči
          if (breathTimerIntervalRef.current) {
            clearInterval(breathTimerIntervalRef.current);
            breathTimerIntervalRef.current = null;
          }
          return;
        }

        setBreathTime(prev => {
          // Pokud je čas 0 nebo méně, začni čekat na dokončení cyklu
          if (prev <= 0) {
            // Zkontroluj znovu, zda už čekáme (dvojitá ochrana)
            if (waitingForCycleCompletionRef.current) {
              return 0;
            }

            // Zastav interval OKAMŽITĚ
            if (breathTimerIntervalRef.current) {
              clearInterval(breathTimerIntervalRef.current);
              breathTimerIntervalRef.current = null;
            }

            // Označ, že čekáme na dokončení cyklu (PŘED nastavením timeoutu)
            waitingForCycleCompletionRef.current = true;

            // Použij aktuální fázi z refu (ne z props, aby se to neměnilo při re-renderu)
            const currentPhase = currentPhaseRef.current;
            console.log('⏰ Breath time reached 0, stopping timer and waiting for cycle completion', { currentPhase, breathInDuration, breathOutDuration });

            // Ulož aktuální fázi pro výpočet čekacího času
            waitingPhaseRef.current = currentPhase;

            // Vypočti, kolik času zbývá do dokončení aktuální fáze (použij uloženou fázi)
            const currentPhaseDuration = currentPhase === 'in' ? breathInDuration : breathOutDuration;
            const fadeOutDuration = 1.5; // Délka fade out
            const silenceDuration = 1.0; // 1 sekunda ticha před finálním zvukem
            const totalWaitTime = (currentPhaseDuration * 1000) + (fadeOutDuration * 1000) + (silenceDuration * 1000);

            console.log(`⏳ Waiting ${totalWaitTime}ms for cycle completion (phase: ${currentPhase}, duration: ${currentPhaseDuration}s + fade: ${fadeOutDuration}s + silence: ${silenceDuration}s)`);

            // Vyčisti předchozí timeout, pokud existuje (ochrana proti duplicitnímu timeoutu)
            if (completionTimeoutRef.current) {
              clearTimeout(completionTimeoutRef.current);
              completionTimeoutRef.current = null;
            }

            // Počkej na dokončení aktuální fáze + fade out + 1 sekunda ticha, pak přehraj finální zvuk
            completionTimeoutRef.current = setTimeout(() => {
              console.log('✅ Cycle completed, playing final sound and stopping breathing');
              if (breathFinalSound && breathFinalSound !== 'none') {
                playFinalSound();
              } else {
                console.log('⚠️ No final sound configured');
              }
              setIsBreathing(false);
              waitingForCycleCompletionRef.current = false;
              waitingPhaseRef.current = null;
              completionTimeoutRef.current = null;
            }, totalWaitTime);

            return 0;
          }
          // Jinak sniž čas o 1 sekundu
          return prev - 1;
        });
      }, 1000);
    } else {
      // Resetuj flagy a vyčisti timeout když se dýchání zastaví
      if (!isBreathing) {
        waitingForCycleCompletionRef.current = false;
        waitingPhaseRef.current = null;
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
      }
    }

    return () => {
      if (breathTimerIntervalRef.current) {
        clearInterval(breathTimerIntervalRef.current);
        breathTimerIntervalRef.current = null;
      }
      // NEDELAJ cleanup timeoutu tady - to by mohlo zrušit timeout předčasně
      // Timeout se vyčistí buď v else bloku výše, nebo po dokončení
    };
  }, [isBreathing, setBreathTime, setIsBreathing, breathFinalSound, playFinalSound, breathInDuration, breathOutDuration]);

  // Handler pro play/pause s podporou přípravného času
  const handlePlayPause = () => {
    console.log('🔊 handlePlayPause called', { isBreathing, currentIsPreparing, preparationTime });

    // Pokud už dýchání probíhá, zastav ho
    if (isBreathing) {
      // Vyčisti timeout a flagy, pokud čekáme na dokončení cyklu
      waitingForCycleCompletionRef.current = false;
      waitingPhaseRef.current = null;
      if (completionTimeoutRef.current) {
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

  // Odpočítávání času přípravy
  useEffect(() => {
    let interval;
    if (localIsPreparing && localPreparationCountdown > 0) {
      interval = setInterval(() => {
        setLocalPreparationCountdown(prev => {
          const newCountdown = prev - 1;
          if (newCountdown <= 0) {
            // Po dokončení přípravy spusť dýchání - použij setTimeout, aby se to nestalo během renderu
            setTimeout(() => {
              setLocalIsPreparing(false);
              if (breathTime <= 0) {
                const newTime = breathDuration * 60;
                setBreathTime(newTime);
              }
              setIsBreathing(true);
            }, 0);
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
          {/* Nadpis - velký elegantní serif font - dynamicky se mění podle stavu dýchání */}
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <motion.h1
              key={isBreathing ? breathPhase : 'default'}
              className="text-5xl font-serif text-gray-800 leading-normal pb-3 overflow-visible"
              style={{ lineHeight: '1.2' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              {isBreathing
                ? (breathPhase === 'in' ? t('nadech') || 'nádech' : t('vydech') || 'výdech')
                : t('dychanie') || 'dýchání'
              }
            </motion.h1>
            {/* Current Time Display - pod nadpisem */}
            <div className="flex items-center justify-center mt-4 mb-2 pointer-events-auto w-full gap-4">
              <div className="pointer-events-none z-10 text-center">
                <CurrentTimeDisplay
                  currentTime={totalTime - breathTime}
                  formatTime={formatTime}
                  className="text-black font-medium text-center text-clamp-time"
                />
              </div>
            </div>
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
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Animace s maskou - bílý kruh uprostřed, černý okolo, vycentrovaná na tlačítko */}
                  <motion.div
                    className="rounded-full"
                    style={{
                      width: '45vw',
                      height: '45vw',
                      maxWidth: '330px',
                      maxHeight: '330px',
                      minWidth: '200px',
                      minHeight: '200px',
                      background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) 25%, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.05) 100%)',
                      transformOrigin: 'center center',
                    }}
                    initial={{ opacity: 0 }}
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
                    exit={{ opacity: 0 }}
                    transition={isBreathing ? {
                      duration: breathPhase === 'in' ? breathInDuration : breathOutDuration,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "reverse"
                    } : {
                      duration: 0.5
                    }}
                  />
                </div>
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

          {/* Reset tlačítko, tlačítko pro zvukovou galerii a tlačítko pro profily - vedle sebe */}
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
              onClick={() => onNavigateToScreen('sound-theme-gallery')}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              title={t('zvukovaGalerie') || 'Zvuková galerie'}
            >
              <Music2 size={28} className="text-gray-800" />
            </button>

            {/* Tlačítko pro profily dýchání - bílé kulaté tlačítko s dark grey bookmark ikonou */}
            <button
              onClick={() => onNavigateToScreen('breath-profiles')}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              title={t('profilyDychani') || 'Profily dýchání'}
            >
              <Bookmark size={28} className="text-gray-800" />
            </button>
          </FramerSection>
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