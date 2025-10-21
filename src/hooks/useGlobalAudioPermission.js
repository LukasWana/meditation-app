import { useState, useCallback, useRef, useEffect } from 'react';
import log from '@services/logger';

export const useGlobalAudioPermission = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [showPermissionOverlay, setShowPermissionOverlay] = useState(false);
  const [hasShownOverlay, setHasShownOverlay] = useState(false);
  const audioContextRef = useRef(null);

  // Inicializuj AudioContext
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        log.audio('🎵 Global AudioContext initialized');
      } catch (error) {
        log.error('Failed to initialize global AudioContext:', error);
      }
    }
    return audioContextRef.current;
  }, []);

  // Požádej o povolení audia
  const requestAudioPermission = useCallback(async () => {
    try {
      log.audio('🎵 Requesting global audio permission...');

      // Inicializuj AudioContext
      const audioContext = initializeAudioContext();

      if (!audioContext) {
        throw new Error('Failed to create AudioContext');
      }

      // Pokud je AudioContext suspended, resume ho
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        log.audio('🎵 Global AudioContext resumed');
      }

      // Zkus přehrát tichý zvuk pro aktivaci
      const dummyAudio = new Audio();
      dummyAudio.volume = 0.01;
      dummyAudio.preload = 'none';

      // Vytvoř tichý buffer
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);

      // Zkus přehrát dummy audio
      try {
        await dummyAudio.play();
        log.audio('🎵 Dummy audio played successfully');
      } catch (playError) {
        log.audio('🎵 Dummy audio play failed (expected):', playError.message);
      }

      setIsAudioEnabled(true);
      setShowPermissionOverlay(false);
      log.audio('✅ Global audio permission granted');
      return true;

    } catch (error) {
      log.error('Failed to request global audio permission:', error);
      // I při chybě zavři overlay - uživatel může zkusit znovu
      setShowPermissionOverlay(false);
      return false;
    }
  }, [initializeAudioContext]);

  // Zobraz overlay při prvním user interaction
  const showPermissionRequest = useCallback(() => {
    if (!isAudioEnabled && !hasShownOverlay) {
      setShowPermissionOverlay(true);
      setHasShownOverlay(true);
      log.audio('🎵 Showing audio permission overlay');
    }
  }, [isAudioEnabled, hasShownOverlay]);

  // Zavři overlay
  const closePermissionOverlay = useCallback(() => {
    setShowPermissionOverlay(false);
    log.audio('🎵 Audio permission overlay closed');
  }, []);

  // Automaticky požádej o povolení při prvním user interaction
  useEffect(() => {
    // Zobraz overlay hned při načtení stránky, pokud audio není povolené a ještě se nezobrazil
    if (!isAudioEnabled && !hasShownOverlay) {
      setShowPermissionOverlay(true);
      setHasShownOverlay(true);
      log.audio('🎵 Showing audio permission overlay on page load');
    }
  }, [isAudioEnabled, hasShownOverlay]);

  // Vyčisti AudioContext při unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    isAudioEnabled,
    showPermissionOverlay,
    requestAudioPermission,
    showPermissionRequest,
    closePermissionOverlay,
    audioContext: audioContextRef.current
  };
};
