import { useEffect, useRef } from 'react';
import { startTransition } from 'react';

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
  // Ref pro uložení hodnot (aby se useEffect nespouštěl při každé změně countdownu)
  const isPreparingRef = useRef(isPreparing);
  const preparationCountdownRef = useRef(preparationCountdown);
  const breathTimeRef = useRef(breathTime);
  const breathDurationRef = useRef(breathDuration);
  const intervalRef = useRef(null);

  // Aktualizuj refy při změně hodnot
  useEffect(() => {
    isPreparingRef.current = isPreparing;
  }, [isPreparing]);

  useEffect(() => {
    preparationCountdownRef.current = preparationCountdown;
  }, [preparationCountdown]);

  useEffect(() => {
    breathTimeRef.current = breathTime;
  }, [breathTime]);

  useEffect(() => {
    breathDurationRef.current = breathDuration;
  }, [breathDuration]);

  // Odpočítávání času přípravy
  useEffect(() => {
    // Pokud už interval běží, neruš ho - interval běží nezávisle a aktualizuje countdown
    if (intervalRef.current) {
      return;
    }

    // Pokud isPreparing je false, interval už neběží, nemusíme nic dělat
    if (!isPreparing) {
      return;
    }

    // Použij aktuální hodnoty z props pro inicializaci
    if (preparationCountdown > 0) {
      intervalRef.current = setInterval(() => {
        setPreparationCountdown(prev => {
          // Kontroluj aktuální hodnotu, ne ref (ref se aktualizuje později)
          const newCountdown = prev - 1;
          if (newCountdown <= 0) {
            // Po dokončení přípravy spusť dýchání - použij startTransition pro batchování změn
            // Použij hodnoty z refů, aby se neměnily při re-renderu
            startTransition(() => {
              setIsPreparing(false);
              if (breathTimeRef.current <= 0) {
                const newTime = breathDurationRef.current * 60;
                setBreathTime(newTime);
              }
              setIsBreathing(true);
            });
            // Zastav interval
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
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
    // Pouze když se změní isPreparing - interval se neresetuje při změně countdownu během běhu
  }, [isPreparing, setBreathTime, setIsBreathing, setIsPreparing, setPreparationCountdown]);
};

