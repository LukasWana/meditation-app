import { useState, useEffect, useMemo } from 'react';
import { fastMetadataService } from '@services/fastMetadataService';

export const useFirebaseAudioFilter = (userGender, userLanguage = 'sk') => {
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);

  // Sleduj načtení metadata a aktualizuj state
  useEffect(() => {
    const updateFiles = () => {
      const allFiles = Array.from(fastMetadataService.metadata.values());
      const meditacieFiles = allFiles.filter(file =>
        file.folder === 'meditacie' || file.fileName.startsWith('meditacie/')
      );
      setAvailableFiles(meditacieFiles);
      setMetadataLoaded(true);
    };

    if (fastMetadataService.isInitialized) {
      updateFiles();
    } else {
      fastMetadataService.initialize().then(updateFiles);
    }
  }, []);

  // Filtrování a seskupování souborů
  const { filteredFiles, filesByTopic, availableTopics } = useMemo(() => {
    const normalizedUserLang = userLanguage.toUpperCase();

    // 1. Filtruj podle jazyka a pohlaví
    const filtered = availableFiles.filter(file => {
      if (!file.parsed) return false;

      const fileLanguage = file.language || file.parsed.language;
      const fileGender = file.parsed.gender;

      // Musí odpovídat jazyku (CZ, SK, EN)
      const langMatch = fileLanguage === normalizedUserLang;
      // Musí odpovídat pohlaví (female, male)
      const genderMatch = fileGender === userGender;

      return langMatch && genderMatch;
    });

    // 2. Seskup podle témat
    const topics = {};
    filtered.forEach(file => {
      const topic = file.parsed?.topic || 'ostatne';
      if (!topics[topic]) topics[topic] = [];
      topics[topic].push(file);
    });

    return {
      filteredFiles: filtered,
      filesByTopic: topics,
      availableTopics: Object.keys(topics)
    };
  }, [availableFiles, userGender, userLanguage]);

  // Sestavení troubleItems (pro UI dashboardy)
  const troubleItems = useMemo(() => {
    const result = [];
    const topicConfig = {
      'uzkost-osamelost': {},
      'strach-osamelost': {},
      'stres-praca': {},
      'spank': {},
      'depresia': {},
      'relaxacia': {}
    };

    Object.keys(filesByTopic).forEach(topicKey => {
      const topicFiles = filesByTopic[topicKey];
      const file = topicFiles[0];
      if (file && file.parsed) {
        const voiceGender = file.parsed.gender === 'female' ? 'žena' : 'muž';
        const voiceType = file.parsed.type || 'MSK';
        const topicName = file.parsed.topic || topicKey.replace('-', ' ');

        result.push({
          key: `${topicKey}-${file.parsed.gender}-${file.parsed.type}`,
          title: file.parsed.title || `${voiceGender} hlas - ${topicName}`,
          audioSrc: file.downloadURL || file.fileName,
          duration: file.durationFormatted || 'N/A',
          voiceInfo: `${voiceGender} hlas (${voiceType})`,
          isAvailable: true,
          allFiles: topicFiles,
          parsed: file.parsed
        });
      }
    });

    return result;
  }, [filesByTopic]);

  const stats = {
    availableFiles: availableFiles.length,
    filteredForUser: filteredFiles.length,
    topicsAvailable: availableTopics.length,
    lastUpdated: new Date().toISOString()
  };

  return {
    audioFiles: availableFiles,
    filteredFiles,
    filesByTopic,
    availableTopics,
    troubleItems,
    userStats: stats,
    isLoading: !metadataLoaded,
    error: null,
    refreshAudioFiles: () => fastMetadataService.initialize(),
    getAudioForTopic: (topic) => filesByTopic[topic]?.[0]?.fileName || null,
    getBestAudio: () => filteredFiles[0]?.fileName || null,
    getFilesForTopic: (topic) => filesByTopic[topic] || [],
    getAudioInfo: (fileName) => availableFiles.find(f => f.fileName === fileName)?.parsed || null,
    isAudioSuitableForUser: (fileName) => {
      const file = availableFiles.find(f => f.fileName === fileName);
      return file?.parsed?.gender === userGender;
    },
    getRecommendedFiles: (limit = 5) => filteredFiles.slice(0, limit)
  };
};
