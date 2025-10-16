import React from 'react';
import { motion } from 'framer-motion';
import { useAudioPlayer, useFirebaseAudio } from './hooks';
import {
  AudioControls,
  CloseButton,
  LoadingIndicator
} from './components';
import { FramerPageTransition, BackButton } from '@components';

const AudioPlayerPage = ({
  audioSrc,
  title,
  onClose,
  className = ""
}) => {
  // Načtení URL z Firebase Storage
  const { audioUrl, loading: firebaseLoading, error: firebaseError } = useFirebaseAudio(audioSrc);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    progress,
    togglePlayPause,
    skipBackward,
    skipForward,
    handleSeek,
    formatTime
  } = useAudioPlayer(audioUrl);

  return (
    <FramerPageTransition screenKey="audio-player-page">
      <div className={`min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-8 pb-20 overflow-x-hidden relative ${className}`}>
        {/* Back Button - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <BackButton onClick={onClose} />
        </div>

        {/* Audio Player Content */}
        <div className="max-w-md w-full mt-16 flex flex-col items-center justify-center relative">
          {/* Audio Element */}
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
          />

          {/* Audio Controls */}
          <AudioControls
            progress={progress}
            isPlaying={isPlaying}
            currentTime={currentTime}
            title={title}
            duration={duration}
            onSeek={handleSeek}
            onTogglePlayPause={togglePlayPause}
            onSkipBackward={skipBackward}
            onSkipForward={skipForward}
            formatTime={formatTime}
          />

          {/* Loading Indicator - Top Left */}
          <div className="absolute top-4 left-4 z-10">
            <LoadingIndicator isLoading={isLoading || firebaseLoading} />
          </div>

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
      </div>
    </FramerPageTransition>
  );
};

export default AudioPlayerPage;
