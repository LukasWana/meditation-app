import { useMemo } from 'react';
import theme from '@config/theme';

/**
 * Hook pro přístup k theme konfiguraci
 *
 * @param {Object} overrides - Volitelné override hodnoty pro specifické případy
 * @returns {Object} Theme konfigurace s možnými override hodnotami
 *
 * @example
 * const theme = useTheme();
 * const customTheme = useTheme({ colors: { primary: '#custom' } });
 */
export const useTheme = (overrides = {}) => {
  return useMemo(() => {
    if (!overrides || Object.keys(overrides).length === 0) {
      return theme;
    }

    // Merge override hodnot s výchozí theme konfigurací
    const merged = { ...theme };

    // Merge colors
    if (overrides.colors) {
      merged.colors = { ...theme.colors, ...overrides.colors };
    }

    // Merge spacing
    if (overrides.spacing) {
      merged.spacing = { ...theme.spacing, ...overrides.spacing };
    }

    // Merge ostatní konfigurace
    Object.keys(overrides).forEach(key => {
      if (key !== 'colors' && key !== 'spacing') {
        merged[key] = { ...theme[key], ...overrides[key] };
      }
    });

    return merged;
  }, [overrides]);
};

/**
 * Hook pro získání konkrétní části theme konfigurace
 *
 * @param {string} themeKey - Klíč theme (např. 'colors', 'spacing', 'buttonVariants')
 * @returns {*} Hodnota theme pro daný klíč
 *
 * @example
 * const colors = useThemeValue('colors');
 * const buttonVariants = useThemeValue('buttonVariants');
 */
export const useThemeValue = (themeKey) => {
  return useMemo(() => {
    return theme[themeKey];
  }, [themeKey]);
};

/**
 * Utility funkce pro generování CSS tříd z button varianty
 *
 * @param {string} variant - Název varianty ('primary', 'secondary', 'ghost', 'rounded')
 * @param {boolean} disabled - Zda je button disabled
 * @returns {string} CSS třídy pro button
 */
export const getButtonClasses = (variant = 'primary', disabled = false) => {
  const variantConfig = theme.buttonVariants[variant] || theme.buttonVariants.primary;

  const classes = [
    variantConfig.base,
    !disabled && variantConfig.hover,
    !disabled && variantConfig.active,
  ].filter(Boolean).join(' ');

  return classes;
};

/**
 * Utility funkce pro generování CSS tříd z card varianty
 *
 * @param {string} variant - Název varianty ('default', 'solid', 'elevated')
 * @returns {string} CSS třídy pro card
 */
export const getCardClasses = (variant = 'default') => {
  const variantConfig = theme.cardVariants[variant] || theme.cardVariants.default;

  return `${variantConfig.base} ${variantConfig.hover}`;
};

/**
 * Utility funkce pro generování CSS tříd a stylů z modal varianty
 *
 * @param {string} variant - Název varianty ('default', 'fullscreen')
 * @returns {Object} Objekt s className a style pro modal
 */
export const getModalClasses = (variant = 'default') => {
  const baseClasses = 'fixed inset-0 flex items-center justify-center';

  if (variant === 'fullscreen') {
    return {
      className: baseClasses,
      style: {
        zIndex: theme.zIndex.modal,
      }
    };
  }

  return {
    className: baseClasses,
    style: {
      zIndex: theme.zIndex.modal,
    }
  };
};

/**
 * Utility funkce pro generování stylů z text varianty
 *
 * @param {string} variant - Název varianty ('heading', 'body', 'caption', 'label', 'h1', 'h2', 'h3')
 * @param {string} color - Volitelná barva textu (default: theme.colors.black)
 * @returns {Object} Objekt se stylem pro text
 */
export const getTextClasses = (variant = 'body', color = null) => {
  const textVariants = {
    h1: {
      fontSize: theme.typography.fontSize['4xl'],
      fontWeight: theme.typography.fontWeight.light,
    },
    h2: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.light,
    },
    h3: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.light,
    },
    heading: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.light,
    },
    body: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.normal,
    },
    caption: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.normal,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
  };

  const variantStyle = textVariants[variant] || textVariants.body;

  return {
    style: {
      ...variantStyle,
      color: color || theme.colors.black,
    }
  };
};

/**
 * Utility funkce pro generování CSS tříd a stylů pro toggle button (aktivní/neaktivní stav)
 *
 * @param {boolean} isActive - Zda je button aktivní
 * @returns {Object} Objekt s className a style pro button
 */
export const getToggleButtonClasses = (isActive = false) => {
  if (isActive) {
    return {
      className: 'px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5',
      style: {
        backgroundColor: theme.colors.black,
        color: theme.colors.white,
      }
    };
  }

  return {
    className: 'px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 border',
    style: {
      backgroundColor: theme.colors.overlay.white70,
      color: theme.colors.gray[700],
      borderColor: theme.colors.overlay.black10,
    },
    hoverStyle: {
      backgroundColor: theme.colors.white,
    }
  };
};

/**
 * Utility funkce pro generování overlay barvy s opacity
 *
 * @param {string} color - Barva ('black' nebo 'white')
 * @param {number} opacity - Opacity (7, 10, 15, 20, 30, 40, 50, 70, 80, 90)
 * @returns {string} RGBA barva
 */
export const getOverlayColor = (color = 'black', opacity = 50) => {
  const opacityKey = `${color}${opacity}`;
  return theme.colors.overlay[opacityKey] || theme.colors.overlay.black50;
};

/**
 * Utility funkce pro generování spacing hodnoty
 *
 * @param {string} size - Velikost ('xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl')
 * @returns {string} Spacing hodnota
 */
export const getSpacing = (size = 'md') => {
  return theme.spacing[size] || theme.spacing.md;
};

/**
 * Utility funkce pro generování shadow hodnoty
 *
 * @param {string} size - Velikost ('sm', 'md', 'lg', 'xl')
 * @returns {string} Shadow hodnota
 */
export const getShadow = (size = 'md') => {
  return theme.shadows[size] || theme.shadows.md;
};

/**
 * Utility funkce pro generování border radius hodnoty
 *
 * @param {string} size - Velikost ('sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full')
 * @returns {string} Border radius hodnota
 */
export const getBorderRadius = (size = 'md') => {
  return theme.borderRadius[size] || theme.borderRadius.md;
};

/**
 * Utility funkce pro generování input stylů
 *
 * @param {boolean} isDarkMode - Zda je dark mode aktivní
 * @param {boolean} hasError - Zda má input chybu
 * @returns {Object} Objekt s className a style pro input
 */
export const getInputClasses = (isDarkMode = false, hasError = false) => {
  const baseStyle = {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: '1px',
    fontSize: theme.typography.fontSize.base,
  };

  if (hasError) {
    return {
      className: 'w-full transition-colors',
      style: {
        ...baseStyle,
        backgroundColor: isDarkMode ? theme.colors.gray[800] : theme.colors.white,
        borderColor: theme.colors.red?.[500] || '#ef4444',
        color: isDarkMode ? theme.colors.white : theme.colors.gray[900],
      }
    };
  }

  return {
    className: 'w-full transition-colors',
    style: {
      ...baseStyle,
      backgroundColor: isDarkMode ? theme.colors.gray[800] : theme.colors.white,
      borderColor: isDarkMode ? theme.colors.gray[600] : theme.colors.gray[300],
      color: isDarkMode ? theme.colors.white : theme.colors.gray[900],
    }
  };
};

export default useTheme;

