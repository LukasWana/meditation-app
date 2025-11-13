import { useMemo } from 'react';
import { isDarkColor, shouldUseDarkMode } from '@utils/colorUtils';

/**
 * Hook pro získání adaptivních barev textů na základě pozadí
 * @param {string|null} backgroundColor - Hex barva pozadí
 * @param {string|null} shaderKey - Klíč shaderu (může být __COLOR__#hex)
 * @returns {object} Objekt s CSS třídami pro různé typy textů
 */
export const useAdaptiveTextColors = (backgroundColor = null, shaderKey = null) => {
  const isDark = useMemo(() => {
    // Pokud je shaderKey barva, použij ji
    if (shaderKey?.startsWith('__COLOR__')) {
      const color = shaderKey.replace('__COLOR__', '');
      return isDarkColor(color);
    }

    // Pokud je předána backgroundColor, použij ji
    if (backgroundColor) {
      return isDarkColor(backgroundColor);
    }

    // Jinak použij shouldUseDarkMode pro shader
    if (shaderKey) {
      return shouldUseDarkMode(shaderKey, backgroundColor);
    }

    // Default: světlé pozadí
    return false;
  }, [backgroundColor, shaderKey]);

  return useMemo(() => {
    if (isDark) {
      return {
        primary: 'text-white',
        secondary: 'text-gray-300',
        muted: 'text-gray-400',
        heading: 'text-white',
        label: 'text-gray-300',
        border: 'border-white/20',
        bgCard: 'bg-white/10',
        bgCardHover: 'bg-white/20',
        isDark: true
      };
    } else {
      return {
        primary: 'text-black',
        secondary: 'text-gray-700',
        muted: 'text-gray-500',
        heading: 'text-black',
        label: 'text-gray-700',
        border: 'border-black/10',
        bgCard: 'bg-white/80',
        bgCardHover: 'bg-white',
        isDark: false
      };
    }
  }, [isDark]);
};

