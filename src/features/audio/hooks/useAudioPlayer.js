import { useState, useRef, useEffect } from 'react';
import cacheService from '@services/cacheServiceRefactored';
import log from '@services/logger';
import globalMetadataPreloader from '@services/globalMetadataPreloader';
import { useAudioContextManager } from './useAudioContextManager';
import { useAudioPlayback } from './useAudioPlayback';
import { extractFileNameFromUrl } from '@utils/audioUrlUtils';
import { useFadeEffects } from '@hooks/useFadeEffects';
import { useAudioElementState } from '@hooks/useAudioElementState';
import { useLegacyPlayback } from '@hooks/useLegacyPlayback';
import { useAutoplayLogic } from '@hooks/useAutoplayLogic';
import { useAudioStateSync } from '@hooks/useAudioStateSync';

export const useAudioPlayer = (audioUrl, albumTracks = null, currentTrackIndex = 0, onTrackChange = null, autoplayEnabled = true) => {

  // Use new modular hooks - nahrazují starý state management
  const { activateAudioContext } = useAudioContextManager();
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    durationStable,
    progress,
    togglePlayPause,
    skipBackward,
    skipForward,
    handleSeek,
    formatTime,
  } = useAudioPlayback(audioUrl);

  // Legacy state pro kompatibilitu s existujícím kódem
  const [audioState, setAudioState] = useState({
    isActivated: false,
    hasInteracted: false,
    userPaused: false,
    volume: 1
  });

  const [playbackState, setPlaybackState] = useState({
    isLoading: true,
    shouldAutoplay: false,
    wasPlayingBeforeSwitch: false,
    hasError: false,
    errorMessage: null
  });

  // Use new modular hooks
  const { fadeOut, fadeOutAndClose, cleanup: cleanupFadeEffects } = useFadeEffects(audioRef);
  const { fixAudioElementState } = useAudioElementState(audioRef, audioUrl);
  const { playAudio } = useLegacyPlayback(audioRef, audioUrl, audioState, setAudioState, setPlaybackState);
  
  // Use autoplay and state sync hooks
  useAutoplayLogic(audioUrl, isPlaying, togglePlayPause, audioState.userPaused, playbackState.shouldAutoplay, albumTracks, currentTrackIndex, onTrackChange, audioState.hasInteracted);
  useAudioStateSync(audioRef, audioUrl, audioState, setAudioState, playbackState, setPlaybackState, albumTracks, currentTrackIndex, onTrackChange);

  // Aktivuj audio při změně skladby - delegováno na useAudioPlayback
  useEffect(() => {
    if (audioUrl) {
      setAudioState(prev => ({ ...prev, hasInteracted: true }));
    }
  }, [audioUrl]);

  // Cleanup effect - vyčisti timeouty při unmount
  useEffect(() => {
    return () => {
      cleanupFadeEffects();
    };
  }, [cleanupFadeEffects]);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    durationStable,
    isLoading: playbackState.isLoading,
    hasError: playbackState.hasError,
    errorMessage: playbackState.errorMessage,
    progress,
    togglePlayPause,
    skipBackward,
    skipForward,
    handleSeek,
    formatTime,
    fadeOutAndClose,
    volume: audioState.volume
  };
};
