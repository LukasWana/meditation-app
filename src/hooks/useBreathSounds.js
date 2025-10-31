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
  breathSoundFadeEnabled,
  breathInDuration,
  breathOutDuration
) => {
  const inSoundRef = useRef(null);
  const outSoundRef = useRef(null);
  const inFadeIntervalRef = useRef(null);
  const outFadeIntervalRef = useRef(null);
  const previousPhaseRef = useRef(null);
  const [inSoundUrl, setInSoundUrl] = useState(null);
  const [outSoundUrl, setOutSoundUrl] = useState(null);

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
      inSoundRef.current.loop = true;
      inSoundRef.current.volume = 0;
      inSoundRef.current.preload = 'auto';
    }

    if (outSoundUrl && !outSoundRef.current) {
      outSoundRef.current = new Audio(outSoundUrl);
      outSoundRef.current.loop = true;
      outSoundRef.current.volume = 0;
      outSoundRef.current.preload = 'auto';
    }

    return () => {
      if (inFadeIntervalRef.current) {
        clearInterval(inFadeIntervalRef.current);
      }
      if (outFadeIntervalRef.current) {
        clearInterval(outFadeIntervalRef.current);
      }
    };
  }, [inSoundUrl, outSoundUrl]);

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

  const fadeOut = (audio, durationSeconds, intervalRef) => {
    if (!audio) {
      return;
    }

    if (!breathSoundFadeEnabled) {
      audio.volume = 0;
      audio.pause();
      audio.currentTime = 0;
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
      }
    }, stepTime);
  };

  // Hlavní logika přehrávání podle breathPhase
  useEffect(() => {
    if (!isPlaying) {
      // Zastav všechny zvuky a vyčisti fade intervaly
      if (inSoundRef.current) {
        fadeOut(inSoundRef.current, 0.5, inFadeIntervalRef);
      }
      if (outSoundRef.current) {
        fadeOut(outSoundRef.current, 0.5, outFadeIntervalRef);
      }
      previousPhaseRef.current = null;
      return;
    }

    // Zkontroluj, zda se změnila fáze - PŘED aktualizací previousPhaseRef
    const isFirstStart = previousPhaseRef.current === null;
    const phaseChanged = !isFirstStart && previousPhaseRef.current !== breathPhase;

    // Získat aktuální zvuk podle fáze
    const currentSound = breathPhase === 'in'
      ? (breathInSound !== 'none' ? inSoundRef.current : null)
      : (breathOutSound !== 'none' ? outSoundRef.current : null);

    // Získat zvuk, který se má zastavit
    const soundToStop = breathPhase === 'in'
      ? (breathOutSound !== 'none' ? outSoundRef.current : null)
      : (breathInSound !== 'none' ? inSoundRef.current : null);

    // Získat délku aktuální fáze (v sekundách)
    const currentDuration = breathPhase === 'in' ? breathInDuration : breathOutDuration;

    // Délka pro rychlý fade out při změně fáze - fixní rychlá délka pro hladký přechod
    const fadeOutDuration = 1.0; // 1 sekunda pro rychlý fade out při přepnutí

    // Při změně fáze: současně fade out předchozího a fade in nového zvuku
    if (phaseChanged && soundToStop && soundToStop.volume > 0) {
      const stopIntervalRef = breathPhase === 'in' ? outFadeIntervalRef : inFadeIntervalRef;
      // Rychlý fade out předchozího zvuku (1 sekunda)
      fadeOut(soundToStop, fadeOutDuration, stopIntervalRef);
    }

    // Spustit nový zvuk s fade in - při změně fáze nebo při prvním spuštění
    if (currentSound && (phaseChanged || isFirstStart)) {
      try {
        // Zastav a resetuj zvuk, pokud už hraje (pro restart při změně fáze)
        if (!currentSound.paused) {
          currentSound.pause();
        }
        currentSound.currentTime = 0;

        // Spusť přehrávání
        currentSound.play().catch((error) => {
          console.warn('Failed to play breath sound:', error);
        });

        const currentIntervalRef = breathPhase === 'in' ? inFadeIntervalRef : outFadeIntervalRef;
        // Fade in nového zvuku během celé délky aktuální fáze
        fadeIn(currentSound, currentDuration, currentIntervalRef);
      } catch (error) {
        console.warn('Error playing breath sound:', error);
      }
    }

    // Aktualizuj předchozí fázi AŽ PO kontrole a spuštění zvuku
    previousPhaseRef.current = breathPhase;

  }, [isPlaying, breathPhase, breathInSound, breathOutSound, breathSoundFadeEnabled, breathInDuration, breathOutDuration]);

  // Cleanup při unmount
  useEffect(() => {
    return () => {
      if (inFadeIntervalRef.current) {
        clearInterval(inFadeIntervalRef.current);
      }
      if (outFadeIntervalRef.current) {
        clearInterval(outFadeIntervalRef.current);
      }
      if (inSoundRef.current) {
        inSoundRef.current.pause();
        inSoundRef.current = null;
      }
      if (outSoundRef.current) {
        outSoundRef.current.pause();
        outSoundRef.current = null;
      }
    };
  }, []);

  return {
    inSound: inSoundRef.current,
    outSound: outSoundRef.current
  };
};

