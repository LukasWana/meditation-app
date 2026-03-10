

import { useState, useEffect, useCallback } from 'react';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import log from '@services/logger';

export function useRealtimeMetadata() {
  const [metadata, setMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    byFolder: {},
    lastUpdated: null
  });

  // Načti všechna metadata
  const loadAllMetadata = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      log.info('🔄 Loading metadata from Realtime Database...');
      const data = await realtimeMetadataService.getAllMetadata();

      setMetadata(data);

      // Aktualizuj statistiky
      const newStats = await realtimeMetadataService.getMetadataStats();
      setStats(newStats);

      log.success(`✅ Loaded ${Object.keys(data).length} metadata entries`);
    } catch (err) {
      log.error('❌ Failed to load metadata:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Načti metadata pro konkrétní složku
  const loadFolderMetadata = useCallback(async (folder) => {
    try {
      setLoading(true);
      setError(null);

      log.info(`🔄 Loading ${folder} metadata from Realtime Database...`);
      const data = await realtimeMetadataService.getFolderMetadata(folder);

      // Aktualizuj pouze metadata pro tuto složku
      setMetadata(prev => ({
        ...prev,
        ...data
      }));

      log.success(`✅ Loaded ${Object.keys(data).length} ${folder} metadata entries`);
    } catch (err) {
      log.error(`❌ Failed to load ${folder} metadata:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Načti metadata pro konkrétní soubor
  const loadFileMetadata = useCallback(async (filePath) => {
    try {
      setError(null);

      log.info(`🔄 Loading file metadata: ${filePath}`);
      const data = await realtimeMetadataService.getFileMetadata(filePath);

      if (data) {
        // Aktualizuj metadata pro tento soubor
        const safePath = realtimeMetadataService.sanitizePath(filePath);
        setMetadata(prev => ({
          ...prev,
          [safePath]: data
        }));

        log.success(`✅ Loaded metadata for: ${filePath}`);
        return data;
      } else {
        log.warn(`⚠️ No metadata found for: ${filePath}`);
        return null;
      }
    } catch (err) {
      log.error(`❌ Failed to load file metadata for ${filePath}:`, err);
      setError(err.message);
      return null;
    }
  }, []);

  // Sleduj změny v metadatech v reálném čase
  useEffect(() => {
    let unsubscribe = null;

    const startWatching = () => {
      try {
        unsubscribe = realtimeMetadataService.watchMetadata((data) => {
          setMetadata(data);

          // Aktualizuj statistiky
          realtimeMetadataService.getMetadataStats().then(setStats);

          log.info('📡 Real-time metadata update received');
        });

        log.info('📡 Started watching metadata changes');
      } catch (err) {
        log.error('❌ Failed to start watching metadata:', err);
        setError(err.message);
      }
    };

    startWatching();

    return () => {
      if (unsubscribe) {
        unsubscribe();
        log.info('📡 Stopped watching metadata changes');
      }
    };
  }, []);

  // Vyčisti listeners při unmount
  useEffect(() => {
    return () => {
      realtimeMetadataService.stopAllListeners();
    };
  }, []);

  // Filtruj metadata podle složky
  const getMetadataByFolder = useCallback((folder) => {
    return Object.entries(metadata).filter(([_, data]) => data.folder === folder);
  }, [metadata]);

  // Najdi metadata podle názvu souboru
  const findMetadataByFileName = useCallback((fileName) => {
    return Object.entries(metadata).find(([_, data]) => data.fileName === fileName);
  }, [metadata]);

  // Získej seznam všech složek
  const getFolders = useCallback(() => {
    const folders = new Set();
    Object.values(metadata).forEach(data => {
      if (data.folder) {
        folders.add(data.folder);
      }
    });
    return Array.from(folders);
  }, [metadata]);

  return {
    metadata,
    loading,
    error,
    stats,
    loadAllMetadata,
    loadFolderMetadata,
    loadFileMetadata,
    getMetadataByFolder,
    findMetadataByFileName,
    getFolders,
    refresh: loadAllMetadata
  };
}
