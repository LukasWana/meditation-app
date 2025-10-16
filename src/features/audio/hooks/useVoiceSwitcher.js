import { useState, useCallback, useMemo } from 'react';
import { parseAudioFileName } from '@utils/audioParser';

export const useVoiceSwitcher = (audioFiles = []) => {
  const [selectedVoice, setSelectedVoice] = useState('auto'); // 'male', 'female', 'auto'

  // Parsuj všechny audio soubory
  const parsedFiles = useMemo(() => {
    return audioFiles
      .map(fileName => ({
        fileName,
        parsed: parseAudioFileName(fileName)
      }))
      .filter(item => item.parsed !== null);
  }, [audioFiles]);

  // Seskup soubory podle témat
  const filesByTopic = useMemo(() => {
    const grouped = {};
    parsedFiles.forEach(({ fileName, parsed }) => {
      if (!grouped[parsed.topic]) {
        grouped[parsed.topic] = [];
      }
      grouped[parsed.topic].push({ fileName, parsed });
    });
    return grouped;
  }, [parsedFiles]);

  // Najdi varianty pro aktuální téma
  const getVoiceVariants = useCallback((currentTopic) => {
    console.log('getVoiceVariants called with topic:', currentTopic);
    console.log('filesByTopic:', filesByTopic);

    if (!currentTopic || !filesByTopic[currentTopic]) {
      console.log('No topic or no files for topic:', currentTopic);
      return {
        maleVoice: null,
        femaleVoice: null,
        hasVariants: false
      };
    }

    const topicFiles = filesByTopic[currentTopic];
    console.log('Topic files:', topicFiles);

    // Najdi mužský a ženský hlas pro stejné téma
    const maleVoice = topicFiles.find(file =>
      file.parsed.voice === 'muzsky'
    )?.fileName || null;

    const femaleVoice = topicFiles.find(file =>
      file.parsed.voice === 'zensky'
    )?.fileName || null;

    const hasVariants = maleVoice && femaleVoice;

    console.log('Voice variants found:', { maleVoice, femaleVoice, hasVariants });

    return {
      maleVoice,
      femaleVoice,
      hasVariants
    };
  }, [filesByTopic]);

  // Získej aktuální audio soubor na základě vybraného hlasu
  const getCurrentAudioFile = useCallback((currentTopic, userGender = 'none') => {
    const { maleVoice, femaleVoice, hasVariants } = getVoiceVariants(currentTopic);

    if (!hasVariants) {
      // Pokud nejsou varianty, vrať první dostupný soubor
      return filesByTopic[currentTopic]?.[0]?.fileName || null;
    }

    switch (selectedVoice) {
      case 'male':
        return maleVoice;
      case 'female':
        return femaleVoice;
      case 'auto':
      default:
        // Auto výběr na základě uživatelova pohlaví
        if (userGender === 'male') return maleVoice;
        if (userGender === 'female') return femaleVoice;
        // Fallback na mužský hlas
        return maleVoice || femaleVoice;
    }
  }, [selectedVoice, getVoiceVariants, filesByTopic]);

  // Změň vybraný hlas
  const switchVoice = useCallback((voice) => {
    setSelectedVoice(voice);
  }, []);

  // Získej informace o dostupných hlasech
  const getVoiceInfo = useCallback((currentTopic) => {
    const { maleVoice, femaleVoice, hasVariants } = getVoiceVariants(currentTopic);

    return {
      hasVariants,
      availableVoices: {
        male: !!maleVoice,
        female: !!femaleVoice
      },
      currentVoice: selectedVoice,
      maleFileName: maleVoice,
      femaleFileName: femaleVoice
    };
  }, [selectedVoice, getVoiceVariants]);

  return {
    selectedVoice,
    switchVoice,
    getCurrentAudioFile,
    getVoiceInfo,
    getVoiceVariants,
    filesByTopic
  };
};
