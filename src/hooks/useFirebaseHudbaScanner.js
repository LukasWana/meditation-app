import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '@services/firebase';
import { parseHudbaFileName } from '@utils/hudbaParser';

export const useFirebaseHudbaScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const scanCDN = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const listRef = ref(storage, '');
      const result = await listAll(listRef);

      // Filtruj pouze MP3 soubory s hudebním formátem
      const mp3Files = result.items
        .filter(item => {
          const name = item.name.toLowerCase();
          const isMp3 = name.endsWith('.mp3');
          const isHudba = /^\d{2}--\d{2}--\d{2}--\d{2}-/.test(item.name);
          return isMp3 && isHudba;
        })
        .map(item => item.name);

      // Ověř, že soubory skutečně existují (získej download URL)
      const verifiedFiles = [];

      for (const fileName of mp3Files) {
        try {
          const fileRef = ref(storage, fileName);
          const downloadURL = await getDownloadURL(fileRef);
          const parsed = parseHudbaFileName(fileName);

          verifiedFiles.push({
            fileName,
            downloadURL,
            parsed,
            isAvailable: true
          });
        } catch (err) {
          console.warn(`Hudební soubor ${fileName} není dostupný:`, err.message);
          verifiedFiles.push({
            fileName,
            downloadURL: null,
            parsed: parseHudbaFileName(fileName),
            isAvailable: false,
            error: err.message
          });
        }
      }

      setAudioFiles(verifiedFiles);
      setLastUpdated(new Date());

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
    const topic = file.parsed.name;
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
