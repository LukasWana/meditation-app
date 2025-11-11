import { useEffect } from 'react';
import { useFirebaseHudbaFilter } from '@features/audio/hooks/useFirebaseHudbaFilter';
import log from '@services/logger';
import { fastMetadataService } from '@services/fastMetadataService';

export const useHudbaScreenData = () => {
  // Použij hudební filtrovací systém z Firebase
  const { hudbaItems, isLoading, error, stats, isLoadingCovers, isLoadingDurations, refreshAudioFiles } = useFirebaseHudbaFilter();

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
  const formatDuration = (value) => {
    if (!value || value === 'N/A') {
      return 'N/A';
    }

    if (typeof value === 'string') {
      return value.includes(':') ? value : 'N/A';
    }

    if (typeof value === 'number' && value > 0) {
      const mins = Math.floor(value / 60);
      const secs = Math.floor(value % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    return 'N/A';
  };

  const getDisplayDuration = (item) => {
    if (!item) return 'N/A';

    if (item.duration && item.duration !== 'N/A') {
      return formatDuration(item.duration);
    }

    const trackDuration = item.tracks?.[0]?.duration;
    if (trackDuration && trackDuration !== 'N/A') {
      return formatDuration(trackDuration);
    }

    return 'N/A';
  };

  // Debug logging s informacemi o načtených datech
  useEffect(() => {
    log.debug('HudbaScreen state:', {
      isLoading,
      error,
      itemsCount: hudbaItems?.length || 0,
      stats
    });
  }, [isLoading, error, hudbaItems, stats]);

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
