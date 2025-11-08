import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FramerPageTransition, BackgroundShader } from '@components';
import { AudioPlayer } from '@features/audio';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useAudioAnalysis } from '@contexts/AudioAnalysisContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { shouldUseDarkMode } from '@utils/colorUtils';

const STORAGE_KEY = 'meditation-app-active-audio-meditace';

const AudioPlayerMeditaceScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange
}) => {
  const { t } = useLanguage();
  const { getShaderForSection, getColorForSection } = useShaderSettings();
  const { audioData } = useAudioAnalysis();
  const { transitionState } = usePlayback();

  const [activeAudio, setActiveAudio] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load activeAudio for meditace from localStorage:', e);
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-current-screen', 'audio-player-meditace');
    } catch (error) {
      console.warn('⚠️ AudioPlayerMeditaceScreen: Failed to persist current screen', error);
    }

    if (activeAudio) {
      onPlayerStateChange?.(true);
    }
  }, [activeAudio, onPlayerStateChange]);

  const getPreviousScreen = useCallback(() => {
    try {
      return localStorage.getItem('meditation-app-previous-screen') || 'meditace';
    } catch (error) {
      console.warn('⚠️ AudioPlayerMeditaceScreen: Failed to read previous screen', error);
      return 'meditace';
    }
  }, []);

  const currentShader = useMemo(() => {
    if (transitionState?.toShaderKey && transitionState.toShaderKey !== '__BLACK__') {
      return transitionState.toShaderKey;
    }

    const color = getColorForSection('meditace');
    if (color) {
      return `__COLOR__${color}`;
    }

    const shader = getShaderForSection('meditace');
    if (shader) {
      return shader;
    }

    return 'default';
  }, [transitionState?.toShaderKey, getColorForSection, getShaderForSection]);

  const handleCloseAudio = () => {
    try {
      setActiveAudio(null);
      localStorage.removeItem(STORAGE_KEY);
      onPlayerStateChange?.(false);
      onNavigateToScreen(getPreviousScreen());
    } catch (e) {
      console.error('Failed to clear meditace active audio:', e);
    }
  };

  const handleTrackChange = (newIndex) => {
    if (activeAudio?.albumTracks && activeAudio.albumTracks[newIndex]) {
      const track = activeAudio.albumTracks[newIndex];
      const updatedAudio = {
        ...activeAudio,
        audioSrc: track.audioSrc,
        title: track.trackName,
        fileName: track.fileName,
        currentTrackIndex: newIndex
      };
      setActiveAudio(updatedAudio);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAudio));
      } catch (e) {
        console.error('Failed to persist meditace track change:', e);
      }
    }
  };

  const isColorMode = currentShader && currentShader.startsWith('__COLOR__');
  const backgroundColor = isColorMode ? currentShader.replace('__COLOR__', '') : null;
  const overlayColor = getColorForSection('meditace');

  const blendedOverlayColor = useMemo(() => {
    if (overlayColor) {
      return overlayColor;
    }
    if (backgroundColor) {
      return backgroundColor;
    }
    // Jemný béžový filtr pro sjednocení se základní paletou
    return 'rgba(244, 221, 196, 0.55)';
  }, [overlayColor, backgroundColor]);

  const isDarkMode = useMemo(() => {
    const colorForDarkMode = overlayColor || backgroundColor;
    return shouldUseDarkMode(currentShader, colorForDarkMode);
  }, [currentShader, backgroundColor, overlayColor]);

  useEffect(() => {
    if (!activeAudio) {
      onPlayerStateChange?.(false);
      onNavigateToScreen(getPreviousScreen());
    }
  }, [activeAudio, onNavigateToScreen, getPreviousScreen, onPlayerStateChange]);

  if (!activeAudio) {
    return null;
  }

  return (
    <FramerPageTransition screenKey='audio-player-meditace' animation="fade">
      <div
        className='min-h-screen w-full max-w-full bg-[#f4ddc4] fixed inset-0'
        style={{
          zIndex: 0,
          opacity: isColorMode ? 1 : 0.3
        }}
      />

      <BackgroundShader
        variant={currentShader}
        intensity={0.8}
        enabled={true}
        opacity={1.0}
        audioData={audioData}
        forceSquare={currentShader?.startsWith('shader-') ? true : null}
      />

      <AudioPlayer
        audioSrc={activeAudio.audioSrc}
        title={activeAudio.title}
        onClose={handleCloseAudio}
        albumTracks={activeAudio.albumTracks}
        currentTrackIndex={activeAudio.currentTrackIndex}
        onTrackChange={handleTrackChange}
        allFiles={activeAudio.allFiles || []}
        autoplayEnabled={true}
        className='pointer-events-auto'
        isDarkMode={isDarkMode}
        backgroundColor={blendedOverlayColor}
      />
    </FramerPageTransition>
  );
};

export default AudioPlayerMeditaceScreen;

