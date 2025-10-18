import { useState, useRef, useEffect } from 'react';

/**
 * Zjednodušený audio player - pouze nutné funkce
 */
export const useAudioPlayerSimple = (audioUrl, albumTracks = null, currentTrackIndex = 0, onTrackChange = null) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef(null);

  // Sleduj změnu audioUrl
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // Resetuj stav pro nový soubor
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setIsPlaying(false);

    // Načti délku při načítání metadata
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioUrl]);

  // Základní event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      // Automatické přehrávání další skladby v albu
      if (albumTracks && albumTracks.length > 1 && onTrackChange) {
        const nextIndex = (currentTrackIndex + 1) % albumTracks.length;
        onTrackChange(nextIndex);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [albumTracks, currentTrackIndex, onTrackChange]);

  // Základní play/pause
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Failed to play:', error);
      });
    }
  };

  // Seek na konkrétní pozici
  const seekTo = (time) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    togglePlayPause,
    seekTo
  };
};

