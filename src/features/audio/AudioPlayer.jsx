import React from 'react';
import { useAudioPlayer, useAudioPlayerLogic } from './hooks';
import {
  AudioControls,
  CloseButton,
  AudioPlayerAnimations
} from './components';


const AudioPlayer = ({
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
  onAutoplayChange = null
}) => {
  // Hlavní logika komponenty
  const {
    audioUrl,
    firebaseError,
    selectedVoice,
    hasVariants,
    availableVoices,
    handleVoiceChange
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

  return (
    <AudioPlayerAnimations
      albumCover={albumCover}
      className={className}
      onClose={onClose}
      fadeOutAndClose={fadeOutAndClose}
    >
      {/* Main content container - max width 600px */}
      <div className="w-full max-w-[600px] h-full flex flex-col items-center justify-center relative">
        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={cachedAudioUrl || audioUrl || undefined}
          preload="metadata"
        />

        {/* Close Button - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <CloseButton
            onClose={() => fadeOutAndClose(onClose, 3000)}
            className="w-10 h-10 sm:w-12 sm:h-12"
          />
        </div>

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
