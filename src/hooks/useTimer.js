

import { useEffect, useRef } from 'react';

export const useTimer = (isPlaying, time, setTime, setIsPlaying) => {
  const isUpdatingRef = useRef(false);
  const timeRef = useRef(time);

  // Aktualizuj ref při změně time
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  // Timer effect with proper cleanup and race condition protection
  // NESPOUŠTĚJ při každé změně time - pouze při změně isPlaying
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        // Ochrana proti race conditions
        if (!isUpdatingRef.current) {
          isUpdatingRef.current = true;
          setTime(t => {
            const newTime = t - 1;
            if (newTime <= 0) {
              // Použij setTimeout pro asynchronní aktualizaci stavu
              setTimeout(() => {
                setIsPlaying(false);
              }, 0);
            }
            isUpdatingRef.current = false;
            return newTime;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, setTime, setIsPlaying]); // Odstranil jsem 'time' z dependencies - způsobovalo to re-render každou sekundu
};
