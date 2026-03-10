import { useEffect, useRef } from 'react';

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

    // Aktualizuj fázi každých 100ms (pro plynulou UI aktualizaci)
    intervalRef.current = setInterval(() => {
      try {
        const phase = getCurrentPhase();
        if (phase) {
          setBreathPhase(phase);
        }
      } catch (error) {
        console.warn('Failed to get current phase:', error);
      }
    }, 100);

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
  }, [isPlaying, setBreathPhase, breathInDuration, breathOutDuration, getCurrentPhase]);
};

