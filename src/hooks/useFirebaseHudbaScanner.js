import { useState, useEffect, useCallback, useRef } from 'react';
import cacheService from '@services/cacheServiceRefactored';
import log from '@services/logger';
import { fastMetadataService } from '@services/fastMetadataService';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

export const useFirebaseHudbaScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [coverImages, setCoverImages] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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
      const isInHudbaFolder = fileName.startsWith('hudba/');

      // Pokud je soubor ve složce hudba/, zahrň ho (přijímáme audio, album_track i simple typy)
      // Pouze pokud je soubor ve složce hudba/ a není sound effect
      if (!isInHudbaFolder) {
        return false;
      }

      // Kontrola sound effects
      const isSoundEffect = fileName.includes('breathing-sfx') ||
                           fileName.includes('breathing') ||
                           fileName.includes('sfx-') ||
                           fileName.startsWith('p2nz7wnr34r');

      if (isSoundEffect) {
        return false;
      }

      // Přijímej soubory s typem audio, album_track nebo simple (jednoduché MP3 soubory)
      const isValidType = metadata.type === 'audio' ||
                         metadata.type === 'album_track' ||
                         metadata.type === 'simple';

      // Pokud má metadata nastavené isHudba, použij to, jinak akceptuj pokud je ve složce hudba/
      const isHudba = metadata.isHudba !== undefined ? metadata.isHudba : isInHudbaFolder;

      return isValidType && isHudba;
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
    let updateTimeout = null;
    let isProcessingUpdate = false;
    let lastUpdateTime = 0;

    const startWatching = () => {
      try {
        log.info('📡 Setting up real-time listener for metadata changes...');

        unsubscribe = realtimeMetadataService.watchMetadata((data) => {
          // Debounce: aktualizuj maximálně jednou za 2 sekundy
          const now = Date.now();
          if (now - lastUpdateTime < 2000) {
            log.debug('⏭️ Skipping real-time update (debounce)');
            return;
          }

          // Pokud už probíhá aktualizace, přeskoč
          if (isProcessingUpdate) {
            log.debug('⏭️ Skipping real-time update (already processing)');
            return;
          }

          // Zkontroluj, zda se data skutečně změnila (pokud má data.lastSync)
          if (data.lastSync && data.lastSync === lastUpdateTime) {
            log.debug('⏭️ Skipping real-time update (no changes)');
            return;
          }

          lastUpdateTime = now;
          isProcessingUpdate = true;
          log.info('📡 Real-time metadata update detected - updating fast metadata...');

          // Debounce aktualizaci o 500ms
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }

          updateTimeout = setTimeout(() => {
            // Aktualizuj pouze fast metadata service (data jsou už v Realtime DB)
            fastMetadataService.initialize(false).then(() => {
              const fastMetadata = fastMetadataService.getAllMetadata();
              if (fastMetadata && Object.keys(fastMetadata).length > 0) {
                // Zkontroluj, zda se data skutečně změnila porovnáním počtu souborů
                const currentHudbaFiles = Object.values(fastMetadata).filter(m =>
                  m.fileName && m.fileName.startsWith('hudba/')
                ).length;

                if (currentHudbaFiles !== audioFiles.length || audioFiles.length === 0) {
                  processFastMetadata(fastMetadata);
                  log.success('✅ Data updated from real-time');
                } else {
                  log.debug('⏭️ Skipping update (data unchanged)');
                }
              }
              isProcessingUpdate = false;
            }).catch(err => {
              log.warn('⚠️ Failed to update fast metadata:', err);
              isProcessingUpdate = false;
            });
          }, 500); // Debounce 500ms
        });

        log.success('📡 Real-time listener activated');
      } catch (error) {
        log.warn('⚠️ Failed to set up real-time listener:', error);
      }
    };

    startWatching();

    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      if (unsubscribe) {
        unsubscribe();
        log.info('📡 Real-time listener stopped');
      }
    };
  }, [audioFiles.length]);

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
    isLoadingCovers: false,
    isLoadingDurations: false,
    error,
    lastUpdated,

    // Actions
    refreshCDN: scanCDN,

    // Getters
    getFilesForTopic: (topic) => filesByTopic[topic] || [],
    getFileByName: (fileName) => availableFiles.find(f => f.fileName === fileName)
  };
};
