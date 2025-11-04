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

    const loadSoundUrl = async () => {
      try {
        // Zkus načíst z metadata
        const metadata = await realtimeMetadataService.getFileMetadata(breathInSound);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          setInSoundUrl(metadata.downloadURL || metadata.audioSrc);
          return;
        }

        // Pokud není v metadata, zkus načíst přímo z Firebase Storage
        const audioRef = ref(storage, breathInSound);
        const url = await getDownloadURL(audioRef);
        setInSoundUrl(url);
      } catch (error) {
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

    const loadSoundUrl = async () => {
      try {
        // Zkus načíst z metadata
        const metadata = await realtimeMetadataService.getFileMetadata(breathOutSound);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          setOutSoundUrl(metadata.downloadURL || metadata.audioSrc);
          return;
        }

        // Pokud není v metadata, zkus načíst přímo z Firebase Storage
        const audioRef = ref(storage, breathOutSound);
        const url = await getDownloadURL(audioRef);
        setOutSoundUrl(url);
      } catch (error) {
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

    const loadSoundUrl = async () => {
      try {
        // Zkus načíst z metadata
        const metadata = await realtimeMetadataService.getFileMetadata(breathClickSound);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          setClickSoundUrl(metadata.downloadURL || metadata.audioSrc);
          return;
        }

        // Pokud není v metadata, zkus načíst přímo z Firebase Storage
        const audioRef = ref(storage, breathClickSound);
        const url = await getDownloadURL(audioRef);
        setClickSoundUrl(url);
      } catch (error) {
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
      // NERESETUJ previousPhaseRef - zachováme ho pro případ, že se komponenta znovu mountuje
      // previousPhaseRef.current = null;
      pendingPhaseRef.current = null;
      return;
    }

    // Pokud se komponenta znovu mountuje a isPlaying je true, ale audio elementy nejsou inicializované,
    // počkej na jejich načtení
    if (!inSoundUrl && !outSoundUrl && breathInSound !== 'none' && breathOutSound !== 'none') {
      // Zvuky se ještě načítají, počkej
      return;
    }

    // Zkontroluj, zda se změnila fáze - PŘED aktualizací previousPhaseRef
    const isFirstStart = previousPhaseRef.current === null;
    const wasRemounted = isFirstStart && inSoundRef.current && outSoundRef.current; // Komponenta se znovu mountovala
    const phaseChanged = !isFirstStart && previousPhaseRef.current !== breathPhase;

    // Získat aktuální zvuk podle fáze
    const currentSound = breathPhase === 'in'
      ? (breathInSound !== 'none' ? inSoundRef.current : null)
      : (breathOutSound !== 'none' ? outSoundRef.current : null);

    // Pokud se komponenta znovu mountovala a isPlaying je true, spusť zvuky znovu
    if (wasRemounted && currentSound) {
      if (currentSound.paused) {
        // Spusť zvuk znovu, ale bez resetování - pokračuj od aktuálního času
        try {
          currentSound.play().catch((error) => {
            console.warn('Failed to resume breath sound after remount:', error);
          });
          // Pokud je zvuk na začátku, spusť fade in
          if (currentSound.currentTime < 1) {
            const currentIntervalRef = breathPhase === 'in' ? inFadeIntervalRef : outFadeIntervalRef;
            const fadeInDuration = 1.5;
            fadeIn(currentSound, fadeInDuration, currentIntervalRef);
          }
        } catch (error) {
          console.warn('Error resuming breath sound after remount:', error);
        }
      }
      // Pokud je zvuk už přehráván, obnovíme previousPhaseRef a pokračujeme
      previousPhaseRef.current = breathPhase;
      return; // Ukončeme zde, abychom neznovu spouštěli zvuk
    }

    // Přehrát kliknutí na začátku každé fáze
    if ((phaseChanged || isFirstStart) && !wasRemounted && clickSoundRef.current && clickSoundUrl) {
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

      if (!sound) return;

      try {
        // Zastav a resetuj zvuk, pokud už hraje
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
        // Fade in nového zvuku - delší fade in při prvním spuštění (3 sekundy) nebo při prvním nádechu, jinak 1.5 sekundy
        const fadeInDuration = (isFirstStart && phase === 'in') ? 3.0 : 1.5;
        fadeIn(sound, fadeInDuration, currentIntervalRef);

        // Pomocná funkce pro nastavení fade out
        const setupFadeOut = () => {
          const soundDuration = sound.duration;

          if (!soundDuration || isNaN(soundDuration)) {
            return;
          }

          // Pokud je zvuk delší než fáze, spusť fade out na konci fáze
          if (soundDuration > duration) {
            // Spusť fade out před koncem fáze (s předstihem pro fade out)
            const fadeOutStartTime = Math.max(0, duration - 1.5); // 1.5s fade out

            fadeOutTimeoutRef.current = setTimeout(() => {
              if (sound && !sound.paused && sound.currentTime < soundDuration) {
                const fadeIntervalRef = phase === 'in' ? inFadeIntervalRef : outFadeIntervalRef;
                fadeOut(sound, 1.5, fadeIntervalRef);
              }
            }, fadeOutStartTime * 1000);
          } else {
            // Pokud je zvuk kratší než fáze, fade out na konci zvuku
            fadeOutTimeoutRef.current = setTimeout(() => {
              if (sound && !sound.paused) {
                const fadeIntervalRef = phase === 'in' ? inFadeIntervalRef : outFadeIntervalRef;
                fadeOut(sound, 1.5, fadeIntervalRef);
              }
            }, (soundDuration - 1.5) * 1000);
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
    if (phaseChanged && soundToStop && soundToStop.volume > 0) {
      // Ulož čekající fázi
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

  // Cleanup při unmount - pouze pokud je isPlaying false
  // Pokud je isPlaying true při unmountu, zachováme audio elementy pro případ remountu
  useEffect(() => {
    return () => {
      // Vyčisti pouze intervaly a timeouty
      if (inFadeIntervalRef.current) {
        clearInterval(inFadeIntervalRef.current);
        inFadeIntervalRef.current = null;
      }
      if (outFadeIntervalRef.current) {
        clearInterval(outFadeIntervalRef.current);
        outFadeIntervalRef.current = null;
      }
      if (inFadeOutTimeoutRef.current) {
        clearTimeout(inFadeOutTimeoutRef.current);
        inFadeOutTimeoutRef.current = null;
      }
      if (outFadeOutTimeoutRef.current) {
        clearTimeout(outFadeOutTimeoutRef.current);
        outFadeOutTimeoutRef.current = null;
      }
      // Pokud isPlaying je false, zastav a vymaž audio elementy
      // Pokud je true, zachováme je pro případ remountu
      if (!isPlaying) {
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
      }
      // Pokud je isPlaying true, zachováme audio elementy a previousPhaseRef
      // pro případ, že se komponenta znovu mountuje
    };
  }, [isPlaying]);

  return {
    inSound: inSoundRef.current,
    outSound: outSoundRef.current
  };
};

