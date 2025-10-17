import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '@services/firebase';
import { parseAudioFileName } from '@utils/hudbaParser';
import cacheService from '@services/cacheService';

// Pomocná funkce pro načtení délky audio souboru
const getAudioDuration = (audioSrc) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      if (isFinite(duration) && duration > 0) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
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

export const useFirebaseHudbaScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [coverImages, setCoverImages] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Funkce pro zpracování cached výsledků
  const processCachedResult = async (cachedResult) => {
    setAudioFiles(cachedResult.audioFiles);
    setCoverImages(new Map(Object.entries(cachedResult.coverImages || {})));
    setLastUpdated(cachedResult.lastUpdated);
    setIsLoading(false);

    // Preloading je teď méně agresivní - jen cache URL
    // const availableFiles = cachedResult.audioFiles.filter(f => f.isAvailable);
    // if (availableFiles.length > 0) {
    //   console.log('Starting preload for cached files');
    //   await cacheService.preloadBatch(availableFiles.slice(0, 5).map(file => ({
    //     url: file.downloadURL,
    //     fileName: file.fileName
    //   })), 'audio');
    // }
  };

  const scanCDN = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Zkontroluj cache pro Firebase query
      const cacheKey = 'hudba_scanner_all_files';
      const cachedResult = cacheService.getFirebaseQuery(cacheKey);

      if (cachedResult) {
        console.log('Using cached Firebase scan result');
        await processCachedResult(cachedResult);
        return;
      }

      const listRef = ref(storage, '');
      const result = await listAll(listRef);

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
          console.warn(`Nelze prohledat složku ${folderRef.name}:`, err.message);
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

      // Ověř, že soubory skutečně existují (získej download URL)
      const verifiedFiles = [];

      for (const fileName of mp3Files) {
        try {
          // Extraktuj pouze název souboru ze cesty
          const fileNameOnly = fileName.includes('/') ? fileName.split('/').pop() : fileName;

          // Přeskoč obrázky - neparsuj je jako audio soubory
          if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileNameOnly)) {
            continue;
          }

          // Zkontroluj cache pro download URL
          let downloadURL = cacheService.getAudioUrl(fileName);
          if (!downloadURL) {
            const fileRef = ref(storage, fileName);
            downloadURL = await getDownloadURL(fileRef);
            // Ulož do cache
            cacheService.setAudioUrl(fileName, downloadURL);
          }

          // Zkontroluj cache pro metadata
          const metadataKey = `metadata_${fileNameOnly}`;
          let parsed = cacheService.getMetadata(metadataKey);
          if (!parsed) {
            parsed = parseAudioFileName(fileNameOnly);
            cacheService.setMetadata(metadataKey, parsed);
          }

          // Zkontroluj cache pro duration
          let duration = cacheService.getDuration(downloadURL);
          if (!duration) {
            duration = await getAudioDuration(downloadURL);
            if (duration) {
              cacheService.setDuration(downloadURL, duration);
            }
          }

          verifiedFiles.push({
            fileName,
            downloadURL,
            parsed,
            duration,
            isAvailable: true
          });

          // Preloading je teď méně agresivní - jen cache URL
          // cacheService.preloadAudio(downloadURL, fileName).catch(err => {
          //   console.warn('Preload failed:', err);
          // });

        } catch (err) {
          console.warn(`Hudební soubor ${fileName} není dostupný:`, err.message);
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

      // Načti cover obrázky pro alba
      const coverImages = new Map();
      for (const imageName of imageFiles) {
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
                console.warn('Image preload failed:', err);
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
          console.warn(`Cover obrázek ${imageName} není dostupný:`, err.message);
        }
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

      console.log(`Načteno ${verifiedFiles.filter(f => f.isAvailable).length} dostupných hudebních souborů z CDN`);

    } catch (err) {
      console.error('Chyba při načítání hudebních souborů z CDN:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scanCDN();
  }, []);

  const availableFiles = audioFiles.filter(file => file.isAvailable);
  const filesByTopic = availableFiles.reduce((acc, file) => {
    if (!file.parsed) return acc;

    // Pro soubory ve složce použij název složky jako téma
    let topic;
    if (file.fileName.includes('/')) {
      // Soubor je ve složce, použij název složky
      const folderName = file.fileName.split('/')[0];
      topic = folderName.replace(/-/g, ' '); // ambient-journey -> ambient journey
    } else {
      // Soubor je v root složce, použij původní logiku
      topic = file.parsed.name;
    }

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
    error,
    lastUpdated,

    // Actions
    refreshCDN: scanCDN,

    // Getters
    getFilesForTopic: (topic) => filesByTopic[topic] || [],
    getFileByName: (fileName) => availableFiles.find(f => f.fileName === fileName)
  };
};
