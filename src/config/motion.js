/**
 * Pohyb a přechody — jediný zdroj pravdy.
 * Doby trvání zrcadlí CSS tokeny v index.css (--duration-*),
 * aby se CSS přechody a framer-motion nerozešly.
 *
 * Nahrazuje původní src/config/animations.js a src/constants/animations.js.
 */

export const DURATION = { fast: 0.15, normal: 0.25, slow: 0.4 };
export const EASE = { standard: [0.4, 0, 0.2, 1], out: [0, 0, 0.2, 1] };

export const SPRING = {
  default: { type: 'spring', stiffness: 300, damping: 30 },
  gentle:  { type: 'spring', stiffness: 200, damping: 25 },
  stiff:   { type: 'spring', stiffness: 400, damping: 35 },
};

export const ANIMATION_TYPES = {
  FADE: 'fade',
  SLIDE: 'slide',
  SCALE: 'scale',
  MODAL: 'modal',
};

export const SLIDE_DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
};

export const TRANSITION_VARIANTS = {
  fade: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  },
  slide: {
    up: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 },
    },
    down: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 },
    },
    left: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 },
    },
    right: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 },
    },
  },
  scale: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  },
  modal: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  },
};

export const TRANSITION_CONFIG = {
  type: 'tween',
  duration: DURATION.normal,
  ease: 'easeInOut',
};

export const TIMING = {
  FAST: '0.2s ease',
  NORMAL: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  SLOW: '0.4s ease-in-out',
  EASE_IN_OUT: '0.3s ease-in-out',
  EASE_OUT: '0.3s ease-out',
  EASE_IN: '0.3s ease-in',
};

export const FRAMER_ANIMATIONS = {
  SPRING: SPRING.default,
  SPRING_GENTLE: SPRING.gentle,
  SPRING_STIFF: SPRING.stiff,
  FADE_IN: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: DURATION.normal },
  },
  SLIDE_UP: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: DURATION.normal },
  },
  SCALE: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: DURATION.fast },
  },
};

export const ANIMATION_CLASSES = {
  FADE_IN: 'animate-fade-in',
  SLIDE_UP: 'animate-slide-up',
  SCALE: 'animate-scale',
  SPIN: 'animate-spin',
};

/** Přechod mezi obrazovkami — záměrně čistý fade, bez posunů. */
export const screenTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DURATION.normal, ease: EASE.standard },
};

/** Nástup nadpisu. Používá výhradně <Heading>, aby byl všude stejný. */
export const headingEntrance = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DURATION.normal, ease: EASE.out },
};

/** Postupný nástup seznamu. Rodič dostane stagger, potomci item. */
export const stagger = {
  container: { animate: { transition: { staggerChildren: 0.05 } } },
  item: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: DURATION.fast } },
  },
};

export const getTransitionVariants = (transitionType, direction = null) => {
  if (transitionType === 'slide' && direction) {
    return TRANSITION_VARIANTS.slide[direction];
  }
  return TRANSITION_VARIANTS[transitionType] || TRANSITION_VARIANTS.fade;
};

export const getTransitionConfig = (duration = null) => {
  return {
    ...TRANSITION_CONFIG,
    duration: duration || TRANSITION_CONFIG.duration,
  };
};