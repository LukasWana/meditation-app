import { useState, useEffect, useMemo } from 'react';
import { useAudioFilter } from '@hooks/useAudioFilter';
import { useFirebaseCDNScanner } from '@hooks/useFirebaseCDNScanner';
import globalMetadataPreloader from '@services/globalMetadataPreloader';

/**
 * Hook pro kombinaci Firebase audio a filtrování
 */
export const useFirebaseAudioFilter = (userGender, userLanguage = 'sk') => {
  // Použij CDN scanner pro dynamické načítání
  const {
    availableFiles,
    filesByTopic,
    availableTopics,
    stats,
    isLoading: cdnLoading,
    error: cdnError,
    refreshCDN,
    getFilesByGender
  } = useFirebaseCDNScanner();

  // Filtruj soubory podle pohlaví uživatele - reaguje na změnu gender
  const filteredFiles = useMemo(() => {
    return getFilesByGender(userGender);
  }, [userGender, availableFiles]);

  // Získej názvy souborů pro kompatibilitu s useAudioFilter
  const audioFileNames = availableFiles.map(file => file.fileName);

  // Získej doporučené soubory - zobraz všechny kombinace hlasů a pohlaví pro každé téma
  const troubleItems = useMemo(() => {
    const getTroubleItems = () => {
    console.log('Filtrované soubory pro uživatele:', filteredFiles);

    const topicConfig = {
      'uzkost-osamelost': {},
      'strach-osamelost': {},
      'stres-praca': {},
      'spank': {},
      'depresia': {},
      'relaxacia': {}
    };

    // Seskup soubory podle témat
    const filesByTopic = filteredFiles.reduce((acc, file) => {
      if (!file.parsed?.topic) return acc;

      if (!acc[file.parsed.topic]) {
        acc[file.parsed.topic] = [];
      }
      acc[file.parsed.topic].push(file);
      return acc;
    }, {});

    console.log('Seskupené soubory podle témat:', filesByTopic);

    // Pro každé téma zobraz všechny dostupné kombinace hlasů a pohlaví
    const result = [];

    Object.keys(filesByTopic).forEach(topicKey => {
      const topicFiles = filesByTopic[topicKey];
      const config = topicConfig[topicKey] || { icon: '🎵' };

      // Zobraz pouze první soubor pro toto téma (varianty se přepínají v playeru)
      const file = topicFiles[0]; // Vezmi první soubor
      if (file && file.parsed) {
        const voiceGender = file.parsed.gender === 'female' ? 'žena' : 'muž';
        const voiceType = file.parsed.type || 'MSK';
        const topic = file.parsed.topic || topicKey.replace('-', ' ');

        // Získej skutečnou délku z globálního preloaderu nebo fallback na file.duration
        const globalMetadata = globalMetadataPreloader.getMetadata(file.fileName);
        let actualDuration = 'N/A';

        if (globalMetadata?.durationFormatted) {
          actualDuration = globalMetadata.durationFormatted;
        } else if (file.duration && file.duration !== 'N/A') {
          actualDuration = file.duration;
        } else {
          // Zkus načíst duration z cache nebo metadata
          const cachedDuration = globalMetadata?.duration;
          if (cachedDuration && cachedDuration > 0) {
            // Převeď sekundy na MM:SS formát
            const minutes = Math.floor(cachedDuration / 60);
            const seconds = Math.floor(cachedDuration % 60);
            actualDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }
        }

        result.push({
          key: `${topicKey}-${file.parsed.gender}-${file.parsed.type}`,
          title: file.parsed.title || `${voiceGender} hlas - ${topic}`,
          audioSrc: file.downloadURL || file.fileName,
          duration: actualDuration,
          voiceInfo: `${voiceGender} hlas (${voiceType})`,
          isAvailable: file.isAvailable || true,
          allFiles: topicFiles, // Zachovej všechny soubory pro přepínání v playeru
          parsed: file.parsed // Přidej parsed data pro další použití
        });
      }

      console.log(`Téma ${topicKey}: ${topicFiles.length} souborů zobrazeno`);
    });

    console.log('Finální troubleItems (všechny kombinace):', result);
    return result;
    };

    return getTroubleItems();
  }, [filteredFiles, availableFiles]);

  // Získej statistiky pro uživatele
  const getUserStats = () => {
    return {
      totalAvailable: stats.availableFiles,
      filteredForUser: filteredFiles.length,
      topicsAvailable: availableTopics.length,
      gender: userGender,
      language: userLanguage,
      lastUpdated: stats.lastUpdated
    };
  };

  return {
    // Data
    audioFiles: availableFiles,
    filteredFiles,
    filesByTopic,
    availableTopics,
    troubleItems,
    userStats: getUserStats(),

    // State
    isLoading: cdnLoading,
    error: cdnError,

    // Getters
    getAudioForTopic: (topic) => {
      const topicFiles = filesByTopic[topic] || [];
      const bestFile = topicFiles.find(file => {
        if (!file.parsed) return false;
        return file.parsed.isForUser(userGender);
      }) || topicFiles[0];
      return bestFile?.fileName || null;
    },
    getBestAudio: () => {
      return filteredFiles[0]?.fileName || null;
    },
    getFilesForTopic: (topic) => {
      return filesByTopic[topic] || [];
    },
    getAudioInfo: (fileName) => {
      const file = availableFiles.find(f => f.fileName === fileName);
      return file?.parsed || null;
    },
    isAudioSuitableForUser: (fileName) => {
      const file = availableFiles.find(f => f.fileName === fileName);
      return file?.parsed?.isForUser(userGender) || false;
    },
    getRecommendedFiles: (limit = 5) => {
      return filteredFiles.slice(0, limit).map(file => ({
        fileName: file.fileName,
        ...file.parsed
      }));
    },

    // Actions
    refreshAudioFiles: refreshCDN
  };
};
