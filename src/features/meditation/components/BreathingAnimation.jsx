import React, { useRef, useEffect } from 'react';
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
  const circleRef = useRef(null);

  // Vynutit, aby kruh byl vždy kulatý - nastavit okamžitě a při každé změně
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.style.setProperty('border-radius', '50%', 'important');
    }
  }, [breathPhase, isBreathing]);

  // Nastavit border-radius také při mount a při každém renderu
  const setBorderRadius = (element) => {
    if (element) {
      element.style.setProperty('border-radius', '50%', 'important');
    }
  };

  if (!isBreathing) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1, overflow: 'visible' }}>
      {/* Animace s maskou - bílý kruh uprostřed, černý okolo, vycentrovaná na tlačítko - pod play tlačítkem */}
      <motion.div
        ref={(el) => {
          circleRef.current = el;
          setBorderRadius(el);
        }}
        className="rounded-full breath-animation-circle"
        style={{
          // Velikost play tlačítka jako základní velikost
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
          pointerEvents: 'none'
        }}
        initial={{
          scale: 1.0,  // Začínáme ve velikosti play tlačítka (scale 1.0)
          opacity: 0.6
        }}
        animate={isBreathing ? {
          scale: breathPhase === 'in'
            ? [1.0, 2.5]  // Nádech - zvětšování z velikosti play tlačítka (1.0) až na 2.5x (45vw / 18vw ≈ 2.5)
            : breathPhase === 'out'
            ? [2.5, 1.0]  // Výdech - zmenšování z 2.5x zpět na velikost play tlačítka (1.0)
            : 1.0,  // Výchozí stav je velikost play tlačítka
          opacity: [0.8, 1, 0.8]
        } : {
          scale: 1.0,
          opacity: 0.8
        }}
        transition={isBreathing ? {
          duration: breathPhase === 'in' ? breathInDuration : breathOutDuration,
          delay: breathPhase === 'out' ? 0.2 : 0,  // Pozdržení výdechu, aby počkal na zvuk
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse"
        } : {
          duration: 0.5
        }}
        onAnimationStart={() => {
          if (circleRef.current) {
            circleRef.current.style.setProperty('border-radius', '50%', 'important');
          }
        }}
        onUpdate={() => {
          if (circleRef.current) {
            circleRef.current.style.setProperty('border-radius', '50%', 'important');
          }
        }}
      />
    </div>
  );
};

export default BreathingAnimation;

