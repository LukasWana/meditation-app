import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FramerPageTransition, BackgroundShader } from '@components';
import { AudioPlayer } from '@features/audio';
import { useLanguage } from '@contexts/LanguageContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { useAudioAnalysis } from '@contexts/AudioAnalysisContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';
import { shouldUseDarkMode } from '@utils/colorUtils';

const DEBUG_AUDIO_PLAYER_LOGS = false;

const AudioPlayerHudbaScreen = ({
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

  // Načti audio data z localStorage
  const [activeAudio, setActiveAudio] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-active-audio-hudba');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load activeAudio from localStorage:', e);
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-current-screen', 'audio-player-hudba');
    } catch (error) {
      console.warn('⚠️ AudioPlayerHudbaScreen: Failed to persist current screen', error);
    }
  }, []);

  const getPreviousScreen = useCallback(() => {
    try {
      return localStorage.getItem('meditation-app-previous-screen') || 'hudba';
    } catch (error) {
      console.warn('⚠️ AudioPlayerHudbaScreen: Failed to read previous screen', error);
      return 'hudba';
    }
  }, []);

  // Urči, jaký shader/barva se má zobrazit
  // Umožni kombinovat barvu + shader - shader se zobrazí jako pozadí, barva jako overlay v přehrávači
  const currentShader = useMemo(() => {
    // Prioritizace: 1. transitionState (aktivní přehrávání), 2. shader z settings, 3. barva z settings

    // Pokud je v transitionState něco kromě BLACK, použij to (může být barva __COLOR__ nebo shader)
    if (transitionState?.toShaderKey && transitionState.toShaderKey !== '__BLACK__') {
      const transitionKey = transitionState.toShaderKey;

      // Pokud je to __COLOR__, zkontroluj, zda je nastaven shader
      if (transitionKey.startsWith('__COLOR__')) {
        // Pokud je nastaven shader, použij shader místo barvy (barva bude v přehrávači)
        const shader = getShaderForSection('hudba');
        if (shader && shader !== 'default') {
          if (DEBUG_AUDIO_PLAYER_LOGS) {
            console.log('🎨 AudioPlayerHudbaScreen: Používám shader místo barvy z transitionState', {
              shader,
              color: transitionKey
            });
          }
          return shader;
        }
      }

      if (DEBUG_AUDIO_PLAYER_LOGS) {
        console.log('🎨 AudioPlayerHudbaScreen: Používám shader/barvu z transitionState', {
          key: transitionKey
        });
      }
      return transitionKey;
    }

    // Pokud není v transitionState, zkontroluj shader (má prioritu - zobrazí se jako pozadí)
    const shader = getShaderForSection('hudba');
    // Pokud je shader nastaven a není null, použij ho (včetně 'hudba', 'default', atd.)
    if (shader) {
      if (DEBUG_AUDIO_PLAYER_LOGS) {
        console.log('🎨 AudioPlayerHudbaScreen: Používám shader z settings', {
          shader
        });
      }
      return shader;
    }

    // Pokud není shader, zkontroluj barvu
    const color = getColorForSection('hudba');
    if (color) {
      if (DEBUG_AUDIO_PLAYER_LOGS) {
        console.log('🎨 AudioPlayerHudbaScreen: Používám barvu z settings', {
          color
        });
      }
      return `__COLOR__${color}`;
    }

    // Default shader
    if (DEBUG_AUDIO_PLAYER_LOGS) {
      console.log('🎨 AudioPlayerHudbaScreen: Používám default shader');
    }
    return 'default';
  }, [transitionState?.toShaderKey, getColorForSection, getShaderForSection]);

  // Handler pro zavření přehrávače
  const handleCloseAudio = () => {
    try {
      setActiveAudio(null);
      localStorage.removeItem('meditation-app-active-audio-hudba');
      const previousScreen = getPreviousScreen();
      onPlayerStateChange?.(false);
      onNavigateToScreen(previousScreen); // Vrať se na předchozí stránku
    } catch (e) {
      console.error('Failed to remove audio data:', e);
    }
  };

  // Handler pro změnu skladby
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
        localStorage.setItem('meditation-app-active-audio-hudba', JSON.stringify(updatedAudio));
      } catch (e) {
        console.error('Failed to save audio data:', e);
      }
    }
  };

  // Zjisti režim shaderu/barvy a UI nastavení (musí být před podmíněným returnem kvůli hookům)
  const isColorMode = currentShader && currentShader.startsWith('__COLOR__');
  const backgroundColor = isColorMode ? currentShader.replace('__COLOR__', '') : null;
  const overlayColor = getColorForSection('hudba');

  const blendedOverlayColor = useMemo(() => {
    if (overlayColor) {
      return overlayColor;
    }
    if (backgroundColor) {
      return backgroundColor;
    }
    return 'rgba(244, 221, 196, 0.55)';
  }, [overlayColor, backgroundColor]);

  const isDarkMode = useMemo(() => {
    const colorForDarkMode = blendedOverlayColor || backgroundColor;
    return shouldUseDarkMode(currentShader, colorForDarkMode);
  }, [currentShader, blendedOverlayColor, backgroundColor]);

  // Pokud není načteno žádné audio, vrať se zpět
  useEffect(() => {
    if (!activeAudio) {
      const previousScreen = getPreviousScreen();
      onPlayerStateChange?.(false);
      onNavigateToScreen(previousScreen);
    }
  }, [activeAudio, onNavigateToScreen, getPreviousScreen, onPlayerStateChange]);

  // Debug: Zkontroluj, co se zobrazuje (hook musí být před podmíněným returnem)
  React.useEffect(() => {
    if (!DEBUG_AUDIO_PLAYER_LOGS) {
      return;
    }
    console.log('🎨 AudioPlayerHudbaScreen: Shader info', {
      currentShader,
      isColorMode,
      backgroundColor,
      overlayColor,
      transitionStateKey: transitionState?.toShaderKey,
      shaderFromSettings: getShaderForSection('hudba'),
      colorFromSettings: getColorForSection('hudba'),
      willShowShader: !isColorMode,
      willShowColor: isColorMode,
      opacity: 1.0
    });
  }, [currentShader, isColorMode, backgroundColor, overlayColor, transitionState, getShaderForSection, getColorForSection]);

  // Pokud není načteno žádné audio, nezobrazuj nic
  if (!activeAudio) {
    return null;
  }

  return (
    <FramerPageTransition screenKey="audio-player-hudba">
      {/* Vrstvení:
          - Pozadí (bg-[#f4ddc4]): zIndex 0 (nejnižší)
          - BackgroundShader: zIndex 5 (nad pozadím, pod přehrávačem)
          - AudioPlayer: zIndex 10 (nad shaderem)
      */}

      {/* Pozadí stránky - průhledné, aby shader prosvítal */}
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] fixed inset-0"
        style={{
          zIndex: 0,
          opacity: isColorMode ? 1 : 0.3 // Pokud je barva, neprůhledné, jinak průhledné
        }}
      />

      {/* BackgroundShader - zobraz shader nebo barvu */}
      <BackgroundShader
        variant={currentShader}
        intensity={0.8}
        enabled={true}
        opacity={isColorMode ? 1.0 : 1.0} // Vždy zobraz s plnou opacity na stránce s přehrávačem
        audioData={audioData} // Použij audio data pro audio-reactive shadery
        forceSquare={currentShader?.startsWith('shader-') ? true : null}
      />

      {/* Audio Player - zobraz jako fullscreen overlay */}
      {activeAudio && (
        <AudioPlayer
          audioSrc={activeAudio.audioSrc}
          title={activeAudio.title}
          onClose={handleCloseAudio}
          albumCover={activeAudio.albumCover}
          albumTracks={activeAudio.albumTracks}
          currentTrackIndex={activeAudio.currentTrackIndex}
          onTrackChange={handleTrackChange}
          autoplayEnabled={true}
          onNavigateToScreen={onNavigateToScreen}
          isDarkMode={isDarkMode}
          backgroundColor={blendedOverlayColor} // Jemná barevná vrstva sjednocující pozadí
        />
      )}
    </FramerPageTransition>
  );
};

export default AudioPlayerHudbaScreen;

