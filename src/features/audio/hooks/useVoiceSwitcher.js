import { useState, useEffect, useMemo, useCallback } from 'react';
import { parseAudioFileName as parseSpeechFileName } from '@utils/audioParser';
import { parseAudioFileName as parseMusicFileName } from '@utils/hudbaParser';

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
    const fileName = extractFileNameFromUrl(fileNameOrUrl);

    if (!fileName) return null;

    // Nejdřív zkusíme hudební formát (hudba/alba)
    const musicResult = parseMusicFileName(fileName);
    if (musicResult) {
      return musicResult;
    }

    // Pak zkusíme mluvené slovo formát
    const speechResult = parseSpeechFileName(fileName);
    if (speechResult) {
      return speechResult;
    }

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
    }
  }, [currentFileInfo]);

  // Pomocná funkce pro sestavení názvu alternativního souboru
  const buildAlternativeFileName = useCallback((voice, fileInfo, topic) => {
    const targetVoice = voice === 'male' ? 'muzsky' : 'zensky';
    const targetType = voice === 'male' ? 'MSK' : 'FSK';
    const topicForFileName = topic.replace(/\s+/g, '-');
    return `${targetVoice}${fileInfo.number}${targetType}-${topicForFileName}.mp3`;
  }, []);

  // Pomocná funkce pro hledání alternativního souboru
  const findAlternativeFile = useCallback((fileName, allFiles) => {
    if (!allFiles || !Array.isArray(allFiles)) return null;

    // Přímé hledání podle názvu souboru
    const directMatch = allFiles.find(file =>
      file.fileName === fileName ||
      file.fileName === fileName.split('/').pop()
    );

    if (directMatch) return directMatch;

    // Hledání podle podobnosti (téma + hlas)
    const topic = fileName.split('-').pop()?.replace('.mp3', '');
    const voice = fileName.includes('muzsky') ? 'muzsky' : 'zensky';

    return allFiles.find(file =>
      file.fileName.includes(topic) && file.fileName.includes(voice)
    );
  }, []);

  // Zobraz přepínač pouze pro mluvené slovo (hudební soubory nemají varianty)
  const hasVariants = useMemo(() => {
    return currentFileInfo && currentFileInfo.gender && (
      currentFileInfo.gender === 'male' || currentFileInfo.gender === 'female'
    ) && currentTopic && currentFileInfo.number && currentFileInfo.type; // Musí mít téma a typ pro hledání alternativ
  }, [currentFileInfo, currentTopic]);

  // Zkontroluj dostupnost alternativních hlasů
  const availableVoices = useMemo(() => {
    if (!hasVariants || !currentFileInfo || !currentTopic) {
      return { male: false, female: false };
    }

    const voices = { male: false, female: false };

    // Zkontroluj aktuální hlas
    if (currentFileInfo.gender === 'male') {
      voices.male = true;
    } else if (currentFileInfo.gender === 'female') {
      voices.female = true;
    }

    // Zkontroluj dostupnost alternativního hlasu
    const alternativeVoice = currentFileInfo.gender === 'male' ? 'female' : 'male';
    const alternativeFileName = buildAlternativeFileName(alternativeVoice, currentFileInfo, currentTopic);

    // Sestav full path pro alternativní soubor
    const fullPath = currentAudioFile.includes('/')
      ? currentAudioFile.substring(0, currentAudioFile.lastIndexOf('/') + 1) + alternativeFileName
      : alternativeFileName;

    const alternativeFile = findAlternativeFile(fullPath, allFiles);
    voices[alternativeVoice] = !!alternativeFile;

    return voices;
  }, [hasVariants, currentFileInfo, currentTopic, currentAudioFile, allFiles, buildAlternativeFileName, findAlternativeFile]);

  // Funkce pro přepínání hlasů
  const handleVoiceChange = useCallback((voice) => {
    setSelectedVoice(voice);

    if (!currentFileInfo || !currentTopic) return null;

    const currentVoiceType = currentFileInfo.gender;
    if (currentVoiceType === voice) return null;

    const newFileName = buildAlternativeFileName(voice, currentFileInfo, currentTopic);

    // Sestav full path
    const fullPath = currentAudioFile.includes('/')
      ? currentAudioFile.substring(0, currentAudioFile.lastIndexOf('/') + 1) + newFileName
      : newFileName;

    const alternativeFile = findAlternativeFile(fullPath, allFiles);

    return alternativeFile?.audioSrc || alternativeFile?.fileName || null;
  }, [currentFileInfo, currentTopic, currentAudioFile, allFiles, buildAlternativeFileName, findAlternativeFile]);

  return {
    selectedVoice,
    currentVoice,
    hasVariants,
    availableVoices,
    handleVoiceChange,
    currentFileInfo
  };
};