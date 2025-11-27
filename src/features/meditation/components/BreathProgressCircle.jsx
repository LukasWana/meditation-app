import React from 'react';
import CircularProgress from '@features/audio/components/CircularProgress';
import PlayPauseButton from '@features/audio/components/PlayPauseButton';
import BreathingAnimation from './BreathingAnimation';

/**
 * Komponenta pro kruhový progress s play button a animací dýchání
 *
 * @param {number} progress - Progress (0-100)
 * @param {boolean} isBreathing - Zda probíhá dýchání
 * @param {'in'|'out'} breathPhase - Aktuální fáze dýchání
 * @param {number} breathInDuration - Délka nádechu v sekundách
 * @param {number} breathOutDuration - Délka výdechu v sekundách
 * @param {Function} onPlayPause - Handler pro play/pause
 */
const BreathProgressCircle = ({
  progress,
  isBreathing,
  breathPhase,
  breathInDuration,
  breathOutDuration,
  onPlayPause
}) => {
  return (
    <div className="relative flex-shrink-0" style={{ overflow: 'visible' }}>
      {/* Dýchací animace během dýchání - pod kruhem a tlačítkem - z-index 1 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <BreathingAnimation
          isBreathing={isBreathing}
          breathPhase={breathPhase}
          breathInDuration={breathInDuration}
          breathOutDuration={breathOutDuration}
        />
      </div>

      <CircularProgress
        progress={progress}
        onSeek={null}
        className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] min-w-[250px] min-h-[250px]"
        style={{ position: 'relative', zIndex: 2 }}
      />

      {/* Play/Pause Button - Center - ve vrchní vrstvě */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 100 }}>
        <PlayPauseButton
          isPlaying={isBreathing}
          onToggle={onPlayPause}
          className="w-[18vw] h-[18vw] max-w-[120px] max-h-[120px] min-w-[80px] min-h-[80px] sm:w-[16vw] sm:h-[16vw] sm:max-w-[140px] sm:max-h-[140px] sm:min-w-[100px] sm:min-h-[100px]"
        />
      </div>
    </div>
  );
};

export default BreathProgressCircle;

