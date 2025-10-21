import { useState, useEffect, useCallback } from 'react';
import unifiedMetadataService from '@services/unifiedMetadataService';

export const useUnifiedMetadata = (fileName) => {
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMetadata = useCallback(async () => {
    if (!fileName) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await unifiedMetadataService.getMetadata(fileName);
      setMetadata(result);
    } catch (err) {
      setError(err.message);
      console.error('Error loading metadata:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fileName]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  return {
    metadata,
    isLoading,
    error,
    reload: loadMetadata
  };
};

export const useBatchMetadata = (fileNames) => {
  const [metadataMap, setMetadataMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBatchMetadata = useCallback(async () => {
    if (!fileNames || fileNames.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const promises = fileNames.map(async (fileName) => {
        const metadata = await unifiedMetadataService.getMetadata(fileName);
        return { fileName, metadata };
      });

      const results = await Promise.allSettled(promises);
      const newMap = new Map();

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.metadata) {
          newMap.set(result.value.fileName, result.value.metadata);
        }
      });

      setMetadataMap(newMap);
    } catch (err) {
      setError(err.message);
      console.error('Error loading batch metadata:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fileNames]);

  useEffect(() => {
    loadBatchMetadata();
  }, [loadBatchMetadata]);

  return {
    metadataMap,
    isLoading,
    error,
    reload: loadBatchMetadata,
    getMetadata: (fileName) => metadataMap.get(fileName)
  };
};

export const useMetadataService = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);

  const initialize = useCallback(async () => {
    if (isInitialized || isLoading) return;

    setIsLoading(true);
    try {
      await unifiedMetadataService.initialize();
      setIsInitialized(true);
      setMetrics(unifiedMetadataService.getMetrics());
    } catch (error) {
      console.error('Failed to initialize metadata service:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isLoading]);

  const refreshMetrics = useCallback(() => {
    setMetrics(unifiedMetadataService.getMetrics());
  }, []);

  const clearCache = useCallback(() => {
    unifiedMetadataService.clearCache();
    setMetrics(unifiedMetadataService.getMetrics());
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    isInitialized,
    isLoading,
    metrics,
    initialize,
    refreshMetrics,
    clearCache
  };
};

export default useUnifiedMetadata;




