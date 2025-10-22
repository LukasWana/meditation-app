import { useState, useEffect, useCallback } from 'react';
import offlineCacheService from '@services/offlineCacheService';
import log from '@services/logger';

/**
 * Hook pro správu offline audia (resolvování URL z cache)
 */
export const useOfflineAudio = (audioUrl) => {
  const [resolvedUrl, setResolvedUrl] = useState(audioUrl);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);

  const extractFileNameFromUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (!url.startsWith('http')) return url;

    try {
      const match = url.match(/\/o\/([^?]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
      const pathname = new URL(url).pathname;
      return pathname.startsWith('/') ? pathname.substring(1) : pathname;
    } catch (error) {
      return url;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const resolveUrl = async () => {
      if (!audioUrl) {
        setResolvedUrl(null);
        return;
      }

      setIsLoadingFromCache(true);
      try {
        const fileName = extractFileNameFromUrl(audioUrl);
        if (!fileName) {
          if (isMounted) setResolvedUrl(audioUrl);
          return;
        }

        // Zkontroluj, jestli je soubor v cache
        const isCached = await offlineCacheService.isFileCached(fileName);
        if (isCached && isMounted) {
          const cachedUrl = await offlineCacheService.getAudioUrl(fileName, audioUrl);
          log.audio(`🎵 Resolved from cache: ${fileName}`);
          setResolvedUrl(cachedUrl);
        } else if (isMounted) {
          log.audio(`🎵 Using original URL: ${audioUrl}`);
          setResolvedUrl(audioUrl);
        }
      } catch (error) {
        log.error('❌ Error resolving offline URL:', error);
        if (isMounted) setResolvedUrl(audioUrl);
      } finally {
        if (isMounted) setIsLoadingFromCache(false);
      }
    };

    resolveUrl();

    return () => {
      isMounted = false;
    };
  }, [audioUrl]);

  return { resolvedUrl, isLoadingFromCache };
};
