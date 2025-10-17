import { useMemo } from 'react';
import { useFirebaseHudbaScanner } from '@hooks/useFirebaseHudbaScanner';

export const useFirebaseHudbaFilter = () => {
  const {
    availableFiles,
    filesByTopic,
    availableTopics,
    stats,
    isLoading,
    error,
    refreshCDN,
    getFilesForTopic,
    getFileByName
  } = useFirebaseHudbaScanner();

  // Filtruj soubory podle témat a vyber nejvyšší verzi pro každé téma
  const hudbaItems = useMemo(() => {
    const items = [];

    availableTopics.forEach(topic => {
      const topicFiles = filesByTopic[topic];
      if (!topicFiles || topicFiles.length === 0) return;

      // Seřaď soubory podle verze (nejvyšší verze první)
      const sortedFiles = topicFiles
        .filter(file => file.parsed && file.isAvailable)
        .sort((a, b) => {
          const versionA = parseInt(a.parsed.version);
          const versionB = parseInt(b.parsed.version);
          return versionB - versionA; // Sestupně - nejvyšší verze první
        });

      if (sortedFiles.length > 0) {
        const bestFile = sortedFiles[0];
        const parsed = bestFile.parsed;

        items.push({
          key: `${topic}-${parsed.version}`,
          title: parsed.name,
          duration: bestFile.duration || 'N/A', // Pokusíme se získat délku z metadata
          audioSrc: bestFile.downloadURL,
          fullNumbering: parsed.fullNumbering,
          version: parsed.version,
          topic,
          fileName: bestFile.fileName
        });
      }
    });

    // Seřaď podle číslování
    return items.sort((a, b) => {
      return a.fullNumbering.localeCompare(b.fullNumbering);
    });

  }, [availableFiles, filesByTopic, availableTopics]);

  return {
    // Data
    hudbaItems,
    availableFiles,
    filesByTopic,
    availableTopics,
    stats,

    // State
    isLoading,
    error,

    // Actions
    refreshAudioFiles: refreshCDN,

    // Getters
    getAudioForTopic: (topic) => {
      const topicFiles = filesByTopic[topic] || [];
      const bestFile = topicFiles
        .filter(file => file.parsed && file.isAvailable)
        .sort((a, b) => parseInt(b.parsed.version) - parseInt(a.parsed.version))[0];
      return bestFile?.fileName || null;
    },
    getBestAudio: () => {
      return hudbaItems[0]?.fileName || null;
    },
    getFilesForTopic,
    getAudioInfo: (fileName) => {
      const file = getFileByName(fileName);
      return file?.parsed || null;
    },
    getRecommendedFiles: (limit = 5) => {
      return hudbaItems.slice(0, limit);
    }
  };
};
