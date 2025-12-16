import { useState, useEffect, useRef } from 'react';
import { useFirebaseHudbaFilter } from '@features/audio/hooks/useFirebaseHudbaFilter';
import log from '@services/logger';
import cacheService from '@services/cacheServiceRefactored';
import { fastMetadataService } from '@services/fastMetadataService';

// Vylepšená funkce pro načtení duration s retry logikou a cleanup
const getAudioDuration = (audioSrc, retries = 3) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    let timeoutId;
    let isResolved = false;

    const cleanup = () => {
      if (isResolved) return;
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      if (timeoutId) clearTimeout(timeoutId);
      // Vyčisti audio element pro uvolnění paměti
      audio.src = '';
      audio.load();
    };

    const resolveOnce = (value) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve(value);
    };

    const onLoadedMetadata = () => {
      const duration = audio.duration;
      if (isFinite(duration) && duration > 0) {
        log.debug(`✅ Duration loaded successfully: ${duration}s`);
        resolveOnce(duration); // Vrať duration v sekundách, ne jako string
      } else {
        log.warn(`Invalid duration received: ${duration}`);
        resolveOnce(null);
      }
    };

    const onError = () => {
      log.warn(`Audio loading failed for ${audioSrc}, retries left: ${retries - 1}`);
      if (retries > 1) {
        // Retry s exponenciálním backoff
        cleanup();
        setTimeout(() => {
          getAudioDuration(audioSrc, retries - 1).then(resolveOnce);
        }, 1000 * (4 - retries)); // 1s, 2s, 3s
      } else {
        resolveOnce(null);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);

    // Timeout po 10 sekundách
    timeoutId = setTimeout(() => {
      log.warn(`Timeout loading duration for ${audioSrc}`);
      resolveOnce(null);
    }, 10000);

    audio.src = audioSrc;
  });
};

export const useHudbaScreenData = () => {
  const [durations, setDurations] = useState(new Map());

  // Použij hudební filtrovací systém z Firebase
  const { hudbaItems, isLoading, error, stats, isLoadingCovers, isLoadingDurations, refreshAudioFiles } = useFirebaseHudbaFilter();

  // Přednačti cover obrázky alb (primárně náhledy) po startu, aby grid nečekal na síť.
  useEffect(() => {
    if (!hudbaItems || hudbaItems.length === 0) return;
    if (isLoading) return;

    const coverUrls = hudbaItems
      .filter(item => item?.type === 'album' && item.coverImage)
      .map(item => item.coverImage);

    const unique = Array.from(new Set(coverUrls));
    const firstBatch = unique.slice(0, 12); // typicky počet položek viditelných v gridu

    const run = () => {
      firstBatch.forEach((url, idx) => {
        cacheService.preloadImage(url, `album-cover:${idx}`).catch(() => {});
      });
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback?.(id);
    }

    run();
  }, [hudbaItems, isLoading]);

  // Funkce pro refresh dat (vymaže cache a znovu načte)
  const handleRefresh = async () => {
    log.info('🔄 Manual refresh triggered - clearing cache and reloading...');
    try {
      // Vymaž cache fast metadata service
      fastMetadataService.clearCache();
      log.info('✅ Fast metadata cache cleared');

      // Zavolej refresh z hooku (pokud existuje)
      if (refreshAudioFiles) {
        log.info('🔄 Calling refreshAudioFiles...');
        await refreshAudioFiles();
        log.success('✅ Data refreshed successfully');
      } else {
        log.warn('⚠️ refreshAudioFiles not available, reloading page...');
        // Fallback: reload stránky
        window.location.reload();
      }
    } catch (error) {
      log.error('❌ Error refreshing data:', error);
      // Fallback: reload stránky
      window.location.reload();
    }
  };

  // Funkce pro formátování délky v sekundách na MM:SS
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 'N/A') return 'N/A';

    // Pokud už je string ve formátu MM:SS, vrať ho
    if (typeof seconds === 'string' && seconds.includes(':')) {
      return seconds;
    }

    // Pokud je to číslo (sekundy), převeď na MM:SS
    if (typeof seconds === 'number' && seconds > 0) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    return 'N/A';
  };

  // Funkce pro získání zobrazené délky skladby s vylepšenými fallback mechanismy
  const getDisplayDuration = (item) => {
    // console.log(`🎵 Getting duration for ${item.title}:`, {
    //   audioSrc: item.audioSrc,
    //   metadataDuration: item.duration,
    //   hasStateDuration: item.audioSrc ? durations.has(item.audioSrc) : false,
    //   stateDuration: item.audioSrc ? durations.get(item.audioSrc) : null
    // });

    // 1. Nejdříve zkus načíst z durations state (nejrychlejší)
    if (item.audioSrc && durations.has(item.audioSrc)) {
      const duration = durations.get(item.audioSrc);
      // console.log(`🎵 Using state duration for ${item.title}: ${duration}s`);
      return formatDuration(duration);
    }

    // 2. Pak zkus načíst z persistentní cache (localStorage)
    if (item.audioSrc) {
      const cachedDuration = cacheService.getDuration(item.audioSrc);
      // console.log(`🎵 Cached duration for ${item.title}:`, cachedDuration);
      if (cachedDuration && cachedDuration !== 'N/A' && cachedDuration > 0) {
        // console.log(`🎵 Using persistent cached duration for ${item.title}: ${cachedDuration}s`);
        // NEPOUŽÍVEJ setState během renderování - způsobuje React warning
        return formatDuration(cachedDuration);
      }
    }

    // 3. Fallback na původní duration z metadata
    if (item.duration && item.duration !== 'N/A') {
      // console.log(`🎵 Using metadata duration for ${item.title}: ${item.duration}`);
      return item.duration;
    }

    // 4. Poslední fallback - zkus načíst z static metadata
    if (item.fileName) {
      const staticMetadata = cacheService.getMetadata(item.fileName);
      // console.log(`🎵 Static metadata for ${item.title}:`, staticMetadata);
      if (staticMetadata && staticMetadata.duration && staticMetadata.duration !== 'N/A') {
        // console.log(`🎵 Using static metadata duration for ${item.title}: ${staticMetadata.duration}`);
        return staticMetadata.duration;
      }
    }

    // 5. Konečný fallback
    // console.log(`🎵 No duration found for ${item.title}, using N/A`);
    return 'N/A';
  };

  // Debug logging s informacemi o cache
  useEffect(() => {
    log.debug('HudbaScreen state:', {
      isLoading,
      error,
      itemsCount: hudbaItems?.length || 0,
      stats,
      durationsStateSize: durations.size,
      cacheStats: cacheService.getStats ? cacheService.getStats() : 'N/A'
    });

    // Debug: vypiš detaily každé položky s duration informacemi
    if (hudbaItems && hudbaItems.length > 0) {
      hudbaItems.forEach((item, _index) => {
        const _cachedDuration = item.audioSrc ? cacheService.getDuration(item.audioSrc) : null;
        const _stateDuration = item.audioSrc ? durations.get(item.audioSrc) : null;

        // log.debug(`🎵 Item ${index + 1}:`, {
        //   title: item.title,
        //   type: item.type,
        //   metadataDuration: item.duration,
        //   cachedDuration: cachedDuration,
        //   stateDuration: stateDuration,
        //   displayDuration: getDisplayDuration(item),
        //   tracks: item.tracks?.length || 'N/A',
        //   audioSrc: !!item.audioSrc
        // });
      });
    }
  }, [isLoading, error, hudbaItems, stats, durations]);

  // Vytvoř stable reference pro hudbaItems aby se předešlo nekonečným smyčkám
  const hudbaItemsRef = useRef(hudbaItems);
  const prevHudbaItemsLength = useRef(0);

  // Načti cached durations do state (bez setState během renderování)
  useEffect(() => {
    if (hudbaItems && hudbaItems.length > 0 && hudbaItems.length !== prevHudbaItemsLength.current) {
      const newDurations = new Map();

      hudbaItems.forEach((item) => {
        if (item.type === 'song' && item.audioSrc) {
          const cachedDuration = cacheService.getDuration(item.audioSrc);
          if (cachedDuration && cachedDuration !== 'N/A' && cachedDuration > 0) {
            newDurations.set(item.audioSrc, cachedDuration);
          }
        }
      });

      // Aktualizuj state pouze pokud jsou nové durations
      if (newDurations.size > 0) {
        setDurations(prev => {
          const combined = new Map(prev);
          newDurations.forEach((duration, audioSrc) => {
            combined.set(audioSrc, duration);
          });
          return combined;
        });
      }

      // Aktualizuj reference
      hudbaItemsRef.current = hudbaItems;
      prevHudbaItemsLength.current = hudbaItems.length;
    }
  }, [hudbaItems]);

  // Načti délky skladeb po načtení UI s vylepšenou logikou
  useEffect(() => {
    if (!hudbaItems || hudbaItems.length === 0 || isLoading) return;

    log.debug('🔄 Loading durations for songs...');
    let isMounted = true;
    const loadingSet = new Set(); // Track currently loading items to prevent duplicates

    const loadDurations = async () => {
      for (const item of hudbaItems) {
        if (!isMounted) break; // Stop if component unmounted

        if (item.type === 'song' && item.audioSrc) {
          // Zkontroluj, jestli už máme duration v cache nebo state
          const hasCachedDuration = cacheService.getDuration(item.audioSrc) || durations.has(item.audioSrc);
          const hasMetadataDuration = item.duration && item.duration !== 'N/A';

          // Načti duration pouze pokud ho nemáme a není už v procesu načítání
          if (!hasCachedDuration && !hasMetadataDuration && !loadingSet.has(item.audioSrc)) {
            loadingSet.add(item.audioSrc);
            try {
              const duration = await getAudioDuration(item.audioSrc);
              if (!isMounted) return; // Check again after async operation

              if (duration && duration > 0) {
                log.debug(`⏱️ Duration loaded for ${item.title}: ${duration}s`);
                // Ulož do persistentní cache
                cacheService.setDuration(item.audioSrc, duration);
                // Aktualizuj state pro okamžité zobrazení
                setDurations(prev => {
                  if (!isMounted) return prev; // Don't update if unmounted
                  const newMap = new Map(prev);
                  newMap.set(item.audioSrc, duration);
                  return newMap;
                });
              }
            } catch (error) {
              if (isMounted) {
                log.warn(`Failed to load duration for ${item.title}:`, error);
              }
            } finally {
              loadingSet.delete(item.audioSrc);
            }
          } else {
            log.debug(`⏱️ Duration already available for ${item.title}`);
          }
        }
      }
    };

    loadDurations();

    // Cleanup function
    return () => {
      isMounted = false;
      loadingSet.clear();
    };
  }, [hudbaItems, isLoading, durations]);

  return {
    hudbaItems,
    isLoading,
    error,
    stats,
    isLoadingCovers,
    isLoadingDurations,
    getDisplayDuration,
    formatDuration,
    refreshData: handleRefresh
  };
};
