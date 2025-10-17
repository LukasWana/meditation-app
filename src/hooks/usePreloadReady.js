/**
 * Hook pro čekání na dokončení preloadingu
 */

import { useEffect, useState } from 'react';
import { useSimplePreloader } from './useSimplePreloader';

export const usePreloadReady = () => {
  const { isPreloaded, preloadStatus } = useSimplePreloader();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isPreloaded) {
      // Počkej ještě chvilku aby se všechna data načetla
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isPreloaded]);

  return { isReady, isPreloaded, preloadStatus };
};

