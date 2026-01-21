import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook pro načítání a přehrávání countdown zvuku během přípravy
 *
 * @param {string} breathCountdownSound - Cesta k zvuku countdown (Firebase Storage path)
 * @param {boolean} isPreparing - Zda probíhá příprava
 */
export const useCountdownSound = (breathCountdownSound, isPreparing) => {
  const [, setCountdownSoundUrl] = useState(null);
  const countdownSoundRef = useRef(null);
  const previousCountdownRef = useRef(null);
  const countdownSoundUrlRef = useRef(null); // Ref pro URL (pro použití v intervalu)
  const isPreparingRef = useRef(isPreparing); // Ref pro isPreparing (pro použití v callbacku)

  // Načtení URL pro countdown zvuk
  useEffect(() => {
    if (breathCountdownSound === 'none' || !breathCountdownSound) {
      setCountdownSoundUrl(null);
      return;
    }

    const loadCountdownSoundUrl = async () => {
      try {
        const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
        const { ref, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('@config/secure-firebase');

        const metadata = await realtimeMetadataService.getFileMetadata(breathCountdownSound);
        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          const url = metadata.downloadURL || metadata.audioSrc;
          setCountdownSoundUrl(url);
          countdownSoundUrlRef.current = url;
        } else {
          // Pokud není v metadata, zkus načíst přímo z Firebase Storage
          try {
            const audioRef = ref(storage, breathCountdownSound);
            const url = await getDownloadURL(audioRef);
            setCountdownSoundUrl(url);
            countdownSoundUrlRef.current = url;
          } catch (storageError) {
            console.warn('Failed to load countdown sound from Firebase Storage:', storageError);
            setCountdownSoundUrl(null);
            countdownSoundUrlRef.current = null;
          }
        }
      } catch (error) {
        console.error('Failed to load countdown sound URL:', error);
        setCountdownSoundUrl(null);
        countdownSoundUrlRef.current = null;
      }
    };

    loadCountdownSoundUrl();
  }, [breathCountdownSound]);

  // Aktualizuj ref pro isPreparing
  useEffect(() => {
    isPreparingRef.current = isPreparing;
  }, [isPreparing]);

  // Funkce pro přehrání countdown zvuku (může být volána přímo)
  const playCountdownSound = useCallback((countdownValue) => {
    if (!countdownSoundUrlRef.current || !isPreparingRef.current || countdownValue <= 0) {
      return;
    }

    // Zastav předchozí přehrávání, pokud běží
    if (countdownSoundRef.current) {
      countdownSoundRef.current.pause();
      countdownSoundRef.current.src = '';
      countdownSoundRef.current = null;
    }

    try {
      // Aktivovat AudioContext před přehráním (pro přehrávání i bez focusu)
      let audioContext = window.globalAudioContext;
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        window.globalAudioContext = audioContext;
      }

      if (audioContext.state === 'suspended') {
        audioContext.resume().catch((error) => {
          console.warn('Failed to resume AudioContext:', error);
        });
      }

      // Vytvoř nový audio element a přehraj ho
      const audio = new Audio(countdownSoundUrlRef.current);
      audio.crossOrigin = 'anonymous'; // Povolí CORS pro Android Chrome
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
  }, []);

  // Cleanup při zastavení přípravy
  useEffect(() => {
    if (!isPreparing) {
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
    }
  }, [isPreparing]);

  // Vrať funkci pro přehrání zvuku (pro použití v usePreparationTimer)
  return playCountdownSound;
};

