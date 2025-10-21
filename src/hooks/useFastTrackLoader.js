import { useState, useEffect, useRef } from 'react';
import { useMetadataLoader, useBatchMetadataLoader } from './useMetadataLoader';
import cacheService from '@services/cacheServiceRefactored';

export const useFastTrackLoader = (items, options = {}) => {
  const {
    enabled = true,
    priorityItems = [],
    maxConcurrent = 3,
    delayBetweenItems = 100
  } = options;

  const [loadedMetadata, setLoadedMetadata] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });

  const loadingQueueRef = useRef(new Set());
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !items || items.length === 0) {
      setLoadedMetadata(new Map());
      setLoading(false);
      setError(null);
      setProgress({ loaded: 0, total: 0 });
      return;
    }

    loadFastTrack();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [items, enabled]);

  const loadFastTrack = async () => {
    try {
      setLoading(true);
      setError(null);
      setProgress({ loaded: 0, total: items.length });

      // Vytvoř AbortController
      abortControllerRef.current = new AbortController();

      // Seřaď položky podle priority
      const sortedItems = [...items].sort((a, b) => {
        const aPriority = priorityItems.includes(a.fileName || a.audioSrc) ? 1 : 0;
        const bPriority = priorityItems.includes(b.fileName || b.audioSrc) ? 1 : 0;
        return bPriority - aPriority;
      });

      const results = new Map();
      let loadedCount = 0;

      // Načti metadata pro každou položku s kontrolou současných requestů
      for (const item of sortedItems) {
        if (abortControllerRef.current?.signal.aborted) break;

        const fileName = item.fileName || item.audioSrc;
        if (!fileName || loadingQueueRef.current.has(fileName)) continue;

        // Kontrola současných requestů
        while (loadingQueueRef.current.size >= maxConcurrent) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        loadingQueueRef.current.add(fileName);

        try {
          // Zkontroluj cache
          const cachedMetadata = cacheService.getMetadata(fileName);
          if (cachedMetadata) {
            results.set(fileName, { ...item, metadata: cachedMetadata });
            loadedCount++;
            setProgress({ loaded: loadedCount, total: items.length });
            continue;
          }

          // Načti metadata asynchronně
          const metadataPromise = loadItemMetadata(item);

          metadataPromise.then(metadata => {
            if (metadata && !abortControllerRef.current?.signal.aborted) {
              results.set(fileName, { ...item, metadata });
              loadedCount++;
              setProgress({ loaded: loadedCount, total: items.length });
            }
          }).catch(err => {
            console.warn(`Fast track load failed for ${fileName}:`, err);
          }).finally(() => {
            loadingQueueRef.current.delete(fileName);
          });

          // Delay mezi requesty pro snížení zátěže
          await new Promise(resolve => setTimeout(resolve, delayBetweenItems));

        } catch (err) {
          console.warn(`Fast track load failed for ${fileName}:`, err);
          loadingQueueRef.current.delete(fileName);
        }
      }

      // Počkej na dokončení všech requestů
      while (loadingQueueRef.current.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setLoadedMetadata(results);
      console.log(`Fast track loading completed: ${results.size}/${items.length} items`);

    } catch (err) {
      console.error('Fast track loading failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadItemMetadata = async (item) => {
    const fileName = item.fileName || item.audioSrc;
    if (!fileName) return null;

    try {
      // Pro Firebase Storage soubory použij metadata loader
      if (fileName.includes('.mp3') || fileName.includes('.wav') || fileName.includes('.m4a')) {
        const { ref, getMetadata } = await import('firebase/storage');
        const { storage } = await import('@services/firebase');

        const audioRef = ref(storage, fileName);
        const metadataResult = await Promise.race([
          getMetadata(audioRef),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Metadata timeout')), 3000)
          )
        ]);

        const extractedMetadata = {
          size: metadataResult.size,
          contentType: metadataResult.contentType,
          timeCreated: metadataResult.timeCreated,
          updated: metadataResult.updated,
          fileName,
          estimatedDuration: estimateDurationFromSize(metadataResult.size, metadataResult.contentType)
        };

        // Ulož do cache
        cacheService.setMetadata(fileName, extractedMetadata);

        return extractedMetadata;
      }

      return null;
    } catch (err) {
      console.warn(`Item metadata load failed for ${fileName}:`, err);
      return null;
    }
  };

  return {
    loadedMetadata,
    loading,
    error,
    progress,
    refetch: loadFastTrack,
    getMetadataForItem: (fileName) => loadedMetadata.get(fileName)
  };
};

export const useLazyMetadataLoader = (items, containerRef, options = {}) => {
  const {
    enabled = true,
    threshold = 3, // Kolik položek před koncem načíst
    batchSize = 5
  } = options;

  const [visibleItems, setVisibleItems] = useState([]);
  const [loadedMetadata, setLoadedMetadata] = useState(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !items || !containerRef?.current) return;

    const container = containerRef.current;

    const handleScroll = () => {
      const containerHeight = container.scrollHeight;
      const scrollTop = container.scrollTop;
      const containerViewHeight = container.clientHeight;

      // Spočítej kolik položek je viditelných nebo blízko
      const itemsPerScreen = items.length / (containerHeight / containerViewHeight);
      const currentPosition = (scrollTop / containerHeight) * items.length;

      const startIndex = Math.max(0, Math.floor(currentPosition) - threshold);
      const endIndex = Math.min(items.length, Math.ceil(currentPosition) + itemsPerScreen + threshold);

      const newVisibleItems = items.slice(startIndex, endIndex);
      setVisibleItems(newVisibleItems);
    };

    // Initial load
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [items, containerRef, enabled, threshold]);

  // Načti metadata pro viditelné položky
  useEffect(() => {
    if (visibleItems.length === 0) return;

    const loadVisibleMetadata = async () => {
      setLoading(true);

      const batches = [];
      for (let i = 0; i < visibleItems.length; i += batchSize) {
        batches.push(visibleItems.slice(i, i + batchSize));
      }

      const results = new Map();

      for (const batch of batches) {
        const batchPromises = batch.map(async (item) => {
          const fileName = item.fileName || item.audioSrc;
          if (!fileName) return null;

          try {
            const cachedMetadata = cacheService.getMetadata(fileName);
            if (cachedMetadata) {
              return { fileName, metadata: cachedMetadata };
            }

            // Načti metadata
            const { ref, getMetadata } = await import('firebase/storage');
            const { storage } = await import('@services/firebase');

            const audioRef = ref(storage, fileName);
            const metadataResult = await getMetadata(audioRef);

            const extractedMetadata = {
              size: metadataResult.size,
              contentType: metadataResult.contentType,
              timeCreated: metadataResult.timeCreated,
              updated: metadataResult.updated,
              fileName,
              estimatedDuration: estimateDurationFromSize(metadataResult.size, metadataResult.contentType)
            };

            cacheService.setMetadata(fileName, extractedMetadata);
            return { fileName, metadata: extractedMetadata };
          } catch (err) {
            console.warn(`Lazy metadata load failed for ${fileName}:`, err);
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            results.set(result.value.fileName, result.value.metadata);
          }
        });

        // Delay mezi batchy
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setLoadedMetadata(prev => new Map([...prev, ...results]));
      setLoading(false);
    };

    loadVisibleMetadata();
  }, [visibleItems, batchSize]);

  return { loadedMetadata, loading, visibleItems };
};

function estimateDurationFromSize(sizeInBytes, contentType) {
  if (!sizeInBytes || !contentType) return null;

  const bitrates = {
    'audio/mpeg': 128000,
    'audio/mp3': 128000,
    'audio/wav': 1411000,
    'audio/ogg': 128000,
    'audio/m4a': 128000
  };

  const bitrate = bitrates[contentType] || 128000;
  const durationInSeconds = (sizeInBytes * 8) / bitrate;

  return Math.round(durationInSeconds);
}

export default useFastTrackLoader;
