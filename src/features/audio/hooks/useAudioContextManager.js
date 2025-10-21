import { useRef, useEffect } from 'react';

/**
 * Hook pro správu AudioContext
 * Centralizuje logiku pro vytváření a aktivaci AudioContext
 */
export const useAudioContextManager = () => {
  const audioContextRef = useRef(null);

  // Vytvoř nebo získej existující AudioContext
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Aktivuj AudioContext
  const activateAudioContext = async () => {
    try {
      const audioContext = getAudioContext();

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      return audioContext;
    } catch (error) {
      console.error('Failed to activate AudioContext:', error);
      return null;
    }
  };

  // Zkontroluj, jestli je AudioContext aktivní
  const isAudioContextActive = () => {
    return audioContextRef.current && audioContextRef.current.state === 'running';
  };

  // Cleanup při unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    getAudioContext,
    activateAudioContext,
    isAudioContextActive
  };
};
