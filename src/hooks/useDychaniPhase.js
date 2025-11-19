
import { useEffect, useRef } from 'react';

export const useDychaniPhase = (isPlaying, time, setBreathPhase, breathInDuration, breathOutDuration) => {
  const phaseRef = useRef('in');
  const timeoutRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Breath phase effect - spouští se pouze při změně isPlaying nebo časů dýchání
  useEffect(() => {
    if (!isPlaying || time <= 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Přímá aktualizace bez queueMicrotask
      setBreathPhase('in');
      phaseRef.current = 'in';
      isInitializedRef.current = false;
      return;
    }

    // Pokud už běží timer, neruš ho - jen aktualizuj délky pokud se změnily
    if (isInitializedRef.current && timeoutRef.current) {
      // Timer už běží, nech ho pokračovat s aktuálními délkami
      return;
    }

    // Resetuj flag - bude se inicializovat nový timer
    isInitializedRef.current = true;

    const switchPhase = () => {
      phaseRef.current = phaseRef.current === 'in' ? 'out' : 'in';
      // Přímá aktualizace bez debounce - zabraňuje zpoždění a blikání při změně fáze
      setBreathPhase(phaseRef.current);

      const nextDuration = phaseRef.current === 'in' ? breathInDuration : breathOutDuration;

      // Spusť další fázi
      timeoutRef.current = setTimeout(switchPhase, nextDuration * 1000);
    };

    // Začni s nádechem - přímá aktualizace
    phaseRef.current = 'in';
    setBreathPhase('in');
    timeoutRef.current = setTimeout(switchPhase, breathInDuration * 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [isPlaying, setBreathPhase, breathInDuration, breathOutDuration]);
};
