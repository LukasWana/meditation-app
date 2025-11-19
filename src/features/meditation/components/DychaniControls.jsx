import React from 'react';
import PlayPauseButton from '@features/audio/components/PlayPauseButton';

/**
 * Komponenta pro ovládací prvky meditace
 * Zobrazuje Play/Pause tlačítko
 */
const DychaniControls = ({
  isPlaying,
  onPlayPause,
  textColors
}) => {
  return (
    <>
      {/* Play/Pause Button - Center */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          zIndex: 30,
          isolation: 'isolate'
        }}
      >
        <PlayPauseButton
          isPlaying={isPlaying}
          onToggle={onPlayPause}
          className="w-[18vw] h-[18vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px] sm:w-[16vw] sm:h-[16vw] sm:max-w-[140px] sm:max-h-[140px] sm:min-w-[100px] sm:min-h-[100px]"
          isDarkMode={textColors.isDark}
        />
      </div>

    </>
  );
};

export default React.memo(DychaniControls);

