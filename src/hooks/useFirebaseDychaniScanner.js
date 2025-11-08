import { useState, useEffect, useCallback, useRef } from 'react';
import cacheService from '@services/cacheServiceRefactored';
import log from '@services/logger';
import { fastMetadataService } from '@services/fastMetadataService';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

const DYCHANI_FOLDER = 'dychani';
const DYCHANI_LEGACY_FOLDER = 'dychanie';
const CACHE_KEY = 'dychani_scanner_all_files';

export const useFirebaseDychaniScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Použij ref pro sledování, zda už probíhá načítání
  const isLoadingRef = useRef(false);
  const hasLoadedDataRef = useRef(false);

  // Funkce pro zpracování fast metadat - nejrychlejší načítání
  const processFastMetadata = async (fastMetadata) => {
    log.cache('⚡ Processing fast metadata for dychani:', {
      metadataCount: Object.keys(fastMetadata).length,
      files: Object.keys(fastMetadata).slice(0, 5)
    });

    // Filtruj pouze dychani soubory (OGG formát)
    const dychaniFiles = Object.values(fastMetadata).filter(metadata => {
      const fileName = (metadata.fileName || '').toLowerCase();
      const isInDychaniFolder =
        fileName.startsWith(`${DYCHANI_FOLDER}/`) ||
        fileName.startsWith(`${DYCHANI_LEGACY_FOLDER}/`);

      if (!isInDychaniFolder) {
        return false;
      }

      // Přijímej OGG soubory (a případně i MP3 jako fallback)
      const isOggFile = fileName.endsWith('.ogg') || fileName.endsWith('.oga');
      const isMp3File = fileName.endsWith('.mp3');

      return isInDychaniFolder && (isOggFile || isMp3File);
    });

    log.firebase(`📊 Found ${dychaniFiles.length} dychani files in fast metadata`);

    // Zpracuj soubory
    const processedFiles = dychaniFiles.map(metadata => {
      let duration = metadata.durationFormatted || metadata.duration || 'N/A';

      // Pokud je délka 'N/A', zkus načíst z cacheService
      if (duration === 'N/A' && metadata.downloadURL) {
        const cachedDuration = cacheService.getDuration(metadata.downloadURL);
        if (cachedDuration && cachedDuration !== 'N/A') {
          duration = cachedDuration;
        }
      }

      const processedFile = {
        fileName: metadata.fileName,
        fileNameOnly: metadata.fileNameOnly,
        downloadURL: metadata.downloadURL,
        duration: duration,
        parsed: metadata.parsed,
        isAvailable: !!metadata.downloadURL,
        type: DYCHANI_FOLDER
      };

      log.debug(`📄 Processed dychani file:`, {
        fileName: processedFile.fileName,
        isAvailable: processedFile.isAvailable,
        downloadURL: processedFile.downloadURL ? 'OK' : 'FAILED',
        duration: processedFile.duration
      });

      return processedFile;
    });

    setAudioFiles(processedFiles);
    setLastUpdated(new Date());
    setIsLoading(false);
    hasLoadedDataRef.current = true;

    log.success(`⚡ Fast loading completed for dychani: ${processedFiles.length} files`);

    // Optimalizuj cache
    cacheService.optimizeCache();
  };

  // Funkce pro zpracování cached výsledků
  const processCachedResult = async (cachedResult) => {
    log.cache('🔄 Processing cached result for dychani:', {
      audioFilesCount: cachedResult.audioFiles?.length || 0
    });

    const processedAudioFiles = (cachedResult.audioFiles || []).map(file => ({
      ...file,
      isAvailable: true
    }));

    setAudioFiles(processedAudioFiles);
    setLastUpdated(cachedResult.lastUpdated);
    setIsLoading(false);
    hasLoadedDataRef.current = true;

    log.success('✅ Using cached dychani data - no Firebase loading needed');
    cacheService.optimizeCache();
  };

  // Zjednodušená verze scanCDN - pouze fallback pro případy, kdy není cache
  const scanCDN = useCallback(async () => {
    if (isLoadingRef.current) {
      log.debug('⏸️ Scan already in progress, skipping...');
      return;
    }

    if (hasLoadedDataRef.current) {
      log.debug('✅ Data already loaded, skipping scan...');
      return;
    }

    // Nejdříve zkus rychlé načítání z fast metadata service (data z Realtime DB)
    try {
      const fastMetadata = fastMetadataService.getAllMetadata();
      if (fastMetadata && Object.keys(fastMetadata).length > 0) {
        log.debug('✅ Using fast metadata from Realtime DB for dychani');
        isLoadingRef.current = true;
        setIsLoading(true);
        await processFastMetadata(fastMetadata);
        return;
      }
    } catch (error) {
      log.debug('Fast metadata not available:', error);
    }

    // Zkontroluj cache (backup)
    const cachedResult =
      cacheService.getFirebaseQuery(CACHE_KEY) ||
      cacheService.getFirebaseQuery('dychanie_scanner_all_files');
    if (cachedResult && cachedResult.audioFiles && cachedResult.audioFiles.length > 0) {
      log.debug('✅ Using cached data for dychani');
      isLoadingRef.current = true;
      setIsLoading(true);
      await processCachedResult(cachedResult);
      return;
    }

    log.warn('⚠️ No cache found for dychani - this should not happen if data was loaded at startup');
    setIsLoading(false);
    isLoadingRef.current = false;
    setError('Data nebyla načtena při startu aplikace. Prosím obnovte stránku.');
  }, []);

  useEffect(() => {
    const loadFromCache = async () => {
      if (audioFiles.length > 0) {
        hasLoadedDataRef.current = true;
        isLoadingRef.current = false;
        setIsLoading(false);
        log.debug('✅ Data already in state for dychani');
        return;
      }

      // Zkontroluj fast metadata service (data z Realtime DB)
      try {
        const fastMetadata = fastMetadataService.getAllMetadata();
        if (fastMetadata && Object.keys(fastMetadata).length > 0) {
          log.debug('✅ Loading from fast metadata (Realtime DB) for dychani...');
          hasLoadedDataRef.current = true;
          isLoadingRef.current = false;
          await processFastMetadata(fastMetadata);
          return;
        }
      } catch (err) {
        log.debug('Fast metadata not available:', err);
      }

      // Zkontroluj cache (backup)
      const cachedResult =
        cacheService.getFirebaseQuery(CACHE_KEY) ||
        cacheService.getFirebaseQuery('dychanie_scanner_all_files');
      if (cachedResult && cachedResult.audioFiles && cachedResult.audioFiles.length > 0) {
        log.debug('✅ Loading from cache for dychani...');
        hasLoadedDataRef.current = true;
        isLoadingRef.current = false;
        await processCachedResult(cachedResult);
        return;
      }

      if (!hasLoadedDataRef.current && !isLoadingRef.current) {
        log.warn('⚠️ No cache found for dychani, loading from Firebase Storage (should not happen)');
        scanCDN();
      }
    };

    loadFromCache();
  }, [scanCDN, audioFiles.length]);

  // Real-time listener pro automatickou aktualizaci při změnách v Realtime Database
  useEffect(() => {
    let unsubscribe = null;

    const startWatching = () => {
      try {
        log.info('📡 Setting up real-time listener for dychani metadata changes...');

        unsubscribe = realtimeMetadataService.watchMetadata(() => {
          log.info('📡 Real-time metadata update detected for dychani - updating fast metadata...');

          fastMetadataService.initialize(false).then(() => {
            const fastMetadata = fastMetadataService.getAllMetadata();
            if (fastMetadata && Object.keys(fastMetadata).length > 0) {
              processFastMetadata(fastMetadata);
              log.success('✅ Dychani data updated from real-time');
            }
          }).catch(err => {
            log.warn('⚠️ Failed to update fast metadata for dychani:', err);
          });
        });

        log.success('📡 Real-time listener activated for dychani');
      } catch (error) {
        log.warn('⚠️ Failed to set up real-time listener for dychani:', error);
      }
    };

    startWatching();

    return () => {
      if (unsubscribe) {
        unsubscribe();
        log.info('📡 Real-time listener stopped for dychani');
      }
    };
  }, []);

  const availableFiles = audioFiles.filter(file => file.isAvailable);

  const stats = {
    totalFiles: audioFiles.length,
    availableFiles: availableFiles.length,
    unavailableFiles: audioFiles.length - availableFiles.length,
    lastUpdated
  };

  return {
    // Data
    audioFiles,
    availableFiles,
    stats,

    // State
    isLoading,
    error,
    lastUpdated,

    // Actions
    refreshCDN: scanCDN,

    // Getters
    getFileByName: (fileName) => availableFiles.find(f => f.fileName === fileName)
  };
};

