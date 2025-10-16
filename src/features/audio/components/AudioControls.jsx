import React from 'react';
import CircularProgress from './CircularProgress';
import PlayPauseButton from './PlayPauseButton';
import SkipButton from './SkipButton';
import CurrentTimeDisplay from './CurrentTimeDisplay';

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
  className = "absolute inset-0 flex items-center justify-center"
}) => {
  return (
    <div className={className}>
      {/* Title - Responsive Above Progress Circle */}
      <div className="absolute top-[15%] md:top-[10%] left-1/2 transform -translate-x-1/2 pointer-events-none z-10 w-full px-4">
        <div
          className="font-light text-center text-black"
          style={{fontFamily: 'Playfair Display', fontSize: 'clamp(18px, 4vw, 28px)'}}
        >
          {title || 'Meditácia'}
        </div>
      </div>

      {/* Circular Progress with Play Button */}
      <div className="relative flex-1 flex items-center justify-center">
        <CircularProgress
          progress={progress}
          onSeek={onSeek}
        />

        {/* Play/Pause Button - Center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <PlayPauseButton
            isPlaying={isPlaying}
            onToggle={onTogglePlayPause}
            className="w-[20vw] h-[20vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px]"
          />
        </div>

        {/* Skip Backward Button - Left of Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="ml-[50vw] sm:ml-[260px] pointer-events-auto">
            <SkipButton
              direction="backward"
              onClick={onSkipBackward}
              className="w-[14vw] h-[14vw] max-w-[70px] max-h-[70px] min-w-[56px] min-h-[56px]"
            />
          </div>
        </div>

        {/* Skip Forward Button - Right of Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="mr-[50vw] sm:mr-[260px] pointer-events-auto">
            <SkipButton
              direction="forward"
              onClick={onSkipForward}
              className="w-[14vw] h-[14vw] max-w-[70px] max-h-[70px] min-w-[56px] min-h-[56px]"
            />
          </div>
        </div>
      </div>

      {/* Time Display - Responsive Below Progress Circle */}
      <div className="absolute bottom-[15%] md:bottom-[10%] left-1/2 transform -translate-x-1/2 pointer-events-none z-10 w-full px-4 flex flex-col items-center space-y-1 md:space-y-4">
        {/* Duration - Total Time */}
        <div
          className="text-gray-500 text-center"
          style={{fontFamily: 'Playfair Display', fontSize: 'clamp(18px, 3vw, 23px)'}}
        >
          {formatTime(duration)}
        </div>

        {/* Current Time */}
        <CurrentTimeDisplay
          currentTime={currentTime}
          formatTime={formatTime}
          className="text-black font-medium"
          style={{fontSize: 'clamp(25px, 3.5vw, 32px)'}}
        />
      </div>
    </div>
  );
};

export default AudioControls;
