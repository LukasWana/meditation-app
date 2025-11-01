import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '@services/firebase';
import { parseAudioFileName } from '@utils/hudbaParser';
import cacheService from '@services/cacheServiceRefactored';
import log from '@services/logger';
import { performanceMonitor } from '@services/performanceMonitor';
import { getComponentConfig } from '@config/performance';
import { fastMetadataService } from '@services/fastMetadataService';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

// Pomocná funkce pro načtení délky audio souboru
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

// Pomocná funkce pro odhad délky na základě velikosti souboru
const estimateDuration = (sizeInBytes, contentType) => {
  if (!sizeInBytes || !contentType) return null;

  // Pro MP3 soubory - přibližně 1MB = 1 minuta
  if (contentType.includes('audio/mpeg')) {
    const estimatedMinutes = Math.round(sizeInBytes / (1024 * 1024));
    const minutes = Math.floor(estimatedMinutes);
    const seconds = Math.floor((estimatedMinutes - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return null;
};

export const useFirebaseHudbaScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [coverImages, setCoverImages] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCovers, setIsLoadingCovers] = useState(false);
  const [isLoadingDurations, setIsLoadingDurations] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Získej konfiguraci pro tento hook
  const config = getComponentConfig('useFirebaseHudbaScanner');

  // Použij ref pro sledování, zda už probíhá načítání
  const isLoadingRef = useRef(false);
  const hasLoadedDataRef = useRef(false);

  // Funkce pro zpracování fast metadat - nejrychlejší načítání
  const processFastMetadata = async (fastMetadata) => {
    log.cache('⚡ Processing fast metadata:', {
      metadataCount: Object.keys(fastMetadata).length,
      files: Object.keys(fastMetadata).slice(0, 5) // Prvních 5 souborů pro debug
    });

    // Debug: vypiš všechny metadata před filtrováním
    log.debug(`🔍 All metadata before filtering:`, Object.values(fastMetadata).map(m => ({
      fileName: m.fileName,
      type: m.type,
      isHudba: m.isHudba,
      isAlbum: m.isAlbum,
      albumName: m.albumName
    })));

    // Filtruj pouze hudba soubory (včetně album souborů)
    // Vyluč sound effects a breathing soubory
    const hudbaFiles = Object.values(fastMetadata).filter(metadata => {
      const fileName = (metadata.fileName || '').toLowerCase();
      const isHudba = metadata.isHudba && (metadata.type === 'audio' || metadata.type === 'album_track');
      const isSoundEffect = fileName.includes('breathing-sfx') ||
                           fileName.includes('breathing') ||
                           fileName.includes('sfx-') ||
                           fileName.startsWith('p2nz7wnr34r');
      const isInHudbaFolder = fileName.startsWith('hudba/');

      return isHudba && isInHudbaFolder && !isSoundEffect;
    });

    log.firebase(`📊 Found ${hudbaFiles.length} hudba files in fast metadata`);

    // Debug: vypiš detaily hudba souborů
    hudbaFiles.forEach((file, index) => {
      log.debug(`🎵 Hudba file ${index + 1}:`, {
        fileName: file.fileName,
        duration: file.durationFormatted,
        isAlbum: file.isAlbum,
        albumName: file.albumName,
        trackName: file.trackName
      });
    });

    // Zpracuj soubory
    const processedFiles = hudbaFiles.map(metadata => {
      // Zkus načíst délku z cacheService (pokud už byla skladba přehrána)
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
        type: 'hudba'
      };

      // Debug log pro všechny soubory
      log.debug(`📄 Processed file:`, {
        fileName: processedFile.fileName,
        isAvailable: processedFile.isAvailable,
        downloadURL: processedFile.downloadURL ? 'OK' : 'FAILED',
        isAlbum: processedFile.parsed?.isAlbum,
        duration: processedFile.duration,
        metadataDuration: metadata.duration,
        metadataDurationFormatted: metadata.durationFormatted
      });

      return processedFile;
    });

    // Načti cover obrázky
    const coverImages = fastMetadataService.getCoverImages();

    log.debug(`🖼️ Cover images loaded: ${coverImages.size}`, Array.from(coverImages.keys()));

    setAudioFiles(processedFiles);
    setCoverImages(coverImages);
    setLastUpdated(new Date());
    setIsLoading(false);
    hasLoadedDataRef.current = true;

    log.success(`⚡ Fast loading completed: ${processedFiles.length} files, ${coverImages.size} covers`);

    // Optimalizuj cache
    cacheService.optimizeCache();
  };

  // Funkce pro zpracování cached výsledků - optimalizováno pro rychlost
  const processCachedResult = async (cachedResult) => {
    log.cache('🔄 Processing cached result:', {
      audioFilesCount: cachedResult.audioFiles?.length || 0,
      audioFiles: cachedResult.audioFiles?.map(f => ({ fileName: f.fileName, audioSrc: f.audioSrc })) || [],
      coverImagesCount: Object.keys(cachedResult.coverImages || {}).length
    });

    // Zajisti, že všechny soubory mají isAvailable: true
    const processedAudioFiles = (cachedResult.audioFiles || []).map(file => ({
      ...file,
      isAvailable: true // Zajisti, že cached soubory jsou dostupné
    }));

    setAudioFiles(processedAudioFiles);
    setCoverImages(new Map(Object.entries(cachedResult.coverImages || {})));
    setLastUpdated(cachedResult.lastUpdated);
    setIsLoading(false);
    hasLoadedDataRef.current = true;

    log.success('✅ Using cached hudba data - no Firebase loading needed');

    // Metadata jsou už načtené z preloadingu, jen optimalizuj cache
    cacheService.optimizeCache();
  };

  // Zjednodušená verze scanCDN - pouze fallback pro případy, kdy není cache
  // V normálních případech se data načítají z Realtime DB při startu
  const scanCDN = useCallback(async () => {
    // Pokud už načítáme, nespouštěj znovu
    if (isLoadingRef.current) {
      log.debug('⏸️ Scan already in progress, skipping...');
      return;
    }

    // Pokud už máme data, nespouštěj znovu
    if (hasLoadedDataRef.current) {
      log.debug('✅ Data already loaded, skipping scan...');
      return;
    }

    // Nejdříve zkus rychlé načítání z fast metadata service (data z Realtime DB)
    try {
      const fastMetadata = fastMetadataService.getAllMetadata();
      if (fastMetadata && Object.keys(fastMetadata).length > 0) {
        log.debug('✅ Using fast metadata from Realtime DB');
        isLoadingRef.current = true;
        setIsLoading(true);
        await processFastMetadata(fastMetadata);
        return;
      }
    } catch (error) {
      log.debug('Fast metadata not available:', error);
    }

    // Zkontroluj cache (backup)
    const cacheKey = 'hudba_scanner_all_files';
    const cachedResult = cacheService.getFirebaseQuery(cacheKey);
    if (cachedResult && cachedResult.audioFiles && cachedResult.audioFiles.length > 0) {
      log.debug('✅ Using cached data');
      isLoadingRef.current = true;
      setIsLoading(true);
      await processCachedResult(cachedResult);
      return;
    }

    // Pouze pokud není žádná cache, loguj varování (nemělo by se stát)
    log.warn('⚠️ No cache found - this should not happen if data was loaded at startup');
    setIsLoading(false);
    isLoadingRef.current = false;
    setError('Data nebyla načtena při startu aplikace. Prosím obnovte stránku.');

    // NENÍ potřeba načítat z Firebase Storage - data jsou v Realtime DB
    // Pokud se dostaneme sem, je to chyba v inicializaci aplikace
    // Všechny zbytečné Firebase Storage operace byly odstraněny
  }, []);

  useEffect(() => {
    // Zjednodušená logika: data jsou už načtená z Realtime DB při startu
    // Pouze načti z cache a zobraz
    const loadFromCache = async () => {
      // Pokud už máme data v state, nespouštěj nic
      if (audioFiles.length > 0) {
        hasLoadedDataRef.current = true;
        isLoadingRef.current = false;
        setIsLoading(false);
        log.debug('✅ Data already in state');
        return;
      }

      // Zkontroluj fast metadata service (data z Realtime DB)
      try {
        const fastMetadata = fastMetadataService.getAllMetadata();
        if (fastMetadata && Object.keys(fastMetadata).length > 0) {
          log.debug('✅ Loading from fast metadata (Realtime DB)...');
          hasLoadedDataRef.current = true;
          isLoadingRef.current = false;
          await processFastMetadata(fastMetadata);
          return;
        }
      } catch (err) {
        log.debug('Fast metadata not available:', err);
      }

      // Zkontroluj cache (backup)
      const cacheKey = 'hudba_scanner_all_files';
      const cachedResult = cacheService.getFirebaseQuery(cacheKey);
      if (cachedResult && cachedResult.audioFiles && cachedResult.audioFiles.length > 0) {
        log.debug('✅ Loading from cache...');
        hasLoadedDataRef.current = true;
        isLoadingRef.current = false;
        await processCachedResult(cachedResult);
        return;
      }

      // Pouze pokud není žádná cache, načti z Firebase Storage (fallback)
      if (!hasLoadedDataRef.current && !isLoadingRef.current) {
        log.warn('⚠️ No cache found, loading from Firebase Storage (should not happen)');
        scanCDN();
      }
    };

    loadFromCache();
  }, [scanCDN, audioFiles.length]);

  // Real-time listener pro automatickou aktualizaci při změnách v Realtime Database
  // Zjednodušeno: pouze aktualizuj fast metadata service, nespouštěj scanCDN
  useEffect(() => {
    let unsubscribe = null;

    const startWatching = () => {
      try {
        log.info('📡 Setting up real-time listener for metadata changes...');

        unsubscribe = realtimeMetadataService.watchMetadata((data) => {
          log.info('📡 Real-time metadata update detected - updating fast metadata...');

          // Aktualizuj pouze fast metadata service (data jsou už v Realtime DB)
          fastMetadataService.initialize(false).then(() => {
            const fastMetadata = fastMetadataService.getAllMetadata();
            if (fastMetadata && Object.keys(fastMetadata).length > 0) {
              processFastMetadata(fastMetadata);
              log.success('✅ Data updated from real-time');
            }
          }).catch(err => {
            log.warn('⚠️ Failed to update fast metadata:', err);
          });
        });

        log.success('📡 Real-time listener activated');
      } catch (error) {
        log.warn('⚠️ Failed to set up real-time listener:', error);
      }
    };

    startWatching();

    return () => {
      if (unsubscribe) {
        unsubscribe();
        log.info('📡 Real-time listener stopped');
      }
    };
  }, []);

  const availableFiles = audioFiles.filter(file => file.isAvailable);

  // Debug: vypiš availableFiles
  log.debug(`📊 Available files:`, availableFiles.map(f => ({
    fileName: f.fileName,
    type: f.type,
    isAvailable: f.isAvailable,
    isAlbum: f.parsed?.isAlbum
  })));
  const filesByTopic = availableFiles.reduce((acc, file) => {
    if (!file.parsed) return acc;

    // Pro soubory ze složek, použij název složky jako téma
    let topic = file.parsed.topic;
    if (!topic && file.fileName.includes('/')) {
      const folderName = file.fileName.split('/')[0];
      topic = folderName.replace(/-/g, ' '); // ambient-journey -> ambient journey
    }

    if (!topic) return acc;

    if (!acc[topic]) {
      acc[topic] = [];
    }
    acc[topic].push(file);

    return acc;
  }, {});

  const availableTopics = Object.keys(filesByTopic);

  const stats = {
    totalFiles: audioFiles.length,
    availableFiles: availableFiles.length,
    unavailableFiles: audioFiles.length - availableFiles.length,
    topicsCount: availableTopics.length,
    lastUpdated
  };

  return {
    // Data
    audioFiles,
    availableFiles,
    filesByTopic,
    coverImages,
    availableTopics,
    stats,

    // State
    isLoading,
    isLoadingCovers,
    isLoadingDurations,
    error,
    lastUpdated,

    // Actions
    refreshCDN: scanCDN,

    // Getters
    getFilesForTopic: (topic) => filesByTopic[topic] || [],
    getFileByName: (fileName) => availableFiles.find(f => f.fileName === fileName)
  };
};
