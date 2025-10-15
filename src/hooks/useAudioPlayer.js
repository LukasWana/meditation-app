import { useState, useRef, useEffect } from 'react';

export const useAudioPlayer = (audioSrc) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio || !duration || isNaN(duration) || duration <= 0) return;

    const currentAudioTime = audio.currentTime;
    const newTime = Math.max(0, currentAudioTime - 10);

    console.log('Skip backward:', { currentAudioTime, newTime, duration });

    if (isFinite(newTime) && newTime >= 0) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio || !duration || isNaN(duration) || duration <= 0) return;

    const currentAudioTime = audio.currentTime;
    const newTime = Math.min(duration, currentAudioTime + 10);

    console.log('Skip forward:', { currentAudioTime, newTime, duration });

    if (isFinite(newTime) && newTime >= 0) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeek = (progressValue) => {
    const audio = audioRef.current;
    if (!audio || !duration || isNaN(duration) || duration <= 0) return;

    // progressValue is already in percentage (0-100)
    const progress = Math.max(0, Math.min(1, progressValue / 100));
    const newTime = progress * duration;

    // Validate newTime is finite
    if (isFinite(newTime) && newTime >= 0) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    progress,
    togglePlayPause,
    skipBackward,
    skipForward,
    handleSeek,
    formatTime
  };
};
