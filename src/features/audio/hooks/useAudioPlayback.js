import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioContextManager } from './useAudioContextManager';
import { useOfflineAudio } from './useOfflineAudio';
import { fastMetadataService } from '@services/fastMetadataService';
import cacheService from '@services/cacheServiceRefactored';
import log from '@services/logger';

export const useAudioPlayback = (audioUrl) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [durationStable, setDurationStable] = useState(false);

  // Resolvni offline URL
  const { resolvedUrl, isLoadingFromCache } = useOfflineAudio(audioUrl);

  const audioRef = useRef(null);
  const { activateAudioContext } = useAudioContextManager();

  // Helper funkce pro extrakci názvu souboru z URL
  const extractFileNameFromUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return null;
    if (!url.startsWith('http')) return url;
    try {
      const match = url.match(/\/o\/([^?]+)/);
      if (match) return decodeURIComponent(match[1]);
      return new URL(url).pathname.substring(1);
    } catch (e) { return url; }
  }, []);

  // Format time helper
  const formatTime = useCallback((time) => {
    if (!time || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Play audio function
  const playAudio = useCallback(async () => {
    const urlToPlay = resolvedUrl || audioUrl;
    if (!audioRef.current || !urlToPlay) return;

    try {
      await activateAudioContext();

      if (audioRef.current.readyState < 2) {
        audioRef.current.load();
        await new Promise((resolve) => {
          audioRef.current.addEventListener('canplay', resolve, { once: true });
        });
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, [audioUrl, resolvedUrl, activateAudioContext]);

  // Pause audio function
  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      await playAudio();
    }
  }, [isPlaying, playAudio, pauseAudio]);

  // Seek handler
  const handleSeek = useCallback((e) => {
    if (!audioRef.current || !duration) return;
    const seekTime = (e.nativeEvent.offsetX / e.target.offsetWidth) * duration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    setProgress((seekTime / duration) * 100);
  }, [duration]);

  // Skip backward
  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  }, []);

  // Skip forward
  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
    }
  }, [duration]);

  // Inicializace duration z metadata služby nebo cache
  useEffect(() => {
    if (!audioUrl) return;

    let durationFromMetadata = null;
    const fileName = extractFileNameFromUrl(audioUrl);

    if (fileName && fastMetadataService.isReady()) {
      const meta = fastMetadataService.getMetadata(fileName);
      if (meta && meta.duration) {
        durationFromMetadata = meta.duration;
      }
    }

    const cachedDuration = cacheService.getDuration(audioUrl);
    const initialDuration = durationFromMetadata || cachedDuration || 0;

    if (initialDuration > 0) {
      setDuration(initialDuration);
      setDurationStable(true);
    } else {
      setDuration(0);
      setDurationStable(false);
    }
  }, [audioUrl, extractFileNameFromUrl]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (duration > 0) {
        setProgress((audio.currentTime / duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setDurationStable(true);
        if (audioUrl) {
          cacheService.setDuration(audioUrl, audio.duration);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setProgress(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [duration, audioUrl]);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    durationStable,
    progress,
    togglePlayPause,
    skipBackward,
    skipForward,
    handleSeek,
    formatTime,
    playAudio,
    pauseAudio,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setProgress,
    setDurationStable,
    resolvedUrl,
    isLoadingFromCache
  };
};
