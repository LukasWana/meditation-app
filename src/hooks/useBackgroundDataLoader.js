

import { useEffect } from 'react';

export const useBackgroundDataLoader = (showIntro) => {
  useEffect(() => {
    if (showIntro) {
      // Spusť načítání dat v pozadí během animace
      const loadDataInBackground = async () => {
        try {
          // Import dynamicky aby se nenačítal při startu
          const { staticMetadataService } = await import('@services/staticMetadataService');
          const { fastMetadataService } = await import('@services/fastMetadataService');
          const globalMetadataPreloader = (await import('@services/globalMetadataPreloader')).default;
          const cacheService = (await import('@services/cacheServiceRefactored')).default;

          // Inicializuj metadata službu (rychlá verze)
          await staticMetadataService.initialize();

          // Inicializuj fast metadata service (struktura + názvy)
          console.log('🔄 Initializing fast metadata service in background...');
          await fastMetadataService.initialize();
          console.log('✅ Fast metadata service initialized');

          // Inicializuj globální metadata preloader (skutečné délky MP3)
          console.log('🔄 Initializing global MP3 metadata preloader in background...');
          await globalMetadataPreloader.initialize();
          console.log('✅ Global MP3 metadata preloader initialized');

          // Preload kritická metadata
          await cacheService.preloadCriticalData();

          // Hudba data se načítají v preloadCriticalData()

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
      setTimeout(loadDataInBackground, 1000);
    }
  }, [showIntro]);
};
