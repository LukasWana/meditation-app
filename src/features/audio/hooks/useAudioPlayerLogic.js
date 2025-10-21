import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirebaseAudio } from './useFirebaseAudio';
import { useAudioContext } from './useAudioContext';
import { useAutoplay } from './useAutoplay';
import { useVoiceSwitcher } from './useVoiceSwitcher';
export const useAudioPlayerLogic = ({
  audioSrc,
  albumTracks,
  currentTrackIndex,
  onTrackChange,
  allFiles,
  autoplayEnabled
}) => {
  const [currentAudioFile, setCurrentAudioFile] = useState(audioSrc);

  // Voice switcher hook
  const {
    selectedVoice,
    currentVoice,
    hasVariants,
    handleVoiceChange,
    currentFileInfo
  } = useVoiceSwitcher(currentAudioFile, allFiles);

  // Pokud máme album tracks, použij aktuální track
  const actualAudioSrc = useMemo(() => {
    if (albumTracks && albumTracks.length > 0 && currentTrackIndex >= 0 && currentTrackIndex < albumTracks.length) {
      return albumTracks[currentTrackIndex].audioSrc;
    }
    return audioSrc;
  }, [audioSrc, albumTracks, currentTrackIndex]);

  // Aktualizuj currentAudioFile když se změní audioSrc
  useEffect(() => {
    // console.log('AudioPlayer: actualAudioSrc changed:', actualAudioSrc);
    setCurrentAudioFile(actualAudioSrc);
  }, [actualAudioSrc]);

  // Extrahuj název souboru z URL nebo použij přímo název souboru
  const getFileNameFromUrl = useCallback((urlOrFileName) => {
    if (!urlOrFileName) return null;

    // Pokud je to už název souboru (ne URL), vrať ho
    if (!urlOrFileName.startsWith('http')) {
      return urlOrFileName;
    }

    // Pokud je to URL, extrahuj název souboru z Firebase Storage URL
    try {
      const url = new URL(urlOrFileName);
      const pathname = decodeURIComponent(url.pathname);
      // console.log('🔗 Parsing Firebase Storage URL:', { urlOrFileName, pathname });

      // Odstraň /o/ prefix a extrahuj cestu k souboru
      const match = pathname.match(/\/o\/(.+?)(?:\?|$)/);
      if (match) {
        const fileName = match[1];
        // console.log('🔗 Extracted fileName:', fileName);
        return fileName;
      }
    } catch (error) {
      console.warn('Failed to parse URL:', urlOrFileName, error);
    }

    // Pokud se nepodařilo extrahovat název souboru, vrať null místo celé URL
    console.error('Failed to extract fileName from URL:', urlOrFileName);
    return null;
  }, []);

  const fileName = useMemo(() => getFileNameFromUrl(currentAudioFile), [currentAudioFile, getFileNameFromUrl]);

  // Načtení URL z Firebase Storage
  const { audioUrl, loading: firebaseLoading, error: firebaseError } = useFirebaseAudio(fileName);

  // AudioContext management
  const { audioContext, isAudioActivated } = useAudioContext(audioUrl);

  // Debug logy pro audio URL
  useEffect(() => {
    // if (audioUrl) {
    //   console.log('🎵 Audio URL loaded:', audioUrl);
    // } else if (firebaseError) {
    //   console.log('🎵 Audio URL error:', firebaseError);
    // }
  }, [audioUrl, firebaseError]);

  // console.log('AudioPlayer debug:', {
  //   audioSrc,
  //   currentAudioFile,
  //   hasVariants,
  //   currentVoice,
  //   selectedVoice
  // });

  // Wrapper pro handleVoiceChange, který aktualizuje currentAudioFile
  const handleVoiceChangeWithUpdate = useCallback((voice) => {
    const newAudioSrc = handleVoiceChange(voice);
    if (newAudioSrc) {
      // console.log('Switching to new audio source:', newAudioSrc);
      setCurrentAudioFile(newAudioSrc);
    }
  }, [handleVoiceChange, setCurrentAudioFile]);

  return {
    // Audio data
    audioUrl,
    firebaseLoading,
    firebaseError,
    fileName,

    // Voice switching
    selectedVoice,
    currentVoice,
    hasVariants,
    handleVoiceChange: handleVoiceChangeWithUpdate,
    currentFileInfo,

    // Context
    audioContext,
    isAudioActivated,

    // File management
    currentAudioFile,
    setCurrentAudioFile
  };
};
