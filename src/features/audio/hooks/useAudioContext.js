import { useEffect } from 'react';

export const useAudioContext = (audioUrl) => {
  // Automatická aktivace audio při načtení stránky a při změně skladby
  useEffect(() => {
    if (audioUrl) {
      try {
        // Použij globální AudioContext pokud existuje, jinak vytvoř nový
        let audioContext = window.globalAudioContext;
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          window.globalAudioContext = audioContext;
        }

        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            window.audioActivated = true;
          }).catch(() => {
            // Audio activation failed
          });
        } else {
          window.audioActivated = true;
        }
      } catch {
        // Audio activation error
      }
    }
  }, [audioUrl]);

  return {
    audioContext: window.globalAudioContext,
    isAudioActivated: window.audioActivated
  };
};
