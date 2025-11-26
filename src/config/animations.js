/**
 * Globální konfigurace animací pro aplikaci
 * Všechny animace se řídí z tohoto jednoho místa
 */

// Typy animací
export const ANIMATION_TYPES = {
  FADE: 'fade',
  SLIDE: 'slide',
  SCALE: 'scale',
  MODAL: 'modal'
};

// Směry pro slide animace
export const SLIDE_DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
};

// Globální konfigurace animací - pouze fade bez posunů
export const TRANSITION_VARIANTS = {
  fade: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  },
  slide: {
    up: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 }
    },
    down: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 }
    },
    left: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 }
    },
    right: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 }
    }
  },
  scale: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  },
  modal: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  }
};

// Globální konfigurace transition
export const TRANSITION_CONFIG = {
  type: "tween",
  duration: 0.2,
  ease: "easeInOut"
};

// Helper funkce pro získání variant podle typu a směru
export const getTransitionVariants = (transitionType, direction = null) => {
  if (transitionType === 'slide' && direction) {
    return TRANSITION_VARIANTS.slide[direction];
  }
  return TRANSITION_VARIANTS[transitionType] || TRANSITION_VARIANTS.fade;
};

// Helper funkce pro získání transition konfigurace
export const getTransitionConfig = (duration = null) => {
  return {
    ...TRANSITION_CONFIG,
    duration: duration || TRANSITION_CONFIG.duration
  };
};

