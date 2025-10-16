import { useState, useEffect } from 'react';
import { useAudioFilter } from '@hooks/useAudioFilter';
import { useFirebaseCDNScanner } from '@hooks/useFirebaseCDNScanner';

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

  // Filtruj soubory podle pohlaví uživatele
  const filteredFiles = getFilesByGender(userGender);

  // Získej názvy souborů pro kompatibilitu s useAudioFilter
  const audioFileNames = availableFiles.map(file => file.fileName);

  // Získej doporučené soubory - zobraz všechny kombinace hlasů a pohlaví pro každé téma
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

      // Zobraz všechny soubory pro toto téma
      topicFiles.forEach((file, index) => {
        const voiceGender = file.parsed?.voice === 'zensky' ? 'žena' : 'muž';
        const targetGender = file.parsed?.targetGender === 'female' ? 'ženy' :
                           file.parsed?.targetGender === 'male' ? 'muže' : 'všechny';

        result.push({
          key: `${topicKey}-${file.parsed?.voice}-${file.parsed?.targetGender}-${index}`,
          title: file.parsed?.readableTopic || topicKey.replace('-', ' '),
          audioSrc: file.fileName,
          duration: '4:25',
          voiceInfo: `${file.parsed?.voice} hlas pro ${targetGender}`,
          isAvailable: true,
          allFiles: [file]
        });
      });

      console.log(`Téma ${topicKey}: ${topicFiles.length} souborů zobrazeno`);
    });

    console.log('Finální troubleItems (všechny kombinace):', result);
    return result;
  };

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
    troubleItems: getTroubleItems(),
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
