// Jednoduché animácie pomocou CSS a React

// Fluidné animácie pre tlačidlá
export const buttonAnimations = {
  // Animácia pri hover
  hoverIn: (element) => {
    if (element) {
      element.style.transform = 'scale(1.05)';
      element.style.transition = 'transform 0.2s ease-out';
    }
  },

  // Animácia pri hover out
  hoverOut: (element) => {
    if (element) {
      element.style.transform = 'scale(1)';
      element.style.transition = 'transform 0.2s ease-out';
    }
  },

  // Animácia pri kliknutí
  click: (element) => {
    if (element) {
      element.style.transform = 'scale(0.95)';
      element.style.transition = 'transform 0.1s ease-in';

      setTimeout(() => {
        element.style.transform = 'scale(1.05)';
        element.style.transition = 'transform 0.15s ease-out';
      }, 100);
    }
  },

  // Ripple efekt pre tlačidlá
  ripple: (element, event) => {
    if (!element) return;

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
      transition: transform 0.6s ease-out, opacity 0.6s ease-out;
    `;

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    // Trigger animácie
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(1)';
      ripple.style.opacity = '0';
    });

    // Vyčistenie
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }
};

// Animácie pre prechody medzi obrazovkami
export const pageTransitions = {
  // Fade in animácia
  fadeIn: (element) => {
    if (element) {
      element.style.opacity = '0';
      element.style.transform = 'translateY(30px)';
      element.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';

      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      });
    }
  },

  // Fade out animácia
  fadeOut: (element) => {
    if (element) {
      element.style.transition = 'opacity 0.4s ease-in, transform 0.4s ease-in';
      element.style.opacity = '0';
      element.style.transform = 'translateY(-30px)';

      return new Promise(resolve => {
        setTimeout(resolve, 400);
      });
    }
    return Promise.resolve();
  },

  // Slide in zľava
  slideInLeft: (element) => {
    if (element) {
      element.style.opacity = '0';
      element.style.transform = 'translateX(-100px)';
      element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateX(0)';
      });
    }
  },

  // Slide in zdola
  slideInUp: (element) => {
    if (element) {
      element.style.opacity = '0';
      element.style.transform = 'translateY(100px)';
      element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      });
    }
  }
};

// Animácie pre dotykové interakcie
export const touchAnimations = {
  // Animácia pri dotyku
  touchStart: (element) => {
    if (element) {
      element.style.transform = 'scale(0.98)';
      element.style.transition = 'transform 0.1s ease-in';
    }
  },

  // Animácia pri pustení dotyku
  touchEnd: (element) => {
    if (element) {
      element.style.transform = 'scale(1)';
      element.style.transition = 'transform 0.2s ease-out';
    }
  },

  // Bounce animácia pre úspešnú akciu
  bounce: (element) => {
    if (element) {
      element.style.transform = 'scale(1.2)';
      element.style.transition = 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';

      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
    }
  }
};

// Animácie pre meditačné elementy
export const meditationAnimations = {
  // Pulsujúca animácia pre kruh
  pulse: (element) => {
    if (element) {
      const animate = () => {
        element.style.transform = 'scale(1.1)';
        element.style.opacity = '1';
        element.style.transition = 'transform 2s ease-in-out, opacity 2s ease-in-out';

        setTimeout(() => {
          element.style.transform = 'scale(1)';
          element.style.opacity = '0.8';
        }, 1000);
      };

      animate();
      return setInterval(animate, 2000);
    }
    return null;
  },

  // Rotujúca animácia
  rotate: (element) => {
    if (element) {
      element.style.transform = 'rotate(0deg)';
      element.style.transition = 'transform 10s linear';

      requestAnimationFrame(() => {
        element.style.transform = 'rotate(360deg)';
      });
    }
  },

  // Dýchacia animácia
  breathe: (element) => {
    if (!element) return { breatheIn: null, breatheOut: null, play: () => {} };

    let currentScale = 1;

    const breatheIn = () => {
      element.style.transform = `scale(${currentScale})`;
      element.style.transition = 'transform 4s ease-in-out';

      const interval = setInterval(() => {
        if (currentScale < 1.3) {
          currentScale += 0.01;
          element.style.transform = `scale(${currentScale})`;
        } else {
          clearInterval(interval);
          breatheOut();
        }
      }, 40);
    };

    const breatheOut = () => {
      const interval = setInterval(() => {
        if (currentScale > 1) {
          currentScale -= 0.01;
          element.style.transform = `scale(${currentScale})`;
        } else {
          clearInterval(interval);
          breatheIn();
        }
      }, 40);
    };

    return {
      breatheIn,
      breatheOut,
      play: breatheIn
    };
  }
};

// Stagger animácie pre viacero elementov
export const staggerAnimations = {
  // Stagger fade in
  staggerFadeIn: (elements, delay = 100) => {
    if (!elements || elements.length === 0) return;

    elements.forEach((element, index) => {
      if (element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

        setTimeout(() => {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
        }, index * delay);
      }
    });
  },

  // Stagger scale
  staggerScale: (elements, delay = 50) => {
    if (!elements || elements.length === 0) return;

    elements.forEach((element, index) => {
      if (element) {
        element.style.transform = 'scale(0)';
        element.style.transition = 'transform 0.4s ease-out';

        setTimeout(() => {
          element.style.transform = 'scale(1)';
        }, index * delay);
      }
    });
  }
};

// Utility funkcie
export const animationUtils = {
  // Pausovanie všetkých animácií
  pauseAll: () => {
    // CSS animácie sa nedajú pausovať, takže len logujeme
    console.log('Animations paused');
  },

  // Pokračovanie všetkých animácií
  resumeAll: () => {
    console.log('Animations resumed');
  },

  // Zastavenie všetkých animácií
  stopAll: () => {
    // Odstránime všetky transition štýly
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      element.style.transition = '';
      element.style.transform = '';
    });
  }
};
