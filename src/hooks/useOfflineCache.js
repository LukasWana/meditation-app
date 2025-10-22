import { useState, useEffect, useCallback } from 'react';
import offlineCacheService from '@services/offlineCacheService';
import log from '@services/logger';

export const useOfflineCache = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(null);

  // Inicializace cache service
  const initializeCache = useCallback(async () => {
    try {
      log.debug('🔄 Initializing offline cache...');
      const success = await offlineCacheService.initialize();
      log.debug('✅ Cache initialization result:', success);
      setIsInitialized(success);

      if (success) {
        // Načti statistiky přímo, ne přes loadCacheStats (který kontroluje isInitialized)
        try {
          log.debug('🔄 Loading cache stats after initialization...');
          const stats = await offlineCacheService.getCacheStats();
          log.debug('📊 Cache stats after init:', stats);
          setCacheStats(stats);
          setIsOfflineReady(stats ? stats.isOfflineReady : false);
        } catch (statsError) {
          log.error('❌ Failed to load cache stats after init:', statsError);
        }
      }
      return success;
    } catch (error) {
      log.error('❌ Failed to initialize offline cache:', error);
      return false;
    }
  }, []);

  // Načti statistiky cache
  const loadCacheStats = useCallback(async () => {
    if (!isInitialized) {
      log.warn('⚠️ Cache not initialized, cannot load stats');
      return null;
    }

    try {
      log.debug('🔄 Loading cache stats...');
      const stats = await offlineCacheService.getCacheStats();
      log.debug('📊 Cache stats loaded:', stats);
      setCacheStats(stats);
      setIsOfflineReady(stats ? stats.isOfflineReady : false);
      return stats;
    } catch (error) {
      log.error('❌ Failed to load cache stats:', error);
      return null;
    }
  }, [isInitialized]);

  // Stáhni všechny soubory do cache
  const cacheAllFiles = useCallback(async (audioFiles, onProgress = null) => {
    if (!isInitialized || isCaching) return false;

    setIsCaching(true);
    setCacheProgress({ current: 0, total: audioFiles.length, percentage: 0 });

    try {
      const result = await offlineCacheService.cacheAllAudioFiles(audioFiles, (progress) => {
        setCacheProgress(progress);
        if (onProgress) {
          onProgress(progress);
        }
      });

      log.success(`✅ Caching completed: ${result.success} success, ${result.errors} errors`);
      await loadCacheStats(); // Aktualizuj statistiky
      return result;
    } catch (error) {
      log.error('❌ Caching failed:', error);
      return { success: 0, errors: audioFiles.length };
    } finally {
      setIsCaching(false);
      setCacheProgress(null);
    }
  }, [isInitialized, isCaching, loadCacheStats]);

  // Vymaž cache
  const clearCache = useCallback(async () => {
    if (!isInitialized) return false;

    try {
      await offlineCacheService.clearCache();
      await loadCacheStats();
      log.info('✅ Cache cleared');
      return true;
    } catch (error) {
      log.error('❌ Failed to clear cache:', error);
      return false;
    }
  }, [isInitialized, loadCacheStats]);

  // Zkontroluj, jestli je soubor v cache
  const isFileCached = useCallback(async (fileName) => {
    if (!isInitialized) return false;
    return await offlineCacheService.isFileCached(fileName);
  }, [isInitialized]);

  // Získej URL pro přehrávání (z cache nebo originál)
  const getAudioUrl = useCallback(async (fileName, originalUrl) => {
    if (!isInitialized) return originalUrl;
    return await offlineCacheService.getAudioUrl(fileName, originalUrl);
  }, [isInitialized]);

  // Zkontroluj dostupnost offline režimu
  const checkOfflineAvailability = useCallback(async () => {
    if (!isInitialized) return false;
    return await offlineCacheService.checkOfflineAvailability();
  }, [isInitialized]);

  // Automatická inicializace při mount
  useEffect(() => {
    initializeCache();
  }, [initializeCache]);

  return {
    // Stav
    isInitialized,
    cacheStats,
    isOfflineReady,
    isCaching,
    cacheProgress,

    // Akce
    initializeCache,
    loadCacheStats,
    cacheAllFiles,
    clearCache,
    isFileCached,
    getAudioUrl,
    checkOfflineAvailability
  };
};

export default useOfflineCache;
