import { useRef, useCallback } from 'react';
import log from '@services/logger';

/**
 * Hook pro správu fade in/out efektů
 * Spravuje fade operace pro plynulé přechody
 */
export const useAudioFade = () => {
  const fadeTimeoutRef = useRef(null);
  const fadeOutIntervalRef = useRef(null);

  // Fade out funkce
  const fadeOut = useCallback((audio, duration = 1000, callback) => {
    if (!audio) return;

    log.audio(`🎵 Starting fadeOut with duration: ${duration}ms`);
    try {
      // Vyčisti předchozí fade interval pokud existuje
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current);
      }

      const startVolume = audio.volume;
      const fadeStep = duration > 50 ? startVolume / (duration / 50) : startVolume / 10;
      let currentVolume = startVolume;

      fadeOutIntervalRef.current = setInterval(() => {
        try {
          currentVolume -= fadeStep;
          if (currentVolume <= 0) {
            currentVolume = 0;
            audio.volume = currentVolume;
            log.audio('🎵 FadeOut completed, pausing audio');
            audio.pause();
            log.audio('🎵 Audio paused after fadeOut');
            audio.volume = startVolume; // Obnov původní hlasitost
            if (fadeOutIntervalRef.current) {
              clearInterval(fadeOutIntervalRef.current);
              fadeOutIntervalRef.current = null;
            }
            if (callback) callback();
          } else {
            audio.volume = currentVolume;
          }
        } catch (error) {
          log.error('Error in fadeOut interval:', error);
          if (fadeOutIntervalRef.current) {
            clearInterval(fadeOutIntervalRef.current);
            fadeOutIntervalRef.current = null;
          }
        }
      }, 50);

      return fadeOutIntervalRef.current;
    } catch (error) {
      log.error('Error in fadeOut:', error);
      if (callback) callback();
    }
  }, []);

  // Fade out and close funkce
  const fadeOutAndClose = useCallback((onClose, fadeDuration = 3000) => {
    return (callback) => {
      const audio = document.querySelector('audio');
      if (audio) {
        fadeOut(audio, fadeDuration, () => {
          if (onClose) {
            onClose();
          }
          if (callback) {
            callback();
          }
          log.audio('Background fade out completed');
        });
      } else {
        if (onClose) {
          onClose();
        }
        if (callback) {
          callback();
        }
      }
    };
  }, [fadeOut]);

  // Cleanup funkce
  const cleanup = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }
  }, []);

  return {
    fadeOut,
    fadeOutAndClose,
    cleanup,
    fadeTimeoutRef,
    fadeOutIntervalRef
  };
};

