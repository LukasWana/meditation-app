

import { useEffect } from 'react';

export const useBackgroundDataLoader = (showIntro) => {
  useEffect(() => {
    let stopWatching = null;

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
          console.log('🔄 Loading UI data from Realtime Database...');
          try {
            await uiDataService.loadUIData();
            console.log('✅ UI data loaded successfully');
          } catch (uiError) {
            console.warn('⚠️ Failed to load UI data:', uiError.message);
            // Pokračuj i když UI data selžou
          }

          console.log('🔄 Loading metadata from Realtime Database...');

          // Nejdříve zkus Realtime Database (nejrychlejší)
          try {
            const realtimeMetadata = await realtimeMetadataService.getAllMetadata();
            if (realtimeMetadata && Object.keys(realtimeMetadata).length > 0) {
              console.log(`✅ Loaded ${Object.keys(realtimeMetadata).length} metadata entries from Realtime Database`);

              // Ulož do cache pro rychlý přístup
              const cacheServiceInstance = cacheService;
              Object.entries(realtimeMetadata).forEach(([key, value]) => {
                cacheServiceInstance.setMetadata(key, value);
              });

              console.log('✅ Realtime Database metadata cached successfully');
            } else {
              throw new Error('No metadata in Realtime Database');
            }
          } catch (realtimeError) {
            console.warn('⚠️ Realtime Database failed, falling back to static metadata:', realtimeError.message);

            // Fallback na statická metadata
            await staticMetadataService.initialize();
          }

          // Inicializuj fast metadata service (struktura + názvy)
          console.log('🔄 Initializing fast metadata service in background...');
          await fastMetadataService.initialize();
          console.log('✅ Fast metadata service initialized');

          // Inicializuj globální metadata preloader (skutečné délky MP3)
          console.log('🔄 Initializing global MP3 metadata preloader in background...');
          await globalMetadataPreloader.initialize();
          console.log('✅ Global MP3 metadata preloader initialized');

          // Inicializuj slova data service (předpřipravené filtrované data)
          console.log('🔄 Initializing slova data service in background...');
          const { slovaDataService } = await import('@services/slovaDataService');
          await slovaDataService.initialize();
          console.log('✅ Slova data service initialized');

          // Preload kritická metadata
          await cacheService.preloadCriticalData();

          // Nastav real-time listener pro aktualizace
          console.log('🔄 Setting up real-time metadata listener...');
          stopWatching = realtimeMetadataService.watchMetadata((data) => {
            console.log('📡 Real-time metadata update received:', {
              hasFiles: !!data.files,
              filesCount: data.files ? data.files.length : 0,
              lastSync: data.lastSync
            });

            if (data.files && Array.isArray(data.files)) {
              // Aktualizuj cache s novými daty
              const cacheServiceInstance = cacheService;
              data.files.forEach(file => {
                if (file.fileName) {
                  cacheServiceInstance.setMetadata(file.fileName, file);
                }
              });

              console.log(`✅ Updated cache with ${data.files.length} files from real-time update`);

              // Aktualizuj fast metadata service
              fastMetadataService.initialize(true).then(() => {
                console.log('✅ Fast metadata service updated from real-time data');
              }).catch(err => {
                console.warn('⚠️ Failed to update fast metadata service:', err);
              });

              // Aktualizuj slova data service
              slovaDataService.initialize().then(() => {
                console.log('✅ Slova data service updated from real-time data');
              }).catch(err => {
                console.warn('⚠️ Failed to update slova data service:', err);
              });
            }
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
        if (stopWatching) {
          console.log('🔄 Cleaning up real-time metadata listener...');
          stopWatching();
        }
      };
    }
  }, [showIntro]);
};
