/**
 * Centrální konfigurace pro všechny GUI animace
 *
 * Tento soubor obsahuje všechny animační parametry používané v aplikaci.
 * Všechny komponenty by měly používat tyto hodnoty pro konzistentní animace.
 */

// Délky trvání animací (v sekundách)
export const durations = {
  fast: 0.2,      // Rychlé animace (hover efekty)
  normal: 0.3,    // Standardní animace (fade in/out)
  medium: 0.4,    // Střední animace (scale, slide)
  slow: 0.6,      // Pomalé animace (page transitions)
  slower: 0.8,    // Velmi pomalé animace (text animations)
  pageTransition: 0.35,  // Page transitions
  pageTransitionScale: 0.45,  // Page transitions s scale efektem
};

// Easing funkce (cubic-bezier hodnoty)
export const easings = {
  easeOut: [0.4, 0, 0.2, 1],      // Standardní ease-out
  easeIn: [0.4, 0, 1, 1],         // Standardní ease-in
  easeInOut: [0.4, 0, 0.2, 1],    // Standardní ease-in-out
  easeOutCubic: 'easeOutCubic',   // Pro Framer Motion string hodnoty
  easeInCubic: 'easeInCubic',
  easeInOutCubic: 'easeInOutCubic',
};

// Spring parametry pro Framer Motion
export const spring = {
  // Výchozí spring pro většinu animací
  default: {
    type: 'spring',
    stiffness: 100,
    damping: 20,
  },

  // Pro page transitions
  pageTransition: {
    type: 'spring',
    stiffness: 100,
    damping: 20,
    duration: durations.slow,
  },

  // Pro button hover efekty
  buttonHover: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  },

  // Pro button tap efekty
  buttonTap: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },

  // Pro button animate
  buttonAnimate: {
    type: 'spring',
    stiffness: 600,
    damping: 35,
  },

  // Pro section hover efekty
  sectionHover: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },

  // Pro section tap efekty
  sectionTap: {
    type: 'spring',
    stiffness: 500,
    damping: 30,
  },

  // Pro slideInTop animaci (speciální)
  slideInTop: {
    type: 'spring',
    stiffness: 160,
    damping: 10,
    mass: 1.0,
    bounce: 0.6,
  },

  // Pro audio player animace
  audioPlayer: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  },

  // Pro text animace
  text: {
    type: 'spring',
    stiffness: 120,
    damping: 20,
  },
};

// Varianty pro page transitions (FramerPageTransition)
export const pageTransitionVariants = {
  slide: {
    initial: {
      opacity: 0,
    },
    in: {
      opacity: 1,
    },
    out: {
      opacity: 0,
    },
    transition: {
      duration: durations.pageTransition,
      ease: easings.easeOut,
    },
  },

  fade: {
    initial: {
      opacity: 0,
    },
    in: {
      opacity: 1,
    },
    out: {
      opacity: 0,
    },
    transition: {
      duration: durations.pageTransition,
      ease: easings.easeOut,
    },
  },

  scale: {
    initial: {
      opacity: 0,
    },
    in: {
      opacity: 1,
    },
    out: {
      opacity: 0,
    },
    transition: {
      duration: durations.pageTransition,
      ease: easings.easeOut,
    },
  },
};

// Varianty pro section animace (FramerSection)
// Všechny animace jsou pouze fadeIn/fadeOut bez pohybu
export const sectionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  slideInLeft: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  slideInUp: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  scaleIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  slideInTop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

// Transition konfigurace pro section animace
export const sectionTransitions = {
  default: {
    duration: durations.slow,
    ease: easings.easeOut,
    ...spring.default,
  },

  slideInTop: spring.slideInTop,
};

// Button animace - bez pohybu, jen opacity
export const buttonAnimations = {
  hover: {
    opacity: 0.9,
    transition: spring.buttonHover,
  },

  tap: {
    opacity: 0.8,
    transition: spring.buttonTap,
  },

  animate: {
    opacity: 1,
    transition: spring.buttonAnimate,
  },

  // CSS transition pro Tailwind
  cssTransition: 'transition-colors duration-200 ease-out',
};

// Section hover/tap animace - bez pohybu, jen opacity
export const sectionInteractions = {
  hover: {
    opacity: 0.9,
    transition: spring.sectionHover,
  },

  tap: {
    opacity: 0.8,
    transition: spring.sectionTap,
  },
};

// Audio player animace
export const audioPlayerAnimations = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: durations.normal,
      ease: 'easeOut',
    },
  },

  container: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: durations.medium,
      ease: 'easeOut',
      ...spring.audioPlayer,
    },
  },
};

// Text animace - bez pohybu, jen opacity
export const textAnimations = {
  default: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        delay: 0.3, // Text se zobrazí po sekci
        duration: durations.slower,
        ...spring.text,
      },
    },
  },
};

// Hlavní export konfigurace
export const animationConfig = {
  durations,
  easings,
  spring,
  pageTransitionVariants,
  sectionVariants,
  sectionTransitions,
  buttonAnimations,
  sectionInteractions,
  audioPlayerAnimations,
  textAnimations,
};

export default animationConfig;

