
import { useEffect, useRef } from 'react';

export const useBreathPhase = (isPlaying, time, setBreathPhase, breathInDuration, breathOutDuration) => {
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
      // Použij queueMicrotask pro asynchronní aktualizaci, aby se zabránilo aktualizaci během renderu
      queueMicrotask(() => {
        setBreathPhase('in');
      });
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
      // Použij queueMicrotask pro asynchronní aktualizaci
      queueMicrotask(() => {
        setBreathPhase(phaseRef.current);
      });

      const nextDuration = phaseRef.current === 'in' ? breathInDuration : breathOutDuration;

      // Spusť další fázi
      timeoutRef.current = setTimeout(switchPhase, nextDuration * 1000);
    };

    // Začni s nádechem - použij queueMicrotask pro asynchronní aktualizaci
    phaseRef.current = 'in';
    queueMicrotask(() => {
      setBreathPhase('in');
    });
    timeoutRef.current = setTimeout(switchPhase, breathInDuration * 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [isPlaying, setBreathPhase, breathInDuration, breathOutDuration]); // Odstranil jsem 'time' z dependencies
};
