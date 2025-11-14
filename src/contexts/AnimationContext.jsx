import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const AnimationContext = createContext();

/**
 * Hook pro přístup k AnimationContext
 * @returns {Object} Animation context value
 */
export const useAnimationControl = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimationControl must be used within an AnimationProvider');
  }
  return context;
};

/**
 * Provider komponenta pro globální ovládání animací
 *
 * Poskytuje:
 * - enabled: zda jsou animace povoleny
 * - paused: zda jsou animace pozastaveny
 * - prefersReducedMotion: zda uživatel preferuje reduced motion
 * - enable/disable/pause/resume funkce
 */
export const AnimationProvider = ({ children }) => {
  // Stav animací
  const [enabled, setEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detekce prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Nastav počáteční hodnotu
    setPrefersReducedMotion(mediaQuery.matches);

    // Poslouchej změny
    const handleChange = (e) => {
      setPrefersReducedMotion(e.matches);
      // Automaticky vypni animace pokud uživatel preferuje reduced motion
      if (e.matches) {
        setEnabled(false);
      }
    };

    // Moderní API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Fallback pro starší prohlížeče
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Funkce pro ovládání animací
  const enable = () => {
    // Nezapínej animace pokud uživatel preferuje reduced motion
    if (!prefersReducedMotion) {
      setEnabled(true);
    }
  };

  const disable = () => {
    setEnabled(false);
  };

  const pause = () => {
    setPaused(true);
  };

  const resume = () => {
    setPaused(false);
  };

  const toggle = () => {
    if (enabled) {
      disable();
    } else {
      enable();
    }
  };

  // Vypočítaná hodnota - animace jsou aktivní pouze pokud jsou enabled a nejsou paused
  const isActive = useMemo(() => {
    return enabled && !paused && !prefersReducedMotion;
  }, [enabled, paused, prefersReducedMotion]);

  const value = useMemo(() => ({
    // Stav
    enabled,
    paused,
    prefersReducedMotion,
    isActive,

    // Funkce
    enable,
    disable,
    pause,
    resume,
    toggle,
  }), [enabled, paused, prefersReducedMotion, isActive]);

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};

export default AnimationContext;

