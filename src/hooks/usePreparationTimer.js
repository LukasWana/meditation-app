import { useEffect } from 'react';

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
 */
export const usePreparationTimer = (
  isPreparing,
  preparationCountdown,
  setPreparationCountdown,
  setIsPreparing,
  breathTime,
  breathDuration,
  setBreathTime,
  setIsBreathing
) => {
  // Odpočítávání času přípravy
  useEffect(() => {
    let interval;
    if (isPreparing && preparationCountdown > 0) {
      interval = setInterval(() => {
        setPreparationCountdown(prev => {
          const newCountdown = prev - 1;
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
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPreparing, preparationCountdown, breathTime, breathDuration, setBreathTime, setIsBreathing, setIsPreparing, setPreparationCountdown]);
};

