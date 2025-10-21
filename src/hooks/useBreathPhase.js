

import { useEffect } from 'react';

export const useBreathPhase = (isPlaying, time, setBreathPhase) => {
  // Breath phase effect
  useEffect(() => {
    let interval;
    if (isPlaying && time > 0) {
      interval = setInterval(() => {
        setBreathPhase(prev => prev === 'in' ? 'out' : 'in');
      }, 4000); // 4 sekundy pro každou fázi
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, time, setBreathPhase]);
};
