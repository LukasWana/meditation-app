

import { useEffect, useRef } from 'react';

export const useBackgroundDataLoader = (showIntro) => {
  const hasStartedLoadingRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Pokud už načítání proběhlo, nespouštěj znovu
    if (hasStartedLoadingRef.current) {
      return;
    }

    let stopWatching = null;
    let updateTimeout = null;

    // Spusť načítání dat - buď během intro animace, nebo okamžitě pokud intro není
    if (!isLoadingRef.current) {
      isLoadingRef.current = true;
      hasStartedLoadingRef.current = true;

      // Spusť načítání dat v pozadí během animace nebo okamžitě
      const loadDataInBackground = async () => {
        try {
          // Import dynamicky aby se nenačítal při startu
          const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
          const { staticMetadataService } = await import('@services/staticMetadataService');
          const { fastMetadataService } = await import('@services/fastMetadataService');
          const globalMetadataPreloader = (await import('@services/globalMetadataPreloader')).default;
          const cacheService = (await import('@services/cacheServiceRefactored')).default;
          const uiDataService = (await import('@services/uiDataService')).default;

          // Načti UI data (texty, překlady, konfigurace) z Realtime Database
          try {
            await uiDataService.loadUIData();
          } catch (uiError) {
            console.warn('⚠️ Failed to load UI data:', uiError.message);
            // Pokračuj i když UI data selžou
          }

          // 1. PRVNÍ: Inicializuj realtimeMetadataService před použitím
          await realtimeMetadataService.initialize();

          // 2. DRUHÝ: Získej metadata z Realtime Database (teď už je služba inicializovaná)
          try {
            const realtimeMetadata = await realtimeMetadataService.getAllMetadata();
            if (realtimeMetadata && Object.keys(realtimeMetadata).length > 0) {
              // Ulož do cache pro rychlý přístup
              const cacheServiceInstance = cacheService;
              Object.entries(realtimeMetadata).forEach(([key, value]) => {
                cacheServiceInstance.setMetadata(key, value);
              });
            } else {
              throw new Error('No metadata in Realtime Database');
            }
          } catch (realtimeError) {
            console.warn('⚠️ Realtime Database failed, falling back to static metadata:', realtimeError.message);

            // Fallback na statická metadata
            await staticMetadataService.initialize();
          }

          // Inicializuj fast metadata service (struktura + názvy)
          await fastMetadataService.initialize();

          // Inicializuj globální metadata preloader (skutečné délky MP3)
          await globalMetadataPreloader.initialize();

          // Inicializuj data meditací (předpřipravené filtrované data)
          const { meditaceDataService } = await import('@services/meditaceDataService');
          await meditaceDataService.initialize();

          // Preload kritická metadata
          await cacheService.preloadCriticalData();

          // Nastav real-time listener pro aktualizace
          let lastUpdateTime = 0;
          let isProcessingUpdate = false;

          stopWatching = realtimeMetadataService.watchMetadata((data) => {
            // Debounce: aktualizuj maximálně jednou za 2 sekundy
            const now = Date.now();
            if (now - lastUpdateTime < 2000) {
              return;
            }

            // Pokud už probíhá aktualizace, přeskoč
            if (isProcessingUpdate) {
              return;
            }

            lastUpdateTime = now;
            isProcessingUpdate = true;

            // Debounce aktualizaci o 500ms
            if (updateTimeout) {
              clearTimeout(updateTimeout);
            }

            updateTimeout = setTimeout(() => {
              if (data.files && Array.isArray(data.files)) {
                // Aktualizuj cache s novými daty
                const cacheServiceInstance = cacheService;
                data.files.forEach(file => {
                  if (file.fileName) {
                    cacheServiceInstance.setMetadata(file.fileName, file);
                  }
                });

                // Aktualizuj fast metadata service (bez force reload)
                fastMetadataService.initialize(false).then(() => {
                  isProcessingUpdate = false;
                }).catch(err => {
                  console.warn('⚠️ Failed to update fast metadata service:', err);
                  isProcessingUpdate = false;
                });

                // Aktualizuj meditace data service
                meditaceDataService.initialize().then(() => {
                  // Service updated
                }).catch(err => {
                  console.warn('⚠️ Failed to update meditace data service:', err);
                });
              } else {
                isProcessingUpdate = false;
              }
            }, 500); // Debounce 500ms
          });

          if (import.meta.env.MODE === 'development') {
            console.log('✅ Background data loading completed during intro animation');
          }

        } catch (error) {
          if (import.meta.env.MODE === 'development') {
            console.warn('Background data loading failed:', error);
          }
        }
      };

      // Spusť po delay aby neovlivnilo LCP (pouze pokud je intro)
      // Pokud intro není, spusť okamžitě
      const delay = showIntro ? 1000 : 0;
      const timeoutId = setTimeout(() => {
        loadDataInBackground().finally(() => {
          isLoadingRef.current = false;
        });
      }, delay);

      // Cleanup funkce
      return () => {
        clearTimeout(timeoutId);
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        if (stopWatching) {
          stopWatching();
        }
        isLoadingRef.current = false;
      };
    }
  }, [showIntro]);
};
