

import { useEffect } from 'react';

export const useBackgroundDataLoader = (showIntro) => {
  useEffect(() => {
    let stopWatching = null;
    let updateTimeout = null;

    if (showIntro) {
      // Spusť načítání dat v pozadí během animace
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
          // Debug logy deaktivovány - příliš mnoho výpisů
          // const DEBUG_BACKGROUND_LOADER = false;
          // if (DEBUG_BACKGROUND_LOADER) console.log('🔄 Loading UI data from Realtime Database...');
          try {
            await uiDataService.loadUIData();
            // if (DEBUG_BACKGROUND_LOADER) console.log('✅ UI data loaded successfully');
          } catch (uiError) {
            console.warn('⚠️ Failed to load UI data:', uiError.message);
            // Pokračuj i když UI data selžou
          }

          // if (DEBUG_BACKGROUND_LOADER) console.log('🔄 Loading metadata from Realtime Database...');

          // Nejdříve zkus Realtime Database (nejrychlejší)
          try {
            const realtimeMetadata = await realtimeMetadataService.getAllMetadata();
            if (realtimeMetadata && Object.keys(realtimeMetadata).length > 0) {
              // if (DEBUG_BACKGROUND_LOADER) console.log(`✅ Loaded ${Object.keys(realtimeMetadata).length} metadata entries from Realtime Database`);

              // Ulož do cache pro rychlý přístup
              const cacheServiceInstance = cacheService;
              Object.entries(realtimeMetadata).forEach(([key, value]) => {
                cacheServiceInstance.setMetadata(key, value);
              });

              // if (DEBUG_BACKGROUND_LOADER) console.log('✅ Realtime Database metadata cached successfully');
            } else {
              throw new Error('No metadata in Realtime Database');
            }
          } catch (realtimeError) {
            console.warn('⚠️ Realtime Database failed, falling back to static metadata:', realtimeError.message);

            // Fallback na statická metadata
            await staticMetadataService.initialize();
          }

          // Inicializuj fast metadata service (struktura + názvy)
          // if (DEBUG_BACKGROUND_LOADER) console.log('🔄 Initializing fast metadata service in background...');
          await fastMetadataService.initialize();
          // if (DEBUG_BACKGROUND_LOADER) console.log('✅ Fast metadata service initialized');

          // Inicializuj globální metadata preloader (skutečné délky MP3)
          // if (DEBUG_BACKGROUND_LOADER) console.log('🔄 Initializing global MP3 metadata preloader in background...');
          await globalMetadataPreloader.initialize();
          // if (DEBUG_BACKGROUND_LOADER) console.log('✅ Global MP3 metadata preloader initialized');

          // Inicializuj data meditací (předpřipravené filtrované data)
          // if (DEBUG_BACKGROUND_LOADER) console.log('🔄 Initializing meditace data service in background...');
          const { meditaceDataService } = await import('@services/meditaceDataService');
          await meditaceDataService.initialize();
          // if (DEBUG_BACKGROUND_LOADER) console.log('✅ Meditace data service initialized');

          // Preload kritická metadata
          await cacheService.preloadCriticalData();

          // Nastav real-time listener pro aktualizace
          // if (DEBUG_BACKGROUND_LOADER) console.log('🔄 Setting up real-time metadata listener...');
          let lastUpdateTime = 0;
          let isProcessingUpdate = false;

          stopWatching = realtimeMetadataService.watchMetadata((data) => {
            // Debounce: aktualizuj maximálně jednou za 2 sekundy
            const now = Date.now();
            if (now - lastUpdateTime < 2000) {
              // if (DEBUG_BACKGROUND_LOADER) console.debug('⏭️ Skipping real-time update (debounce)');
              return;
            }

            // Pokud už probíhá aktualizace, přeskoč
            if (isProcessingUpdate) {
              // if (DEBUG_BACKGROUND_LOADER) console.debug('⏭️ Skipping real-time update (already processing)');
              return;
            }

            lastUpdateTime = now;
            isProcessingUpdate = true;

            // if (DEBUG_BACKGROUND_LOADER) console.log('📡 Real-time metadata update received:', {
            //   hasFiles: !!data.files,
            //   filesCount: data.files ? data.files.length : 0,
            //   lastSync: data.lastSync
            // });

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

                // if (DEBUG_BACKGROUND_LOADER) console.log(`✅ Updated cache with ${data.files.length} files from real-time update`);

                // Aktualizuj fast metadata service (bez force reload)
                fastMetadataService.initialize(false).then(() => {
                  // if (DEBUG_BACKGROUND_LOADER) console.log('✅ Fast metadata service updated from real-time data');
                  isProcessingUpdate = false;
                }).catch(err => {
                  console.warn('⚠️ Failed to update fast metadata service:', err);
                  isProcessingUpdate = false;
                });

                // Aktualizuj meditace data service
                meditaceDataService.initialize().then(() => {
                  // if (DEBUG_BACKGROUND_LOADER) console.log('✅ Meditace data service updated from real-time data');
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

      // Spusť po delay aby neovlivnilo LCP
      const timeoutId = setTimeout(loadDataInBackground, 1000);

      // Cleanup funkce
      return () => {
        clearTimeout(timeoutId);
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        if (stopWatching) {
          // if (DEBUG_BACKGROUND_LOADER) console.log('🔄 Cleaning up real-time metadata listener...');
          stopWatching();
        }
      };
    }
  }, [showIntro]);
};
