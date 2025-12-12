import { useState, useEffect, useRef } from 'react';
import { ref, getMetadata } from 'firebase/storage';
import { storage } from '@config/secure-firebase';
import cacheService from '@services/cacheServiceRefactored';

export const useMetadataLoader = (audioFileName, options = {}) => {
  const {
    enabled = true,
    timeout = 5000,
    retryCount = 2
  } = options;

  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !audioFileName) {
      setMetadata(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Zkontroluj cache
    const cachedMetadata = cacheService.getMetadata(audioFileName);
    if (cachedMetadata) {
      setMetadata(cachedMetadata);
      setLoading(false);
      return;
    }

    loadMetadata();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [audioFileName, enabled]);

  const loadMetadata = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      // Vytvoř AbortController pro možnost zrušení requestu
      abortControllerRef.current = new AbortController();

      // Vytvoř reference k souboru v Firebase Storage
      const audioRef = ref(storage, audioFileName);

      // Získej pouze metadata pomocí getMetadata (ne celý soubor)
      const metadataResult = await Promise.race([
        getMetadata(audioRef),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Metadata timeout')), timeout)
        )
      ]);

      // Extrahuj užitečné informace z metadat
      const extractedMetadata = {
        size: metadataResult.size,
        contentType: metadataResult.contentType,
        timeCreated: metadataResult.timeCreated,
        updated: metadataResult.updated,
        fileName: audioFileName,
        // Odhad délky z velikosti souboru (přibližné)
        estimatedDuration: estimateDurationFromSize(metadataResult.size, metadataResult.contentType)
      };

      // Ulož do cache
      cacheService.setMetadata(audioFileName, extractedMetadata);
      setMetadata(extractedMetadata);
      retryCountRef.current = 0;

    } catch (err) {
      console.warn(`Metadata load failed for ${audioFileName}:`, err);

      // Retry mechanismus
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        console.log(`Retrying metadata load for ${audioFileName} (attempt ${retryCountRef.current})`);

        setTimeout(() => {
          loadMetadata();
        }, 1000 * retryCountRef.current); // Exponenciální backoff
      } else {
        setError(err.message);
        retryCountRef.current = 0;
      }
    } finally {
      setLoading(false);
    }
  };

  return { metadata, loading, error, refetch: loadMetadata };
};

export const useBatchMetadataLoader = (fileNames, options = {}) => {
  const {
    enabled = true,
    batchSize = 5,
    delayBetweenBatches = 1000
  } = options;

  const [metadata, setMetadata] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });

  useEffect(() => {
    if (!enabled || !fileNames || fileNames.length === 0) {
      setMetadata(new Map());
      setLoading(false);
      setError(null);
      setProgress({ loaded: 0, total: 0 });
      return;
    }

    loadBatchMetadata();
  }, [fileNames, enabled]);

  const loadBatchMetadata = async () => {
    try {
      setLoading(true);
      setError(null);
      setProgress({ loaded: 0, total: fileNames.length });

      const results = new Map();
      const batches = [];

      // Rozděl soubory do batchů
      for (let i = 0; i < fileNames.length; i += batchSize) {
        batches.push(fileNames.slice(i, i + batchSize));
      }

      // Načti každý batch s delay
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        const batchPromises = batch.map(async (fileName) => {
          try {
            // Zkontroluj cache
            const cachedMetadata = cacheService.getMetadata(fileName);
            if (cachedMetadata) {
              return { fileName, metadata: cachedMetadata, fromCache: true };
            }

            // Načti metadata
            const audioRef = ref(storage, fileName);
            const metadataResult = await Promise.race([
              getMetadata(audioRef),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Batch metadata timeout')), 3000)
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

            return { fileName, metadata: extractedMetadata, fromCache: false };
          } catch (err) {
            console.warn(`Batch metadata load failed for ${fileName}:`, err);
            return { fileName, error: err.message };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.metadata) {
            results.set(result.value.fileName, result.value.metadata);
          }
        });

        // Aktualizuj progress
        const loadedCount = Math.min((batchIndex + 1) * batchSize, fileNames.length);
        setProgress({ loaded: loadedCount, total: fileNames.length });

        // Delay mezi batchy (kromě posledního)
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      setMetadata(results);
      console.log(`Batch metadata loading completed: ${results.size}/${fileNames.length} files`);

    } catch (err) {
      console.error('Batch metadata loading failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { metadata, loading, error, progress, refetch: loadBatchMetadata };
};

function estimateDurationFromSize(sizeInBytes, contentType) {
  if (!sizeInBytes || !contentType) return null;

  // Přibližné bitrate pro různé formáty
  const bitrates = {
    'audio/mpeg': 128000, // 128 kbps pro MP3
    'audio/mp3': 128000,
    'audio/wav': 1411000, // 1411 kbps pro WAV
    'audio/ogg': 128000,  // 128 kbps pro OGG
    'audio/m4a': 128000   // 128 kbps pro M4A
  };

  const bitrate = bitrates[contentType] || 128000; // Default 128 kbps
  const durationInSeconds = (sizeInBytes * 8) / bitrate;

  return Math.round(durationInSeconds);
}

export default useMetadataLoader;
