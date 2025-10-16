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
  className = "absolute inset-0 flex items-center justify-center"
}) => {
  return (
    <div className={`${className} flex flex-col items-center justify-center h-full`}>
      {/* Title and Duration - Above Circular Progress */}
      <div className="mb-4 pointer-events-none z-10 w-full px-8 flex flex-col items-center space-y-1">
        <div
          className="font-light text-center text-black"
          style={{fontFamily: 'Playfair Display', fontSize: 'clamp(24px, 4vw, 36px)'}}
        >
          {title || 'Meditácia'}
        </div>
        {/* Duration - Total Time - Right under title */}
        <div
          className="text-gray-600 text-center"
          style={{fontFamily: 'Playfair Display', fontSize: 'clamp(16px, 2vw, 20px)'}}
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
            className="w-[20vw] h-[20vw] max-w-[140px] max-h-[140px] min-w-[100px] min-h-[100px]"
          />
        </div>
      </div>

      {/* Skip Buttons - Outside Circular Progress */}
      <div className="flex items-center justify-between w-full max-w-[80vw] px-4 mt-4 pointer-events-auto">
        {/* Skip Backward Button - Left */}
        <SkipButton
          direction="backward"
          onClick={onSkipBackward}
          className="w-[12vw] h-[12vw] max-w-[70px] max-h-[70px] min-w-[50px] min-h-[50px]"
        />

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Skip Forward Button - Right */}
        <SkipButton
          direction="forward"
          onClick={onSkipForward}
          className="w-[12vw] h-[12vw] max-w-[70px] max-h-[70px] min-w-[50px] min-h-[50px]"
        />
      </div>

      {/* Current Time Display - Below Circular Progress */}
      <div className="mt-4 pointer-events-none z-10 w-full px-8">
        <CurrentTimeDisplay
          currentTime={currentTime}
          formatTime={formatTime}
          className="text-black font-medium text-center"
          style={{fontSize: 'clamp(28px, 4vw, 40px)'}}
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
