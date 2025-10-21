import { useState, useRef, useCallback } from 'react';
import { useAudioContextManager } from './useAudioContextManager';

/**
 * Hook pro audio playback logiku
 * Obsahuje základní funkce pro přehrávání, pause, seek atd.
 */
export const useAudioPlayback = (audioUrl) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [durationStable, setDurationStable] = useState(false);

  const audioRef = useRef(null);
  const { activateAudioContext } = useAudioContextManager();

  // Formátování času
  const formatTime = useCallback((time) => {
    if (!time || !isFinite(time)) return '0:00';

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Hlavní funkce pro přehrávání
  const playAudio = useCallback(async () => {
    if (!audioRef.current || !audioUrl) return;

    try {
      // Aktivuj AudioContext
      await activateAudioContext();

      // Pokud je audio v špatném stavu, reloaduj ho
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
  }, [audioUrl, activateAudioContext]);

  // Pause funkce
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

  // Seek funkce
  const handleSeek = useCallback((newTime) => {
    if (audioRef.current && duration > 0) {
      const clampedTime = Math.max(0, Math.min(newTime, duration));
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
      setProgress((clampedTime / duration) * 100);
    }
  }, [duration]);

  // Skip funkce
  const skipBackward = useCallback(() => {
    handleSeek(Math.max(0, currentTime - 10));
  }, [currentTime, handleSeek]);

  const skipForward = useCallback(() => {
    handleSeek(Math.min(duration, currentTime + 10));
  }, [currentTime, duration, handleSeek]);

  // Fade out efekt
  const fadeOutAndClose = useCallback((onClose, duration = 3000) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const startVolume = audio.volume;
    const fadeTime = duration;
    const fadeSteps = 20;
    const stepTime = fadeTime / fadeSteps;
    const volumeStep = startVolume / fadeSteps;

    let currentStep = 0;
    const fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(0, startVolume - (volumeStep * currentStep));

      if (currentStep >= fadeSteps) {
        clearInterval(fadeInterval);
        audio.pause();
        audio.volume = startVolume; // Obnov původní hlasitost
        onClose();
      }
    }, stepTime);
  }, []);

  // Event handlery
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      if (duration > 0) {
        setProgress((time / duration) * 100);
      }
    }
  }, [duration]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const newDuration = audioRef.current.duration;
      setDuration(newDuration);
      setDurationStable(true);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
  }, []);

  return {
    // Refs
    audioRef,

    // State
    isPlaying,
    currentTime,
    duration,
    progress,
    durationStable,

    // Functions
    playAudio,
    pauseAudio,
    togglePlayPause,
    handleSeek,
    skipBackward,
    skipForward,
    fadeOutAndClose,
    formatTime,

    // Event handlers
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded
  };
};
