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
  const startTimeRef = useRef(null);
  const initialCountdownRef = useRef(null);

  // Odpočítávání času přípravy
  useEffect(() => {
    // Cleanup předchozího intervalu
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isPreparing) {
      previousCountdownRef.current = null;
      startTimeRef.current = null;
      initialCountdownRef.current = null;
      return;
    }

    if (isPreparing && preparationCountdown > 0) {
      // Při startu uložit čas a počáteční countdown
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        initialCountdownRef.current = preparationCountdown;
        // Přehrát zvuk pro počáteční hodnotu countdownu při startu přípravy
        if (playCountdownSound && typeof playCountdownSound === 'function') {
          playCountdownSound(preparationCountdown);
          previousCountdownRef.current = preparationCountdown;
        }
      }

      // Interval, který kontroluje čas pomocí Date.now() (nezávislé na throttlingu)
      intervalRef.current = setInterval(() => {
        if (!startTimeRef.current || !initialCountdownRef.current) {
          return;
        }

        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000); // uplynulý čas v sekundách
        const newCountdown = Math.max(0, initialCountdownRef.current - elapsed);

        // Spustit zvuk při změně countdownu
        if (playCountdownSound && typeof playCountdownSound === 'function' && newCountdown > 0 && previousCountdownRef.current !== newCountdown) {
          playCountdownSound(newCountdown);
          previousCountdownRef.current = newCountdown;
        }

        // Aktualizovat countdown
        setPreparationCountdown(newCountdown);

        // Po dokončení přípravy spusť dýchání
        if (newCountdown <= 0) {
          // Použij setTimeout, aby se to nestalo během renderu
          setTimeout(() => {
            setIsPreparing(false);
            if (breathTime <= 0) {
              const newTime = breathDuration * 60;
              setBreathTime(newTime);
            }
            setIsBreathing(true);
          }, 0);
        }
      }, 100); // Kontrola každých 100ms pro přesnější timing
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPreparing, preparationCountdown, breathTime, breathDuration, setBreathTime, setIsBreathing, setIsPreparing, setPreparationCountdown, playCountdownSound]);
};

