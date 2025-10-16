import { useState, useMemo } from 'react';
import { parseAudioFileName, findBestAudioForUser, groupAudioByTopic, getAvailableTopics } from '@utils/audioParser';

/**
 * Hook pro filtrování audio souborů na základě uživatelských preferencí
 */
export const useAudioFilter = (userGender, userLanguage = 'sk') => {
  const [audioFiles, setAudioFiles] = useState([]);

  // Filtrované soubory podle pohlaví
  const filteredFiles = useMemo(() => {
    if (!audioFiles || audioFiles.length === 0) return [];

    return audioFiles.filter(fileName => {
      const parsed = parseAudioFileName(fileName);
      if (!parsed) return false;

      // Pokud uživatel nechce být osobní, ukaž vše
      if (userGender === 'none') {
        return true;
      }

      // Jinak ukaž obsah pro jeho pohlaví + obecný obsah
      return parsed.isForUser(userGender);
    });
  }, [audioFiles, userGender]);

  // Seskupené soubory podle témat
  const filesByTopic = useMemo(() => {
    return groupAudioByTopic(filteredFiles);
  }, [filteredFiles]);

  // Dostupné témata
  const availableTopics = useMemo(() => {
    return getAvailableTopics(filteredFiles);
  }, [filteredFiles]);

  /**
   * Najde nejlepší audio soubor pro dané téma
   */
  const getAudioForTopic = (topic) => {
    return findBestAudioForUser(audioFiles, userGender, userLanguage, topic);
  };

  /**
   * Najde nejlepší audio soubor bez ohledu na téma
   */
  const getBestAudio = () => {
    return findBestAudioForUser(audioFiles, userGender, userLanguage);
  };

  /**
   * Získá všechny soubory pro dané téma
   */
  const getFilesForTopic = (topic) => {
    return filesByTopic[topic] || [];
  };

  /**
   * Získá informace o audio souboru
   */
  const getAudioInfo = (fileName) => {
    return parseAudioFileName(fileName);
  };

  /**
   * Zkontroluje, zda je soubor vhodný pro uživatele
   */
  const isAudioSuitableForUser = (fileName) => {
    const parsed = parseAudioFileName(fileName);
    if (!parsed) return false;
    return parsed.isForUser(userGender);
  };

  /**
   * Získá doporučené soubory pro uživatele
   */
  const getRecommendedFiles = (limit = 5) => {
    const recommendations = [];

    // Pro každé téma najdi nejlepší soubor
    availableTopics.forEach(topic => {
      const bestFile = getAudioForTopic(topic);
      if (bestFile && !recommendations.find(r => r.fileName === bestFile)) {
        const info = getAudioInfo(bestFile);
        recommendations.push({
          fileName: bestFile,
          topic: topic,
          ...info
        });
      }
    });

    return recommendations.slice(0, limit);
  };

  return {
    // Data
    audioFiles,
    filteredFiles,
    filesByTopic,
    availableTopics,

    // Actions
    setAudioFiles,

    // Getters
    getAudioForTopic,
    getBestAudio,
    getFilesForTopic,
    getAudioInfo,
    isAudioSuitableForUser,
    getRecommendedFiles,

    // Stats
    totalFiles: audioFiles.length,
    filteredFilesCount: filteredFiles.length,
    topicsCount: availableTopics.length
  };
};
