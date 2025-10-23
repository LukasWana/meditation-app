import React from 'react';
import CircularProgress from './CircularProgress';
import PlayPauseButton from './PlayPauseButton';
import SkipButton from './SkipButton';
import CurrentTimeDisplay from './CurrentTimeDisplay';
import VoiceSwitcher from './VoiceSwitcher';
import TrackSwitcher from './TrackSwitcher';

const AudioControls = ({
  progress,
  isPlaying,
  currentTime,
  title,
  duration,
  durationStable = true,
  onSeek,
  onTogglePlayPause,
  onSkipBackward,
  onSkipForward,
  formatTime,
  // Voice switcher props
  hasVariants,
  selectedVoice,
  availableVoices,
  onVoiceChange,
  // Track switcher props
  albumTracks = null,
  currentTrackIndex = 0,
  onTrackChange = null,
  // Data source indicator
  dataSource = null,
  className = "w-full flex flex-col items-center justify-center h-full"
}) => {
  return (
    <div className={className}>
      {/* Title and Duration - Above Circular Progress with fixed height */}
      <div className="mb-6 z-10 w-full pl-10 pr-10 sm:pl-20 sm:pr-20 flex flex-col items-center space-y-0" style={{minHeight: 'clamp(80px, 15vh, 120px)'}}>
        {/* Duration - Total Time - Above title - zobraz pouze když je stabilní */}
        {duration && duration > 0 && durationStable && (
          <div
            className="text-gray-600 text-center mb-2"
            style={{fontFamily: 'Playfair Display', fontSize: 'clamp(18px, 1.2vw, 16px)'}}
          >
            {formatTime(duration)}
          </div>
        )}
        {/* Title - Fixed height container for 2-line support */}
        <div
          className="font-light text-center text-black leading-tight"
          style={{
            fontFamily: 'Playfair Display',
            fontSize: 'clamp(20px, 3.5vw, 32px)',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '1.2'
          }}
        >
          <span>{title || 'Meditácia'}</span>
          {/* Data source indicator */}
          {dataSource && (
            <div
              className={`w-2 h-2 rounded-full ml-2 ${
                dataSource === 'cache' ? 'bg-red-500' : 'bg-green-500'
              }`}
              title={dataSource === 'cache' ? 'Načítáno z cache' : 'Načítáno z internetu'}
            />
          )}
        </div>
      </div>

      {/* Circular Progress with Play Button - Always Centered */}
      <div className="relative flex-shrink-0">
        <CircularProgress
          progress={progress}
          onSeek={durationStable ? onSeek : null}
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

      {/* Skip Buttons with Current Time in between - Centered below circular progress */}
      <div className="flex items-center justify-center space-x-4 mt-6 mb-4 pointer-events-auto">
        <SkipButton
          direction="backward"
          onClick={onSkipBackward}
          className="w-[10vw] h-[10vw] max-w-[60px] max-h-[60px] min-w-[45px] min-h-[45px] sm:w-[8vw] sm:h-[8vw] sm:max-w-[70px] sm:max-h-[70px] sm:min-w-[55px] sm:min-h-[55px]"
        />

        {/* Current Time Display - Between skip buttons with fixed width */}
        <div className="pointer-events-none z-10" style={{minWidth: '60px', textAlign: 'center'}}>
          <CurrentTimeDisplay
            currentTime={currentTime}
            formatTime={formatTime}
            className="text-black font-medium text-center"
            style={{fontSize: 'clamp(20px, 2.5vw, 28px)'}}
          />
        </div>

        <SkipButton
          direction="forward"
          onClick={onSkipForward}
          className="w-[10vw] h-[10vw] max-w-[60px] max-h-[60px] min-w-[45px] min-h-[45px] sm:w-[8vw] sm:h-[8vw] sm:max-w-[70px] sm:max-h-[70px] sm:min-w-[55px] sm:min-h-[55px]"
        />
      </div>

      {/* Voice Switcher - Bottom - pouze pro mluvené slovo */}
      {hasVariants && (
        <div className="mt-6 pointer-events-auto z-10">
          <VoiceSwitcher
            selectedVoice={selectedVoice}
            availableVoices={availableVoices}
            onVoiceChange={onVoiceChange}
          />
        </div>
      )}

      {/* Track Switcher - Only show for album content */}
      {albumTracks && albumTracks.length > 1 && (
        <TrackSwitcher
          tracks={albumTracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={onTrackChange}
        />
      )}

    </div>
  );
};

export default AudioControls;
