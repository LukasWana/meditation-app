import { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { useFirebaseAudio } from './useFirebaseAudio';
import { useAudioContext } from './useAudioContext';
import { useAutoplay } from './useAutoplay';
import { useVoiceSwitcher } from './useVoiceSwitcher';
import { storage } from '@services/firebase';

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
    availableVoices,
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

  const fileName = useMemo(() => {
    const extracted = getFileNameFromUrl(currentAudioFile);
    if (!extracted && currentAudioFile) {
      console.warn('⚠️ useAudioPlayerLogic: Failed to extract file name from URL', {
        currentAudioFile
      });
    }
    return extracted;
  }, [currentAudioFile]);

  // Načtení URL z Firebase Storage
  const { audioUrl, loading: firebaseLoading, error: firebaseError, dataSource } = useFirebaseAudio(fileName);

  const [manualAudioUrl, setManualAudioUrl] = useState(null);
  const [manualDataSource, setManualDataSource] = useState(null);

  const mapUrlForDevProxy = useCallback((url) => {
    if (!url) return url;
    if (import.meta.env.DEV && url.startsWith('https://firebasestorage.googleapis.com')) {
      return url.replace('https://firebasestorage.googleapis.com', '/firebase-storage');
    }
    return url;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveFallbackUrl = async () => {
      if (audioUrl) {
        if (isMounted) {
          setManualAudioUrl(null);
          setManualDataSource(null);
        }
        return;
      }

      const fallbackDownloadUrl = typeof currentAudioFile === 'string' && currentAudioFile.startsWith('http')
        ? currentAudioFile
        : null;

      if (fileName) {
        try {
          const storageRef = ref(storage, fileName);
          const url = await getDownloadURL(storageRef);
          if (isMounted) {
            setManualAudioUrl(mapUrlForDevProxy(url));
            setManualDataSource('firebase');
            console.warn('⚠️ useAudioPlayerLogic: Resolved audio URL via manual getDownloadURL fallback', { fileName });
          }
          return;
        } catch (fallbackError) {
          console.error('❌ useAudioPlayerLogic: getDownloadURL fallback failed', {
            fileName,
            error: fallbackError
          });
        }
      }

      if (fallbackDownloadUrl && isMounted) {
        setManualAudioUrl(mapUrlForDevProxy(fallbackDownloadUrl));
        setManualDataSource('direct');
        console.warn('⚠️ useAudioPlayerLogic: Falling back to direct audio URL', {
          fallbackDownloadUrl
        });
      }
    };

    resolveFallbackUrl();

    return () => {
      isMounted = false;
    };
  }, [audioUrl, fileName, currentAudioFile, mapUrlForDevProxy]);

  const effectiveAudioUrl = mapUrlForDevProxy(audioUrl) || manualAudioUrl;
  const effectiveDataSource = audioUrl ? dataSource : (manualDataSource || dataSource);

  // AudioContext management
  const { audioContext, isAudioActivated } = useAudioContext(effectiveAudioUrl);

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
    audioUrl: effectiveAudioUrl,
    firebaseLoading,
    firebaseError,
    fileName,

    // Voice switching
    selectedVoice,
    currentVoice,
    hasVariants,
    availableVoices,
    handleVoiceChange: handleVoiceChangeWithUpdate,
    currentFileInfo,

    // Context
    audioContext,
    isAudioActivated,

    // File management
    currentAudioFile,
    setCurrentAudioFile,

    // Data source indicator
    dataSource: effectiveDataSource
  };
};
