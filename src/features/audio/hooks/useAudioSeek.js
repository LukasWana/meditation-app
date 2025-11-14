import { useEffect, useCallback } from 'react';
import log from '@services/logger';

/**
 * Hook pro správu seekování a time updates
 * Spravuje aktuální čas přehrávání a seek operace
 */
export const useAudioSeek = (audioRef, playbackState, setPlaybackState) => {
  // Aktualizuj čas přehrávání
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (audio.currentTime !== undefined) {
        setPlaybackState(prev => ({ ...prev, currentTime: audio.currentTime }));
      }
    };

    audio.addEventListener('timeupdate', updateTime);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
    };
  }, [audioRef, setPlaybackState]);

  // Seek funkce
  const handleSeek = useCallback((newTime) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) {
      log.warn('Cannot seek: audio not ready');
      return;
    }

    const clampedTime = Math.max(0, Math.min(newTime, audio.duration));
    audio.currentTime = clampedTime;
    setPlaybackState(prev => ({ ...prev, currentTime: clampedTime }));
    log.audio(`Seeked to ${clampedTime.toFixed(2)}s`);
  }, [audioRef, setPlaybackState]);

  // Skip backward
  const skipBackward = useCallback((seconds = 10) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(0, audio.currentTime - seconds);
    audio.currentTime = newTime;
    setPlaybackState(prev => ({ ...prev, currentTime: newTime }));
    log.audio(`Skipped backward ${seconds}s to ${newTime.toFixed(2)}s`);
  }, [audioRef, setPlaybackState]);

  // Skip forward
  const skipForward = useCallback((seconds = 10) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    const newTime = Math.min(audio.duration, audio.currentTime + seconds);
    audio.currentTime = newTime;
    setPlaybackState(prev => ({ ...prev, currentTime: newTime }));
    log.audio(`Skipped forward ${seconds}s to ${newTime.toFixed(2)}s`);
  }, [audioRef, setPlaybackState]);

  // Format time helper
  const formatTime = useCallback((seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    handleSeek,
    skipBackward,
    skipForward,
    formatTime
  };
};

