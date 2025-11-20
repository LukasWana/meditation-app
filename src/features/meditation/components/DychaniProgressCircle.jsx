import React, { memo } from 'react';
import CircularProgress from '@features/audio/components/CircularProgress';
import PlayPauseButton from '@features/audio/components/PlayPauseButton';
import DychaniAnimation from './DychaniAnimation';

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
const DychaniProgressCircle = ({
  progress,
  isBreathing,
  breathPhase,
  breathInDuration,
  breathOutDuration,
  onPlayPause
}) => {
  return (
    <div className="relative flex-shrink-0" style={{ isolation: 'isolate' }}>
      {/* Dýchací animace během dýchání - pod kruhem a tlačítkem, pod shaderem */}
      <DychaniAnimation
        isBreathing={isBreathing}
        breathPhase={breathPhase}
        breathInDuration={breathInDuration}
        breathOutDuration={breathOutDuration}
      />

      <CircularProgress
        progress={progress}
        onSeek={null}
        className="w-[60vw] h-[60vw] max-w-[280px] max-h-[280px] min-w-[220px] min-h-[220px]"
        style={{ position: 'relative', zIndex: 2 }}
        section="dychani"
      />

      {/* Play/Pause Button - Center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
        <div className="pointer-events-auto">
          <PlayPauseButton
            isPlaying={isBreathing}
            onToggle={onPlayPause}
            className="w-[20vw] h-[20vw] max-w-[96px] max-h-[96px] min-w-[72px] min-h-[72px]"
          />
        </div>
      </div>
    </div>
  );
};

export default memo(DychaniProgressCircle);

