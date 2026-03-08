import { useEffect, useRef } from 'react';
import { useMeditationStore } from '@stores/meditationStore';

/**
 * Hook pro meditační timer.
 * Automaticky se propojí s useMeditationStore.
 */
export const useTimer = () => {
  const { isPlaying, time, setTime, setIsPlaying } = useMeditationStore();
  const isUpdatingRef = useRef(false);

  // Timer effect with proper cleanup and race condition protection
  useEffect(() => {
    let interval;
    if (isPlaying && time > 0) {
      interval = setInterval(() => {
        // Ochrana proti race conditions
        if (!isUpdatingRef.current) {
          isUpdatingRef.current = true;
          setTime(time - 1);

          if (time - 1 <= 0) {
            setIsPlaying(false);
          }
          isUpdatingRef.current = false;
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
