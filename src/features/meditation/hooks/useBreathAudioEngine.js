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

  // Loading state - počítadlo místo boolean pro správné sledování paralelního dekódování (Bug 4)
  const loadingCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // State pro sledování načtení bufferů (pro správné dependency v useEffect)
  const [buffersReady, setBuffersReady] = useState(false);

  // Refs pro nestabilní závislosti scheduleru (Bug 6)
  const isPlayingRef = useRef(isPlaying);
  const breathSoundFadeEnabledRef = useRef(breathSoundFadeEnabled);
  const onPhaseChangeRef = useRef(onPhaseChange);
  const breathInDurationRef = useRef(breathInDuration);
  const breathOutDurationRef = useRef(breathOutDuration);

  // URLs pro načítání
  const [inSoundUrl, setInSoundUrl] = useState(null);
  const [outSoundUrl, setOutSoundUrl] = useState(null);
  const [clickSoundUrl, setClickSoundUrl] = useState(null);

  // Inicializace AudioContext
  const initializeAudioContext = useCallback(() => {
    // 1. Získej nebo vytvoř AudioContext
    let audioContext = audioContextRef.current;

    if (!audioContext) {
      try {
        audioContext = window.globalAudioContext;
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          window.globalAudioContext = audioContext;
        }
        audioContextRef.current = audioContext;
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
        setLoadError(error.message);
        return null;
      }
    }

    // 2. Resume pokud je suspendovaný (důležité pro Android)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(err => console.warn('AudioContext resume failed:', err));
    }

    // 3. Vytvoř/obnov gain nodes pokud je potřeba
    const needsNodes = !masterGainRef.current ||
      !inGainRef.current ||
      !outGainRef.current ||
      !clickGainRef.current ||
      masterGainRef.current.context !== audioContext;

    if (needsNodes) {
      try {
        // Vyčisti staré pokud existují (defenzivní)
        [masterGainRef, inGainRef, outGainRef, clickGainRef].forEach(ref => {
          if (ref.current) {
            try { ref.current.disconnect(); } catch (e) { /* Ignore */ }
          }
        });

        masterGainRef.current = audioContext.createGain();
        masterGainRef.current.connect(audioContext.destination);

        inGainRef.current = audioContext.createGain();
        inGainRef.current.connect(masterGainRef.current);

        outGainRef.current = audioContext.createGain();
        outGainRef.current.connect(masterGainRef.current);

        clickGainRef.current = audioContext.createGain();
        clickGainRef.current.connect(masterGainRef.current);

        console.log('🎵 Audio nodes initialized/restored');
      } catch (error) {
        console.error('Failed to initialize audio nodes:', error);
      }
    }

    return audioContext;
  }, []);

  // Načtení URL pro zvuky (stejná logika jako v useBreathSounds)
  // Synchronizace refs s aktuálními hodnotami (Bug 6)
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    breathSoundFadeEnabledRef.current = breathSoundFadeEnabled;
  }, [breathSoundFadeEnabled]);
  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  }, [onPhaseChange]);
  useEffect(() => {
    breathInDurationRef.current = breathInDuration;
  }, [breathInDuration]);
  useEffect(() => {
    breathOutDurationRef.current = breathOutDuration;
  }, [breathOutDuration]);

  useEffect(() => {
    // Resetuj buffersReady při změně zvuků
    setBuffersReady(false);

    // Bug 5: Zastavit scheduler při změně zvuků, aby nepoužíval staré buffery
    if (schedulerIntervalRef.current) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }
    scheduledBoundariesRef.current.clear();
    scheduledUntilRef.current = 0;

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

        // Bug 4: Použij counter místo boolean pro správné sledování paralelního dekódování
        loadingCountRef.current++;
        setIsLoading(true);
        const response = await fetch(url, { mode: 'cors' });
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        bufferRef.current = audioBuffer;
        setLoadError(null);
      } catch (error) {
        console.error('Failed to decode audio:', error);
        bufferRef.current = null;
        setLoadError(error.message);
      } finally {
        loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
        if (loadingCountRef.current === 0) {
          setIsLoading(false);
        }
      }
    };

    const loadPromises = [];
    if (inSoundUrl) {
      loadPromises.push(decodeAudio(inSoundUrl, inBufferRef));
    } else {
      inBufferRef.current = null;
    }
    if (outSoundUrl) {
      loadPromises.push(decodeAudio(outSoundUrl, outBufferRef));
    } else {
      outBufferRef.current = null;
    }
    if (clickSoundUrl) {
      loadPromises.push(decodeAudio(clickSoundUrl, clickBufferRef));
    } else {
      clickBufferRef.current = null;
    }

    // Počkej na načtení všech bufferů a aktualizuj state
    Promise.all(loadPromises).then(() => {
      // Důležité: Můžeme označit za připravené pouze tehdy, pokud pro požadované zvuky už máme URL.
      // Jinak to znamená, že useEffect běží na "null" URLs před tím, než loadSoundUrl dokončí.
      const needsIn = breathInSound && breathInSound !== 'none';
      const needsOut = breathOutSound && breathOutSound !== 'none';
      if (needsIn && !inSoundUrl) return;
      if (needsOut && !outSoundUrl) return;

      setBuffersReady(true);
    });
  }, [inSoundUrl, outSoundUrl, clickSoundUrl, initializeAudioContext, breathInSound, breathOutSound]);

  // Zastavení všech aktivních sources
  const stopAllSources = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try {
        // Zkus zastavit source - pokud už je zastavený, vyhodí chybu, kterou ignorujeme
        source.stop();
      } catch (e) {
        // Source už může být zastavený nebo v neplatném stavu - to je v pořádku
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

    // Bug 3: Zrušit předchozí gain automatizaci před nastavením nových hodnot
    // Tím se zabrání konfliktu mezi starým fade-out (gain→0) a novým fade-in (gain→1)
    gainNode.gain.cancelScheduledValues(start);

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

    try {
      source.start(start);
      source.stop(start + duration);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      };

      activeSourcesRef.current.push(source);
    } catch (error) {
      console.warn('Failed to start audio source:', error);
      // Source se nepřidá do activeSourcesRef, takže se automaticky vyčistí
    }
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

    try {
      source.start(start);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      };

      activeSourcesRef.current.push(source);
    } catch (error) {
      console.warn('Failed to start click sound:', error);
      // Source se nepřidá do activeSourcesRef, takže se automaticky vyčistí
    }
  }, []);

  // Trackování naplánovaných hranic (aby se neplánovaly dvakrát)
  const scheduledBoundariesRef = useRef(new Set());
  const lastPhaseUpdateRef = useRef(null);

  // Lookahead scheduler - plánuje zvuky dopředu
  // Bug 6: Scheduler čte nestabilní závislosti z refs, aby se jeho reference neměnila zbytečně
  const scheduler = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current || isSuspendedRef.current) {
      return;
    }

    const audioContext = audioContextRef.current;
    const now = audioContext.currentTime;

    if (!startAtAudioTimeRef.current) {
      return;
    }

    const elapsed = now - startAtAudioTimeRef.current;

    if (elapsed < 0) return; // Ještě nezačalo

    // Čti aktuální hodnoty z refs
    const currentBreathInDuration = breathInDurationRef.current;
    const currentBreathOutDuration = breathOutDurationRef.current;
    const currentFadeEnabled = breathSoundFadeEnabledRef.current;

    // Lookahead: plánuj 2 sekundy dopředu
    const lookaheadTime = 2.0;
    const scheduleUntil = now + lookaheadTime;

    // Pokud už máme naplánováno dostatečně dopředu, přeskoč
    if (scheduledUntilRef.current >= scheduleUntil) {
      return;
    }

    // Cleanup starých záznamů v scheduledBoundariesRef (starší než aktuální čas - 1 cyklus)
    const cycleDuration = currentBreathInDuration + currentBreathOutDuration;
    const cleanupThreshold = elapsed - cycleDuration;
    scheduledBoundariesRef.current.forEach(key => {
      const match = key.match(/^(in|out)-(\d+\.\d+)$/);
      if (match) {
        const time = parseFloat(match[2]);
        if (time < cleanupThreshold) {
          scheduledBoundariesRef.current.delete(key);
        }
      }
    });

    // Plánuj zvuky pro aktuální a budoucí fáze v lookahead rozsahu
    const fadeOutDuration = 1.5;
    const fadeInDuration = currentFadeEnabled ? 1.5 : 0;

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
          if (cycle > 0) {
            const prevOutGain = outGainRef.current;
            if (prevOutGain && currentFadeEnabled) {
              const fadeOutStart = inAudioTime - fadeOutDuration;
              if (fadeOutStart >= now) {
                try {
                  prevOutGain.gain.cancelScheduledValues(fadeOutStart);
                  const currentGain = prevOutGain.gain.value;
                  prevOutGain.gain.setValueAtTime(currentGain, fadeOutStart);
                  prevOutGain.gain.linearRampToValueAtTime(0, inAudioTime);
                } catch (error) {
                  console.warn('Failed to schedule fade-out for out sound:', error);
                }
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
              currentBreathInDuration,
              firstCycleFadeIn,
              0 // Fade-out se naplánuje při výdechu
            );
          }

          scheduledBoundariesRef.current.add(inKey);
        }
      }

      // Plánuj výdech
      const outStart = cycleStart + currentBreathInDuration;
      const outKey = `out-${outStart.toFixed(3)}`;
      if (outStart < elapsed + lookaheadTime && !scheduledBoundariesRef.current.has(outKey)) {
        const outAudioTime = startAtAudioTimeRef.current + outStart;
        if (outAudioTime >= now) {
          const outBuffer = outBufferRef.current;
          const outGain = outGainRef.current;

          // Fade-out předchozího nádechu
          const prevInGain = inGainRef.current;
          if (prevInGain && currentFadeEnabled) {
            const fadeOutStart = outAudioTime - fadeOutDuration;
            if (fadeOutStart >= now) {
              try {
                prevInGain.gain.cancelScheduledValues(fadeOutStart);
                const currentGain = prevInGain.gain.value;
                prevInGain.gain.setValueAtTime(currentGain, fadeOutStart);
                prevInGain.gain.linearRampToValueAtTime(0, outAudioTime);
              } catch (error) {
                console.warn('Failed to schedule fade-out for in sound:', error);
              }
            }
          }

          // Klik na začátku výdechu
          scheduleClick(outAudioTime);

          if (outBuffer && outGain) {
            scheduleSound(
              outBuffer,
              outGain,
              outAudioTime,
              currentBreathOutDuration,
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
    const currentOnPhaseChange = onPhaseChangeRef.current;
    if (currentOnPhaseChange) {
      const { phase: currentPhase } = phaseAtTime(elapsed, currentBreathInDuration, currentBreathOutDuration);
      if (lastPhaseUpdateRef.current !== currentPhase) {
        lastPhaseUpdateRef.current = currentPhase;
        currentOnPhaseChange(currentPhase);
      }
    }
  }, [
    // Bug 6: Stabilní závislosti - nestabilní hodnoty se čtou z refs
    scheduleSound,
    scheduleClick
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

      // Bug 2: Odpoj gain nodes POUZE při zastavení (isPlaying=false),
      // NE při restartu scheduleru kvůli změně deps
      try {
        if (inGainRef.current) {
          inGainRef.current.disconnect();
          inGainRef.current = null;
        }
        if (outGainRef.current) {
          outGainRef.current.disconnect();
          outGainRef.current = null;
        }
        if (clickGainRef.current) {
          clickGainRef.current.disconnect();
          clickGainRef.current = null;
        }
        if (masterGainRef.current) {
          masterGainRef.current.disconnect();
          masterGainRef.current = null;
        }
      } catch (error) {
        console.warn('Error disconnecting gain nodes:', error);
        // I když dojde k chybě, nastav refs na null, aby se vytvořily nové
        inGainRef.current = null;
        outGainRef.current = null;
        clickGainRef.current = null;
        masterGainRef.current = null;
      }

      return;
    }

    // Inicializuj AudioContext
    const audioContext = initializeAudioContext();
    if (!audioContext) return;

    // DŮLEŽITÉ: Zkontroluj, zda jsou buffery načtené před spuštěním
    // Pokud jsou zvuky nastavené (ne 'none'), musí být buffery načtené
    if (!buffersReady) {
      // Buffery se ještě načítají, počkej
      console.log('⏳ Waiting for audio buffers to load...', {
        buffersReady
      });
      return;
    }

    // Spuštění scheduleru - celá sekvence je async, aby await resume() proběhlo před startem
    const startSchedulerAsync = async () => {
      // Resume AudioContext pokud je suspendovaný - MUSÍ proběhnout před startem scheduleru
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          console.log('AudioContext resumed, state:', audioContext.state);
        } catch (err) {
          console.error('Failed to resume AudioContext:', err);
          return; // Bez funkčního kontextu nelze přehrávat
        }
      }

      // Nastav start time - AŽ PO resume, aby currentTime byl správný
      if (!startAtAudioTimeRef.current) {
        // Pokud jsme byli pozastaveni, resync
        if (pausedElapsedRef.current > 0 && pausedElapsedRef.current < 3600) { // Max 1 hodina
          startAtAudioTimeRef.current = audioContext.currentTime - pausedElapsedRef.current;
          pausedElapsedRef.current = 0;
        } else {
          startAtAudioTimeRef.current = audioContext.currentTime;
          pausedElapsedRef.current = 0;
        }
      }

      // Validace: pokud startAtAudioTimeRef je v budoucnosti nebo příliš daleko v minulosti, resetuj
      const timeDiff = audioContext.currentTime - startAtAudioTimeRef.current;
      if (timeDiff < -1 || timeDiff > 3600) { // Max 1 hodina rozdíl
        console.warn('Invalid start time detected, resetting:', timeDiff);
        startAtAudioTimeRef.current = audioContext.currentTime;
        pausedElapsedRef.current = 0;
      }

      isSuspendedRef.current = false;

      // Bug 2: Vyčisti předchozí scheduler interval pokud existuje (při restartu)
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
      }

      // Spusť scheduler (každých 50ms)
      schedulerIntervalRef.current = setInterval(() => {
        scheduler();
      }, 50);

      // Okamžitě naplánuj první zvuky
      scheduler();
    };

    startSchedulerAsync();

    // Bug 2: Cleanup effect NEODPOJUJE gain nodes - pouze zastaví scheduler interval
    return () => {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
    };
  }, [isPlaying, initializeAudioContext, scheduler, stopAllSources, breathInSound, breathOutSound, buffersReady]);

  // Bug 1: Znovu spusť scheduler, když se buffery načtou (pokud je isPlaying)
  // Tento effect je záchranný mechanismus pro případ, kdy isPlaying=true přijde
  // DŘÍVE než jsou buffery načtené. Hlavní effect (výše) scheduler nespustí,
  // a tento effect ho spustí jakmile jsou buffery připravené.
  useEffect(() => {
    if (!isPlaying) return;
    if (!buffersReady) return; // Buffery ještě nejsou připravené

    if (!buffersReady) return;

    // Bug 1: Nepoužívej schedulerIntervalRef jako guard - mohlo být vyčištěno cleanup funkcí
    // Místo toho vždy restartuj scheduler pokud buffery jsou ready a isPlaying
    const audioContext = initializeAudioContext();
    if (!audioContext) return;

    const startSchedulerAfterBuffers = async () => {
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          console.log('AudioContext resumed (buffersReady path), state:', audioContext.state);
        } catch (err) {
          console.error('Failed to resume AudioContext:', err);
          return;
        }
      }

      if (!startAtAudioTimeRef.current) {
        startAtAudioTimeRef.current = audioContext.currentTime;
      }

      isSuspendedRef.current = false;

      // Vyčisti předchozí scheduler pokud existuje
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
      }

      schedulerIntervalRef.current = setInterval(() => {
        scheduler();
      }, 50);

      scheduler();
    };

    startSchedulerAfterBuffers();

    return () => {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
    };
  }, [isPlaying, breathInSound, breathOutSound, buffersReady, initializeAudioContext, scheduler]);

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

  // Reset audio engine - volá se při kliknutí na tlačítko reset
  const resetAudioEngine = useCallback(() => {
    console.log('🔄 Resetting audio engine');

    // Zastav všechny aktivní sources
    stopAllSources();

    // Vyčisti scheduler
    if (schedulerIntervalRef.current) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }

    // Reset scheduler refs
    scheduledUntilRef.current = 0;
    startAtAudioTimeRef.current = null;
    pausedAtRef.current = null;
    pausedElapsedRef.current = 0;
    isSuspendedRef.current = false;
    scheduledBoundariesRef.current.clear();
    lastPhaseUpdateRef.current = null;

    // DŮLEŽITÉ: Odpoj gain nodes a nastav na null, aby se při dalším startu správně znovu vytvořily
    try {
      if (inGainRef.current) {
        inGainRef.current.disconnect();
        inGainRef.current = null;
      }
      if (outGainRef.current) {
        outGainRef.current.disconnect();
        outGainRef.current = null;
      }
      if (clickGainRef.current) {
        clickGainRef.current.disconnect();
        clickGainRef.current = null;
      }
      if (masterGainRef.current) {
        masterGainRef.current.disconnect();
        masterGainRef.current = null;
      }
    } catch (error) {
      console.warn('Error disconnecting gain nodes during reset:', error);
      // I když dojde k chybě, nastav refs na null, aby se vytvořily nové
      inGainRef.current = null;
      outGainRef.current = null;
      clickGainRef.current = null;
      masterGainRef.current = null;
    }
  }, [stopAllSources]);

  // Cleanup při unmount
  useEffect(() => {
    return () => {
      // Zastav všechny sources
      stopAllSources();

      // Vyčisti scheduler
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }

      // Odpoj gain nodes
      try {
        if (inGainRef.current) {
          inGainRef.current.disconnect();
        }
        if (outGainRef.current) {
          outGainRef.current.disconnect();
        }
        if (clickGainRef.current) {
          clickGainRef.current.disconnect();
        }
        if (masterGainRef.current) {
          masterGainRef.current.disconnect();
        }
      } catch (error) {
        // Ignoruj chyby při cleanup
      }

      // Vyčisti refs
      scheduledBoundariesRef.current.clear();
      scheduledUntilRef.current = 0;
      startAtAudioTimeRef.current = null;
    };
  }, [stopAllSources]);

  return {
    isLoading,
    loadError,
    getCurrentPhase,
    resetAudioEngine,
    initializeAudioContext // Exportujeme pro přímé volání při kliknutí
  };
};
