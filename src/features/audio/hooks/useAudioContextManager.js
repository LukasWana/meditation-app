import { useRef, useCallback } from 'react';
import log from '@services/logger';

export const useAudioContextManager = () => {
  const audioContextRef = useRef(null);
  const hasInteractedRef = useRef(false);

  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      log.audio('🎵 AudioContext initialized');
    }
    return audioContextRef.current;
  }, []);

  const activateAudioContext = useCallback(async () => {
    const audioContext = initializeAudioContext();
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
        log.audio('🎵 AudioContext resumed');
        hasInteractedRef.current = true;
      } catch (error) {
        log.error('❌ Failed to resume AudioContext:', error);
        throw error;
      }
    } else if (audioContext.state === 'running') {
      log.audio('🎵 AudioContext is already running');
      hasInteractedRef.current = true;
    }
    return audioContext;
  }, [initializeAudioContext]);

  const getAudioContext = useCallback(() => {
    return audioContextRef.current;
  }, []);

  const hasUserInteracted = useCallback(() => {
    return hasInteractedRef.current;
  }, []);

  return {
    audioContext: audioContextRef.current,
    initializeAudioContext,
    activateAudioContext,
    getAudioContext,
    hasUserInteracted,
    hasInteracted: hasInteractedRef.current,
  };
};