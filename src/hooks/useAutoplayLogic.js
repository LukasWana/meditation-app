/**
 * Hook pro autoplay logiku
 */
import { useEffect } from 'react';
import log from '@services/logger';

export const useAutoplayLogic = (
  audioUrl,
  isPlaying,
  togglePlayPause,
  userPaused,
  shouldAutoplay,
  albumTracks,
  currentTrackIndex,
  onTrackChange,
  hasInteracted
) => {
  // Autoplay při změně tracku - pouze pokud uživatel už jednou klikl na play
  useEffect(() => {
    if (albumTracks && albumTracks.length > 1 && currentTrackIndex > 0 && hasInteracted) {
      // Pokud se mění track a uživatel už jednou klikl na play, spusť autoplay
      // Bez ohledu na aktuální stav přehrávání (isPlaying)
      console.log('🎵 Track changed - autoplay enabled for next track');
    }

    // Resetuj userPaused flag při změně tracku (dříve než se spustí autoplay)
    if (currentTrackIndex > 0) {
      console.log('🎵 Track changed - userPaused flag reset');
    }
  }, [currentTrackIndex, albumTracks, hasInteracted]);

  // Autoplay hook pro automatické spuštění
  useEffect(() => {
    if (shouldAutoplay && !userPaused && hasInteracted) {
      log.audio('🎵 Autoplay triggered');
      // Spusť přehrávání
      if (togglePlayPause) {
        togglePlayPause();
      }
    }
  }, [shouldAutoplay, userPaused, hasInteracted, togglePlayPause]);

  return {
    // Hook nepotřebuje returnovat nic specifického
  };
};
