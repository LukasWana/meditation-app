import { useMemo } from 'react';
import animationConfig from '@config/animations';

/**
 * Hook pro přístup k animační konfiguraci
 *
 * @param {Object} overrides - Volitelné override hodnoty pro specifické případy
 * @returns {Object} Animace konfigurace s možnými override hodnotami
 *
 * @example
 * const config = useAnimationConfig();
 * const customConfig = useAnimationConfig({ durations: { fast: 0.1 } });
 */
export const useAnimationConfig = (overrides = {}) => {
  return useMemo(() => {
    if (!overrides || Object.keys(overrides).length === 0) {
      return animationConfig;
    }

    // Merge override hodnot s výchozí konfigurací
    const merged = { ...animationConfig };

    // Merge durations
    if (overrides.durations) {
      merged.durations = { ...animationConfig.durations, ...overrides.durations };
    }

    // Merge easings
    if (overrides.easings) {
      merged.easings = { ...animationConfig.easings, ...overrides.easings };
    }

    // Merge spring
    if (overrides.spring) {
      merged.spring = { ...animationConfig.spring, ...overrides.spring };
    }

    // Merge ostatní konfigurace
    Object.keys(overrides).forEach(key => {
      if (key !== 'durations' && key !== 'easings' && key !== 'spring') {
        merged[key] = { ...animationConfig[key], ...overrides[key] };
      }
    });

    return merged;
  }, [overrides]);
};

/**
 * Hook pro získání konkrétní části konfigurace
 *
 * @param {string} configKey - Klíč konfigurace (např. 'durations', 'spring', 'buttonAnimations')
 * @returns {*} Hodnota konfigurace pro daný klíč
 *
 * @example
 * const durations = useAnimationConfigValue('durations');
 * const buttonAnim = useAnimationConfigValue('buttonAnimations');
 */
export const useAnimationConfigValue = (configKey) => {
  return useMemo(() => {
    return animationConfig[configKey];
  }, [configKey]);
};

export default useAnimationConfig;

