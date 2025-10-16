import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '@services/firebase';
import { parseAudioFileName } from '@utils/audioParser';

/**
 * Hook pro načítání aktuálního obsahu z Firebase CDN
 */
export const useFirebaseCDNScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const scanCDN = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Získej referenci na root složku v Firebase Storage
      const listRef = ref(storage, '');

      // Načti všechny soubory
      const result = await listAll(listRef);

      // Filtruj pouze MP3 soubory
      const mp3Files = result.items
        .filter(item => item.name.toLowerCase().endsWith('.mp3'))
        .map(item => item.name);

      // Ověř, že soubory skutečně existují (získej download URL)
      const verifiedFiles = [];

      for (const fileName of mp3Files) {
        try {
          const fileRef = ref(storage, fileName);
          const downloadURL = await getDownloadURL(fileRef);

          // Parsuj název souboru pro získání metadat
          const parsed = parseAudioFileName(fileName);

          verifiedFiles.push({
            fileName,
            downloadURL,
            parsed,
            isAvailable: true
          });
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

      console.log(`Načteno ${verifiedFiles.filter(f => f.isAvailable).length} dostupných audio souborů z CDN`);

      // Debug: vypiš všechny načtené soubory
      verifiedFiles.filter(f => f.isAvailable).forEach(file => {
        console.log(`Soubor: ${file.fileName}, parsed:`, file.parsed);
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
