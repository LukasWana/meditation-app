import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '@config/secure-firebase';
import cacheService from '@services/cacheServiceRefactored';
import log from '@services/logger';
import { performanceMonitor } from '@services/performanceMonitor';
import { getComponentConfig } from '@config/performance';
import { fastMetadataService } from '@services/fastMetadataService';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

// Pomocná funkce pro načtení délky audio souboru (podporuje OGG i MP3)
const getAudioDuration = (audioSrc) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      if (isFinite(duration) && duration > 0) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Ulož duration do cache
        cacheService.setDuration(audioSrc, duration);

        resolve(durationString);
      } else {
        resolve(null);
      }
    });
    audio.addEventListener('error', () => {
      resolve(null);
    });
    audio.src = audioSrc;
    // Timeout po 5 sekundách
    setTimeout(() => resolve(null), 5000);
  });
};

export const useFirebaseDychanieScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Získej konfiguraci pro tento hook
  const config = getComponentConfig('useFirebaseDychanieScanner');

  // Použij ref pro sledování, zda už probíhá načítání
  const isLoadingRef = useRef(false);
  const hasLoadedDataRef = useRef(false);

  // Funkce pro zpracování fast metadat - nejrychlejší načítání
  const processFastMetadata = async (fastMetadata) => {
    log.cache('⚡ Processing fast metadata for dychanie:', {
      metadataCount: Object.keys(fastMetadata).length,
      files: Object.keys(fastMetadata).slice(0, 5)
    });

    // Filtruj pouze dychanie soubory (OGG formát)
    const dychanieFiles = Object.values(fastMetadata).filter(metadata => {
      const fileName = (metadata.fileName || '').toLowerCase();
      const isInDychanieFolder = fileName.startsWith('dychanie/');

      if (!isInDychanieFolder) {
        return false;
      }

      // Přijímej OGG soubory (a případně i MP3 jako fallback)
      const isOggFile = fileName.endsWith('.ogg') || fileName.endsWith('.oga');
      const isMp3File = fileName.endsWith('.mp3');

      return isInDychanieFolder && (isOggFile || isMp3File);
    });

    log.firebase(`📊 Found ${dychanieFiles.length} dychanie files in fast metadata`);

    // Zpracuj soubory
    const processedFiles = dychanieFiles.map(metadata => {
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
        type: 'dychanie'
      };

      log.debug(`📄 Processed dychanie file:`, {
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

    log.success(`⚡ Fast loading completed for dychanie: ${processedFiles.length} files`);

    // Optimalizuj cache
    cacheService.optimizeCache();
  };

  // Funkce pro zpracování cached výsledků
  const processCachedResult = async (cachedResult) => {
    log.cache('🔄 Processing cached result for dychanie:', {
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

    log.success('✅ Using cached dychanie data - no Firebase loading needed');
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
        log.debug('✅ Using fast metadata from Realtime DB for dychanie');
        isLoadingRef.current = true;
        setIsLoading(true);
        await processFastMetadata(fastMetadata);
        return;
      }
    } catch (error) {
      log.debug('Fast metadata not available:', error);
    }

    // Zkontroluj cache (backup)
    const cacheKey = 'dychanie_scanner_all_files';
    const cachedResult = cacheService.getFirebaseQuery(cacheKey);
    if (cachedResult && cachedResult.audioFiles && cachedResult.audioFiles.length > 0) {
      log.debug('✅ Using cached data for dychanie');
      isLoadingRef.current = true;
      setIsLoading(true);
      await processCachedResult(cachedResult);
      return;
    }

    log.warn('⚠️ No cache found for dychanie - this should not happen if data was loaded at startup');
    setIsLoading(false);
    isLoadingRef.current = false;
    setError('Data nebyla načtena při startu aplikace. Prosím obnovte stránku.');
  }, []);

  useEffect(() => {
    const loadFromCache = async (retryCount = 0) => {
      if (audioFiles.length > 0) {
        hasLoadedDataRef.current = true;
        isLoadingRef.current = false;
        setIsLoading(false);
        log.debug('✅ Data already in state for dychanie');
        return;
      }

      // Zkontroluj fast metadata service (data z Realtime DB)
      try {
        const fastMetadata = fastMetadataService.getAllMetadata();
        if (fastMetadata && Object.keys(fastMetadata).length > 0) {
          log.debug('✅ Loading from fast metadata (Realtime DB) for dychanie...');
          hasLoadedDataRef.current = true;
          isLoadingRef.current = false;
          await processFastMetadata(fastMetadata);
          return;
        }
      } catch (err) {
        log.debug('Fast metadata not available:', err);
      }

      // Zkontroluj cache (backup)
      const cacheKey = 'dychanie_scanner_all_files';
      const cachedResult = cacheService.getFirebaseQuery(cacheKey);
      if (cachedResult && cachedResult.audioFiles && cachedResult.audioFiles.length > 0) {
        log.debug('✅ Loading from cache for dychanie...');
        hasLoadedDataRef.current = true;
        isLoadingRef.current = false;
        await processCachedResult(cachedResult);
        return;
      }

      // Pokud metadata ještě nejsou připravena, počkej a zkus znovu (max 10 pokusů)
      if (retryCount < 10) {
        log.debug(`⏳ Metadata not ready yet for dychanie, retrying in 500ms... (${retryCount + 1}/10)`);
        setTimeout(() => {
          if (!hasLoadedDataRef.current) {
            loadFromCache(retryCount + 1);
          }
        }, 500);
        return;
      }

      if (!hasLoadedDataRef.current && !isLoadingRef.current) {
        log.warn('⚠️ No cache found for dychanie after retries, this should not happen if data was loaded at startup');
        setIsLoading(false);
        isLoadingRef.current = false;
        setError('Data nebyla načtena při startu aplikace. Prosím obnovte stránku.');
      }
    };

    loadFromCache();
  }, [scanCDN, audioFiles.length]);

  // Real-time listener pro automatickou aktualizaci při změnách v Realtime Database
  useEffect(() => {
    let unsubscribe = null;

    const startWatching = () => {
      try {
        log.info('📡 Setting up real-time listener for dychanie metadata changes...');

        unsubscribe = realtimeMetadataService.watchMetadata((data) => {
          log.info('📡 Real-time metadata update detected for dychanie - updating fast metadata...');

          fastMetadataService.initialize(false).then(() => {
            const fastMetadata = fastMetadataService.getAllMetadata();
            if (fastMetadata && Object.keys(fastMetadata).length > 0) {
              processFastMetadata(fastMetadata);
              log.success('✅ Dychanie data updated from real-time');
            }
          }).catch(err => {
            log.warn('⚠️ Failed to update fast metadata for dychanie:', err);
          });
        });

        log.success('📡 Real-time listener activated for dychanie');
      } catch (error) {
        log.warn('⚠️ Failed to set up real-time listener for dychanie:', error);
      }
    };

    startWatching();

    return () => {
      if (unsubscribe) {
        unsubscribe();
        log.info('📡 Real-time listener stopped for dychanie');
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

