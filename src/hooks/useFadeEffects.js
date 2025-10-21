/**
 * Hook pro fade efekty v audio přehrávači
 */
import { useRef } from 'react';
import log from '@services/logger';

export const useFadeEffects = (audioRef) => {
  const fadeTimeoutRef = useRef(null);
  const fadeOutIntervalRef = useRef(null);
  const fadeInIntervalRef = useRef(null);

  /**
   * Fade out efekt pro audio
   * @param {HTMLAudioElement} audio - Audio element
   * @param {number} duration - Délka fade out v ms
   * @param {Function} callback - Callback po dokončení
   */
  const fadeOut = (audio, duration = 1000, callback) => {
    if (!audio) return;

    log.audio(`🎵 Starting fadeOut with duration: ${duration}ms`);
    try {
      // Vyčisti předchozí fade interval pokud existuje
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current);
      }

      const startVolume = audio.volume;
      const fadeStep = duration > 50 ? startVolume / (duration / 50) : startVolume / 10; // Ochrana proti division by zero
      let currentVolume = startVolume;

      fadeOutIntervalRef.current = setInterval(() => {
        try {
          currentVolume -= fadeStep;
          if (currentVolume <= 0) {
            currentVolume = 0;
            audio.volume = currentVolume;
            audio.pause();
            log.audio('🎵 FadeOut completed');
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
          if (callback) callback();
        }
      }, 50);

      return fadeOutIntervalRef.current;
    } catch (error) {
      log.error('Error in fadeOut:', error);
      if (callback) callback();
    }
  };

  /**
   * Fade out a zavření přehrávače
   * @param {Function} onClose - Funkce pro zavření
   * @param {number} duration - Délka fade out v ms
   */
  const fadeOutAndClose = (onClose, duration = 3000) => {
    const audio = audioRef.current;
    if (!audio) {
      if (onClose) onClose();
      return;
    }

    log.audio(`🎵 Starting fadeOutAndClose with duration: ${duration}ms`);

    // Nastav timeout pro automatické zavření
    fadeTimeoutRef.current = setTimeout(() => {
      log.audio('🎵 FadeOut timeout reached, closing player');
      if (onClose) onClose();
    }, duration);

    // Spusť fade out
    fadeOut(audio, duration, () => {
      log.audio('🎵 FadeOut completed, closing player');
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      if (onClose) onClose();
    });
  };

  /**
   * Vyčisti všechny fade efekty
   */
  const cleanup = () => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }
    if (fadeInIntervalRef.current) {
      clearInterval(fadeInIntervalRef.current);
      fadeInIntervalRef.current = null;
    }
  };

  return {
    fadeOut,
    fadeOutAndClose,
    cleanup
  };
};
