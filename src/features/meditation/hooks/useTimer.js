import { useEffect } from 'react';
import { useMeditationStore } from '@stores/meditationStore';

/**
 * Hook pro meditační timer.
 * Automaticky se propojí s useMeditationStore a plynule odečítá čas.
 */
export const useTimer = () => {
  const { isPlaying, time, setTime, setIsPlaying } = useMeditationStore();

  useEffect(() => {
    if (!isPlaying || time <= 0) return;

    const interval = setInterval(() => {
      setTime(time - 1);
      if (time - 1 <= 0) {
        setIsPlaying(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, time, setTime, setIsPlaying]);
};

