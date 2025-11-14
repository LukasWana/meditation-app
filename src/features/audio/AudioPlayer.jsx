import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAudioPlayer, useAudioPlayerLogic } from './hooks';
import {
  AudioControls,
  AudioPlayerAnimations,
  ShaderSelector
} from './components';
import { FramerButton } from '@components';
import { useAudioAnalysis as useAudioAnalysisHook } from '@hooks/useAudioAnalysis';
import { useAudioAnalysis as useAudioAnalysisContext } from '@contexts/AudioAnalysisContext';
import { useShaderSettings } from '@contexts/ShaderSettingsContext';
import { usePlayback } from '@contexts/ShaderPlaybackContext';


const AudioPlayer = ({
  sectionKey = 'hudba',
  audioSrc,
  title,
  onClose,
  className = "",
  albumCover = null,
  albumTracks = null,
  currentTrackIndex = 0,
  onTrackChange = null,
  allFiles = [],
  autoplayEnabled = true,
  onAutoplayChange = null,
  onNavigateToScreen = null, // Pro navigaci na stránku výběru shaderů
  isDarkMode = false, // Dark mode pro tmavé shadery/barvy
  backgroundColor = null // Barva pozadí přehrávače (může být kombinována se shaderem)
}) => {
  // Hlavní logika komponenty
  const {
    audioUrl,
    firebaseError,
    selectedVoice,
    hasVariants,
    availableVoices,
    handleVoiceChange,
    dataSource
  } = useAudioPlayerLogic({
    audioSrc,
    albumTracks,
    currentTrackIndex,
    onTrackChange,
    allFiles,
    autoplayEnabled
  });

  // Použij title prop přímo - onTrackChange callback už aktualizuje title správně
  const actualTitle = title;

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
    fadeOutAndClose,
    cachedAudioUrl
  } = useAudioPlayer(audioUrl, albumTracks, currentTrackIndex, onTrackChange, autoplayEnabled);

  // Audio analýza pro shadery
  const audioAnalysisData = useAudioAnalysisHook(audioRef, isPlaying);
  const { setAudioData } = useAudioAnalysisContext();

  // Shader settings pro výběr shaderu na pozadí
  const { getShaderForSection, setShaderForSection, getColorForSection } = useShaderSettings();
  const selectedShader = getShaderForSection(sectionKey);
  const selectedColor = getColorForSection(sectionKey);

  // Shader playback context pro přehrávání shaderů
  const { transitionState, startTransition } = usePlayback();

  // Umožni kombinovat barvu + shader
  // Pokud je předána barva jako prop, použij ji, jinak použij barvu z settings
  const finalBackgroundColor = backgroundColor !== null ? backgroundColor : (selectedColor || null);

  // Handler pro změnu shaderu
  const handleShaderChange = (shaderId) => {
    // Ulož do ShaderSettingsContext
    setShaderForSection(sectionKey, shaderId);

    // Nastav shader v PlaybackContext pomocí startTransition
    const from = { shaderKey: transitionState?.toShaderKey || '__BLACK__' };
    const to = { shaderKey: shaderId || '__BLACK__' };
    startTransition(from, to);
  };

  // Synchronizuj shader z ShaderSettingsContext do PlaybackContext při načtení
  // Barva se použije jako overlay v AudioPlayerAnimations (ne v PlaybackContext)
  React.useEffect(() => {
    // Urči, co se má zobrazit jako pozadí - priorita: shader > barva
    // Pokud je shader, použij ho (barva bude overlay v přehrávači)
    // Pokud není shader, použij barvu jako pozadí
    let targetShaderKey = null;

    if (selectedShader && selectedShader !== 'default') {
      // Pokud je nastaven shader, použij ho (barva bude overlay)
      targetShaderKey = selectedShader;
    } else if (selectedColor) {
      // Pokud není shader, použij barvu jako pozadí
      targetShaderKey = `__COLOR__${selectedColor}`;
    } else {
      // Default shader
      targetShaderKey = 'default';
    }

    // Synchronizuj pouze pokud máme target a liší se od aktuálního stavu
    // A POUZE pokud transitionState není právě v procesu transition (aby se nepřepsal shader nastavený v ShaderSelectionScreen)
    if (targetShaderKey) {
      const currentKey = transitionState?.toShaderKey || '__BLACK__';
      const isCurrentlyTransitioning = transitionState?.isTransitioning || false;

      // Pokud není v procesu transition a klíč se liší, synchronizuj
      if (!isCurrentlyTransitioning && currentKey !== targetShaderKey) {
        // Debug log deaktivován - příliš mnoho výpisů
        // const DEBUG_AUDIO_PLAYER = false;
        // if (DEBUG_AUDIO_PLAYER) {
        //   console.log('🔄 AudioPlayer: Synchronizuji shader/barvu (z settings)', {
        //     from: currentKey,
        //     to: targetShaderKey,
        //     selectedColor,
        //     selectedShader,
        //     willUseColorOverlay: !!selectedColor && !!selectedShader,
        //     isCurrentlyTransitioning
        //   });
        // }
        const from = { shaderKey: currentKey };
        const to = { shaderKey: targetShaderKey };
        startTransition(from, to);
      } else if (isCurrentlyTransitioning) {
        // if (DEBUG_AUDIO_PLAYER) {
        //   console.log('⏸️ AudioPlayer: Přeskakuji synchronizaci - právě probíhá transition', {
        //     currentKey,
        //     targetShaderKey,
        //     isCurrentlyTransitioning
        //   });
        // }
      }
    }
  }, [selectedShader, selectedColor, sectionKey, startTransition, transitionState]);

  // Aktualizuj audio data v contextu
  React.useEffect(() => {
    setAudioData(audioAnalysisData);
  }, [audioAnalysisData, setAudioData]);

  return (
    <AudioPlayerAnimations
      albumCover={albumCover} // Album cover se zobrazí POUZE v sekci hudba
      backgroundColor={finalBackgroundColor || undefined} // Předaj barvu pozadí (může být kombinována se shaderem)
      className={className}
      onClose={onClose}
      fadeOutAndClose={fadeOutAndClose}
      sectionKey={sectionKey} // Předaj sectionKey pro kontrolu, zda zobrazit album cover
    >
      {/* Main content container - max width 600px */}
      <div className="w-full max-w-[600px] h-full flex flex-col items-center justify-center relative">
        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={cachedAudioUrl || audioUrl || undefined}
          preload="metadata"
          crossOrigin="anonymous"
        />

        {/* Back Button - Top Left */}
        <div className="absolute top-4 left-4 z-[100] pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <FramerButton
              onClick={() => fadeOutAndClose(onClose, 3000)}
              variant="ghost"
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-black/10 hover:bg-white/30 flex items-center justify-center p-0"
            >
              <ArrowLeft size={20} />
            </FramerButton>
          </motion.div>
        </div>

        {/* Shader Selector - Top Right */}
        {onNavigateToScreen && (
          <div className="absolute top-4 right-4 z-[100] pointer-events-auto">
            <ShaderSelector
              selectedShader={selectedShader}
              onShaderChange={handleShaderChange}
              onNavigateToScreen={onNavigateToScreen}
              isDarkMode={isDarkMode}
              section={sectionKey}
            />
          </div>
        )}

        {/* Audio Controls - Centered */}
        <AudioControls
          progress={progress}
          isPlaying={isPlaying}
          currentTime={currentTime}
          title={actualTitle}
          duration={duration}
          durationStable={durationStable}
          onSeek={handleSeek}
          onTogglePlayPause={togglePlayPause}
          onSkipBackward={skipBackward}
          onSkipForward={skipForward}
          formatTime={formatTime}
          autoplayEnabled={autoplayEnabled}
          onAutoplayChange={onAutoplayChange}
          // Voice switcher props
          hasVariants={hasVariants}
          selectedVoice={selectedVoice}
          availableVoices={availableVoices}
          onVoiceChange={handleVoiceChange}
          // Track switcher props
          albumTracks={albumTracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={onTrackChange}
          // Data source indicator
          dataSource={dataSource}
          // Dark mode
          isDarkMode={isDarkMode}
          className="w-full flex flex-col items-center justify-center h-full"
        />

        {/* Firebase Error */}
        {firebaseError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 rounded-full">
            <div className="text-center p-4">
              <p className="text-red-600 font-medium">Chyba při načítání audio</p>
              <p className="text-red-500 text-sm">{firebaseError}</p>
            </div>
          </div>
        )}
      </div>
    </AudioPlayerAnimations>
  );
};

export default AudioPlayer;
