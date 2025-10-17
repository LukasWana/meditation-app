import { useEffect, useRef, useCallback } from 'react';
import cacheService from '@services/cacheService';

/**
 * Hook pro prediktivní preloading na základě navigačních vzorců
 * Přednačítá data pro potenciálně navštívené obrazovky
 */
export const usePredictivePreloader = (currentScreen, navigationHistory = []) => {
  const preloadTimeoutRef = useRef(null);
  const preloadedScreensRef = useRef(new Set());

  // Definice navigačních vzorců a preload strategií
  const navigationPatterns = {
    // Z home screen - uživatel často jde na slova nebo bez-slov
    'home': {
      likelyNext: ['slova', 'bez-slov', 'meditation'],
      preloadData: async () => {
        // Přednačti metadata pro slova a hudbu
        try {
          const { useFirebaseAudioFilter } = await import('@features/audio/hooks/useFirebaseAudioFilter');
          const { useFirebaseHudbaFilter } = await import('@features/audio/hooks/useFirebaseHudbaFilter');

          // Spusť preloading v pozadí
          setTimeout(() => {
            cacheService.preloadCriticalData().catch(err => {
              console.warn('Critical data preload failed:', err);
            });
          }, 500);
        } catch (err) {
          console.warn('Predictive preload setup failed:', err);
        }
      }
    },

    // Z slova screen - uživatel může jít na meditation nebo zpět
    'slova': {
      likelyNext: ['meditation', 'home'],
      preloadData: async () => {
        // Metadata už jsou načtená, jen optimalizuj cache
        cacheService.optimizeCache();
      }
    },

    // Z bez-slov screen - podobně jako slova
    'bez-slov': {
      likelyNext: ['home', 'album-detail'],
      preloadData: async () => {
        cacheService.optimizeCache();
      }
    },

    // Z meditation screen - často se vrací domů
    'meditation': {
      likelyNext: ['home', 'breath'],
      preloadData: async () => {
        // Meditace nepotřebuje další preloading
      }
    }
  };

  const predictNextScreen = useCallback((current, history) => {
    const pattern = navigationPatterns[current];
    if (!pattern) return [];

    // Analýza historie pro lepší predikci
    const recentHistory = history.slice(-3); // Poslední 3 navigace
    const frequency = {};

    recentHistory.forEach(screen => {
      frequency[screen] = (frequency[screen] || 0) + 1;
    });

    // Seřaď podle frekvence a pravděpodobnosti
    return pattern.likelyNext.sort((a, b) => {
      const aFreq = frequency[a] || 0;
      const bFreq = frequency[b] || 0;
      return bFreq - aFreq;
    });
  }, []);

  useEffect(() => {
    if (!currentScreen) return;

    // Zruš předchozí timeout
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Prediktivní preloading po 100ms pro dotyková zařízení
    preloadTimeoutRef.current = setTimeout(async () => {
      try {
        const pattern = navigationPatterns[currentScreen];
        if (pattern && pattern.preloadData) {
          await pattern.preloadData();
          preloadedScreensRef.current.add(currentScreen);
        }

        // Predikce dalších obrazovek
        const likelyNext = predictNextScreen(currentScreen, navigationHistory);
        console.log(`Predictive preloading for ${currentScreen}, likely next: ${likelyNext.join(', ')}`);

        // Preload data pro pravděpodobně navštívené obrazovky
        for (const nextScreen of likelyNext.slice(0, 2)) { // Pouze první 2
          if (!preloadedScreensRef.current.has(nextScreen)) {
            setTimeout(() => {
              preloadScreenData(nextScreen);
            }, 150 + Math.random() * 100); // Random delay 150-250ms pro dotyková zařízení
          }
        }

      } catch (error) {
        console.warn('Predictive preload failed:', error);
      }
    }, 200);

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [currentScreen, navigationHistory, predictNextScreen]);

  const preloadScreenData = useCallback(async (screenName) => {
    try {
      switch (screenName) {
        case 'slova':
          // Přednačti audio filtry pro slova
          await cacheService.preloadSlovaData();
          break;
        case 'bez-slov':
          // Přednačti hudební filtry
          await cacheService.preloadHudbaData();
          break;
        case 'meditation':
          // Meditace nepotřebuje speciální preloading
          break;
        default:
          break;
      }
      preloadedScreensRef.current.add(screenName);
    } catch (err) {
      console.warn(`Preload failed for ${screenName}:`, err);
    }
  }, []);

  // Cleanup na unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  return {
    preloadScreenData,
    preloadedScreens: Array.from(preloadedScreensRef.current)
  };
};

/**
 * Hook pro touch preloading - spouští preloading při touch na tlačítko
 */
export const useTouchPreloader = () => {
  const hoverTimeoutRef = useRef(null);
  const preloadingRef = useRef(false);

  const preloadOnTouch = useCallback(async (screenName, delay = 100) => {
    if (preloadingRef.current) return;

    // Zruš předchozí timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(async () => {
      try {
        preloadingRef.current = true;
        console.log(`Touch preloading: ${screenName}`);

        switch (screenName) {
          case 'slova':
            await cacheService.preloadSlovaData();
            break;
          case 'bez-slov':
            await cacheService.preloadHudbaData();
            break;
          default:
            break;
        }
      } catch (err) {
        console.warn(`Touch preload failed for ${screenName}:`, err);
      } finally {
        preloadingRef.current = false;
      }
    }, delay);
  }, []);

  const cancelTouchPreload = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    preloadingRef.current = false;
  }, []);

  // Cleanup na unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return { preloadOnTouch, cancelTouchPreload };
};

/**
 * Hook pro background preloading - načítá kritická data při startu aplikace
 */
export const useBackgroundPreloader = () => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    const initializePreloading = async () => {
      try {
        console.log('Starting background preloading...');

        // Preload kritická data v pozadí
        await cacheService.preloadCriticalData();

        initializedRef.current = true;
        console.log('Background preloading completed');
      } catch (err) {
        console.warn('Background preloading failed:', err);
      }
    };

    // Spusť po 100ms od startu aplikace pro okamžitou odezvu
    const timer = setTimeout(initializePreloading, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return { isInitialized: initializedRef.current };
};

export default usePredictivePreloader;
