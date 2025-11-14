import { useState } from 'react';

/**
 * Hook pro správu audio stavu
 * Spravuje základní stavy přehrávání a interakce
 */
export const useAudioState = () => {
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    isActivated: false,
    hasInteracted: false,
    userPaused: false
  });

  const [playbackState, setPlaybackState] = useState({
    currentTime: 0,
    duration: 0,
    isLoading: true,
    shouldAutoplay: false,
    wasPlayingBeforeSwitch: false,
    hasError: false,
    errorMessage: null,
    durationStable: false
  });

  return {
    audioState,
    setAudioState,
    playbackState,
    setPlaybackState
  };
};

