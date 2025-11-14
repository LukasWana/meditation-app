import { useEffect } from 'react';

export const useAudioContext = (audioUrl) => {
  // Automatická aktivace audio při načtení stránky a při změně skladby
  useEffect(() => {
    if (audioUrl) {
      // Debug logy deaktivovány - příliš mnoho výpisů
      // const DEBUG_AUDIO_CONTEXT = false;
      // if (DEBUG_AUDIO_CONTEXT) console.log('🎵 Activating audio for new track...');

      try {
        // Použij globální AudioContext pokud existuje, jinak vytvoř nový
        let audioContext = window.globalAudioContext;
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          window.globalAudioContext = audioContext;
        }

        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            // if (DEBUG_AUDIO_CONTEXT) console.log('🎵 Audio activated for new track!');
            window.audioActivated = true;
          }).catch(() => {
            // if (DEBUG_AUDIO_CONTEXT) console.log('🎵 Audio activation failed for new track');
          });
        } else {
          // if (DEBUG_AUDIO_CONTEXT) console.log('🎵 Audio already active for new track');
          window.audioActivated = true;
        }
      } catch {
        // if (DEBUG_AUDIO_CONTEXT) console.log('🎵 Audio activation error for new track');
      }
    }
  }, [audioUrl]);

  return {
    audioContext: window.globalAudioContext,
    isAudioActivated: window.audioActivated
  };
};
