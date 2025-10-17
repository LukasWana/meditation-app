import React from 'react';
import CircularProgress from './CircularProgress';
import PlayPauseButton from './PlayPauseButton';
import SkipButton from './SkipButton';
import CurrentTimeDisplay from './CurrentTimeDisplay';
import VoiceSwitcher from './VoiceSwitcher';

const AudioControls = ({
  progress,
  isPlaying,
  currentTime,
  title,
  duration,
  onSeek,
  onTogglePlayPause,
  onSkipBackward,
  onSkipForward,
  formatTime,
  // Voice switcher props
  hasVariants,
  selectedVoice,
  onVoiceChange,
  className = "w-full flex flex-col items-center justify-center h-full"
}) => {
  return (
    <div className={className}>
      {/* Title and Duration - Above Circular Progress */}
      <div className="mb-6 pointer-events-none z-10 w-full px-6 sm:px-8 flex flex-col items-center space-y-2">
        <div
          className="font-light text-center text-black"
          style={{fontFamily: 'Playfair Display', fontSize: 'clamp(20px, 3.5vw, 32px)'}}
        >
          {title || 'Meditácia'}
        </div>
        {/* Duration - Total Time - Right under title */}
        <div
          className="text-gray-600 text-center"
          style={{fontFamily: 'Playfair Display', fontSize: 'clamp(14px, 2.5vw, 18px)'}}
        >
          {formatTime(duration)}
        </div>
      </div>

      {/* Circular Progress with Play Button - Always Centered */}
      <div className="relative flex-shrink-0">
        <CircularProgress
          progress={progress}
          onSeek={onSeek}
        />

        {/* Play/Pause Button - Center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <PlayPauseButton
            isPlaying={isPlaying}
            onToggle={onTogglePlayPause}
            className="w-[18vw] h-[18vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px] sm:w-[16vw] sm:h-[16vw] sm:max-w-[140px] sm:max-h-[140px] sm:min-w-[100px] sm:min-h-[100px]"
          />
        </div>
      </div>

      {/* Skip Buttons - Centered below circular progress */}
      <div className="flex items-center justify-center space-x-4 mt-6 pointer-events-auto">
        <SkipButton
          direction="backward"
          onClick={onSkipBackward}
          className="w-[10vw] h-[10vw] max-w-[60px] max-h-[60px] min-w-[45px] min-h-[45px] sm:w-[8vw] sm:h-[8vw] sm:max-w-[70px] sm:max-h-[70px] sm:min-w-[55px] sm:min-h-[55px]"
        />

        <SkipButton
          direction="forward"
          onClick={onSkipForward}
          className="w-[10vw] h-[10vw] max-w-[60px] max-h-[60px] min-w-[45px] min-h-[45px] sm:w-[8vw] sm:h-[8vw] sm:max-w-[70px] sm:max-h-[70px] sm:min-w-[55px] sm:min-h-[55px]"
        />
      </div>

      {/* Current Time Display - Below Circular Progress */}
      <div className="mt-6 pointer-events-none z-10 w-full px-6 sm:px-8">
        <CurrentTimeDisplay
          currentTime={currentTime}
          formatTime={formatTime}
          className="text-black font-medium text-center"
          style={{fontSize: 'clamp(24px, 3.5vw, 36px)'}}
        />
      </div>

      {/* Voice Switcher - Bottom */}
      <div className="mt-6 pointer-events-auto z-10">
        {console.log('AudioControls hasVariants:', hasVariants)}
        <VoiceSwitcher
          selectedVoice={selectedVoice}
          onVoiceChange={onVoiceChange}
        />
      </div>

    </div>
  );
};

export default AudioControls;
