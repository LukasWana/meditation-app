

import { useEffect, useState } from 'react';
import initializationManager from '@services/initializationManager';
import { getService } from '@services/serviceRegistry';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import cacheServiceRefactored from '@services/cacheServiceRefactored';
import log from '@services/logger';

const INITIAL_STATE = {
  phase: 'idle',
  statusMessage: 'Čekám na inicializaci…',
  isLoading: false,
  uiData: null,
  metadataLoaded: false,
  cacheInitialized: false,
  fastMetadataInitialized: false,
  globalPreloaderInitialized: false,
  slovaServiceInitialized: false,
  realtimeUpdates: 0,
  lastRealtimeUpdate: null,
  readyForServiceWorker: false,
  error: null,
  isComplete: false
};

export const useBackgroundDataLoader = ({ enabled = true } = {}) => {
  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    console.log('🎯 [CRITICAL DEBUG] useBackgroundDataLoader useEffect triggered', { enabled });
    if (!enabled) {
      console.log('⚠️ [DEBUG] useBackgroundDataLoader NOT enabled, skipping');
      setState(INITIAL_STATE);
      return;
    }

    console.log('✅ [DEBUG] useBackgroundDataLoader enabled, starting data load...');
    let stopWatching = null;
    let updateTimeout = null;
    let isMounted = true;

    const safelySetState = (updater) => {
      if (!isMounted) return;
      setState(prev => typeof updater === 'function' ? updater(prev) : updater);
    };

    const loadDataInBackground = async () => {
      console.log('🚀 [CRITICAL DEBUG] useBackgroundDataLoader.loadDataInBackground() START');

      safelySetState(prev => ({
        ...prev,
        isLoading: true,
        phase: 'ui-data',
        statusMessage: 'Načítám UI data…'
      }));

      try {
        console.log('🔍 [DEBUG] About to call initializationManager.initializeCategory("data")...');
        // Inicializuj UI data service
        await initializationManager.initializeCategory('data', false, (service, status) => {
          console.log('📊 [DEBUG] UI Data service initializing:', status);
          if (status.name === 'ui') {
            safelySetState(prev => ({
              ...prev,
              phase: 'ui-data',
              statusMessage: 'Načítám UI data…'
            }));
          }
        });
        console.log('✅ [DEBUG] UI Data initialization completed');

        // Získej UI data
        const uiDataEntry = getService('data', 'ui');
        console.log('🔍 [DEBUG] About to load UIData...');
        const uiData = await uiDataEntry.service.loadUIData();
        console.log('✅ [DEBUG] UI Data loaded:', uiData);
        safelySetState(prev => ({
          ...prev,
          uiData
        }));

        safelySetState(prev => ({
          ...prev,
          phase: 'metadata',
          statusMessage: 'Načítám metadata…'
        }));

        console.log('🎯 [CRITICAL DEBUG] About to call initializationManager.initializeCategory("metadata")...');
        // Inicializuj metadata services
        await initializationManager.initializeCategory('metadata', false, (service, status) => {
          console.log('📊 [DEBUG] Metadata service initializing:', status);
          safelySetState(prev => ({
            ...prev,
            phase: 'metadata',
            statusMessage: `Inicializuji ${status.name} metadata…`
          }));
        });
        console.log('✅ [CRITICAL DEBUG] Metadata initialization completed');

        console.log('🔍 [DEBUG] About to call realtimeMetadataService.getAllMetadata()...');
        // Načti metadata z Realtime Database a ulož do cache
        try {
          const realtimeMetadata = await realtimeMetadataService.getAllMetadata();
          console.log('✅ [DEBUG] realtimeMetadataService.getAllMetadata() returned:', Object.keys(realtimeMetadata || {}).length, 'keys');
          if (realtimeMetadata && Object.keys(realtimeMetadata).length > 0) {
            Object.entries(realtimeMetadata).forEach(([key, value]) => {
              cacheServiceRefactored.setMetadata(key, value);
            });
            safelySetState(prev => ({
              ...prev,
              metadataLoaded: true
            }));
          } else {
            throw new Error('No metadata in Realtime Database');
          }
        } catch (realtimeError) {
          console.error('❌❌❌ [CRITICAL ERROR] realtimeMetadataService.getAllMetadata() FAILED:', realtimeError);
          console.error('Error details:', {
            message: realtimeError.message,
            stack: realtimeError.stack,
            name: realtimeError.name
          });
          if (import.meta.env.MODE === 'development') {
            log.warn('⚠️ Realtime metadata unavailable, using static fallback:', realtimeError.message);
          }
          // Static metadata service se inicializoval přes initializationManager
          safelySetState(prev => ({
            ...prev,
            metadataLoaded: true
          }));
        }

        safelySetState(prev => ({
          ...prev,
          statusMessage: 'Inicializuji cache…'
        }));

        // Inicializuj cache services
        await initializationManager.initializeCategory('cache', false, (service, status) => {
          safelySetState(prev => ({
            ...prev,
            phase: 'cache',
            statusMessage: `Inicializuji ${status.name} cache…`
          }));
        });

        // Preload critical data
        await cacheServiceRefactored.preloadCriticalData();

        // PŘEDNAČTI NÁHLEDY POZADÍ - na pozadí, aby se uživatel nemusel čekat v nastavení
        try {
          const { ref, listAll, getDownloadURL } = await import('firebase/storage');
          const { storage } = await import('@config/secure-firebase');

          const backgroundRef = ref(storage, 'background');
          const backgroundResult = await listAll(backgroundRef);

          const imageFiles = backgroundResult.items.filter(item => {
            const name = item.name.toLowerCase();
            return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
          });

          // Přednačti náhledy paralelně na pozadí (nečekej na dokončení)
          const preloadPromises = imageFiles.map(async (itemRef) => {
            try {
              const imageCacheKey = `background/${itemRef.name}`;
              const thumbnailCacheKey = `background/thumbnails/${itemRef.name}`;

              // Zkontroluj cache pro plný obrázek
              let downloadURL = cacheServiceRefactored.getImageUrl(imageCacheKey);
              if (!downloadURL) {
                downloadURL = await getDownloadURL(itemRef);
                cacheServiceRefactored.setImageUrl(imageCacheKey, downloadURL);
              }

              // Zkus načíst náhled
              let thumbnailURL = cacheServiceRefactored.getImageUrl(thumbnailCacheKey);
              if (!thumbnailURL) {
                try {
                  const thumbnailRef = ref(storage, thumbnailCacheKey);
                  thumbnailURL = await getDownloadURL(thumbnailRef);
                  cacheServiceRefactored.setImageUrl(thumbnailCacheKey, thumbnailURL);
                } catch {
                  // Náhled neexistuje, použij plný obrázek
                  thumbnailURL = null;
                }
              }

              // Přednačti do Cache Storage pro okamžité zobrazení
              const bestPreviewUrl = thumbnailURL || downloadURL;
              if (bestPreviewUrl) {
                await cacheServiceRefactored.preloadImage(bestPreviewUrl, `background-preview:${itemRef.name}`);
              }
            } catch (err) {
              // Ignoruj chyby při přednačítání - není kritické
            }
          });

          // Spusť přednačítání na pozadí (nečekej na dokončení)
          Promise.all(preloadPromises).catch(() => {});
          if (import.meta.env.MODE === 'development') {
            log.cache(`🚀 Preloading ${imageFiles.length} background thumbnails in background...`);
          }
        } catch (err) {
          // Ignoruj chyby při přednačítání - není kritické pro funkčnost aplikace
          if (import.meta.env.MODE === 'development') {
            log.warn('Failed to preload background thumbnails:', err);
          }
        }

        safelySetState(prev => ({
          ...prev,
          cacheInitialized: true,
          statusMessage: 'Inicializuji služby…'
        }));

        // Inicializuj preloader a data services
        await initializationManager.initializeCategory('preloader', false);
        safelySetState(prev => ({
          ...prev,
          globalPreloaderInitialized: true
        }));

        await initializationManager.initializeCategory('data', false, (service, status) => {
          if (status.name === 'slova') {
            safelySetState(prev => ({
              ...prev,
              slovaServiceInitialized: true
            }));
          }
        });

        // Fast metadata service se inicializoval přes initializationManager
        safelySetState(prev => ({
          ...prev,
          fastMetadataInitialized: true
        }));

        safelySetState(prev => ({
          ...prev,
          phase: 'listening',
          statusMessage: 'Čekám na real-time aktualizace…'
        }));

        let lastUpdateTime = 0;
        let isProcessingUpdate = false;
        const DEBOUNCE_DELAY = 2000; // 2 sekundy debounce pro Realtime Database updates

        stopWatching = realtimeMetadataService.watchMetadata((data) => {
          const now = Date.now();

          // Debounce: ignoruj update, pokud proběhl příliš brzy po předchozím
          if (now - lastUpdateTime < DEBOUNCE_DELAY) {
            return;
          }

          // Pokud už probíhá zpracování, ignoruj
          if (isProcessingUpdate) {
            return;
          }

          lastUpdateTime = now;
          isProcessingUpdate = true;

          // Zruš předchozí timeout, pokud existuje
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }

          // Debounced zpracování update
          updateTimeout = setTimeout(async () => {
            if (data.files && Array.isArray(data.files)) {
              data.files.forEach(file => {
                if (file.fileName) {
                  cacheServiceRefactored.setMetadata(file.fileName, file);
                }
              });

              try {
                // Refresh fast metadata a slova services (paralelně)
                const [fastMetadataEntry, slovaEntry] = await Promise.all([
                  Promise.resolve(getService('metadata', 'fast')),
                  Promise.resolve(getService('data', 'slova'))
                ]);

                const refreshPromises = [];

                if (fastMetadataEntry) {
                  refreshPromises.push(
                    initializationManager.initializeService(fastMetadataEntry, false)
                      .catch(err => log.warn('⚠️ Failed to refresh fast metadata:', err))
                  );
                }

                if (slovaEntry) {
                  refreshPromises.push(
                    initializationManager.initializeService(slovaEntry, false)
                      .catch(err => log.warn('⚠️ Failed to refresh slova service:', err))
                  );
                }

                // Počkej na dokončení všech refresh operací
                await Promise.all(refreshPromises);

              } catch (err) {
                log.warn('⚠️ Failed to refresh services:', err);
              }

              safelySetState(prev => ({
                ...prev,
                realtimeUpdates: prev.realtimeUpdates + 1,
                lastRealtimeUpdate: new Date().toISOString()
              }));
            }

            isProcessingUpdate = false;
          }, 500);
        });

        safelySetState(prev => ({
          ...prev,
          isLoading: false,
          isComplete: true,
          readyForServiceWorker: true,
          statusMessage: 'Data připravena'
        }));
      } catch (error) {
        safelySetState(prev => ({
          ...prev,
          isLoading: false,
          phase: 'error',
          error,
          statusMessage: error.message || 'Načítání selhalo'
        }));

        if (import.meta.env.MODE === 'development') {
          console.error('❌ Background data loading failed:', error);
        }
      }
    };

    loadDataInBackground();

    return () => {
      isMounted = false;
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      if (stopWatching) {
        stopWatching();
      }
    };
  }, [enabled]);

  return state;
};
