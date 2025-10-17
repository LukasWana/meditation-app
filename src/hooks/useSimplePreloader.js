/**
 * Zjednodušený preloading systém pro předpřipravené stránky
 */

import { useEffect, useRef, useState } from 'react';
import cacheService from '@services/cacheService';
import { staticMetadataService } from '@services/staticMetadataService';

/**
 * Hook pro preloading dat při startu aplikace
 */
export const useSimplePreloader = () => {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [preloadStatus, setPreloadStatus] = useState({
    metadata: false,
    slova: false,
    hudba: false,
    structured: false
  });
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    const preloadData = async () => {
      try {
        console.log('🚀 Starting lightweight data preloading...');

        // 1. Inicializuj pouze statickou metadata službu
        await staticMetadataService.initialize();
        setPreloadStatus(prev => ({ ...prev, metadata: true }));
        console.log('✅ Static metadata service initialized');

        // 2. Preload pouze kritická metadata do cache (bez Firebase)
        await cacheService.preloadCriticalData();
        setPreloadStatus(prev => ({ ...prev, slova: true, hudba: true, structured: true }));
        console.log('✅ Critical metadata preloaded to cache');

        setIsPreloaded(true);
        console.log('🎉 Lightweight preloading completed - only static data');

      } catch (error) {
        console.warn('Lightweight preloading failed, continuing with fallback:', error);
        setIsPreloaded(true); // Pokračuj i při chybě
      }
    };

    // Spusť preloading po malém delay
    setTimeout(preloadData, 100);
    initializedRef.current = true;
  }, []);

  return {
    isPreloaded,
    preloadStatus
  };
};

/**
 * Hook pro kontrolu, jestli jsou data připravená
 */
export const useDataReady = (dataType = 'all') => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkDataReady = () => {
      let ready = false;

      // Zkontroluj pouze cache - statická data
      switch (dataType) {
        case 'metadata':
          ready = cacheService.has('metadata', 'muzsky4FSK-uzkost-osamelost.mp3');
          break;
        case 'slova':
          ready = cacheService.has('metadata', 'muzsky4FSK-uzkost-osamelost.mp3');
          break;
        case 'hudba':
          ready = cacheService.has('metadata', '00--00--00--00-ambient1.mp3');
          break;
        case 'structured':
          ready = cacheService.has('metadata', 'muzsky4FSK-uzkost-osamelost.mp3') &&
                  cacheService.has('metadata', '00--00--00--00-ambient1.mp3');
          break;
        case 'all':
        default:
          ready = cacheService.has('metadata', 'muzsky4FSK-uzkost-osamelost.mp3') &&
                  cacheService.has('metadata', '00--00--00--00-ambient1.mp3');
          break;
      }

      setIsReady(ready);
    };

    checkDataReady();

    // Zkontroluj každých 100ms
    const interval = setInterval(checkDataReady, 100);

    return () => clearInterval(interval);
  }, [dataType]);

  return isReady;
};

export default useSimplePreloader;
