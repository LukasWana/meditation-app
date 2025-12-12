

import { useEffect, useRef } from 'react';

export const useTimer = (isPlaying, time, setTime, setIsPlaying) => {
  const isUpdatingRef = useRef(false);

  // Timer effect with proper cleanup and race condition protection
  useEffect(() => {
    let interval;
    if (isPlaying && time > 0) {
      interval = setInterval(() => {
        // Ochrana proti race conditions
        if (!isUpdatingRef.current) {
          isUpdatingRef.current = true;
          setTime(t => {
            const newTime = t - 1;
            if (newTime <= 0) {
              // Zastav přehrávání okamžitě (bez setTimeout) a timer clamping na 0
              setIsPlaying(false);
            }
            isUpdatingRef.current = false;
            return Math.max(0, newTime);
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, time, setTime, setIsPlaying]);
};
