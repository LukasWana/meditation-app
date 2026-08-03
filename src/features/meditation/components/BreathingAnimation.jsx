import React from 'react';
import { motion } from 'framer-motion';
import { usePageVisible } from '@hooks/usePageVisible';

/**
 * Komponenta pro animaci dýchání - bílý animovaný kruh
 *
 * @param {boolean} isBreathing - Zda probíhá dýchání
 * @param {'in'|'out'} breathPhase - Aktuální fáze dýchání
 * @param {number} breathInDuration - Délka nádechu v sekundách
 * @param {number} breathOutDuration - Délka výdechu v sekundách
 */
const BreathingAnimation = ({
  isBreathing,
  breathPhase,
  breathInDuration,
  breathOutDuration
}) => {
  const isPageVisible = usePageVisible();
  const shouldAnimate = isBreathing && isPageVisible;

  if (!isBreathing) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1, overflow: 'visible' }}>
      {/* Animace s maskou - bílý kruh uprostřed, vycentrovaná na tlačítko */}
      <motion.div
        className="rounded-full breath-animation-circle"
        style={{
          width: '18vw',
          height: '18vw',
          maxWidth: '120px',
          maxHeight: '120px',
          minWidth: '80px',
          minHeight: '80px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0) 70%)',
          filter: 'blur(4px)',
          transformOrigin: 'center center',
          borderRadius: '50%',
          overflow: 'visible',
          zIndex: 1,
          position: 'absolute',
          pointerEvents: 'none',
          willChange: 'transform, opacity'
        }}
        initial={{
          scale: 1.0,
          opacity: 0.6
        }}
        animate={shouldAnimate ? {
          scale: breathPhase === 'in'
            ? [1.0, 2.5]
            : breathPhase === 'out'
            ? [2.5, 1.0]
            : 1.0,
          opacity: [0.8, 1, 0.8]
        } : {
          scale: 1.0,
          opacity: 0.8
        }}
        transition={shouldAnimate ? {
          duration: breathPhase === 'in' ? breathInDuration : breathOutDuration,
          delay: breathPhase === 'out' ? 0.2 : 0,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse"
        } : {
          duration: 0.3
        }}
      />
    </div>
  );
};

export default BreathingAnimation;


