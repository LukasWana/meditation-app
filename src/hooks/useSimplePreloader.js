/**
 * Zjednodušený preloading systém pro předpřipravené stránky
 */

import { useEffect, useRef, useState } from 'react';
import cacheService from '@services/cacheService';
import { staticMetadataService } from '@services/staticMetadataService';
import { uiDataCollector } from '@services/uiDataCollector';
import { firebaseMetadataCollector } from '@services/firebaseMetadataCollector';

/**
 * Hook pro preloading dat při startu aplikace
 */
export const useSimplePreloader = () => {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [preloadStatus, setPreloadStatus] = useState({
    metadata: false,
    slova: false,
    hudba: false,
    structured: false,
    firebase: false
  });
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    const preloadData = async () => {
      try {
        console.log('🚀 Starting comprehensive data collection...');

        // 1. Inicializuj statickou metadata službu
        await staticMetadataService.initialize();
        setPreloadStatus(prev => ({ ...prev, metadata: true }));
        console.log('✅ Static metadata service initialized');

        // 2. Načti metadata z Firebase Storage a roztřiď je
        const firebaseMetadata = await firebaseMetadataCollector.collectAllFirebaseMetadata();
        setPreloadStatus(prev => ({ ...prev, firebase: true }));
        console.log('✅ Firebase metadata collected and categorized');

        // 3. Ulož Firebase metadata do cache a localStorage
        firebaseMetadataCollector.saveToCache();
        firebaseMetadataCollector.saveToLocalStorage();
        console.log('✅ Firebase metadata saved to cache and localStorage');

        // 4. Načti všechna data z UI aplikace a vytvoř strukturovaný JSON
        const structuredData = await uiDataCollector.collectAllUIData();
        setPreloadStatus(prev => ({ ...prev, slova: true, hudba: true, structured: true }));
        console.log('✅ UI data collected and structured');

        // 5. Ulož strukturovaná data do localStorage
        uiDataCollector.saveStructuredData();
        console.log('✅ Structured data saved to localStorage');

        // 6. Preload kritická data do cache
        await cacheService.preloadCriticalData();
        console.log('✅ Critical data preloaded to cache');

        setIsPreloaded(true);
        console.log('🎉 All data preloaded successfully - Firebase metadata + UI data');

      } catch (error) {
        console.warn('Data collection failed, continuing with fallback:', error);
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

      // Zkontroluj Firebase metadata v localStorage
      const firebaseData = firebaseMetadataCollector.loadFromLocalStorage();
      const structuredData = uiDataCollector.loadStructuredData();

      if (firebaseData || structuredData) {
        switch (dataType) {
          case 'metadata':
            ready = (firebaseData && Object.keys(firebaseData.slova || {}).length > 0) ||
                   (structuredData && Object.keys(structuredData.metadata || {}).length > 0);
            break;
          case 'slova':
            ready = (firebaseData && Object.keys(firebaseData.slova || {}).length > 0) ||
                   (structuredData && (structuredData.slova || []).length > 0);
            break;
          case 'hudba':
            ready = (firebaseData && Object.keys(firebaseData.hudba || {}).length > 0) ||
                   (structuredData && (structuredData.hudba || []).length > 0);
            break;
          case 'firebase':
            ready = firebaseData && Object.keys(firebaseData.slova || {}).length > 0;
            break;
          case 'structured':
            ready = structuredData && structuredData.structured;
            break;
          case 'all':
          default:
            ready = (firebaseData && Object.keys(firebaseData.slova || {}).length > 0) ||
                   (structuredData && Object.keys(structuredData.metadata || {}).length > 0);
            break;
        }
      } else {
        // Fallback na cache kontrolu
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
          case 'all':
          default:
            ready = cacheService.has('metadata', 'muzsky4FSK-uzkost-osamelost.mp3') &&
                    cacheService.has('metadata', '00--00--00--00-ambient1.mp3');
            break;
        }
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
