import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '@services/firebase';
import { parseAudioFileName } from '@utils/hudbaParser';
import cacheService from '@services/cacheServiceRefactored';
import log from '@services/logger';

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

    log.success('✅ Používám cached meditace data - žádné Firebase načítání');

    // Metadata jsou už načtené z preloadingu, jen optimalizuj cache
    cacheService.optimizeCache();
  };

  const scanCDN = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Zkontroluj cache pro Firebase query
      const cacheKey = 'meditace_scanner_all_files';
      const cachedResult = cacheService.getFirebaseQuery(cacheKey);

      if (cachedResult) {
        console.log('Using cached Firebase scan result for meditace');
        await processCachedResult(cachedResult);
        return;
      }

      // Získej referenci na root složku v Firebase Storage
      const listRef = ref(storage, '');

      // Načti všechny soubory včetně podsložek
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

          // Pokud je to meditace/ složka, prohledej i jazykové podsložky
          if (folderRef.name === 'meditace') {
            for (const langFolderRef of folderResult.prefixes) {
              try {
                const langFolderResult = await listAll(langFolderRef);
                langFolderResult.items.forEach(item => {
                  allFiles.push({
                    ...item,
                    name: `${folderRef.name}/${langFolderRef.name}/${item.name}` // Přidej cestu s jazykem
                  });
                });
              } catch (langErr) {
                console.warn(`Nelze prohledat jazykovou složku ${langFolderRef.name}:`, langErr.message);
              }
            }
          }
        } catch (err) {
          console.warn(`Nelze prohledat složku ${folderRef.name}:`, err.message);
        }
      }

      // Filtruj pouze MP3 soubory pro meditace složku
      const mp3Files = allFiles
        .filter(item => {
          const name = item.name;
          const isMp3 = name.toLowerCase().endsWith('.mp3');
          // Soubory z meditace/ složky, jazykových podsložek (CZ/, SK/, EN/) nebo začínající "muzsky" nebo "zensky"
          const isMeditace = name.startsWith('meditace/') ||
                         name.startsWith('meditace/CZ/') ||
                         name.startsWith('meditace/SK/') ||
                         name.startsWith('meditace/EN/') ||
                         /^(muzsky|zensky)/.test(name);
          const isNotMusic = !name.startsWith('00--00--00--');
          console.log(`Filtering ${name}: isMp3=${isMp3}, isMeditace=${isMeditace}, isNotMusic=${isNotMusic}`);
          return isMp3 && isMeditace && isNotMusic;
        })
        .map(item => item.name);

      // Použij metadata z cache místo načítání ze Firebase
      const verifiedFiles = [];

      for (const fileName of mp3Files) {
        try {
          // Zkontroluj, jestli je soubor v hudbaData cache (meditace soubory)
          const hudbaData = cacheService.getFirebaseQuery('hudba_scanner_all_files');
          const cachedFile = hudbaData?.audioFiles?.find(file => file.fileName === fileName);

          if (cachedFile) {
            // Použij data z cache
            verifiedFiles.push({
              fileName: cachedFile.fileName,
              downloadURL: cachedFile.audioSrc,
              parsed: cachedFile.parsed,
              isAvailable: cachedFile.isAvailable
            });
            continue;
          }

          // Pokud není v cache, načti ze Firebase
          console.log(`No cached data for ${fileName}, loading from Firebase`);
          try {
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
          } catch (error) {
            console.warn(`Soubor ${fileName} nebyl nalezen v Firebase Storage:`, error.message);
            // Přeskoč tento soubor
          }

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

      log.success(`✅ Loaded ${verifiedFiles.filter(f => f.isAvailable).length} meditace files from cache (no Firebase loading needed)`);

      // Debug: vypiš všechny načtené soubory
      verifiedFiles.filter(f => f.isAvailable).forEach(file => {
        log.debug(`✅ File: ${file.fileName}, parsed:`, file.parsed);
      });

    } catch (err) {
      log.error('Chyba při načítání obsahu z CDN:', err);
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
