import { useEffect, useRef, useState, useCallback } from 'react';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@config/secure-firebase';
import { phaseAtTime } from '@utils/breathPhase';

/**
 * Hook pro přesné přehrávání zvuků dýchání pomocí Web Audio API
 * Používá AudioContext.currentTime jako jediný zdroj pravdy pro timing
 *
 * @param {boolean} isPlaying - Zda probíhá dýchání
 * @param {number} breathInDuration - Délka nádechu v sekundách
 * @param {number} breathOutDuration - Délka výdechu v sekundách
 * @param {string} breathInSound - ID zvuku pro nádech
 * @param {string} breathOutSound - ID zvuku pro výdech
 * @param {string} breathClickSound - ID zvuku pro kliknutí
 * @param {boolean} breathSoundFadeEnabled - Zda je zapnuté fade in/out
 * @param {Function} onPhaseChange - Callback při změně fáze (phase: 'in' | 'out')
 */
export const useBreathAudioEngine = (
  isPlaying,
  breathInDuration,
  breathOutDuration,
  breathInSound,
  breathOutSound,
  breathClickSound,
  breathSoundFadeEnabled,
  onPhaseChange
) => {
  // AudioContext a nodes
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const inGainRef = useRef(null);
  const outGainRef = useRef(null);
  const clickGainRef = useRef(null);

  // Audio buffers
  const inBufferRef = useRef(null);
  const outBufferRef = useRef(null);
  const clickBufferRef = useRef(null);

  // Scheduler state
  const schedulerIntervalRef = useRef(null);
  const startAtAudioTimeRef = useRef(null);
  const scheduledUntilRef = useRef(0);
  const activeSourcesRef = useRef([]);

  // Suspend/resume state
  const pausedAtRef = useRef(null);
  const pausedElapsedRef = useRef(0);
  const isSuspendedRef = useRef(false);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // URLs pro načítání
  const [inSoundUrl, setInSoundUrl] = useState(null);
  const [outSoundUrl, setOutSoundUrl] = useState(null);
  const [clickSoundUrl, setClickSoundUrl] = useState(null);

  // Inicializace AudioContext
  const initializeAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    try {
      // Použij globální AudioContext pokud existuje
      let audioContext = window.globalAudioContext;
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        window.globalAudioContext = audioContext;
      }

      audioContextRef.current = audioContext;

      // Vytvoř gain nodes
      masterGainRef.current = audioContext.createGain();
      masterGainRef.current.connect(audioContext.destination);

      inGainRef.current = audioContext.createGain();
      inGainRef.current.connect(masterGainRef.current);

      outGainRef.current = audioContext.createGain();
      outGainRef.current.connect(masterGainRef.current);

      clickGainRef.current = audioContext.createGain();
      clickGainRef.current.connect(masterGainRef.current);

      return audioContext;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      setLoadError(error.message);
      return null;
    }
  }, []);

  // Načtení URL pro zvuky (stejná logika jako v useBreathSounds)
  useEffect(() => {
    const loadSoundUrl = async (soundId, setUrl) => {
      if (soundId === 'none' || !soundId) {
        setUrl(null);
        return;
      }

      try {
        const metadata = await realtimeMetadataService.getFileMetadata(soundId);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          setUrl(metadata.downloadURL || metadata.audioSrc);
          return;
        }

        const audioRef = ref(storage, soundId);
        const url = await getDownloadURL(audioRef);
        setUrl(url);
      } catch (error) {
        console.error(`Failed to load sound URL for ${soundId}:`, error);
        setUrl(null);
      }
    };

    loadSoundUrl(breathInSound, setInSoundUrl);
    loadSoundUrl(breathOutSound, setOutSoundUrl);
    loadSoundUrl(breathClickSound, setClickSoundUrl);
  }, [breathInSound, breathOutSound, breathClickSound]);

  // Dekódování audio souborů do AudioBuffer
  useEffect(() => {
    const decodeAudio = async (url, bufferRef) => {
      if (!url) {
        bufferRef.current = null;
        return;
      }

      try {
        const audioContext = initializeAudioContext();
        if (!audioContext) return;

        setIsLoading(true);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        bufferRef.current = audioBuffer;
        setLoadError(null);
      } catch (error) {
        console.error('Failed to decode audio:', error);
        bufferRef.current = null;
        setLoadError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (inSoundUrl) decodeAudio(inSoundUrl, inBufferRef);
    if (outSoundUrl) decodeAudio(outSoundUrl, outBufferRef);
    if (clickSoundUrl) decodeAudio(clickSoundUrl, clickBufferRef);
  }, [inSoundUrl, outSoundUrl, clickSoundUrl, initializeAudioContext]);

  // Zastavení všech aktivních sources
  const stopAllSources = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source už může být zastavený
      }
    });
    activeSourcesRef.current = [];
  }, []);

  // Plánování zvuku s fade in/out
  const scheduleSound = useCallback((
    buffer,
    gainNode,
    startTime,
    duration,
    fadeInDuration = 0,
    fadeOutDuration = 0
  ) => {
    if (!buffer || !gainNode || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);

    // Nastav gain envelope
    const now = audioContext.currentTime;
    const start = Math.max(now, startTime);

    if (breathSoundFadeEnabled) {
      if (fadeInDuration > 0) {
        gainNode.gain.setValueAtTime(0, start);
        gainNode.gain.linearRampToValueAtTime(1, start + fadeInDuration);
      } else {
        gainNode.gain.setValueAtTime(1, start);
      }

      if (fadeOutDuration > 0) {
        const fadeOutStart = start + duration - fadeOutDuration;
        gainNode.gain.linearRampToValueAtTime(0, fadeOutStart);
      }
    } else {
      gainNode.gain.setValueAtTime(1, start);
      if (fadeOutDuration > 0) {
        const fadeOutStart = start + duration - fadeOutDuration;
        gainNode.gain.linearRampToValueAtTime(0, fadeOutStart);
      }
    }

    source.start(start);
    source.stop(start + duration);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
    };

    activeSourcesRef.current.push(source);
  }, [breathSoundFadeEnabled]);

  // Plánování kliku
  const scheduleClick = useCallback((time) => {
    if (!clickBufferRef.current || !clickGainRef.current) return;

    const audioContext = audioContextRef.current;
    const source = audioContext.createBufferSource();
    source.buffer = clickBufferRef.current;
    source.connect(clickGainRef.current);

    clickGainRef.current.gain.setValueAtTime(1, time);

    const now = audioContext.currentTime;
    const start = Math.max(now, time);
    source.start(start);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
    };

    activeSourcesRef.current.push(source);
  }, []);

  // Trackování naplánovaných hranic (aby se neplánovaly dvakrát)
  const scheduledBoundariesRef = useRef(new Set());
  const lastPhaseUpdateRef = useRef(null);

  // Lookahead scheduler - plánuje zvuky dopředu
  const scheduler = useCallback(() => {
    if (!isPlaying || !audioContextRef.current || isSuspendedRef.current) {
      return;
    }

    const audioContext = audioContextRef.current;
    const now = audioContext.currentTime;

    if (!startAtAudioTimeRef.current) {
      return;
    }

    const elapsed = now - startAtAudioTimeRef.current;

    if (elapsed < 0) return; // Ještě nezačalo

    // Lookahead: plánuj 2 sekundy dopředu
    const lookaheadTime = 2.0;
    const scheduleUntil = now + lookaheadTime;

    // Pokud už máme naplánováno dostatečně dopředu, přeskoč
    if (scheduledUntilRef.current >= scheduleUntil) {
      return;
    }

    // Plánuj zvuky pro aktuální a budoucí fáze v lookahead rozsahu
    const cycleDuration = breathInDuration + breathOutDuration;
    const fadeOutDuration = 1.5;
    const fadeInDuration = breathSoundFadeEnabled ? 1.5 : 0;

    // Najdi všechny cykly v lookahead rozsahu
    const startCycle = Math.floor(elapsed / cycleDuration);
    const endCycle = Math.ceil((elapsed + lookaheadTime) / cycleDuration);

    for (let cycle = startCycle; cycle <= endCycle; cycle++) {
      const cycleStart = cycle * cycleDuration;

      // Plánuj nádech
      const inStart = cycleStart;
      const inKey = `in-${inStart.toFixed(3)}`;
      if (inStart < elapsed + lookaheadTime && !scheduledBoundariesRef.current.has(inKey)) {
        const inAudioTime = startAtAudioTimeRef.current + inStart;
        if (inAudioTime >= now) {
          const inBuffer = inBufferRef.current;
          const inGain = inGainRef.current;
          const firstCycleFadeIn = cycle === 0 && inStart === 0 ? 3.0 : fadeInDuration;

          // Fade-out předchozího výdechu (pokud existuje)
          if (cycle > 0 || inStart > 0) {
            const prevOutGain = outGainRef.current;
            if (prevOutGain && breathSoundFadeEnabled) {
              const fadeOutStart = inAudioTime - fadeOutDuration;
              if (fadeOutStart >= now) {
                prevOutGain.gain.cancelScheduledValues(fadeOutStart);
                const currentGain = prevOutGain.gain.value;
                prevOutGain.gain.setValueAtTime(currentGain, fadeOutStart);
                prevOutGain.gain.linearRampToValueAtTime(0, inAudioTime);
              }
            }
          }

          // Klik na začátku nádechu
          scheduleClick(inAudioTime);

          if (inBuffer && inGain) {
            scheduleSound(
              inBuffer,
              inGain,
              inAudioTime,
              breathInDuration,
              firstCycleFadeIn,
              0 // Fade-out se naplánuje při výdechu
            );
          }

          scheduledBoundariesRef.current.add(inKey);
        }
      }

      // Plánuj výdech
      const outStart = cycleStart + breathInDuration;
      const outKey = `out-${outStart.toFixed(3)}`;
      if (outStart < elapsed + lookaheadTime && !scheduledBoundariesRef.current.has(outKey)) {
        const outAudioTime = startAtAudioTimeRef.current + outStart;
        if (outAudioTime >= now) {
          const outBuffer = outBufferRef.current;
          const outGain = outGainRef.current;

          // Fade-out předchozího nádechu
          const prevInGain = inGainRef.current;
          if (prevInGain && breathSoundFadeEnabled) {
            const fadeOutStart = outAudioTime - fadeOutDuration;
            if (fadeOutStart >= now) {
              prevInGain.gain.cancelScheduledValues(fadeOutStart);
              const currentGain = prevInGain.gain.value;
              prevInGain.gain.setValueAtTime(currentGain, fadeOutStart);
              prevInGain.gain.linearRampToValueAtTime(0, outAudioTime);
            }
          }

          // Klik na začátku výdechu
          scheduleClick(outAudioTime);

          if (outBuffer && outGain) {
            scheduleSound(
              outBuffer,
              outGain,
              outAudioTime,
              breathOutDuration,
              fadeInDuration,
              0 // Fade-out se naplánuje při dalším nádechu
            );
          }

          scheduledBoundariesRef.current.add(outKey);
        }
      }
    }

    // První start je už zpracován v cyklu výše (cycle === 0)

    scheduledUntilRef.current = scheduleUntil;

    // Průběžně aktualizuj UI fázi podle aktuálního času
    if (onPhaseChange) {
      const { phase: currentPhase } = phaseAtTime(elapsed, breathInDuration, breathOutDuration);
      if (lastPhaseUpdateRef.current !== currentPhase) {
        lastPhaseUpdateRef.current = currentPhase;
        onPhaseChange(currentPhase);
      }
    }
  }, [
    isPlaying,
    breathInDuration,
    breathOutDuration,
    breathSoundFadeEnabled,
    scheduleSound,
    scheduleClick,
    onPhaseChange
  ]);

  // Spuštění scheduleru
  useEffect(() => {
    if (!isPlaying) {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
      stopAllSources();
      scheduledUntilRef.current = 0;
      startAtAudioTimeRef.current = null;
      pausedAtRef.current = null;
      pausedElapsedRef.current = 0;
      isSuspendedRef.current = false;
      scheduledBoundariesRef.current.clear();
      lastPhaseUpdateRef.current = null;
      return;
    }

    // Inicializuj AudioContext
    const audioContext = initializeAudioContext();
    if (!audioContext) return;

    // Resume AudioContext pokud je suspendovaný
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed');
      }).catch(err => {
        console.error('Failed to resume AudioContext:', err);
      });
    }

    // Nastav start time
    if (!startAtAudioTimeRef.current) {
      // Pokud jsme byli pozastaveni, resync
      if (pausedElapsedRef.current > 0) {
        startAtAudioTimeRef.current = audioContext.currentTime - pausedElapsedRef.current;
        pausedElapsedRef.current = 0;
      } else {
        startAtAudioTimeRef.current = audioContext.currentTime;
      }
    }

    isSuspendedRef.current = false;

    // Spusť scheduler (každých 50ms)
    schedulerIntervalRef.current = setInterval(() => {
      scheduler();
    }, 50);

    // Okamžitě naplánuj první zvuky
    scheduler();

    return () => {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
    };
  }, [isPlaying, initializeAudioContext, scheduler, stopAllSources]);

  // Handling suspend/resume a visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      if (document.hidden) {
        // Appka jde na pozadí
        if (audioContext.state === 'suspended') {
          isSuspendedRef.current = true;
          if (startAtAudioTimeRef.current) {
            pausedElapsedRef.current = audioContext.currentTime - startAtAudioTimeRef.current;
            pausedAtRef.current = audioContext.currentTime;
          }
        }
      } else {
        // Appka se vrací do popředí
        if (audioContext.state === 'suspended' && isPlaying) {
          audioContext.resume().then(() => {
            console.log('AudioContext resumed after visibility change');
            isSuspendedRef.current = false;
            // Resync start time
            if (pausedElapsedRef.current > 0 && startAtAudioTimeRef.current) {
              startAtAudioTimeRef.current = audioContext.currentTime - pausedElapsedRef.current;
              pausedElapsedRef.current = 0;
            }
          }).catch(err => {
            console.error('Failed to resume AudioContext after visibility change:', err);
          });
        }
      }
    };

    const handleStateChange = () => {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      if (audioContext.state === 'suspended' && isPlaying) {
        isSuspendedRef.current = true;
        if (startAtAudioTimeRef.current) {
          pausedElapsedRef.current = audioContext.currentTime - startAtAudioTimeRef.current;
          pausedAtRef.current = audioContext.currentTime;
        }
      } else if (audioContext.state === 'running' && isSuspendedRef.current && isPlaying) {
        isSuspendedRef.current = false;
        // Resync
        if (pausedElapsedRef.current > 0 && startAtAudioTimeRef.current) {
          startAtAudioTimeRef.current = audioContext.currentTime - pausedElapsedRef.current;
          pausedElapsedRef.current = 0;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const audioContext = audioContextRef.current;
    if (audioContext) {
      audioContext.addEventListener('statechange', handleStateChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (audioContext) {
        audioContext.removeEventListener('statechange', handleStateChange);
      }
    };
  }, [isPlaying]);

  // Vracíme aktuální fázi pro UI
  const getCurrentPhase = useCallback(() => {
    if (!startAtAudioTimeRef.current || !audioContextRef.current) {
      return 'in';
    }

    const elapsed = audioContextRef.current.currentTime - startAtAudioTimeRef.current;
    const { phase } = phaseAtTime(elapsed, breathInDuration, breathOutDuration);
    return phase;
  }, [breathInDuration, breathOutDuration]);

  return {
    isLoading,
    loadError,
    getCurrentPhase
  };
};

