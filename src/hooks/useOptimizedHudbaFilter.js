import { useState, useEffect, useMemo } from 'react';
import { firestoreMetadataService } from '@services/firestoreMetadataService';
import { staticMetadataService } from '@services/staticMetadataService';
import { log } from '@services/logger';

/**
 * Optimalizovaný hook pro načítání hudba dat z Firestore
 * Místo pomalého Firebase Storage používá rychlou Firestore databázi
 */
export const useOptimizedHudbaFilter = () => {
  const [hudbaItems, setHudbaItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    albums: 0,
    songs: 0,
    totalDuration: 0
  });

  // Načti metadata s fallback mechanismem
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setIsLoading(true);
        setError(null);

        log.info('🚀 Loading metadata with fallback mechanism...');
        const startTime = performance.now();

        let allMetadata = {};

        // Nejdříve zkus Firestore
        try {
          log.info('📊 Trying Firestore database...');
          allMetadata = await firestoreMetadataService.loadAllMetadata();
          log.success('✅ Firestore metadata loaded successfully');
        } catch (firestoreError) {
          log.warn('⚠️ Firestore failed, falling back to static metadata:', firestoreError.message);

          // Fallback na statická metadata
          try {
            await staticMetadataService.loadMetadata();
            allMetadata = staticMetadataService.getAllMetadata();
            log.success('✅ Static metadata loaded successfully');
          } catch (staticError) {
            log.error('❌ Both Firestore and static metadata failed:', staticError.message);
            throw new Error('Failed to load metadata from any source');
          }
        }

        const endTime = performance.now();
        log.success(`⚡ Metadata loaded in ${(endTime - startTime).toFixed(2)}ms`);
        log.debug(`📊 Loaded ${Object.keys(allMetadata).length} metadata records`);

        // Filtruj pouze hudba soubory
        const hudbaMetadata = Object.values(allMetadata).filter(meta =>
          meta.type === 'hudba' ||
          (meta.fileName && meta.fileName.includes('ambient')) ||
          (meta.fileName && meta.fileName.includes('nature')) ||
          (meta.fileName && meta.fileName.includes('rain')) ||
          (meta.fileName && meta.fileName.includes('00--'))
        );

        log.debug(`🎵 Found ${hudbaMetadata.length} hudba files`);

        // Zpracuj metadata do formátu pro UI
        const processedItems = hudbaMetadata.map(meta => ({
          title: meta.fileName.replace('.mp3', '').replace(/-/g, ' ').replace(/00--00--00--/g, ''),
          fileName: meta.fileName,
          audioSrc: meta.downloadURL,
          duration: meta.duration || 'N/A',
          size: meta.size,
          contentType: meta.contentType,
          timeCreated: meta.timeCreated,
          type: 'song'
        }));

        // Vypočti statistiky
        const totalDuration = processedItems.reduce((total, item) => {
          if (item.duration && item.duration !== 'N/A') {
            const parts = item.duration.split(':');
            if (parts.length === 2) {
              const minutes = parseInt(parts[0]);
              const seconds = parseInt(parts[1]);
              if (!isNaN(minutes) && !isNaN(seconds)) {
                return total + minutes * 60 + seconds;
              }
            }
          }
          return total;
        }, 0);

        const totalMinutes = Math.floor(totalDuration / 60);
        const totalSeconds = totalDuration % 60;

        setStats({
          totalFiles: processedItems.length,
          albums: 0,
          songs: processedItems.length,
          totalDuration: `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`
        });

        setHudbaItems(processedItems);

        log.success(`✅ Hudba data loaded successfully: ${processedItems.length} songs`);

      } catch (err) {
        log.error('❌ Failed to load hudba metadata:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // Memoizované hodnoty pro optimalizaci
  const memoizedStats = useMemo(() => stats, [stats]);
  const memoizedItems = useMemo(() => hudbaItems, [hudbaItems]);

  return {
    hudbaItems: memoizedItems,
    isLoading,
    error,
    stats: memoizedStats,
    isLoadingCovers: false, // Covers se načítají z Firestore
    isLoadingDurations: false // Duration jsou už v metadatech
  };
};
