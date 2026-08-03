import { useEffect, useRef } from 'react';
import { usePageVisible } from '@hooks/usePageVisible';

/**
 * Hook pro aktualizaci UI fáze dýchání na základě audio času
 * Tento hook pouze aktualizuje UI - timing je řízený audio enginem
 *
 * @param {boolean} isPlaying - Zda probíhá dýchání
 * @param {Function} setBreathPhase - Funkce pro aktualizaci fáze
 * @param {number} breathInDuration - Délka nádechu v sekundách
 * @param {number} breathOutDuration - Délka výdechu v sekundách
 * @param {Function} getCurrentPhase - Funkce z audio enginu pro získání aktuální fáze
 */
export const useBreathPhase = (
  isPlaying,
  setBreathPhase,
  breathInDuration,
  breathOutDuration,
  getCurrentPhase
) => {
  const intervalRef = useRef(null);
  const isVisible = usePageVisible();

  useEffect(() => {
    if (!isPlaying || !getCurrentPhase) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset na 'in' při zastavení
      queueMicrotask(() => {
        setBreathPhase('in');
      });
      return;
    }

    // Na pozadí není co překreslovat — timing hlídá audio engine, ne tento interval
    if (!isVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Aktualizuj fázi každých 200ms. Fáze dýchání trvají jednotky sekund,
    // takže hustší polling jen budí CPU bez viditelného rozdílu.
    intervalRef.current = setInterval(() => {
      try {
        const phase = getCurrentPhase();
        if (phase) {
          setBreathPhase(phase);
        }
      } catch (error) {
        console.warn('Failed to get current phase:', error);
      }
    }, 200);

    // Okamžitá aktualizace při startu
    try {
      const phase = getCurrentPhase();
      if (phase) {
        setBreathPhase(phase);
      }
    } catch (error) {
      console.warn('Failed to get initial phase:', error);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, isVisible, setBreathPhase, breathInDuration, breathOutDuration, getCurrentPhase]);
};

