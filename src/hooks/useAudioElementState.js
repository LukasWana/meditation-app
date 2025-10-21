/**
 * Hook pro správu stavu audio elementu
 */
import { useEffect } from 'react';
import log from '@services/logger';

export const useAudioElementState = (audioRef, audioUrl) => {
  /**
   * Oprava stavu audio elementu po načtení - zajistí že je audio připravené k přehrávání
   * @param {HTMLAudioElement} audio - Audio element
   * @returns {Promise} - Promise, který se vyřeší když je audio připravené
   */
  const fixAudioElementState = (audio) => {
    if (!audio) return Promise.resolve();

    return new Promise((resolve, reject) => {
      // Přidej event listener pro loadeddata (když je audio připravené k přehrávání)
      const handleLoadedData = () => {
        log.audio('🎵 Audio element state fixed after load');
        resolve();
      };

      // Přidej event listener pro error handling
      const handleError = (event) => {
        log.error('🎵 Audio element error:', event.error);
        reject(event.error);
      };

      // Přidej event listener pro canplay (když je audio připravené k přehrávání)
      const handleCanPlay = () => {
        log.audio('🎵 Audio element state fixed after canplay');
        resolve();
      };

      audio.addEventListener('loadeddata', handleLoadedData);
      audio.addEventListener('error', handleError);
      audio.addEventListener('canplay', handleCanPlay);

      // Cleanup funkce
      const cleanup = () => {
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
      };

      // Timeout pro cleanup
      setTimeout(() => {
        cleanup();
        resolve();
      }, 5000);
    });
  };

  /**
   * Sleduj změnu audioUrl a zachovej stav přehrávání
   */
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

    // Oprava stavu po načtení
    fixAudioElementState(audio).then(() => {
      log.audio('🎵 Audio element state fixed after URL change');
    }).catch((error) => {
      log.error('🎵 Failed to fix audio element state:', error);
    });

  }, [audioUrl, audioRef]);

  return {
    fixAudioElementState
  };
};
