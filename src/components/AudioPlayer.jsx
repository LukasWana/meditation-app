import React from 'react';
import { motion } from 'framer-motion';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import {
  AudioControls,
  CloseButton,
  LoadingIndicator
} from './audio';

const AudioPlayer = ({
  audioSrc,
  title,
  onClose,
  className = ""
}) => {
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
  } = useAudioPlayer(audioSrc);

  return (
    <motion.div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClose}
    >
      <motion.div
        className="bg-[#f4ddc4] rounded-full shadow-2xl w-[90vw] h-[90vw] max-w-[600px] max-h-[600px] min-w-[320px] min-h-[320px] mx-4 flex flex-col items-center justify-center relative overflow-hidden"
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
          src={audioSrc}
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

        {/* Loading Indicator */}
        <LoadingIndicator isLoading={isLoading} />
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
