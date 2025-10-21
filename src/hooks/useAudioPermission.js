import { useState, useCallback, useRef, useEffect } from 'react';
import log from '@services/logger';

export const useAudioPermission = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isPermissionRequested, setIsPermissionRequested] = useState(false);
  const audioContextRef = useRef(null);
  const dummyAudioRef = useRef(null);

  // Inicializuj AudioContext při prvním použití
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        log.audio('🎵 AudioContext initialized');
      } catch (error) {
        log.error('Failed to initialize AudioContext:', error);
      }
    }
  }, []);

  // Vytvoř dummy audio element pro testování povolení
  const createDummyAudio = useCallback(() => {
    if (!dummyAudioRef.current && audioContextRef.current) {
      dummyAudioRef.current = new Audio();
      dummyAudioRef.current.volume = 0.01; // Velmi tichý
      dummyAudioRef.current.preload = 'none';

      try {
        // Vytvoř tichý audio buffer
        const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
      } catch (error) {
        log.error('Error creating dummy audio buffer:', error);
      }
    }
  }, []);

  // Požádej o povolení audia po user interaction
  const requestAudioPermission = useCallback(async () => {
    if (isAudioEnabled) {
      return true;
    }

    try {
      log.audio('🎵 Requesting audio permission...');
      setIsPermissionRequested(true);

      // Inicializuj AudioContext
      initializeAudioContext();

      // Pokud je AudioContext suspended, resume ho
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        log.audio('🎵 AudioContext resumed');
      }

      // Vytvoř a spusť dummy audio
      createDummyAudio();

      // Zkus přehrát tichý zvuk
      if (dummyAudioRef.current) {
        try {
          await dummyAudioRef.current.play();
          log.audio('🎵 Dummy audio played successfully');
        } catch (playError) {
          log.error('Failed to play dummy audio:', playError);
          // I když se nepodaří přehrát dummy audio, můžeme pokračovat
        }
      }

      setIsAudioEnabled(true);
      log.audio('🎵 Audio permission granted');
      return true;

    } catch (error) {
      log.error('Failed to request audio permission:', error);
      setIsAudioEnabled(false);
      return false;
    }
  }, [isAudioEnabled, initializeAudioContext, createDummyAudio]);

  // Automaticky požádej o povolení při prvním user interaction
  const handleUserInteraction = useCallback(async () => {
    log.audio('🎵 handleUserInteraction called', { isPermissionRequested, isAudioEnabled });
    if (!isPermissionRequested && !isAudioEnabled) {
      log.audio('🎵 User interaction detected, requesting audio permission...');
      await requestAudioPermission();
    } else {
      log.audio('🎵 Audio permission already requested or enabled');
    }
  }, [isPermissionRequested, isAudioEnabled, requestAudioPermission]);

  // Přidej event listenery pro user interaction
  useEffect(() => {
    if (!isPermissionRequested && !isAudioEnabled) {
      const events = ['click', 'touchstart', 'keydown'];

      const handleInteraction = () => {
        handleUserInteraction();
      };

      events.forEach(event => {
        document.addEventListener(event, handleInteraction, { once: true, passive: true });
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleInteraction);
        });
      };
    }
  }, [isPermissionRequested, isAudioEnabled, handleUserInteraction]);

  // Vyčisti AudioContext při unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (dummyAudioRef.current) {
        dummyAudioRef.current = null;
      }
    };
  }, []);

  return {
    isAudioEnabled,
    isPermissionRequested,
    requestAudioPermission,
    handleUserInteraction,
    audioContext: audioContextRef.current
  };
};
