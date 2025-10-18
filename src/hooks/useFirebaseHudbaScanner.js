import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '@services/firebase';
import { parseAudioFileName } from '@utils/hudbaParser';
import cacheService from '@services/cacheService';
import { log } from '@services/logger';
import { performanceMonitor } from '@services/performanceMonitor';
import { getComponentConfig } from '@config/performance';
import { fastMetadataService } from '@services/fastMetadataService';

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
    const hudbaFiles = Object.values(fastMetadata).filter(metadata =>
      metadata.isHudba && (metadata.type === 'audio' || metadata.type === 'album_track')
    );

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
      const processedFile = {
        fileName: metadata.fileName,
        fileNameOnly: metadata.fileNameOnly,
        downloadURL: metadata.downloadURL,
        duration: metadata.durationFormatted || 'N/A',
        parsed: metadata.parsed,
        isAvailable: !!metadata.downloadURL,
        type: 'hudba'
      };

      // Debug log pro všechny soubory
      log.debug(`📄 Processed file:`, {
        fileName: processedFile.fileName,
        isAvailable: processedFile.isAvailable,
        downloadURL: processedFile.downloadURL ? 'OK' : 'FAILED',
        isAlbum: processedFile.parsed?.isAlbum
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

    log.success('✅ Using cached hudba data - no Firebase loading needed');

    // Metadata jsou už načtené z preloadingu, jen optimalizuj cache
    cacheService.optimizeCache();
  };

  const scanCDN = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Nejdříve zkus rychlé načítání z fast metadata service
      try {
        log.info('🔄 Initializing fast metadata service...');
        await fastMetadataService.initialize(true); // Force reload pro opravu cest
        const fastMetadata = fastMetadataService.getAllMetadata();

        log.info(`📊 Fast metadata loaded: ${Object.keys(fastMetadata).length} files`);

        if (Object.keys(fastMetadata).length > 0) {
          log.success('⚡ Using fast metadata loading from Firebase structure');
          await processFastMetadata(fastMetadata);
          return;
        } else {
          log.warn('No fast metadata found, falling back to Firebase Storage');
          // Pokračuj s původním Firebase Storage načítáním
        }
      } catch (error) {
        log.warn('Fast metadata loading failed, falling back to Firebase Storage:', error);
      }

      // Pokud se dostaneme sem, znamená to, že fast metadata se nepoužila
      log.info('🔄 Falling back to Firebase Storage loading...');

      // Zkontroluj cache pro Firebase query
      const cacheKey = 'hudba_scanner_all_files';
      const cachedResult = cacheService.getFirebaseQuery(cacheKey);

      log.cache('🔍 Checking cache for hudba data:', {
        cacheKey,
        hasCachedResult: !!cachedResult,
        cachedResultKeys: cachedResult ? Object.keys(cachedResult) : null
      });

      if (cachedResult) {
        log.success('✅ Using cached Firebase scan result');
        log.cache('📊 Cached data details:', {
          audioFilesCount: cachedResult.audioFiles?.length || 0,
          audioFiles: cachedResult.audioFiles?.map(f => f.fileName) || [],
          lastUpdated: cachedResult.lastUpdated
        });
        await processCachedResult(cachedResult);
        return;
      }

      log.warn('❌ No cached data found, loading from Firebase Storage...');

      // Načti přímo obsah složky "hudba" místo prohledávání všech složek
      const hudbaRef = ref(storage, 'hudba');
      log.firebase('📂 Loading hudba folder directly...');
      const hudbaResult = await listAll(hudbaRef);
      log.firebase('📂 Hudba folder loaded:', {
        items: hudbaResult.items.length,
        prefixes: hudbaResult.prefixes.length,
        prefixNames: hudbaResult.prefixes.map(p => p.name)
      });

      // Získej všechny soubory z hudba složky
      const allFiles = [];

      // Přidej soubory přímo z hudba/ složky
      hudbaResult.items.forEach(item => {
        allFiles.push({
          ...item,
          name: `hudba/${item.name}`,
          folder: 'hudba'
        });
        log.firebase(`📄 Added direct file: hudba/${item.name}`);
      });

      // Prohledej podsložky v hudba/ (např. ambient-journey/)
      for (const subFolderRef of hudbaResult.prefixes) {
        try {
          const subFolderResult = await listAll(subFolderRef);
          log.firebase(`📁 Processing subfolder: ${subFolderRef.name}, found ${subFolderResult.items.length} items`);
          log.firebase(`📁 Subfolder ref:`, subFolderRef);
          log.firebase(`📁 Subfolder items:`, subFolderResult.items.map(i => i.name));
          subFolderResult.items.forEach(item => {
            const fullPath = `hudba/${subFolderRef.name}/${item.name.trim()}`;
            allFiles.push({
              ...item,
              name: fullPath,
              folder: 'hudba',
              subFolder: subFolderRef.name
            });
            log.firebase(`📄 Added subfolder file: ${fullPath}, subFolder: ${subFolderRef.name}`);
          });
        } catch (subErr) {
          log.warn(`Nelze prohledat podsložku ${subFolderRef.name}:`, subErr.message);
        }
      }

      // Debug: vypiš všechny soubory po načítání podsložek
      log.firebase(`📊 Files after subfolder processing:`, allFiles.map(f => ({ name: f.name, folder: f.folder, subFolder: f.subFolder })));

      // Debug: vypiš pouze album soubory
      const allAlbumFiles = allFiles.filter(f => f.name.includes('/') && f.name.startsWith('hudba/'));
      log.firebase(`🎵 Album files:`, allAlbumFiles.map(f => ({ name: f.name, folder: f.folder, subFolder: f.subFolder })));

      // Debug: vypiš pouze MP3 soubory z alb
      const albumMp3Files = allAlbumFiles.filter(f => f.name.toLowerCase().endsWith('.mp3'));
      log.firebase(`🎵 Album MP3 files:`, albumMp3Files.map(f => ({ name: f.name, folder: f.folder, subFolder: f.subFolder })));

      // Filtruj pouze MP3 soubory z hudba/ složky a obrázky pro cover
      const audioFiles = allFiles
        .filter(item => {
          const name = item.name.toLowerCase();
          const isMp3 = name.endsWith('.mp3');
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
          // Pouze soubory z hudba/ složky (podle folder vlastnosti)
          const isHudba = item.folder === 'hudba';
          log.firebase(`🔍 File filter: ${item.name}, isMp3: ${isMp3}, isImage: ${isImage}, isHudba: ${isHudba}, folder: ${item.folder}`);
          return (isMp3 || isImage) && isHudba;
        })
        .map(item => item.name);

      const mp3Files = audioFiles.filter(name => name.toLowerCase().endsWith('.mp3'));
      const imageFiles = audioFiles.filter(name => /\.(jpg|jpeg|png|gif|webp)$/i.test(name));

      log.firebase(`📊 Total files found: ${allFiles.length}, audioFiles: ${audioFiles.length}, mp3Files: ${mp3Files.length}, imageFiles: ${imageFiles.length}`);

      // Debug: vypiš všechny soubory
      log.firebase(`📄 All files:`, allFiles.map(f => ({ name: f.name, folder: f.folder, subFolder: f.subFolder })));
      log.firebase(`🎵 MP3 files:`, mp3Files);

      // Použij metadata z cache místo načítání ze Firebase - optimalizováno pro performance
      const verifiedFiles = [];

      // Rozděl zpracování do chunků pro non-blocking UI - dynamická konfigurace
      const chunkSize = config.chunkSize;
      const chunks = [];
      for (let i = 0; i < mp3Files.length; i += chunkSize) {
        chunks.push(mp3Files.slice(i, i + chunkSize));
      }

      log.performance(`Processing ${mp3Files.length} files in ${chunks.length} chunks`, 0);

      // Inicializuj performance monitoring pro tento hook
      performanceMonitor.initialize();

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const chunkStartTime = performance.now();

        for (const fileName of chunk) {
          try {
            // Extraktuj pouze název souboru ze cesty
            const fileNameOnly = fileName.includes('/') ? fileName.split('/').pop() : fileName;

            // Přeskoč obrázky - neparsuj je jako audio soubory
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileNameOnly)) {
              continue;
            }

            // Použij metadata z cache (už načtené z preloadingu)
            const cachedMetadata = cacheService.getMetadata(fileNameOnly);
            log.debug(`🔍 Cache check for ${fileNameOnly}:`, { cachedMetadata: !!cachedMetadata, fileName });
            if (!cachedMetadata) {
              log.debug(`No cached metadata for ${fileNameOnly}, loading from Firebase`);
              // Pokud není v cache, načti normálně ze Firebase
              const fileRef = ref(storage, fileName);
              const downloadURL = await getDownloadURL(fileRef);
              cacheService.setAudioUrl(fileName, downloadURL);

              // Pokus se načíst metadata ze Firebase
              let duration = 'N/A';
              try {
                const firebaseMetadata = await getMetadata(fileRef);

                // 1. Zkus skutečnou délku z cache (z přehrávače)
                const realDuration = cacheService.getDuration(downloadURL);
                if (realDuration && realDuration > 0) {
                  const minutes = Math.floor(realDuration / 60);
                  const seconds = Math.floor(realDuration % 60);
                  duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                } else {
                  // 2. Zkus odhadnout z velikosti souboru
                  const sizeInBytes = firebaseMetadata.size;
                  const contentType = firebaseMetadata.contentType;
                  const estimatedDuration = estimateDuration(sizeInBytes, contentType);
                  if (estimatedDuration) {
                    duration = estimatedDuration;
                  }
                }
              } catch (metadataError) {
                log.warn(`Failed to get metadata for ${fileName}:`, metadataError);
                // Použij odhad z názvu souboru nebo default
                duration = 'N/A';
              }

              // Vytvoř parsed objekt podle struktury souboru
              // Album soubor má 3+ části: hudba/ambient-journey/song.mp3
              // Samostatná skladba má 2 části: hudba/song.mp3
              const pathParts = fileName.split('/');
              const isAlbumFile = pathParts.length > 2;
              let parsed;

              if (isAlbumFile) {
                // Album soubor - hudba/ambient-journey/song.mp3
                const albumName = pathParts[1]; // ambient-journey
                const trackName = pathParts[2].replace(/\.mp3$/i, ''); // song

                parsed = {
                  originalFileName: fileNameOnly,
                  name: trackName,
                  type: 'album_track',
                  isHudba: true,
                  isAlbum: true,
                  trackName: trackName,
                  albumName: albumName,
                  folder: 'hudba'
                };
              } else {
                // Samostatná skladba - hudba/song.mp3
                parsed = {
                  originalFileName: fileNameOnly,
                  name: fileNameOnly.replace(/\.mp3$/i, ''),
                  type: 'simple',
                  isHudba: true,
                  isAlbum: false,
                  trackName: fileNameOnly.replace(/\.mp3$/i, ''),
                  albumName: fileNameOnly.replace(/\.mp3$/i, ''),
                  folder: 'hudba'
                };
              }

              verifiedFiles.push({
                fileName: fileName,
                fileNameOnly: fileNameOnly,
                downloadURL: downloadURL,
                duration: duration,
                parsed: parsed,
                isAvailable: true,
                type: 'hudba'
              });
            } else {
              // Použij data z cache
              const downloadURL = cacheService.getAudioUrl(fileName) || `https://firebasestorage.googleapis.com/v0/b/${storage.app.options.storageBucket}/o/${encodeURIComponent(fileName)}?alt=media`;

              // Získej duration z cache nebo použij default
              const cachedDuration = cacheService.getDuration(downloadURL);
              let duration = 'N/A';
              if (cachedDuration && cachedDuration > 0) {
                const minutes = Math.floor(cachedDuration / 60);
                const seconds = Math.floor(cachedDuration % 60);
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              }

              log.debug(`📄 Using cached data for ${fileName}:`, {
                downloadURL: !!downloadURL,
                duration,
                cachedMetadata: !!cachedMetadata
              });

              // Vytvoř parsed objekt podle struktury souboru (cached verze)
              // Album soubor má 3+ části: hudba/ambient-journey/song.mp3
              // Samostatná skladba má 2 části: hudba/song.mp3
              const pathParts = fileName.split('/');
              const isAlbumFile = pathParts.length > 2;
              let parsed;

              if (cachedMetadata) {
                parsed = cachedMetadata;
                log.debug(`📄 Using cached metadata for ${fileName}:`, parsed);
              } else if (isAlbumFile) {
                // Album soubor - hudba/ambient-journey/song.mp3
                const albumName = pathParts[1]; // ambient-journey
                const trackName = pathParts[2].replace(/\.mp3$/i, ''); // song

                parsed = {
                  originalFileName: fileNameOnly,
                  name: trackName,
                  type: 'album_track',
                  isHudba: true,
                  isAlbum: true,
                  trackName: trackName,
                  albumName: albumName,
                  folder: 'hudba'
                };
                log.debug(`📄 Created album parsed for ${fileName}:`, parsed);
              } else {
                // Samostatná skladba - hudba/song.mp3
                parsed = {
                  originalFileName: fileNameOnly,
                  name: fileNameOnly.replace(/\.mp3$/i, ''),
                  type: 'simple',
                  isHudba: true,
                  isAlbum: false,
                  trackName: fileNameOnly.replace(/\.mp3$/i, ''),
                  albumName: fileNameOnly.replace(/\.mp3$/i, ''),
                  folder: 'hudba'
                };
                log.debug(`📄 Created simple parsed for ${fileName}:`, parsed);
              }

              verifiedFiles.push({
                fileName: fileName,
                fileNameOnly: fileNameOnly,
                downloadURL: downloadURL,
                duration: duration,
                parsed: parsed,
                isAvailable: true,
                type: 'hudba'
              });

              log.debug(`✅ Added file to verifiedFiles:`, {
                fileName,
                isAlbum: parsed.isAlbum,
                albumName: parsed.albumName,
                trackName: parsed.trackName
              });

              log.debug(`✅ Loaded ${fileNameOnly} from cache (no Firebase loading needed)`);
            }
          } catch (err) {
            log.warn(`Hudební soubor ${fileName} není dostupný:`, err.message);
            verifiedFiles.push({
              fileName,
              downloadURL: null,
              parsed: parseAudioFileName(fileName),
              duration: null,
              isAvailable: false,
              error: err.message
            });
          }
        }

        // Yield control back to browser po každém chunk - optimalizováno
        if (chunkIndex < chunks.length - 1) {
          // Použij requestIdleCallback pokud je dostupný, jinak setTimeout
          if (window.requestIdleCallback) {
            await new Promise(resolve => {
              window.requestIdleCallback(resolve, { timeout: 10 });
            });
          } else {
            await new Promise(resolve => setTimeout(resolve, config.yieldTimeout));
          }
        }

        const chunkEndTime = performance.now();
        const chunkDuration = chunkEndTime - chunkStartTime;

        log.performance(`Chunk ${chunkIndex + 1}/${chunks.length} processed`, chunkDuration);

        // Track performance pro monitoring
        if (chunkDuration > 50) {
          performanceMonitor.measurePerformance(`AudioChunk_${chunkIndex + 1}`, () => chunkDuration);
        }
      }

      // Načti cover obrázky pro alba - optimalizováno pro performance
      const coverImages = new Map();
      const imageChunks = [];
      const imageChunkSize = config.imageChunkSize;
      for (let i = 0; i < imageFiles.length; i += imageChunkSize) {
        imageChunks.push(imageFiles.slice(i, i + imageChunkSize));
      }

      log.performance(`Processing ${imageFiles.length} images in ${imageChunks.length} chunks`, 0);

      for (let chunkIndex = 0; chunkIndex < imageChunks.length; chunkIndex++) {
        const chunk = imageChunks[chunkIndex];
        const chunkStartTime = performance.now();

        for (const imageName of chunk) {
          try {
            // Zkontroluj cache pro image URL
            let downloadURL = cacheService.getImageUrl(imageName);
            if (!downloadURL) {
              const imageRef = ref(storage, imageName);
              downloadURL = await getDownloadURL(imageRef);
              // Ulož do cache
              cacheService.setImageUrl(imageName, downloadURL);
            }

            // Pro soubory ze složek - použij název podsložky jako klíč
            if (imageName.includes('/')) {
              const pathParts = imageName.split('/');
              const folderName = pathParts[0]; // hudba
              const subFolderName = pathParts[1]; // ambient-journey
              const imageFileName = pathParts[2]; // cover.jpg

              // Pokud je to cover.jpg v podsložce, použij název podsložky
              if (imageFileName && imageFileName.toLowerCase().includes('cover')) {
                coverImages.set(subFolderName, downloadURL);
                log.firebase(`🖼️ Album cover loaded: ${subFolderName} from ${imageName}`);

                // Spusť preloading obrázku
                cacheService.preloadImage(downloadURL, imageName).catch(err => {
                  log.warn('Image preload failed:', err);
                });
              }
            } else {
              // Pro obrázky v root složce - pokus se parsovat jako album
              const parsed = parseAudioFileName(imageName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '.mp3'));
              if (parsed && parsed.isAlbum) {
                coverImages.set(parsed.albumName, downloadURL);
              }
            }
          } catch (err) {
            log.warn(`Cover obrázek ${imageName} není dostupný:`, err.message);
          }
        }

        // Yield control back to browser po každém chunk - optimalizováno
        if (chunkIndex < imageChunks.length - 1) {
          // Použij requestIdleCallback pokud je dostupný, jinak setTimeout
          if (window.requestIdleCallback) {
            await new Promise(resolve => {
              window.requestIdleCallback(resolve, { timeout: 10 });
            });
          } else {
            await new Promise(resolve => setTimeout(resolve, config.yieldTimeout));
          }
        }

        const chunkEndTime = performance.now();
        const chunkDuration = chunkEndTime - chunkStartTime;

        log.performance(`Image chunk ${chunkIndex + 1}/${imageChunks.length} processed`, chunkDuration);

        // Track performance pro monitoring
        if (chunkDuration > 50) {
          performanceMonitor.measurePerformance(`ImageChunk_${chunkIndex + 1}`, () => chunkDuration);
        }
      }

      setAudioFiles(verifiedFiles);
      setCoverImages(coverImages);
      setLastUpdated(new Date());

      // Debug: vypiš finální verifiedFiles
      log.firebase(`📊 Final verifiedFiles:`, verifiedFiles.map(f => ({
        fileName: f.fileName,
        isAlbum: f.parsed?.isAlbum,
        albumName: f.parsed?.albumName,
        trackName: f.parsed?.trackName,
        duration: f.duration
      })));

      // Debug: vypiš pouze album soubory
      const albumFiles = verifiedFiles.filter(f => f.parsed?.isAlbum);
      log.firebase(`🎵 Album files in verifiedFiles:`, albumFiles.map(f => ({
        fileName: f.fileName,
        albumName: f.parsed?.albumName,
        trackName: f.parsed?.trackName,
        duration: f.duration
      })));

      // Debug: vypiš pouze samostatné skladby
      const standaloneFiles = verifiedFiles.filter(f => !f.parsed?.isAlbum);
      log.firebase(`🎵 Standalone files in verifiedFiles:`, standaloneFiles.map(f => ({
        fileName: f.fileName,
        trackName: f.parsed?.trackName,
        duration: f.duration
      })));

      // Ulož výsledek do cache
      const resultToCache = {
        audioFiles: verifiedFiles,
        lastUpdated: new Date(),
        coverImages: Object.fromEntries(coverImages)
      };
      cacheService.setFirebaseQuery(cacheKey, resultToCache);

      log.success(`Načteno ${verifiedFiles.filter(f => f.isAvailable).length} dostupných hudebních souborů z CDN`);

    } catch (err) {
      log.error('Chyba při načítání hudebních souborů z CDN:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Spusť scan okamžitě - preload ready check odstraněn
    scanCDN();
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
