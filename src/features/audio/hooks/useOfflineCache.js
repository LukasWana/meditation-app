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
      console.log('🔄 Initializing offline cache...');
      log.debug('🔄 Initializing offline cache...');
      const success = await offlineCacheService.initialize();
      console.log('✅ Cache initialization result:', success);
      log.debug('✅ Cache initialization result:', success);
      setIsInitialized(success);

      if (success) {
        // Načti statistiky přímo, ne přes loadCacheStats (který kontroluje isInitialized)
        try {
          console.log('🔄 Loading cache stats after initialization...');
          log.debug('🔄 Loading cache stats after initialization...');
          const stats = await offlineCacheService.getCacheStats();
          console.log('📊 Cache stats after init:', stats);
          log.debug('📊 Cache stats after init:', stats);
          setCacheStats(stats);
          setIsOfflineReady(stats ? stats.isOfflineReady : false);
        } catch (statsError) {
          console.error('❌ Failed to load cache stats after init:', statsError);
          log.error('❌ Failed to load cache stats after init:', statsError);
        }
      }
      return success;
    } catch (error) {
      console.error('❌ Failed to initialize offline cache:', error);
      log.error('❌ Failed to initialize offline cache:', error);
      return false;
    }
  }, []);

  // Načti statistiky cache
  const loadCacheStats = useCallback(async () => {
    console.log('🔄 loadCacheStats called:', { isInitialized });
    if (!isInitialized) {
      console.warn('⚠️ Cache not initialized, cannot load stats');
      log.warn('⚠️ Cache not initialized, cannot load stats');
      return null;
    }

    try {
      console.log('🔄 Loading cache stats...');
      log.debug('🔄 Loading cache stats...');

      // Použij enhanced offline cache service pro lepší statistiky
      await offlineCacheService.initialize();
      const stats = await offlineCacheService.getCacheStats();

      console.log('📊 Cache stats loaded:', stats);
      log.debug('📊 Cache stats loaded:', stats);
      setCacheStats(stats);
      setIsOfflineReady(stats ? stats.isOfflineReady : false);
      return stats;
    } catch (error) {
      console.error('❌ Failed to load cache stats:', error);
      log.error('❌ Failed to load cache stats:', error);
      return null;
    }
  }, [isInitialized]);

  // Stáhni všechny soubory do cache
  const cacheAllFiles = useCallback(async (audioFiles, onProgress = null) => {
    console.log('🔄 cacheAllFiles called:', {
      isInitialized,
      isCaching,
      audioFilesLength: audioFiles?.length || 0
    });

    if (!isInitialized) {
      console.warn('⚠️ Cache not initialized, cannot cache files');
      return false;
    }

    if (isCaching) {
      console.warn('⚠️ Cache already in progress, cannot start new caching');
      return false;
    }

    setIsCaching(true);
    setCacheProgress({ current: 0, total: audioFiles.length, percentage: 0 });

    try {
      console.log('🚀 Starting cache operation with files:', audioFiles.length);
      const result = await offlineCacheService.cacheAllAudioFiles(audioFiles, (progress) => {
        console.log('📊 Cache progress:', progress);
        setCacheProgress(progress);
        if (onProgress) {
          onProgress(progress);
        }
      });

      console.log('✅ Caching completed:', result);
      log.success(`✅ Caching completed: ${result.success} success, ${result.errors} errors`);

      // Aktualizuj statistiky
      console.log('🔄 Updating cache stats after caching...');
      const updatedStats = await loadCacheStats();
      console.log('📊 Updated cache stats:', updatedStats);

      return result;
    } catch (error) {
      console.error('❌ Caching failed:', error);
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

    try {
      // Použij enhanced offline cache service pro lepší fallback strategii
      await offlineCacheService.initialize();
      return await offlineCacheService.getAudioUrl(fileName, originalUrl);
    } catch (error) {
      log.error('❌ Error getting audio URL:', error);
      return originalUrl;
    }
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
