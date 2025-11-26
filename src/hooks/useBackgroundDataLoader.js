

import { useEffect, useState } from 'react';
import uiDataService from '@services/uiDataService';

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
    if (!enabled) {
      setState(INITIAL_STATE);
      return;
    }

    let stopWatching = null;
    let updateTimeout = null;
    let isMounted = true;

    const safelySetState = (updater) => {
      if (!isMounted) return;
      setState(prev => typeof updater === 'function' ? updater(prev) : updater);
    };

    const loadDataInBackground = async () => {
      safelySetState(prev => ({
        ...prev,
        isLoading: true,
        phase: 'ui-data',
        statusMessage: 'Načítám UI data…'
      }));

      try {
        const uiData = await uiDataService.loadUIData();
        safelySetState(prev => ({
          ...prev,
          uiData
        }));

        safelySetState(prev => ({
          ...prev,
          phase: 'metadata',
          statusMessage: 'Načítám metadata…'
        }));

        const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
        const { staticMetadataService } = await import('@services/staticMetadataService');
        const { fastMetadataService } = await import('@services/fastMetadataService');
        const globalMetadataPreloader = (await import('@services/globalMetadataPreloader')).default;
        const cacheService = (await import('@services/cacheServiceRefactored')).default;
        const { slovaDataService } = await import('@services/slovaDataService');

        try {
          const realtimeMetadata = await realtimeMetadataService.getAllMetadata();
          if (realtimeMetadata && Object.keys(realtimeMetadata).length > 0) {
            Object.entries(realtimeMetadata).forEach(([key, value]) => {
              cacheService.setMetadata(key, value);
            });
          } else {
            throw new Error('No metadata in Realtime Database');
          }
        } catch (realtimeError) {
          if (import.meta.env.MODE === 'development') {
            console.warn('⚠️ Realtime metadata unavailable, using static fallback:', realtimeError.message);
          }
          await staticMetadataService.initialize();
        }

        safelySetState(prev => ({
          ...prev,
          metadataLoaded: true,
          statusMessage: 'Inicializuji cache…'
        }));

        await cacheService.preloadCriticalData();
        safelySetState(prev => ({
          ...prev,
          cacheInitialized: true,
          statusMessage: 'Inicializuji služby…'
        }));

        await fastMetadataService.initialize();
        safelySetState(prev => ({
          ...prev,
          fastMetadataInitialized: true
        }));

        await globalMetadataPreloader.initialize();
        safelySetState(prev => ({
          ...prev,
          globalPreloaderInitialized: true
        }));

        await slovaDataService.initialize();
        safelySetState(prev => ({
          ...prev,
          slovaServiceInitialized: true
        }));

        safelySetState(prev => ({
          ...prev,
          phase: 'listening',
          statusMessage: 'Čekám na real-time aktualizace…'
        }));

        let lastUpdateTime = 0;
        let isProcessingUpdate = false;

        stopWatching = realtimeMetadataService.watchMetadata((data) => {
          const now = Date.now();
          if (now - lastUpdateTime < 2000) {
            return;
          }

          if (isProcessingUpdate) {
            return;
          }

          lastUpdateTime = now;
          isProcessingUpdate = true;

          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }

          updateTimeout = setTimeout(async () => {
            if (data.files && Array.isArray(data.files)) {
              data.files.forEach(file => {
                if (file.fileName) {
                  cacheService.setMetadata(file.fileName, file);
                }
              });

              try {
                await fastMetadataService.initialize(false);
              } catch (err) {
                console.warn('⚠️ Failed to refresh fast metadata:', err);
              }

              try {
                await slovaDataService.initialize();
              } catch (err) {
                console.warn('⚠️ Failed to refresh slova service:', err);
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
