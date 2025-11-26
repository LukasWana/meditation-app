import { useEffect, useRef, useState } from 'react';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@services/firebase';

/**
 * Hook pro přehrávání zvuků dýchání s fade in/out efekty
 * Používá MP3 soubory z kategorie "hudba" z Firebase
 */
export const useBreathSounds = (
  isPlaying,
  breathPhase,
  breathInSound,
  breathOutSound,
  breathClickSound,
  breathSoundFadeEnabled,
  breathInDuration,
  breathOutDuration
) => {
  const inSoundRef = useRef(null);
  const outSoundRef = useRef(null);
  const clickSoundRef = useRef(null);
  const inFadeIntervalRef = useRef(null);
  const outFadeIntervalRef = useRef(null);
  const inFadeOutTimeoutRef = useRef(null);
  const outFadeOutTimeoutRef = useRef(null);
  const previousPhaseRef = useRef(null);
  const pendingPhaseRef = useRef(null); // Fáze, která čeká na spuštění
  const [inSoundUrl, setInSoundUrl] = useState(null);
  const [outSoundUrl, setOutSoundUrl] = useState(null);
  const [clickSoundUrl, setClickSoundUrl] = useState(null);

  // Načtení URL pro nádech zvuk
  useEffect(() => {
    if (breathInSound === 'none') {
      setInSoundUrl(null);
      return;
    }

    const loadSoundUrl = async (retryCount = 0) => {
      try {
        // Zkus načíst z metadata
        const metadata = await realtimeMetadataService.getFileMetadata(breathInSound);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          setInSoundUrl(metadata.downloadURL || metadata.audioSrc);
          return;
        }

        // Pokud metadata ještě nejsou připravena, počkej a zkus znovu (max 5 pokusů)
        if (retryCount < 5) {
          setTimeout(() => {
            loadSoundUrl(retryCount + 1);
          }, 500);
          return;
        }

        // Pokud není v metadata, zkus načíst přímo z Firebase Storage
        const audioRef = ref(storage, breathInSound);
        const url = await getDownloadURL(audioRef);
        setInSoundUrl(url);
      } catch (error) {
        // Pokud je to první pokus a metadata nejsou připravena, zkus znovu
        if (retryCount < 5 && error.message?.includes('not ready')) {
          setTimeout(() => {
            loadSoundUrl(retryCount + 1);
          }, 500);
          return;
        }
        console.error('Failed to load breath in sound URL:', error);
        setInSoundUrl(null);
      }
    };

    loadSoundUrl();
  }, [breathInSound]);

  // Načtení URL pro výdech zvuk
  useEffect(() => {
    if (breathOutSound === 'none') {
      setOutSoundUrl(null);
      return;
    }

    const loadSoundUrl = async (retryCount = 0) => {
      try {
        // Zkus načíst z metadata
        const metadata = await realtimeMetadataService.getFileMetadata(breathOutSound);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          const url = metadata.downloadURL || metadata.audioSrc;
          setOutSoundUrl(url);
          return;
        }

        // Pokud metadata ještě nejsou připravena, počkej a zkus znovu (max 5 pokusů)
        if (retryCount < 5) {
          setTimeout(() => {
            loadSoundUrl(retryCount + 1);
          }, 500);
          return;
        }

        // Pokud není v metadata, zkus načíst přímo z Firebase Storage
        const audioRef = ref(storage, breathOutSound);
        const url = await getDownloadURL(audioRef);
        setOutSoundUrl(url);
      } catch (error) {
        // Pokud je to první pokus a metadata nejsou připravena, zkus znovu
        if (retryCount < 5 && error.message?.includes('not ready')) {
          setTimeout(() => {
            loadSoundUrl(retryCount + 1);
          }, 500);
          return;
        }
        console.error('Failed to load breath out sound URL:', error);
        setOutSoundUrl(null);
      }
    };

    loadSoundUrl();
  }, [breathOutSound]);

  // Načtení URL pro kliknutí zvuk
  useEffect(() => {
    if (breathClickSound === 'none') {
      setClickSoundUrl(null);
      return;
    }

    const loadSoundUrl = async (retryCount = 0) => {
      try {
        // Zkus načíst z metadata
        const metadata = await realtimeMetadataService.getFileMetadata(breathClickSound);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          setClickSoundUrl(metadata.downloadURL || metadata.audioSrc);
          return;
        }

        // Pokud metadata ještě nejsou připravena, počkej a zkus znovu (max 5 pokusů)
        if (retryCount < 5) {
          setTimeout(() => {
            loadSoundUrl(retryCount + 1);
          }, 500);
          return;
        }

        // Pokud není v metadata, zkus načíst přímo z Firebase Storage
        const audioRef = ref(storage, breathClickSound);
        const url = await getDownloadURL(audioRef);
        setClickSoundUrl(url);
      } catch (error) {
        // Pokud je to první pokus a metadata nejsou připravena, zkus znovu
        if (retryCount < 5 && error.message?.includes('not ready')) {
          setTimeout(() => {
            loadSoundUrl(retryCount + 1);
          }, 500);
          return;
        }
        console.error('Failed to load breath click sound URL:', error);
        setClickSoundUrl(null);
      }
    };

    loadSoundUrl();
  }, [breathClickSound]);

  // Inicializace audio elementů
  useEffect(() => {
    // Vyčisti staré audio elementy
    if (inSoundRef.current) {
      inSoundRef.current.pause();
      inSoundRef.current = null;
    }
    if (outSoundRef.current) {
      outSoundRef.current.pause();
      outSoundRef.current = null;
    }

    // Vytvoř nové audio elementy s načtenými URL
    if (inSoundUrl && !inSoundRef.current) {
      inSoundRef.current = new Audio(inSoundUrl);
      inSoundRef.current.loop = false; // Zvuk se přehrává jen jednou
      inSoundRef.current.volume = 0;
      inSoundRef.current.preload = 'auto';
    }

    if (outSoundUrl && !outSoundRef.current) {
      outSoundRef.current = new Audio(outSoundUrl);
      outSoundRef.current.loop = false; // Zvuk se přehrává jen jednou
      outSoundRef.current.volume = 0;
      outSoundRef.current.preload = 'auto';
    }

    if (clickSoundUrl && !clickSoundRef.current) {
      clickSoundRef.current = new Audio(clickSoundUrl);
      clickSoundRef.current.loop = false;
      clickSoundRef.current.volume = 1;
      clickSoundRef.current.preload = 'auto';
    }

    return () => {
      if (inFadeIntervalRef.current) {
        clearInterval(inFadeIntervalRef.current);
      }
      if (outFadeIntervalRef.current) {
        clearInterval(outFadeIntervalRef.current);
      }
      if (inFadeOutTimeoutRef.current) {
        clearTimeout(inFadeOutTimeoutRef.current);
      }
      if (outFadeOutTimeoutRef.current) {
        clearTimeout(outFadeOutTimeoutRef.current);
      }
    };
  }, [inSoundUrl, outSoundUrl, clickSoundUrl]);

  // Fade funkce - používají přesný čas pro nádech/výdech
  const fadeIn = (audio, durationSeconds, intervalRef) => {
    if (!audio) {
      return;
    }

    if (!breathSoundFadeEnabled) {
      audio.volume = 1;
      return;
    }

    // Počet kroků pro fade - více kroků = plynulejší fade
    // Použijeme 60 FPS pro plynulost (každých ~16ms)
    const fps = 60;
    const stepTime = 1000 / fps; // ~16ms mezi kroky
    const totalSteps = Math.max(10, Math.floor((durationSeconds * 1000) / stepTime));
    let currentStep = 0;

    // Vyčisti předchozí fade interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    audio.volume = 0;

    // Spusť fade in
    intervalRef.current = setInterval(() => {
      currentStep++;
      const progress = Math.min(1, currentStep / totalSteps);
      audio.volume = progress;

      if (currentStep >= totalSteps || progress >= 1) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        audio.volume = 1;
      }
    }, stepTime);
  };

  const fadeOut = (audio, durationSeconds, intervalRef, onComplete) => {
    if (!audio) {
      if (onComplete) onComplete();
      return;
    }

    if (!breathSoundFadeEnabled) {
      audio.volume = 0;
      audio.pause();
      audio.currentTime = 0;
      if (onComplete) onComplete();
      return;
    }

    // Počet kroků pro fade - více kroků = plynulejší fade
    const fps = 60;
    const stepTime = 1000 / fps; // ~16ms mezi kroky
    const totalSteps = Math.max(10, Math.floor((durationSeconds * 1000) / stepTime));
    let currentStep = 0;
    const startVolume = audio.volume || 1;

    // Vyčisti předchozí fade interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Spusť fade out
    intervalRef.current = setInterval(() => {
      currentStep++;
      const progress = Math.min(1, currentStep / totalSteps);
      audio.volume = Math.max(0, startVolume * (1 - progress));

      if (currentStep >= totalSteps || audio.volume <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        audio.volume = 0;
        audio.pause();
        audio.currentTime = 0;
        if (onComplete) onComplete();
      }
    }, stepTime);
  };

  // Hlavní logika přehrávání podle breathPhase
  useEffect(() => {
    if (!isPlaying) {
      // Zastav všechny zvuky a vyčisti fade intervaly
      if (inSoundRef.current) {
        fadeOut(inSoundRef.current, 1.5, inFadeIntervalRef);
      }
      if (outSoundRef.current) {
        fadeOut(outSoundRef.current, 1.5, outFadeIntervalRef);
      }
      previousPhaseRef.current = null;
      pendingPhaseRef.current = null;
      return;
    }

    // Pokud audio elementy nejsou inicializované, počkej na jejich načtení
    if ((breathInSound !== 'none' && !inSoundUrl) || (breathOutSound !== 'none' && !outSoundUrl)) {
      // Zvuky se ještě načítají, počkej
      return;
    }

    // Zkontroluj, zda se změnila fáze - PŘED aktualizací previousPhaseRef
    const isFirstStart = previousPhaseRef.current === null;
    const phaseChanged = !isFirstStart && previousPhaseRef.current !== breathPhase;

    // Získat aktuální zvuk podle fáze
    const currentSound = breathPhase === 'in'
      ? (breathInSound !== 'none' ? inSoundRef.current : null)
      : (breathOutSound !== 'none' ? outSoundRef.current : null);

    // Přehrát kliknutí na začátku každé fáze
    if ((phaseChanged || isFirstStart) && clickSoundRef.current && clickSoundUrl) {
      try {
        clickSoundRef.current.currentTime = 0;
        clickSoundRef.current.play().catch((error) => {
          console.warn('Failed to play click sound:', error);
        });
      } catch (error) {
        console.warn('Error playing click sound:', error);
      }
    }

    // Získat zvuk, který se má zastavit
    const soundToStop = breathPhase === 'in'
      ? (breathOutSound !== 'none' ? outSoundRef.current : null)
      : (breathInSound !== 'none' ? inSoundRef.current : null);

    // Délka fade out při změně fáze
    const fadeOutDuration = 1.5; // 1.5 sekundy fade out

    // Pomocná funkce pro spuštění nového zvuku
    const startNewSound = (phaseToPlay) => {
      // Použij zadanou fázi nebo aktuální
      const phase = phaseToPlay || breathPhase;
      const sound = phase === 'in'
        ? (breathInSound !== 'none' ? inSoundRef.current : null)
        : (breathOutSound !== 'none' ? outSoundRef.current : null);
      const duration = phase === 'in' ? breathInDuration : breathOutDuration;

      if (!sound) {
        return;
      }

      try {
        // Zjisti, zda je zvuk delší než fáze
        const soundDuration = sound.duration;
        const isLongSound = soundDuration && !isNaN(soundDuration) && soundDuration > duration;

        // Pokud zvuk běží a je delší než fáze, necháme ho pokračovat bez resetování
        if (isLongSound && !sound.paused && sound.currentTime > 0) {
          // Zvuk je dlouhý a běží - necháme ho pokračovat, jen nastavíme fade in
          // NEPAUZUJEME a NERESETUJEME
          const currentIntervalRef = phase === 'in' ? inFadeIntervalRef : outFadeIntervalRef;

          // Použij stejnou logiku pro výpočet fade in duration
          const soundDuration = sound.duration;
          const fadeInDuration = (soundDuration && !isNaN(soundDuration) && soundDuration < 2.0)
            ? Math.max(0.3, soundDuration * 0.3)
            : 1.5;

          fadeIn(sound, fadeInDuration, currentIntervalRef);
          return; // Ukonči funkci - zvuk už běží
        }

        // Pro krátké zvuky nebo při prvním spuštění: resetuj a spusť od začátku
        if (!sound.paused) {
          sound.pause();
        }
        sound.currentTime = 0;

        // Vyčisti předchozí fade out timeout
        const fadeOutTimeoutRef = phase === 'in' ? inFadeOutTimeoutRef : outFadeOutTimeoutRef;
        if (fadeOutTimeoutRef.current) {
          clearTimeout(fadeOutTimeoutRef.current);
          fadeOutTimeoutRef.current = null;
        }

        // Spusť přehrávání
        sound.play().catch((error) => {
          console.warn('Failed to play breath sound:', error);
        });

        const currentIntervalRef = phase === 'in' ? inFadeIntervalRef : outFadeIntervalRef;

        // Funkce pro výpočet optimální délky fade in podle délky zvuku
        const getFadeInDuration = () => {
          const soundDuration = sound.duration;

          // Pokud délka zvuku není známá, použij výchozí hodnotu
          if (!soundDuration || isNaN(soundDuration) || soundDuration <= 0) {
            return (isFirstStart && phase === 'in') ? 3.0 : 1.5;
          }

          // Pro krátké zvuky (kratší než 2 sekundy) použij kratší fade in
          // aby zvuk dosáhl plné hlasitosti před koncem
          if (soundDuration < 2.0) {
            // Pro velmi krátké zvuky (< 1.5s) použij ještě kratší fade in (20% nebo max 0.2s)
            // Pro ostatní krátké zvuky použij 30% délky, minimálně 0.2 sekundy
            if (soundDuration < 1.5) {
              // Velmi krátké zvuky - 20% délky, max 0.2 sekundy, min 0.15 sekundy
              return Math.max(0.15, Math.min(0.2, soundDuration * 0.2));
            } else {
              // Ostatní krátké zvuky - 30% délky, minimálně 0.2 sekundy
              return Math.max(0.2, soundDuration * 0.3);
            }
          }

          // Pro delší zvuky použij standardní fade in
          return (isFirstStart && phase === 'in') ? 3.0 : 1.5;
        };

        const fadeInDuration = getFadeInDuration();
        fadeIn(sound, fadeInDuration, currentIntervalRef);

        // Pomocná funkce pro nastavení fade out
        const setupFadeOut = () => {
          const soundDuration = sound.duration;

          if (!soundDuration || isNaN(soundDuration)) {
            return;
          }

          // Pokud je zvuk delší než fáze, NESPAŠ fade out - zvuk bude pokračovat
          // a při změně fáze se zastaví automaticky fade out mechanismem
          // Tím zabráníme přerušení dlouhých zvuků při opakovaných fázích
          if (soundDuration > duration) {
            // Zvuk je delší než fáze - necháme ho běžet bez fade out
            // Při změně fáze se zastaví automaticky
            return;
          } else {
            // Pokud je zvuk kratší než fáze, fade out na konci zvuku
            // Pro velmi krátké zvuky (< 2s) použij kratší fade out (0.2s) a spusť ho až na konci
            const fadeOutDuration = soundDuration < 2.0 ? 0.2 : 1.5;
            const fadeOutStartTime = Math.max(0, soundDuration - fadeOutDuration);

            fadeOutTimeoutRef.current = setTimeout(() => {
              if (sound && !sound.paused && sound.currentTime < soundDuration) {
                const fadeIntervalRef = phase === 'in' ? inFadeIntervalRef : outFadeIntervalRef;
                fadeOut(sound, fadeOutDuration, fadeIntervalRef);
              }
            }, fadeOutStartTime * 1000);
          }
        };

        // Zjisti délku zvuku a nastav fade out na konci fáze, pokud je zvuk delší
        sound.addEventListener('loadedmetadata', setupFadeOut, { once: true });

        // Pokud už jsou metadata načtená, zavolej okamžitě
        if (sound.duration && !isNaN(sound.duration)) {
          setupFadeOut();
        }
      } catch (error) {
        console.warn('Error playing breath sound:', error);
      }
    };

    // Při změně fáze: nejdříve fade out předchozího zvuku, poté spusť nový
    // Kontrolujeme, zda zvuk skutečně běží (není pauzovaný a má currentTime > 0)
    const isSoundPlaying = soundToStop && !soundToStop.paused && soundToStop.currentTime > 0;

    if (phaseChanged && soundToStop && isSoundPlaying) {
      // Zvuk běží - zastav ho fade out a pak spusť nový
      pendingPhaseRef.current = breathPhase;

      const stopIntervalRef = breathPhase === 'in' ? outFadeIntervalRef : inFadeIntervalRef;
      // Fade out předchozího zvuku (1.5 sekundy), poté spusť nový
      fadeOut(soundToStop, fadeOutDuration, stopIntervalRef, () => {
        // Po dokončení fade out spusť nový zvuk pro čekající fázi
        const nextPhase = pendingPhaseRef.current;
        pendingPhaseRef.current = null;
        if (nextPhase) {
          startNewSound(nextPhase);
        }
      });
    } else if (currentSound && (phaseChanged || isFirstStart)) {
      // Spustit nový zvuk bez čekání - při prvním spuštění nebo pokud není co zastavit
      startNewSound();
    }

    // Aktualizuj předchozí fázi AŽ PO kontrole a spuštění zvuku
    previousPhaseRef.current = breathPhase;

  }, [isPlaying, breathPhase, breathInSound, breathOutSound, breathClickSound, clickSoundUrl, breathSoundFadeEnabled, breathInDuration, breathOutDuration]);

  // Cleanup při unmount
  useEffect(() => {
    return () => {
      if (inFadeIntervalRef.current) {
        clearInterval(inFadeIntervalRef.current);
      }
      if (outFadeIntervalRef.current) {
        clearInterval(outFadeIntervalRef.current);
      }
      if (inFadeOutTimeoutRef.current) {
        clearTimeout(inFadeOutTimeoutRef.current);
      }
      if (outFadeOutTimeoutRef.current) {
        clearTimeout(outFadeOutTimeoutRef.current);
      }
      if (inSoundRef.current) {
        inSoundRef.current.pause();
        inSoundRef.current = null;
      }
      if (outSoundRef.current) {
        outSoundRef.current.pause();
        outSoundRef.current = null;
      }
      if (clickSoundRef.current) {
        clickSoundRef.current.pause();
        clickSoundRef.current = null;
      }
    };
  }, []);

  return {
    inSound: inSoundRef.current,
    outSound: outSoundRef.current
  };
};

