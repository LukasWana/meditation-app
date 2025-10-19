import { useState, useEffect, useMemo, useCallback } from 'react';
import { parseAudioFileName as parseSpeechFileName } from '@utils/audioParser';
import { parseAudioFileName as parseMusicFileName } from '@utils/hudbaParser';

/**
 * Hook pro management přepínání hlasů mezi mužským a ženským
 */
export const useVoiceSwitcher = (currentAudioFile, allFiles) => {
  const [selectedVoice, setSelectedVoice] = useState('male'); // 'male', 'female'

  // Pomocná funkce pro extrakci názvu souboru z URL
  const extractFileNameFromUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return null;

    // Pokud už je to název souboru (ne URL), vrať ho
    if (!url.startsWith('http')) {
      return url.includes('/') ? url.split('/').pop() : url;
    }

    try {
      // Pro Firebase Storage URL: https://firebasestorage.googleapis.com/v0/b/.../o/filename.mp3?alt=media
      const match = url.match(/\/o\/([^?]+)/);
      if (match) {
        const fullPath = decodeURIComponent(match[1]);
        // Extraktuj pouze název souboru ze cesty (např. "ambient-journey/filename.mp3" -> "filename.mp3")
        return fullPath.includes('/') ? fullPath.split('/').pop() : fullPath;
      }

      // Fallback pro běžné URL
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop();
    } catch (error) {
      // Pokud to není validní URL, zkusíme to jako název souboru
      // Také extraktuj název souboru ze cesty pokud obsahuje "/"
      return url.includes('/') ? url.split('/').pop() : url;
    }
  }, []);

  // Univerzální parser - zkusí oba formáty
  const parseAudioFileName = useCallback((fileNameOrUrl) => {
    console.log('parseAudioFileName called with:', fileNameOrUrl);
    const fileName = extractFileNameFromUrl(fileNameOrUrl);
    console.log('Extracted fileName:', fileName);

    if (!fileName) return null;

    // Nejdřív zkusíme hudební formát (hudba/alba)
    const musicResult = parseMusicFileName(fileName);
    if (musicResult) {
      console.log('Parsed as music:', musicResult);
      return musicResult;
    }

    // Pak zkusíme mluvené slovo formát
    const speechResult = parseSpeechFileName(fileName);
    if (speechResult) {
      console.log('Parsed as speech:', speechResult);
      return speechResult;
    }

    console.log('Could not parse fileName:', fileName);
    return null;
  }, [extractFileNameFromUrl]);

  // Získej informace o aktuálním souboru
  const currentFileInfo = useMemo(() => {
    if (!currentAudioFile) return null;
    return parseAudioFileName(currentAudioFile);
  }, [currentAudioFile, parseAudioFileName]);

  const currentVoice = useMemo(() => currentFileInfo?.gender, [currentFileInfo]); // 'male' nebo 'female'

  // Získej téma pro hledání variant
  const currentTopic = useMemo(() => currentFileInfo?.topic || currentFileInfo?.albumName, [currentFileInfo]);

  // Inicializuj selectedVoice podle aktuálního hlasu v souboru
  useEffect(() => {
    if (currentFileInfo && currentFileInfo.gender) {
      const voice = currentFileInfo.gender; // Už je 'male' nebo 'female'
      setSelectedVoice(voice);
      console.log('Initialized selectedVoice to:', voice, 'based on file gender:', currentFileInfo.gender);
    }
  }, [currentFileInfo]);

  // Zobraz přepínač pouze pro mluvené slovo (hudební soubory nemají varianty)
  const hasVariants = useMemo(() => {
    return currentFileInfo && currentFileInfo.gender && (
      currentFileInfo.gender === 'male' || currentFileInfo.gender === 'female'
    ) && currentTopic && currentFileInfo.number && currentFileInfo.type; // Musí mít téma a typ pro hledání alternativ
  }, [currentFileInfo, currentTopic]);

  // Funkce pro přepínání hlasů
  const handleVoiceChange = useCallback((voice) => {
    setSelectedVoice(voice);
    console.log('Voice changed to:', voice);

    // Najdi alternativní soubor s opačným hlasem
    if (currentFileInfo && currentTopic) {
      const targetVoice = voice === 'male' ? 'muzsky' : 'zensky';
      const currentVoiceType = currentFileInfo.gender;

      // Pokud už je vybraný správný hlas, nic nedělej
      if (currentVoiceType === voice) {
        console.log('Already playing correct voice');
        return;
      }

      // Sestav název souboru s opačným hlasem
      // Formát: "zensky4FSK-téma.mp3" nebo "muzsky4MSK-téma.mp3"
      // Musíme změnit type podle targetVoice: FSK pro ženy, MSK pro muže
      const targetType = voice === 'male' ? 'MSK' : 'FSK';
      const topicForFileName = currentTopic.replace(/\s+/g, '-'); // Nahraď mezery pomlčkami
      const newFileName = `${targetVoice}${currentFileInfo.number}${targetType}-${topicForFileName}.mp3`;
      console.log('Switching to file:', newFileName);
      console.log('Current file components:', {
        targetVoice,
        number: currentFileInfo.number,
        originalType: currentFileInfo.type,
        targetType,
        topic: currentTopic
      });

      // Najdi původní cestu k souboru (složku)
      // Pokud currentAudioFile obsahuje cestu, použij ji, jinak použij jen název souboru
      let fullPath;
      if (currentAudioFile.includes('/')) {
        const originalPath = currentAudioFile.substring(0, currentAudioFile.lastIndexOf('/') + 1);
        fullPath = originalPath + newFileName;
      } else {
        // Pokud je to jen název souboru, použij jen nový název
        fullPath = newFileName;
      }

      console.log('Full path to new file:', fullPath);
      console.log('Current file info:', currentFileInfo);

      // Zkontroluj, jestli alternativní soubor existuje v allFiles
      const alternativeFile = allFiles.find(file =>
        file.fileName === fullPath || file.fileName === newFileName
      );

      if (alternativeFile) {
        console.log('Alternative file found:', alternativeFile);
        // Přepni na nový soubor
        return alternativeFile.audioSrc || fullPath;
      } else {
        console.warn('Alternative file not found:', fullPath);
        // Zkus najít soubor s podobným názvem
        const similarFile = allFiles.find(file =>
          file.fileName.includes(topicForFileName) &&
          file.fileName.includes(targetVoice)
        );

        if (similarFile) {
          console.log('Similar file found:', similarFile);
          return similarFile.audioSrc || similarFile.fileName;
        } else {
          console.error('No alternative file found for voice switch');
          return null;
        }
      }
    } else {
      console.log('Cannot switch voice - missing file info or topic:', { currentFileInfo, currentTopic });
      return null;
    }
  }, [currentFileInfo, currentTopic, currentAudioFile, allFiles]);

  return {
    selectedVoice,
    currentVoice,
    hasVariants,
    handleVoiceChange,
    currentFileInfo
  };
};