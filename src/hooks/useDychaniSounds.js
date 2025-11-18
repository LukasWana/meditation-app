import { useEffect, useRef, useState } from 'react';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@services/firebase';

/**
 * Hook pro přehrávání zvuků dýchání s fade in/out efekty
 * Používá MP3 soubory z kategorie "hudba" z Firebase
 */
export const useDychaniSounds = (
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

  const mapUrlForDevProxy = (url) => {
    if (!url) return url;
    if (import.meta.env.DEV && typeof url === 'string' && url.startsWith('https://firebasestorage.googleapis.com')) {
      return url.replace('https://firebasestorage.googleapis.com', '/firebase-storage');
    }
    return url;
  };

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
          setInSoundUrl(mapUrlForDevProxy(metadata.downloadURL || metadata.audioSrc));
          return;
        }

        // Pokud není v metadata, zkus načíst přímo z Firebase Storage
        const audioRef = ref(storage, breathInSound);
        const url = await getDownloadURL(audioRef);
        setInSoundUrl(mapUrlForDevProxy(url));
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
          setOutSoundUrl(mapUrlForDevProxy(metadata.downloadURL || metadata.audioSrc));
          return;
        }

        // Pokud není v metadata, zkus načíst přímo z Firebase Storage
        const audioRef = ref(storage, breathOutSound);
        const url = await getDownloadURL(audioRef);
        setOutSoundUrl(mapUrlForDevProxy(url));
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
          setClickSoundUrl(mapUrlForDevProxy(metadata.downloadURL || metadata.audioSrc));
          return;
        }

        // Pokud není v metadata, zkus načíst přímo z Firebase Storage
        const audioRef = ref(storage, breathClickSound);
        const url = await getDownloadURL(audioRef);
        setClickSoundUrl(mapUrlForDevProxy(url));
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
        // Zjisti, zda je zvuk delší než fáze
        const soundDuration = sound.duration;
        const isLongSound = soundDuration && !isNaN(soundDuration) && soundDuration > duration;

          // Pokud zvuk běží a je delší než fáze, necháme ho pokračovat bez resetování
        if (isLongSound && !sound.paused && sound.currentTime > 0) {
          // Zvuk je dlouhý a běží - necháme ho pokračovat, jen nastavíme fade in
          // NEPAUZUJEME a NERESETUJEME
          const currentIntervalRef = phase === 'in' ? inFadeIntervalRef : outFadeIntervalRef;
          // Fade in synchronizován s délkou fáze - max 15% fáze
          const maxFadeInPercent = 0.15;
          const minFadeDuration = 0.2;
          const fadeInDuration = Math.min(
            Math.max(duration * maxFadeInPercent, minFadeDuration),
            duration * 0.3 // Maximálně 30% fáze pro fade in
          );
          fadeIn(sound, fadeInDuration, currentIntervalRef);

          // Nastav také fade out timeout pro dlouhý zvuk
          const fadeOutTimeoutRef = phase === 'in' ? inFadeOutTimeoutRef : outFadeOutTimeoutRef;
          if (fadeOutTimeoutRef.current) {
            clearTimeout(fadeOutTimeoutRef.current);
            fadeOutTimeoutRef.current = null;
          }

          const maxFadeOutPercent = 0.15;
          const maxFadeOutDuration = duration - fadeInDuration;
          const fadeOutDuration = Math.min(
            Math.max(duration * maxFadeOutPercent, minFadeDuration),
            maxFadeOutDuration
          );

          const fadeOutStartTime = (duration - fadeOutDuration) * 1000;
          fadeOutTimeoutRef.current = setTimeout(() => {
            if (sound && !sound.paused) {
              fadeOut(sound, fadeOutDuration, currentIntervalRef);
            }
            fadeOutTimeoutRef.current = null;
          }, fadeOutStartTime);

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
        // Fade in a fade out MUSÍ se vejít do délky fáze a NEPRODLUŽOVAT ji
        // Použijeme maximálně 15% fáze pro fade in a 15% fáze pro fade out
        // Celkem 30% fáze pro fade efekty, zbytek (70%) je pro plnou hlasitost
        // Minimální délka fade in/out je 0.2s pro velmi krátké fáze
        const maxFadeInPercent = 0.15; // 15% fáze pro fade in
        const maxFadeOutPercent = 0.15; // 15% fáze pro fade out
        const minFadeDuration = 0.2; // Minimálně 0.2s pro fade efekty

        // Vypočítej délky fade in a fade out tak, aby se vešly do fáze
        // DŮLEŽITÉ: fadeInDuration + fadeOutDuration musí být <= duration
        const fadeInDuration = Math.min(
          Math.max(duration * maxFadeInPercent, minFadeDuration),
          duration * 0.3 // Maximálně 30% fáze pro fade in
        );
        // Fade out musí se vejít do zbytku fáze po fade in
        const maxFadeOutDuration = duration - fadeInDuration;
        const fadeOutDuration = Math.min(
          Math.max(duration * maxFadeOutPercent, minFadeDuration),
          maxFadeOutDuration // Ujisti se, že fade out se vejde do zbytku fáze
        );

        // Spusť fade in okamžitě
        fadeIn(sound, fadeInDuration, currentIntervalRef);

        // Nastav fade out timeout - MUSÍ začít tak, aby skončil přesně na konci fáze
        // Fade out začne na (duration - fadeOutDuration) a skončí na duration
        // Vyčisti předchozí fade out timeout pokud existuje
        if (fadeOutTimeoutRef.current) {
          clearTimeout(fadeOutTimeoutRef.current);
          fadeOutTimeoutRef.current = null;
        }

        // Vypočítej přesný čas, kdy má fade out začít (v milisekundách)
        const fadeOutStartTime = (duration - fadeOutDuration) * 1000;

        // Spusť fade out před koncem fáze - přesně tak, aby skončil na konci fáze
        // DŮLEŽITÉ: Toto se nastaví OKAMŽITĚ po spuštění zvuku
        fadeOutTimeoutRef.current = setTimeout(() => {
          // Zkontroluj, zda zvuk stále běží a fáze se nezměnila
          if (sound && !sound.paused) {
            const fadeIntervalRef = phase === 'in' ? inFadeIntervalRef : outFadeIntervalRef;
            // Spusť fade out s přesnou délkou, aby skončil na konci fáze
            fadeOut(sound, fadeOutDuration, fadeIntervalRef);
          }
          // Vyčisti timeout ref
          fadeOutTimeoutRef.current = null;
        }, fadeOutStartTime);
      } catch (error) {
        console.warn('Error playing breath sound:', error);
      }
    };

    // Při změně fáze: fade out už by měl běžet z setupFadeOut (začal před koncem fáze)
    // DŮLEŽITÉ: Nový zvuk se spustí OKAMŽITĚ při změně fáze, nečekáme na dokončení fade out
    // Fade out předchozího zvuku se okamžitě zastaví nebo rychle dokončí, aby neprodlužoval fázi
    if (phaseChanged && soundToStop && soundToStop.volume > 0) {
      const fadeOutTimeoutRef = breathPhase === 'in' ? outFadeOutTimeoutRef : inFadeOutTimeoutRef;
      const fadeIntervalRef = breathPhase === 'in' ? outFadeIntervalRef : inFadeIntervalRef;

      // Zruš fade out timeout, pokud existuje - fáze se změnila, fade out už není potřeba
      if (fadeOutTimeoutRef.current) {
        clearTimeout(fadeOutTimeoutRef.current);
        fadeOutTimeoutRef.current = null;
      }

      // Zastav fade out interval, pokud běží
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }

      // Okamžitě zastav zvuk - neprodlužujeme fázi fade outem
      // Pokud chceme plynulý přechod, použijeme velmi krátký fade out (max 0.2s)
      if (breathSoundFadeEnabled) {
        fadeOut(soundToStop, 0.2, fadeIntervalRef);
      } else {
        soundToStop.volume = 0;
        soundToStop.pause();
        soundToStop.currentTime = 0;
      }
    }

    // Spustit nový zvuk okamžitě při změně fáze nebo prvním spuštění
    // Nečekáme na dokončení fade out předchozího zvuku - běží paralelně
    if (currentSound && (phaseChanged || isFirstStart)) {
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

