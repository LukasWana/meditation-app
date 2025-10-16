import React from 'react';
import { motion } from 'framer-motion';
import { useAudioPlayer, useFirebaseAudio } from './hooks';
import {
  AudioControls,
  CloseButton,
  LoadingIndicator
} from './components';

const AudioPlayer = ({
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
    <motion.div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      {/* Mobile Fullscreen Player */}
      <motion.div
        className="bg-[#f4ddc4] w-full h-full sm:w-[90vw] sm:h-[90vw] sm:max-w-[600px] sm:max-h-[600px] sm:min-w-[320px] sm:min-h-[320px] sm:mx-4 sm:rounded-full shadow-2xl flex flex-col items-center justify-center relative overflow-hidden"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          aspectRatio: '1/1'
        }}
      >
        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />

        {/* Close Button - Top Right for All Devices */}
        <div className="absolute top-4 right-4 z-10">
          <CloseButton
            onClose={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
          />
        </div>

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

        {/* Loading Indicator */}
        <LoadingIndicator isLoading={isLoading || firebaseLoading} />

        {/* Firebase Error */}
        {firebaseError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 rounded-full">
            <div className="text-center p-4">
              <p className="text-red-600 font-medium">Chyba při načítání audio</p>
              <p className="text-red-500 text-sm">{firebaseError}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Close Button - Touching Main Circle
      <div className="absolute bottom-[20vw] sm:bottom-20 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20">
        <CloseButton
          onClose={onClose}
          className="w-[8vw] h-[8vw] max-w-[40px] max-h-[40px] min-w-[32px] min-h-[32px]"
        />
      </div>*/}
    </motion.div>
  );
};

export default AudioPlayer;
