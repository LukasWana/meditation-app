import { useState, useRef, useEffect } from 'react';
import cacheService from '@services/cacheService';
import { log } from '@services/logger';

export const useAudioPlayer = (audioUrl, albumTracks = null, currentTrackIndex = 0, onTrackChange = null) => {
  log.audio('useAudioPlayer called with audioUrl:', audioUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [wasPlayingBeforeSwitch, setWasPlayingBeforeSwitch] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true); // Auto-play při prvním načtení
  const audioRef = useRef(null);
  const fadeTimeoutRef = useRef(null);
  const fadeOutIntervalRef = useRef(null);
  const fadeInIntervalRef = useRef(null);

  // Sleduj změnu audioUrl a zachovej stav přehrávání
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // Ulož aktuální stav přehrávání před změnou zdroje
    const wasPlaying = isPlaying;
    setWasPlayingBeforeSwitch(wasPlaying);

    // Resetuj stav pro nový soubor
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);

    // Načti délku při načítání metadata
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        log.audio(`Duration loaded: ${audio.duration}s`);

        // Ulož délku do cache pro budoucí použití
        if (audioUrl) {
          cacheService.setDuration(audioUrl, audio.duration);
        }
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    log.audio('Audio source changed, was playing:', wasPlaying);

    // Cleanup event listener
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      const audioDuration = audio.duration;
      setDuration(audioDuration);
      setIsLoading(false);

      // Ulož duration do cache
      if (audioDuration && audioUrl) {
        cacheService.setDuration(audioUrl, audioDuration);
      }

      // Auto-play při prvním načtení nebo po změně zdroje
      if (shouldAutoPlay || wasPlayingBeforeSwitch) {
        log.audio('Auto-playing:', shouldAutoPlay ? 'first load' : 'source change');
        audio.play().then(() => {
          setIsPlaying(true);
          setShouldAutoPlay(false); // Reset po prvním auto-play
          setWasPlayingBeforeSwitch(false);
          fadeIn(audio, 1000); // Fade in při auto-play
        }).catch((error) => {
          log.error('Failed to auto-play:', error);
          setIsPlaying(false);
          setShouldAutoPlay(false);
          setWasPlayingBeforeSwitch(false);
        });
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);

      // Automatické přehrávání další skladby v albu
      if (albumTracks && albumTracks.length > 1 && onTrackChange) {
        const nextIndex = (currentTrackIndex + 1) % albumTracks.length;
        onTrackChange(nextIndex);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);

      // Cleanup fade timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }

      // Cleanup fade intervals
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current);
        fadeOutIntervalRef.current = null;
      }
      if (fadeInIntervalRef.current) {
        clearInterval(fadeInIntervalRef.current);
        fadeInIntervalRef.current = null;
      }
    };
  }, [wasPlayingBeforeSwitch, shouldAutoPlay]);

  // Nastav shouldAutoPlay na true když se změní currentTrackIndex (pro album přehrávání)
  useEffect(() => {
    if (albumTracks && albumTracks.length > 1) {
      setShouldAutoPlay(true);
    }
  }, [currentTrackIndex, albumTracks]);

  // Fade out funkce
  const fadeOut = (audio, duration = 1000, callback) => {
    if (!audio) return;

    // Vyčisti předchozí fade interval pokud existuje
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
    }

    const startVolume = audio.volume;
    const fadeStep = duration > 50 ? startVolume / (duration / 50) : startVolume / 10; // Ochrana proti division by zero
    let currentVolume = startVolume;

    fadeOutIntervalRef.current = setInterval(() => {
      currentVolume -= fadeStep;
      if (currentVolume <= 0) {
        currentVolume = 0;
        audio.volume = currentVolume;
        audio.pause();
        audio.volume = startVolume; // Obnov původní hlasitost
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;
        }
        if (callback) callback();
      } else {
        audio.volume = currentVolume;
      }
    }, 50);

    return fadeOutIntervalRef.current;
  };

  // Fade in funkce
  const fadeIn = (audio, duration = 1000) => {
    if (!audio) return;

    // Vyčisti předchozí fade interval pokud existuje
    if (fadeInIntervalRef.current) {
      clearInterval(fadeInIntervalRef.current);
    }

    audio.volume = 0;
    const fadeStep = duration > 50 ? 1 / (duration / 50) : 1 / 10; // Ochrana proti division by zero
    let currentVolume = 0;

    fadeInIntervalRef.current = setInterval(() => {
      currentVolume += fadeStep;
      if (currentVolume >= 1) {
        currentVolume = 1;
        audio.volume = currentVolume;
        if (fadeInIntervalRef.current) {
          clearInterval(fadeInIntervalRef.current);
          fadeInIntervalRef.current = null;
        }
      } else {
        audio.volume = currentVolume;
      }
    }, 50);

    return fadeInIntervalRef.current;
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Fade out při zastavení
      fadeOut(audio, 1000, () => {
        setIsPlaying(false);
      });
    } else {
      // Fade in při spuštění
      audio.play().then(() => {
        setIsPlaying(true);
        fadeIn(audio, 1000);
      });
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio || !duration || isNaN(duration) || duration <= 0) return;

    const currentAudioTime = audio.currentTime;
    const newTime = Math.max(0, currentAudioTime - 10);

    log.audio('Skip backward:', { currentAudioTime, newTime, duration });

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

    log.audio('Skip forward:', { currentAudioTime, newTime, duration });

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
      // Fade out, změň pozici, fade in
      const wasPlaying = isPlaying;

      if (wasPlaying) {
        fadeOut(audio, 300, () => {
          audio.currentTime = newTime;
          setCurrentTime(newTime);
          if (wasPlaying) {
            audio.play().then(() => {
              fadeIn(audio, 300);
            });
          }
        });
      } else {
        audio.currentTime = newTime;
        setCurrentTime(newTime);
      }
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Funkce pro fade out při zavření přehrávače
  const fadeOutAndClose = (onClose, duration = 3000) => {
    const audio = audioRef.current;

    // Zavři přehrávač okamžitě
    onClose();

    // Pokud je audio a přehrává se, spusť fade out na pozadí
    if (audio && isPlaying) {
      fadeOut(audio, duration, () => {
        // Po dokončení fade out nic nedělej - přehrávač už je zavřený
        log.audio('Background fade out completed');
      });
    }
  };

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
    formatTime,
    fadeOutAndClose
  };
};
