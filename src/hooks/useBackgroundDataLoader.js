

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
        // Inicializuj UI data service
        await initializationManager.initializeCategory('data', false, (service, status) => {
          if (status.name === 'ui') {
            safelySetState(prev => ({
              ...prev,
              phase: 'ui-data',
              statusMessage: 'Načítám UI data…'
            }));
          }
        });

        // Získej UI data
        const uiDataEntry = getService('data', 'ui');
        const uiData = await uiDataEntry.service.loadUIData();
        safelySetState(prev => ({
          ...prev,
          uiData
        }));

        safelySetState(prev => ({
          ...prev,
          phase: 'metadata',
          statusMessage: 'Načítám metadata…'
        }));

        // Inicializuj metadata services
        await initializationManager.initializeCategory('metadata', false, (service, status) => {
          safelySetState(prev => ({
            ...prev,
            phase: 'metadata',
            statusMessage: `Inicializuji ${status.name} metadata…`
          }));
        });

        // Načti metadata z Realtime Database a ulož do cache
        try {
          const realtimeMetadata = await realtimeMetadataService.getAllMetadata();
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
                  cacheServiceRefactored.setMetadata(file.fileName, file);
                }
              });

              try {
                // Refresh fast metadata a slova services
                const fastMetadataEntry = getService('metadata', 'fast');
                if (fastMetadataEntry) {
                  await initializationManager.initializeService(fastMetadataEntry, false);
                }
              } catch (err) {
                log.warn('⚠️ Failed to refresh fast metadata:', err);
              }

              try {
                const slovaEntry = getService('data', 'slova');
                if (slovaEntry) {
                  await initializationManager.initializeService(slovaEntry, false);
                }
              } catch (err) {
                log.warn('⚠️ Failed to refresh slova service:', err);
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
