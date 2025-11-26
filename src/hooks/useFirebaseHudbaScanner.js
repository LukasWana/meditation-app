import { useState, useEffect, useRef } from 'react';
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
    console.log(`🔍 processFastMetadata: Filtering ${Object.keys(fastMetadata).length} metadata records`);

    // Debug: zobraz všechny soubory ve složce hudba/ před filtrováním
    const allHudbaFiles = Object.values(fastMetadata).filter(m => {
      const fileName = (m.fileName || '').toLowerCase();
      return fileName.startsWith('hudba/');
    });
    console.log(`🎵 All files in hudba/ folder: ${allHudbaFiles.length}`);
    if (allHudbaFiles.length > 0) {
      console.log('🎵 Sample hudba files:', allHudbaFiles.slice(0, 5).map(m => ({
        fileName: m.fileName,
        type: m.type,
        folder: m.folder,
        isHudba: m.isHudba,
        hasDownloadURL: !!m.downloadURL
      })));
    }

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
      // TAKÉ přijímáme soubory bez typu nebo s jiným typem, pokud jsou ve složce hudba/ a mají downloadURL
      // (to je důležité, protože normalizace může nastavit různý type)
      const isValidType = metadata.type === 'audio' ||
                         metadata.type === 'album_track' ||
                         metadata.type === 'simple' ||
                         !metadata.type || // Pokud nemá type, přijmi ho
                         metadata.type === 'hudba' || // Některé metadata mohou mít type 'hudba'
                         (metadata.folder === 'hudba' && metadata.downloadURL); // Pokud je ve složce hudba a má URL

      // Pokud má metadata nastavené isHudba, použij to, jinak akceptuj pokud je ve složce hudba/
      const isHudba = metadata.isHudba !== undefined ? metadata.isHudba : isInHudbaFolder;

      const shouldInclude = isValidType && isHudba;

      // Debug: pokud soubor neprojde filtrem, zobraz důvod
      if (!shouldInclude && isInHudbaFolder && !isSoundEffect) {
        console.log(`⚠️ File filtered out: ${fileName}`, {
          type: metadata.type,
          isValidType,
          isHudba,
          hasDownloadURL: !!metadata.downloadURL,
          folder: metadata.folder
        });
      }

      return shouldInclude;
    });

    console.log(`🎵 processFastMetadata: Found ${hudbaFiles.length} hudba files after filtering`);

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

    console.log(`🎵 processFastMetadata: Setting ${processedFiles.length} audioFiles`);
    console.log(`🎵 Processed files sample:`, processedFiles.slice(0, 3).map(f => ({
      fileName: f.fileName,
      type: f.type,
      isAvailable: f.isAvailable,
      downloadURL: f.downloadURL ? 'OK' : 'MISSING'
    })));

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

    setAudioFiles(cachedResult.audioFiles);
    setCoverImages(new Map(Object.entries(cachedResult.coverImages || {})));
    setLastUpdated(cachedResult.lastUpdated);
    setIsLoading(false);
    hasLoadedDataRef.current = true;

    log.success('✅ Using cached hudba data - no Firebase loading needed');

    // Metadata jsou už načtené z preloadingu, jen optimalizuj cache
    cacheService.optimizeCache();
  };

  // Funkce pro načtení dat z CDN (Firebase Storage) - fallback, pokud není cache
  const scanCDN = async () => {
    // NENÍ potřeba načítat z Firebase Storage - data jsou v Realtime DB
    // Pokud se dostaneme sem, je to chyba v inicializaci aplikace
    // Všechny zbytečné Firebase Storage operace byly odstraněny
  };

  // Funkce pro čekání na inicializaci fastMetadataService
  const waitForMetadataInitialization = async (maxWaitTime = 5000) => {
    const startTime = Date.now();

    // Zkontroluj, zda už máme data (to je hlavní indikátor, že je vše připravené)
    if (fastMetadataService.metadata?.size > 0) {
      console.log(`✅ FastMetadataService already has data: ${fastMetadataService.metadata.size} records`);
      return true;
    }

    // Pokud není inicializovaný a neprobíhá inicializace, zkus ho inicializovat
    if (!fastMetadataService.isLoading && !fastMetadataService.isInitialized) {
      console.log('🔄 FastMetadataService not initialized, initializing now...');
      try {
        await fastMetadataService.initialize(false);
      } catch (initError) {
        console.error('❌ Error initializing FastMetadataService:', initError);
      }
    }

    // Počkej na dokončení inicializace - hlavně kontroluj, zda jsou data
    while ((fastMetadataService.isLoading || fastMetadataService.metadata?.size === 0) && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Pokud už máme data, můžeme skončit dřív
      if (fastMetadataService.metadata?.size > 0) {
        break;
      }
    }

    // Zkontroluj výsledek - hlavní kritérium je existence dat
    const hasData = fastMetadataService.metadata?.size > 0;
    if (hasData) {
      console.log(`✅ FastMetadataService initialized successfully: ${fastMetadataService.metadata.size} metadata records`);
      return true;
    } else {
      console.warn(`⚠️ FastMetadataService initialization timeout or no data available. Metadata size: ${fastMetadataService.metadata?.size || 0}, isInitialized: ${fastMetadataService.isInitialized}, isLoading: ${fastMetadataService.isLoading}`);
      return false;
    }
  };

  useEffect(() => {
    // Zjednodušená logika: počkej na inicializaci metadat, pak načti data
    const loadData = async (retryCount = 0) => {
      // Pokud už máme data v state, nespouštěj nic
      if (audioFiles.length > 0) {
        hasLoadedDataRef.current = true;
        isLoadingRef.current = false;
        setIsLoading(false);
        log.debug('✅ Data already in state');
        return;
      }

      // Pokud už probíhá načítání, nezačínej nové
      if (isLoadingRef.current) {
        log.debug('⏭️ Loading already in progress, skipping.');
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        // KROK 1: Zkontroluj, zda už máme metadata (nejrychlejší kontrola)
        let currentMetadataSize = fastMetadataService.metadata?.size || 0;
        console.log(`🔍 FastMetadataService current metadata size (before wait): ${currentMetadataSize}`);

        // Pokud nemáme metadata, počkej na inicializaci
        if (currentMetadataSize === 0) {
          console.log('⏳ No metadata yet, waiting for initialization...');
          await waitForMetadataInitialization(5000);

          // Zkontroluj znovu po čekání
          currentMetadataSize = fastMetadataService.metadata?.size || 0;
          console.log(`🔍 FastMetadataService current metadata size (after wait): ${currentMetadataSize}`);

          // Pokud stále nemáme metadata, zkus retry nebo cache
          if (currentMetadataSize === 0) {
            if (retryCount < 3) {
              console.log(`⏳ Metadata still not ready, retrying in 500ms... (${retryCount + 1}/3)`);
              isLoadingRef.current = false;
              setIsLoading(false);
              setTimeout(() => {
                if (!hasLoadedDataRef.current) {
                  loadData(retryCount + 1);
                }
              }, 500);
              return;
            }

            // Pokud už jsme vyčerpali retry, zkus cache
            console.log('⚠️ Metadata initialization failed after retries, trying cache...');
          }
        }

        // KROK 2: Načti metadata z fastMetadataService - použij data pokud existují
        let fastMetadata = null;

        // Hlavní kontrola: zda máme data v Map
        if (currentMetadataSize > 0) {
          // Použij data přímo z Map v fastMetadataService
          console.log('✅ Using metadata directly from fastMetadataService.metadata Map');
          fastMetadata = Object.fromEntries(fastMetadataService.metadata);
          console.log(`🔍 Converted Map to object: ${Object.keys(fastMetadata).length} keys`);

          // Debug: zkontroluj hudba soubory
          const hudbaInMetadata = Object.values(fastMetadata).filter(m =>
            m.fileName && m.fileName.toLowerCase().startsWith('hudba/')
          );
          console.log(`🎵 Hudba files in metadata: ${hudbaInMetadata.length}`);
        } else {
          // Fallback: zkus načíst přímo z realtimeMetadataService
          console.log('⚠️ FastMetadataService Map is empty, trying realtimeMetadataService directly...');
          try {
            const realtimeMetadata = await realtimeMetadataService.getAllMetadata();
            const realtimeCount = realtimeMetadata ? Object.keys(realtimeMetadata).length : 0;
            console.log(`🔍 RealtimeMetadataService count: ${realtimeCount}`);

            if (realtimeCount > 0) {
              console.log('✅ Found metadata in RealtimeDatabase, using it directly...');
              fastMetadata = realtimeMetadata;
            }
          } catch (realtimeError) {
            console.error('❌ Error loading from realtimeMetadataService:', realtimeError);
          }
        }

        // KROK 3: Zpracuj metadata pokud jsou dostupná
        const metadataCount = fastMetadata ? Object.keys(fastMetadata).length : 0;
        console.log(`🔍 useFirebaseHudbaScanner: fastMetadata count: ${metadataCount}`);

        if (fastMetadata && metadataCount > 0) {
          // Debug: zobraz hudba soubory
          const hudbaMetadata = Object.values(fastMetadata).filter(m =>
            m.fileName && m.fileName.toLowerCase().startsWith('hudba/')
          );
          console.log(`🎵 Found ${hudbaMetadata.length} hudba files in metadata before processing:`,
            hudbaMetadata.slice(0, 5).map(m => ({
              fileName: m.fileName,
              type: m.type,
              isHudba: m.isHudba,
              downloadURL: m.downloadURL ? 'OK' : 'MISSING',
              folder: m.folder
            }))
          );

          console.log('✅ Calling processFastMetadata...');
          log.debug('✅ Loading from fast metadata (Realtime DB)...');
          hasLoadedDataRef.current = true;
          isLoadingRef.current = false;

          try {
            await processFastMetadata(fastMetadata);
            console.log('✅ processFastMetadata completed successfully');

            // Zkontroluj, jestli se audioFiles nastavily
            // POZNÁMKA: setAudioFiles je async, takže může trvat trochu déle
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (processError) {
            console.error('❌ Error in processFastMetadata:', processError);
          }
          return;
        } else {
          // Pokud metadata nejsou dostupná, zkus cache nebo retry
          console.log('⚠️ Fast metadata is empty or not available, metadataCount:', metadataCount);

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

          // Pokud metadata nejsou připravená a není cache, zkus retry
          if (retryCount < 3) {
            console.log(`⏳ Metadata not ready yet, retrying in 500ms... (${retryCount + 1}/3)`);
            isLoadingRef.current = false;
            setIsLoading(false);
            setTimeout(() => {
              if (!hasLoadedDataRef.current) {
                loadData(retryCount + 1);
              }
            }, 500);
            return;
          }

          // Pokud už jsme vyčerpali všechny možnosti, nastav chybu
          console.error('❌ Failed to load metadata after all retries');
          setError('Data nebyla načtena. Prosím obnovte stránku.');
          setIsLoading(false);
          isLoadingRef.current = false;
        }
      } catch (err) {
        console.error('❌ Error loading metadata:', err);
        log.error('Error loading metadata:', err);
        setError(err.message || 'Chyba při načítání dat');
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadData();
  }, [audioFiles.length]);

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
                  processFastMetadata(Object.fromEntries(fastMetadata)); // Převeď Map na objekt
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

    const topic = file.parsed.topic;
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
    availableTopics,
    stats,
    coverImages,

    // State
    isLoading,
    isLoadingCovers: false,
    isLoadingDurations: false,
    error,

    // Actions
    refreshAudioFiles: scanCDN, // Použij scanCDN pro refresh

    // Getters
    getAudioForTopic: (topic) => {
      const topicFiles = filesByTopic[topic] || [];
      const bestFile = topicFiles
        .filter(file => file.parsed && file.isAvailable)
        .sort((a, b) => parseInt(b.parsed.version) - parseInt(a.parsed.version))[0];
      return bestFile?.fileName || null;
    },
    getBestAudio: () => {
      return availableFiles[0]?.fileName || null;
    },
    getFilesForTopic: (topic) => {
      return filesByTopic[topic] || [];
    },
    getAudioInfo: (fileName) => {
      const file = availableFiles.find(f => f.fileName === fileName);
      return file?.parsed || null;
    },
    getRecommendedFiles: (limit = 5) => {
      return availableFiles.slice(0, limit);
    }
  };
};
