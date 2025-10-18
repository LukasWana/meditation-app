import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '@services/firebase';
import { parseAudioFileName } from '@utils/hudbaParser';
import cacheService from '@services/cacheService';
import { log } from '@services/logger';

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
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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

    log.success('✅ Using cached hudba data - no Firebase loading needed');

    // Metadata jsou už načtené z preloadingu, jen optimalizuj cache
    cacheService.optimizeCache();
  };

  const scanCDN = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      const listRef = ref(storage, '');
      log.firebase('📂 Loading from Firebase Storage...');
      const result = await listAll(listRef);
      log.firebase('📂 Firebase Storage loaded:', {
        items: result.items.length,
        prefixes: result.prefixes.length
      });

      // Získej všechny soubory včetně podsložek
      const allFiles = [...result.items];

      // Prohledej podsložky
      for (const folderRef of result.prefixes) {
        try {
          const folderResult = await listAll(folderRef);
          // Přidej soubory z podsložky s prefixem složky
          folderResult.items.forEach(item => {
            allFiles.push({
              ...item,
              name: `${folderRef.name}/${item.name}` // Přidej cestu složky k názvu
            });
          });
        } catch (err) {
          log.warn(`Nelze prohledat složku ${folderRef.name}:`, err.message);
        }
      }

      // Filtruj pouze MP3 soubory s hudebním formátem a obrázky pro cover
      const audioFiles = allFiles
        .filter(item => {
          const name = item.name.toLowerCase();
          const isMp3 = name.endsWith('.mp3');
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
          // Zkontroluj hudební formát buď na začátku názvu nebo po cestě složky
          const isHudba = /\d{2}--\d{2}--\d{2}--\d{2}-/.test(item.name);
          return (isMp3 || isImage) && isHudba;
        })
        .map(item => item.name);

      const mp3Files = audioFiles.filter(name => name.toLowerCase().endsWith('.mp3'));
      const imageFiles = audioFiles.filter(name => /\.(jpg|jpeg|png|gif|webp)$/i.test(name));

      // Použij metadata z cache místo načítání ze Firebase - optimalizováno pro performance
      const verifiedFiles = [];

      // Rozděl zpracování do chunků pro non-blocking UI
      const chunkSize = 10; // Zpracuj po 10 souborech
      const chunks = [];
      for (let i = 0; i < mp3Files.length; i += chunkSize) {
        chunks.push(mp3Files.slice(i, i + chunkSize));
      }

      log.performance(`Processing ${mp3Files.length} files in ${chunks.length} chunks`, 0);

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

              // Parsuj název souboru
              const parsed = parseAudioFileName(fileNameOnly);
              if (parsed) {
                verifiedFiles.push({
                  fileName: fileName,
                  fileNameOnly: fileNameOnly,
                  downloadURL: downloadURL,
                  duration: duration,
                  parsed: parsed,
                  isAvailable: true
                });
              }
            } else {
              // Použij data z cache
              const downloadURL = cacheService.getAudioUrl(fileNameOnly) || `https://firebasestorage.googleapis.com/v0/b/${storage.app.options.storageBucket}/o/${encodeURIComponent(fileName)}?alt=media`;

              // Získej duration z cache nebo použij default
              const cachedDuration = cacheService.getDuration(downloadURL);
              let duration = 'N/A';
              if (cachedDuration && cachedDuration > 0) {
                const minutes = Math.floor(cachedDuration / 60);
                const seconds = Math.floor(cachedDuration % 60);
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              }

              verifiedFiles.push({
                fileName: fileName,
                fileNameOnly: fileNameOnly,
                downloadURL: downloadURL,
                duration: duration,
                parsed: cachedMetadata,
                isAvailable: true
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

        // Yield control back to browser po každém chunk
        if (chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const chunkEndTime = performance.now();
        log.performance(`Chunk ${chunkIndex + 1}/${chunks.length} processed`, chunkEndTime - chunkStartTime);
      }

      // Načti cover obrázky pro alba - optimalizováno pro performance
      const coverImages = new Map();
      const imageChunks = [];
      const imageChunkSize = 5; // Menší chunk pro obrázky
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

            // Pro soubory ze složek - použij název složky jako klíč
            if (imageName.includes('/')) {
              const folderName = imageName.split('/')[0];
              const imageFileName = imageName.split('/')[1];

              // Pokud je to cover.jpg v složce, použij název složky
              if (imageFileName.toLowerCase().includes('cover')) {
                coverImages.set(folderName, downloadURL);

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

        // Yield control back to browser po každém chunk
        if (chunkIndex < imageChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const chunkEndTime = performance.now();
        log.performance(`Image chunk ${chunkIndex + 1}/${imageChunks.length} processed`, chunkEndTime - chunkStartTime);
      }

      setAudioFiles(verifiedFiles);
      setCoverImages(coverImages);
      setLastUpdated(new Date());

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
    coverImages,
    availableTopics,
    stats,

    // State
    isLoading,
    error,
    lastUpdated,

    // Actions
    refreshCDN: scanCDN,

    // Getters
    getFilesForTopic: (topic) => filesByTopic[topic] || [],
    getFileByName: (fileName) => availableFiles.find(f => f.fileName === fileName)
  };
};


