import { useEffect, useRef } from 'react';

/**
 * Hook pro timer přípravy - odpočítávání času a spuštění dýchání po dokončení
 *
 * @param {boolean} isPreparing - Zda probíhá příprava
 * @param {number} preparationCountdown - Aktuální hodnota countdownu
 * @param {Function} setPreparationCountdown - Funkce pro aktualizaci countdownu
 * @param {Function} setIsPreparing - Funkce pro zastavení přípravy
 * @param {number} breathTime - Aktuální zbývající čas dýchání
 * @param {number} breathDuration - Délka dýchání v minutách
 * @param {Function} setBreathTime - Funkce pro aktualizaci času dýchání
 * @param {Function} setIsBreathing - Funkce pro spuštění dýchání
 * @param {Function} playCountdownSound - Funkce pro přehrání countdown zvuku (volitelné)
 */
export const usePreparationTimer = (
  isPreparing,
  preparationCountdown,
  setPreparationCountdown,
  setIsPreparing,
  breathTime,
  breathDuration,
  setBreathTime,
  setIsBreathing,
  playCountdownSound = null
) => {
  const previousCountdownRef = useRef(null);
  const intervalRef = useRef(null);

  // Odpočítávání času přípravy
  useEffect(() => {
    // Cleanup předchozího intervalu
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isPreparing) {
      previousCountdownRef.current = null;
      return;
    }

    if (isPreparing && preparationCountdown > 0) {
      // Přehrát zvuk pro počáteční hodnotu countdownu při startu přípravy (pouze pokud se countdown změnil)
      if (playCountdownSound && typeof playCountdownSound === 'function' && previousCountdownRef.current !== preparationCountdown) {
        playCountdownSound(preparationCountdown);
        previousCountdownRef.current = preparationCountdown;
      }

      intervalRef.current = setInterval(() => {
        setPreparationCountdown(prev => {
          const newCountdown = prev - 1;

          // Spusť countdown zvuk přímo v intervalu při změně countdownu (před aktualizací state)
          // Toto zajistí, že se zvuk přehrává přesně v momentě změny, ne až po renderu
          if (playCountdownSound && typeof playCountdownSound === 'function' && newCountdown > 0 && previousCountdownRef.current !== newCountdown) {
            playCountdownSound(newCountdown);
            previousCountdownRef.current = newCountdown;
          }

          if (newCountdown <= 0) {
            // Po dokončení přípravy spusť dýchání - použij setTimeout, aby se to nestalo během renderu
            setTimeout(() => {
              setIsPreparing(false);
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPreparing, preparationCountdown, breathTime, breathDuration, setBreathTime, setIsBreathing, setIsPreparing, setPreparationCountdown, playCountdownSound]);
};

