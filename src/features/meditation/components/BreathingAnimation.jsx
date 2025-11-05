import React from 'react';
import { motion } from 'framer-motion';

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
  if (!isBreathing) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
      {/* Animace s maskou - bílý kruh uprostřed, černý okolo, vycentrovaná na tlačítko */}
      <motion.div
        key={breathPhase}
        className="rounded-full"
        style={{
          width: '45vw',
          height: '45vw',
          maxWidth: '330px',
          maxHeight: '330px',
          minWidth: '200px',
          minHeight: '200px',
          background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 25%, rgba(255,255,255,1) 25%, rgba(255,255,255,1) 100%)',
          transformOrigin: 'center center',
        }}
        initial={{
          opacity: 0.8,
          scale: breathPhase === 'in' ? 0.2 : 1.2
        }}
        animate={isBreathing ? {
          scale: breathPhase === 'in'
            ? [0.2, 1.2]  // Nádech - zvětšování až na 120%
            : breathPhase === 'out'
            ? [1.2, 0.2]  // Výdech - zmenšování až na 20%
            : 1.2,
          opacity: [0.8, 1, 0.8]
        } : {
          scale: 1.0,
          opacity: 0.8
        }}
        exit={{ opacity: 0 }}
        transition={isBreathing ? {
          duration: breathPhase === 'in' ? breathInDuration : breathOutDuration,
          delay: breathPhase === 'out' ? 0.2 : 0,  // Pozdržení výdechu, aby počkal na zvuk
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse"
        } : {
          duration: 0.5
        }}
      />
    </div>
  );
};

export default BreathingAnimation;

