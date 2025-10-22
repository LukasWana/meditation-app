/**
 * Hook pro synchronizaci stavu audio elementu s React state
 */
import { useEffect } from 'react';
import log from '@services/logger';

export const useAudioStateSync = (
  audioRef,
  audioUrl,
  audioState,
  setAudioState,
  playbackState,
  setPlaybackState,
  albumTracks,
  currentTrackIndex,
  onTrackChange
) => {
  // Sleduj změnu audioUrl a zachovej stav přehrávání
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      log.audio('🎵 Audio URL effect: skipping - no audio element or audioUrl:', {
        hasAudio: !!audio,
        audioUrl
      });
      return;
    }

    log.audio('🎵 Audio URL changed:', audioUrl);

    // Vyčisti audio element před načtením nového souboru
    log.audio('🎵 Cleaning up audio element before loading new source');
    log.audio('🎵 Audio element state before cleanup:', {
      readyState: audio.readyState,
      networkState: audio.networkState,
      paused: audio.paused,
      currentTime: audio.currentTime,
      ended: audio.ended
    });

    // Reset audio element
    audio.load();

    // Ulož aktuální stav přehrávání před změnou zdroje
    const wasPlaying = audioState.isPlaying;
    setPlaybackState(prev => ({ ...prev, wasPlayingBeforeSwitch: wasPlaying }));

    // Zastav všechny fade operace
    // (fade operace jsou nyní v useFadeEffects hooku)

    // Nastav nový src
    audio.src = audioUrl;
    audio.load();

    // Pokud byl přehrávač aktivní před změnou, označ pro autoplay
    if (wasPlaying) {
      setPlaybackState(prev => ({ ...prev, shouldAutoplay: true }));
      log.audio('🎵 Audio was playing before switch, autoplay enabled');
    }

    // Přidej event listenery pro nový audio element
    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      if (duration && isFinite(duration) && duration > 0) {
        setPlaybackState(prev => ({
          ...prev,
          duration: duration,
          durationStable: true,
          isLoading: false
        }));
        log.audio(`🎵 Duration loaded: ${duration}s`);
      } else {
        log.audio(`Invalid duration from audio element: ${audio.duration}`);
      }
    };

    const handleLoadedData = () => {
      setPlaybackState(prev => ({ ...prev, isLoading: false }));
      log.audio('🎵 Audio loaded and ready to play');
    };

    const handleCanPlay = () => {
      setPlaybackState(prev => ({ ...prev, isLoading: false }));
      log.audio('🎵 Audio can play');
    };

    const handleError = (event) => {
      setPlaybackState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: event.error?.message || 'Audio loading failed'
      }));
      log.error('🎵 Audio error:', event.error);
    };

    const handlePlay = () => {
      setAudioState(prev => ({ ...prev, isPlaying: true }));
      log.audio('🎵 Audio started playing');
    };

    const handlePause = () => {
      setAudioState(prev => ({ ...prev, isPlaying: false }));
      log.audio('🎵 Audio paused');
    };

    const handleEnded = () => {
      setAudioState(prev => ({ ...prev, isPlaying: false }));
      log.audio('🎵 Audio ended');

      // Pokud je to album, přejdi na další track
      if (albumTracks && albumTracks.length > 1 && currentTrackIndex < albumTracks.length - 1) {
        const nextIndex = currentTrackIndex + 1;
        log.audio(`🎵 Auto-advancing to next track: ${nextIndex}`);
        if (onTrackChange) {
          onTrackChange(nextIndex);
        }
      }
    };

    const updateTime = () => {
      if (audio.currentTime !== undefined) {
        setPlaybackState(prev => ({ ...prev, currentTime: audio.currentTime }));
      }
    };

    // Přidej event listenery
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', updateTime);

    // Cleanup funkce
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', updateTime);
    };
  }, [audioUrl, audioState.isPlaying, albumTracks, currentTrackIndex, onTrackChange]);

  return {
    // Hook nepotřebuje returnovat nic specifického
  };
};
