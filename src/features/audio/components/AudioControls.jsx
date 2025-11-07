import React from 'react';
import CircularProgress from './CircularProgress';
import PlayPauseButton from './PlayPauseButton';
import SkipButton from './SkipButton';
import CurrentTimeDisplay from './CurrentTimeDisplay';
import VoiceSwitcher from './VoiceSwitcher';
import TrackSwitcher from './TrackSwitcher';
import ShaderSelector from './ShaderSelector';
import AudioShaderBackground from '@components/AudioShaderBackground';

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
  // Shader selector props
  selectedShader = null,
  onShaderChange = null,
  onNavigateToScreen = null,
  // Data source indicator
  dataSource = null,
  // Dark mode
  isDarkMode = false,
  className = "w-full flex flex-col items-center justify-center h-full"
}) => {
  // Barvy pro dark mode
  const textColor = isDarkMode ? 'text-white' : 'text-black';
  const textGrayColor = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  return (
    <div className={className}>
      {/* Title and Duration - Above Circular Progress with fixed height */}
      <div className="mb-6 z-10 w-full pl-10 pr-10 sm:pl-20 sm:pr-20 flex flex-col items-center space-y-0 audio-controls-container">
        {/* Duration - Total Time - Above title - zobraz pouze když je stabilní */}
        {duration && duration > 0 && durationStable && (
          <div className={`${textGrayColor} text-center mb-2 text-clamp-duration`}>
            {formatTime(duration)}
          </div>
        )}
        {/* Title - Fixed height container for 2-line support */}
        <div className={`font-light text-center ${textColor} leading-tight text-clamp-title min-h-[60px] flex items-center justify-center`} style={{lineHeight: '1.2'}}>
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
      <div className="relative flex-shrink-0" style={{ isolation: 'isolate' }}>
        {/* CircularProgress - nad shaderem */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <CircularProgress
            progress={progress}
            onSeek={durationStable ? onSeek : null}
          />
        </div>

        {/* Play/Pause Button - Center - nad CircularProgress */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 3 }}>
          <div className="pointer-events-auto">
            <PlayPauseButton
              isPlaying={isPlaying}
              onToggle={onTogglePlayPause}
              className="w-[18vw] h-[18vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px] sm:w-[16vw] sm:h-[16vw] sm:max-w-[140px] sm:max-h-[140px] sm:min-w-[100px] sm:min-h-[100px]"
            />
          </div>
        </div>
      </div>

      {/* Skip Buttons with Current Time in between - Centered below circular progress */}
      <div className="flex items-center justify-center space-x-4 mt-6 mb-4 pointer-events-auto">
        <SkipButton
          direction="backward"
          onClick={onSkipBackward}
          className="w-[10vw] h-[10vw] max-w-[60px] max-h-[60px] min-w-[45px] min-h-[45px] sm:w-[8vw] sm:h-[8vw] sm:max-w-[70px] sm:max-h-[70px] sm:min-w-[55px] sm:min-h-[55px]"
          isDarkMode={isDarkMode}
        />

        {/* Current Time Display - Between skip buttons with fixed width */}
        <div className="pointer-events-none z-10 min-w-[60px] text-center">
          <CurrentTimeDisplay
            currentTime={currentTime}
            formatTime={formatTime}
            className={`${textColor} font-medium text-center text-clamp-time`}
          />
        </div>

        <SkipButton
          direction="forward"
          onClick={onSkipForward}
          className="w-[10vw] h-[10vw] max-w-[60px] max-h-[60px] min-w-[45px] min-h-[45px] sm:w-[8vw] sm:h-[8vw] sm:max-w-[70px] sm:max-h-[70px] sm:min-w-[55px] sm:min-h-[55px]"
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Voice Switcher - Bottom - pouze pro mluvené slovo */}
      {hasVariants && (
        <div className="mt-6 pointer-events-auto z-10">
          <VoiceSwitcher
            selectedVoice={selectedVoice}
            availableVoices={availableVoices}
            onVoiceChange={onVoiceChange}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* Track Switcher - Only show for album content */}
      {albumTracks && albumTracks.length > 1 && (
        <TrackSwitcher
          tracks={albumTracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={onTrackChange}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Shader Selector - Bottom - pro výběr shaderu na pozadí */}
      {onShaderChange && (
        <div className="mt-6 pointer-events-auto z-10">
          <ShaderSelector
            selectedShader={selectedShader}
            onShaderChange={onShaderChange}
            onNavigateToScreen={onNavigateToScreen}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

    </div>
  );
};

export default AudioControls;
