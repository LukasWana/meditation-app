import { useState, useEffect, useCallback } from 'react';
import offlineCacheService from '@services/offlineCacheService';
import log from '@services/logger';

/**
 * Hook pro správu audio cache
 * Spravuje načítání a ukládání audio souborů do cache
 */
export const useAudioCache = (audioUrl) => {
  const [cachedAudioUrl, setCachedAudioUrl] = useState(null);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);

  // Pomocná funkce pro extrakci názvu souboru z URL
  const extractFileNameFromUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return null;

    // Pokud už je to název souboru (ne URL), vrať ho
    if (!url.startsWith('http')) {
      return url;
    }

    try {
      // Pro Firebase Storage URL: https://firebasestorage.googleapis.com/v0/b/.../o/filename.mp3?alt=media
      const match = url.match(/\/o\/([^?]+)/);
      if (match) {
        const fullPath = decodeURIComponent(match[1]);
        return fullPath;
      }

      // Fallback pro běžné URL
      const pathname = new URL(url).pathname;
      return pathname.startsWith('/') ? pathname.substring(1) : pathname;
    } catch (error) {
      return url.includes('/') ? url : url;
    }
  }, []);

  // Načti audio z cache
  useEffect(() => {
    if (!audioUrl) {
      setCachedAudioUrl(null);
      setIsLoadingFromCache(false);
      return;
    }

    const tryLoadFromCache = async () => {
      setIsLoadingFromCache(true);
      try {
        const fileName = extractFileNameFromUrl(audioUrl);
        if (!fileName) {
          setCachedAudioUrl(null);
          log.audio(`🎵 Using original audio: ${audioUrl}`);
          return;
        }

        log.audio(`🔍 Checking cache for: ${fileName}`);

        // Zkontroluj, jestli je soubor v cache
        const isCached = await offlineCacheService.isFileCached(fileName);
        if (isCached) {
          log.audio(`✅ Found in cache: ${fileName}`);

          // Získej cached URL
          const cachedUrl = await offlineCacheService.getAudioUrl(fileName, audioUrl);
          log.audio(`🎵 Using cached URL: ${cachedUrl}`);
          setCachedAudioUrl(cachedUrl);
        } else {
          log.audio(`❌ Not in cache: ${fileName}`);
          setCachedAudioUrl(null);
          log.audio(`🎵 Using original audio: ${audioUrl}`);
        }
      } catch (error) {
        log.error('❌ Error loading from cache:', error);
        setCachedAudioUrl(null);
      } finally {
        setIsLoadingFromCache(false);
      }
    };

    tryLoadFromCache();
  }, [audioUrl, extractFileNameFromUrl]);

  return {
    cachedAudioUrl,
    isLoadingFromCache,
    extractFileNameFromUrl
  };
};

