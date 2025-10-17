import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '@services/firebase';
import { parseAudioFileName } from '@utils/audioParser';
import cacheService from '@services/cacheService';

/**
 * Hook pro načítání aktuálního obsahu z Firebase CDN
 */
export const useFirebaseCDNScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Funkce pro zpracování cached výsledků - optimalizováno pro rychlost
  const processCachedResult = async (cachedResult) => {
    setAudioFiles(cachedResult.audioFiles);
    setLastUpdated(cachedResult.lastUpdated);
    setIsLoading(false);

    console.log('✅ Using cached slova data - no Firebase loading needed');

    // Metadata jsou už načtené z preloadingu, jen optimalizuj cache
    cacheService.optimizeCache();
  };

  const scanCDN = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Zkontroluj cache pro Firebase query
      const cacheKey = 'slova_scanner_all_files';
      const cachedResult = cacheService.getFirebaseQuery(cacheKey);

      if (cachedResult) {
        console.log('Using cached Firebase scan result for slova');
        await processCachedResult(cachedResult);
        return;
      }

      // Získej referenci na root složku v Firebase Storage
      const listRef = ref(storage, '');

      // Načti všechny soubory
      const result = await listAll(listRef);

      // Filtruj pouze MP3 soubory pro mluvené slovo (ne hudební soubory)
      const mp3Files = result.items
        .filter(item => {
          const name = item.name;
          const isMp3 = name.toLowerCase().endsWith('.mp3');
          // Pouze soubory začínající "muzsky" nebo "zensky" (ne "00--00--00--")
          const isSpokenWord = /^(muzsky|zensky)/.test(name);
          const isNotMusic = !name.startsWith('00--00--00--');
          console.log(`Filtering ${name}: isMp3=${isMp3}, isSpokenWord=${isSpokenWord}, isNotMusic=${isNotMusic}`);
          return isMp3 && isSpokenWord && isNotMusic;
        })
        .map(item => item.name);

      // Použij metadata z cache místo načítání ze Firebase
      const verifiedFiles = [];

      for (const fileName of mp3Files) {
        try {
          // Použij metadata z cache (už načtené z preloadingu)
          const cachedMetadata = cacheService.getMetadata(fileName);
          if (!cachedMetadata) {
            console.log(`No cached metadata for ${fileName}, loading from Firebase`);
            // Pokud není v cache, načti normálně ze Firebase
            const fileRef = ref(storage, fileName);
            const downloadURL = await getDownloadURL(fileRef);
            cacheService.setAudioUrl(fileName, downloadURL);

            const parsed = parseAudioFileName(fileName);
            verifiedFiles.push({
              fileName,
              downloadURL,
              parsed,
              isAvailable: true
            });
            continue;
          }

          // Zkontroluj cache pro download URL (může být už načtené)
          let downloadURL = cacheService.getAudioUrl(fileName);
          if (!downloadURL) {
            // Pouze pokud není v cache, načti ze Firebase
            const fileRef = ref(storage, fileName);
            downloadURL = await getDownloadURL(fileRef);
            cacheService.setAudioUrl(fileName, downloadURL);
          }

          // Parse metadata z cache
          const parsed = parseAudioFileName(fileName);

          verifiedFiles.push({
            fileName,
            downloadURL,
            parsed,
            isAvailable: true
          });

          console.log(`✅ Loaded ${fileName} from cache (no Firebase loading needed)`);

        } catch (err) {
          console.warn(`Soubor ${fileName} není dostupný:`, err.message);
          // Přidej i nedostupné soubory pro debug
          verifiedFiles.push({
            fileName,
            downloadURL: null,
            parsed: parseAudioFileName(fileName),
            isAvailable: false,
            error: err.message
          });
        }
      }

      setAudioFiles(verifiedFiles);
      setLastUpdated(new Date());

      // Ulož výsledek do cache
      const resultToCache = {
        audioFiles: verifiedFiles,
        lastUpdated: new Date()
      };
      cacheService.setFirebaseQuery(cacheKey, resultToCache);

      console.log(`✅ Loaded ${verifiedFiles.filter(f => f.isAvailable).length} slova files from cache (no Firebase loading needed)`);

      // Debug: vypiš všechny načtené soubory
      verifiedFiles.filter(f => f.isAvailable).forEach(file => {
        console.log(`✅ File: ${file.fileName}, parsed:`, file.parsed);
      });

    } catch (err) {
      console.error('Chyba při načítání obsahu z CDN:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Načti obsah při inicializaci
  useEffect(() => {
    scanCDN();
  }, []);

  // Získej pouze dostupné soubory
  const availableFiles = audioFiles.filter(file => file.isAvailable);

  // Získej soubory seskupené podle témat
  const filesByTopic = availableFiles.reduce((acc, file) => {
    if (!file.parsed) return acc;

    const topic = file.parsed.topic;
    if (!acc[topic]) {
      acc[topic] = [];
    }
    acc[topic].push(file);

    return acc;
  }, {});

  // Získej seznam všech témat
  const availableTopics = Object.keys(filesByTopic);

  // Získej statistiky
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

    // State
    isLoading,
    error,
    lastUpdated,

    // Actions
    refreshCDN: scanCDN,

    // Getters
    getFilesForTopic: (topic) => filesByTopic[topic] || [],
    getFileByName: (fileName) => availableFiles.find(f => f.fileName === fileName),
    getFilesByGender: (gender) => {
      const filtered = availableFiles.filter(file => {
        if (!file.parsed) return false;
        const result = file.parsed.isForUser(gender);
        console.log(`Filtrování: ${file.fileName}, gender: ${gender}, result: ${result}`);
        return result;
      });
      console.log(`Pro gender ${gender} nalezeno ${filtered.length} souborů z ${availableFiles.length}`);
      return filtered;
    }
  };
};
