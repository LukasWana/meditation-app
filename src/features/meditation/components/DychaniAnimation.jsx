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
const DychaniAnimation = ({
  isBreathing,
  breathPhase,
  breathInDuration,
  breathOutDuration
}) => {
  if (!isBreathing) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: -1 }}>
      {/* Animace s maskou - bílý kruh uprostřed, černý okolo, vycentrovaná na tlačítko */}
      {/* VYPNUTO - shader má vlastní pulzování podle dýchání */}
      {false && (
        <motion.div
          key={breathPhase}
          className="rounded-full"
          style={{
            width: '35vw',
            height: '35vw',
            maxWidth: '280px',
            maxHeight: '280px',
            minWidth: '180px',
            minHeight: '180px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0) 75%)',
            transformOrigin: 'center center',
          }}
          initial={{
            opacity: 0.05,
            scale: breathPhase === 'in' ? 0.2 : 1.2
          }}
          animate={isBreathing ? {
            scale: breathPhase === 'in'
              ? [0.2, 1.2]  // Nádech - zvětšování až na 120%
              : breathPhase === 'out'
              ? [1.2, 0.2]  // Výdech - zmenšování až na 20%
              : 1.2,
            opacity: [0.05, 0.1, 0.05] // Velmi nízká opacity pro lepší viditelnost shaderu
          } : {
            scale: 1.0,
            opacity: 0.05
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
      )}
    </div>
  );
};

export default DychaniAnimation;

