/**
 * Centralizovaný systém animací a přechodů
 */

// Timing funkce
export const TIMING = {
  FAST: '0.2s ease',
  NORMAL: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  SLOW: '0.4s ease-in-out',
  EASE_IN_OUT: '0.3s ease-in-out',
  EASE_OUT: '0.3s ease-out',
  EASE_IN: '0.3s ease-in'
};

// Framer Motion animace
export const FRAMER_ANIMATIONS = {
  SPRING: {
    type: 'spring',
    stiffness: 300,
    damping: 30
  },
  SPRING_GENTLE: {
    type: 'spring',
    stiffness: 200,
    damping: 25
  },
  SPRING_STIFF: {
    type: 'spring',
    stiffness: 400,
    damping: 35
  },
  FADE_IN: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  SLIDE_UP: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3 }
  },
  SCALE: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 }
  }
};

// CSS třídy pro animace
export const ANIMATION_CLASSES = {
  FADE_IN: 'animate-fade-in',
  SLIDE_UP: 'animate-slide-up',
  SCALE: 'animate-scale',
  SPIN: 'animate-spin'
};

