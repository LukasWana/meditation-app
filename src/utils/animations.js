import anime from 'animejs/lib/anime.es.js';

// Fluidné animácie pre tlačidlá
export const buttonAnimations = {
  // Animácia pri hover
  hoverIn: (element) => {
    anime({
      targets: element,
      scale: 1.05,
      duration: 200,
      easing: 'easeOutCubic',
    });
  },

  // Animácia pri hover out
  hoverOut: (element) => {
    anime({
      targets: element,
      scale: 1,
      duration: 200,
      easing: 'easeOutCubic',
    });
  },

  // Animácia pri kliknutí
  click: (element) => {
    anime({
      targets: element,
      scale: 0.95,
      duration: 100,
      easing: 'easeInCubic',
      complete: () => {
        anime({
          targets: element,
          scale: 1.05,
          duration: 150,
          easing: 'easeOutCubic',
        });
      }
    });
  },

  // Ripple efekt pre tlačidlá
  ripple: (element, event) => {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      pointer-events: none;
      z-index: 1000;
    `;

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    anime({
      targets: ripple,
      scale: [0, 1],
      opacity: [0.6, 0],
      duration: 600,
      easing: 'easeOutQuart',
      complete: () => {
        ripple.remove();
      }
    });
  }
};

// Animácie pre prechody medzi obrazovkami
export const pageTransitions = {
  // Fade in animácia
  fadeIn: (element) => {
    anime({
      targets: element,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      easing: 'easeOutCubic',
    });
  },

  // Fade out animácia
  fadeOut: (element) => {
    return anime({
      targets: element,
      opacity: [1, 0],
      translateY: [0, -30],
      duration: 400,
      easing: 'easeInCubic',
    });
  },

  // Slide in zľava
  slideInLeft: (element) => {
    anime({
      targets: element,
      translateX: [-100, 0],
      opacity: [0, 1],
      duration: 600,
      easing: 'easeOutCubic',
    });
  },

  // Slide in zdola
  slideInUp: (element) => {
    anime({
      targets: element,
      translateY: [100, 0],
      opacity: [0, 1],
      duration: 600,
      easing: 'easeOutCubic',
    });
  }
};

// Animácie pre dotykové interakcie
export const touchAnimations = {
  // Animácia pri dotyku
  touchStart: (element) => {
    anime({
      targets: element,
      scale: 0.98,
      duration: 100,
      easing: 'easeInCubic',
    });
  },

  // Animácia pri pustení dotyku
  touchEnd: (element) => {
    anime({
      targets: element,
      scale: 1,
      duration: 200,
      easing: 'easeOutCubic',
    });
  },

  // Bounce animácia pre úspešnú akciu
  bounce: (element) => {
    anime({
      targets: element,
      scale: [1, 1.2, 1],
      duration: 400,
      easing: 'easeOutElastic(1, .6)',
    });
  }
};

// Animácie pre meditačné elementy
export const meditationAnimations = {
  // Pulsujúca animácia pre kruh
  pulse: (element) => {
    anime({
      targets: element,
      scale: [1, 1.1, 1],
      opacity: [0.8, 1, 0.8],
      duration: 2000,
      loop: true,
      easing: 'easeInOutSine',
    });
  },

  // Rotujúca animácia
  rotate: (element) => {
    anime({
      targets: element,
      rotate: 360,
      duration: 10000,
      loop: true,
      easing: 'linear',
    });
  },

  // Dýchacia animácia
  breathe: (element) => {
    const breatheIn = anime({
      targets: element,
      scale: [1, 1.3],
      duration: 4000,
      easing: 'easeInOutSine',
    });

    const breatheOut = anime({
      targets: element,
      scale: [1.3, 1],
      duration: 4000,
      easing: 'easeInOutSine',
    });

    return {
      breatheIn,
      breatheOut,
      play: () => {
        breatheIn.play();
        setTimeout(() => breatheOut.play(), 4000);
      }
    };
  }
};

// Stagger animácie pre viacero elementov
export const staggerAnimations = {
  // Stagger fade in
  staggerFadeIn: (elements, delay = 100) => {
    anime({
      targets: elements,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 600,
      delay: anime.stagger(delay),
      easing: 'easeOutCubic',
    });
  },

  // Stagger scale
  staggerScale: (elements, delay = 50) => {
    anime({
      targets: elements,
      scale: [0, 1],
      duration: 400,
      delay: anime.stagger(delay),
      easing: 'easeOutBack',
    });
  }
};

// Utility funkcie
export const animationUtils = {
  // Vytvorenie timeline
  createTimeline: () => {
    return anime.timeline();
  },

  // Pausovanie všetkých animácií
  pauseAll: () => {
    anime.pause();
  },

  // Pokračovanie všetkých animácií
  resumeAll: () => {
    anime.play();
  },

  // Zastavenie všetkých animácií
  stopAll: () => {
    anime.remove();
  }
};
