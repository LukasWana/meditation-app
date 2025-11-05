import { useState, useEffect, useRef } from 'react';

/**
 * Hook pro načítání a přehrávání countdown zvuku během přípravy
 *
 * @param {string} breathCountdownSound - Cesta k zvuku countdown (Firebase Storage path)
 * @param {boolean} isPreparing - Zda probíhá příprava
 * @param {number} preparationCountdown - Aktuální hodnota countdownu
 */
export const useCountdownSound = (breathCountdownSound, isPreparing, preparationCountdown) => {
  const [countdownSoundUrl, setCountdownSoundUrl] = useState(null);
  const countdownSoundRef = useRef(null);
  const previousCountdownRef = useRef(null);

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
      isPreparing,
      countdownSoundUrl,
      preparationCountdown,
      breathCountdownSound,
      previousCountdown: previousCountdownRef.current
    });

    // Reset previousCountdownRef když se příprava zastaví
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
      return;
    }

    // Přehrát zvuk při každé změně countdownu, pokud je zvuk nastaven
    if (isPreparing && preparationCountdown > 0 && countdownSoundUrl) {
      // Přehrát zvuk pouze když se countdown změní (ne při každém renderu)
      if (previousCountdownRef.current !== preparationCountdown) {
        console.log('🔊 Playing countdown sound for countdown:', preparationCountdown);

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

        previousCountdownRef.current = preparationCountdown;
      }
    } else {
      // Debug proč se zvuk nepřehrává
      if (isPreparing && preparationCountdown > 0) {
        if (!countdownSoundUrl) {
          console.log('⚠️ Countdown sound not playing: no sound URL (breathCountdownSound:', breathCountdownSound, ')');
        }
      }
    }
  }, [isPreparing, preparationCountdown, countdownSoundUrl, breathCountdownSound]);
};

