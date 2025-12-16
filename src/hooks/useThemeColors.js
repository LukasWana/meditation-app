import { useTheme } from '@contexts/ThemeContext';
import { getDisplayTextColor, getOpacityForMode, addOpacityToColor } from '@utils/colorUtils';

/**
 * Hook pro konzistentní práci s barvami tématu
 * Poskytuje helper funkce a computed hodnoty
 */
export const useThemeColors = () => {
  const { getCurrentThemeColors, colorMode, getBackgroundColor, getBackgroundImageUrl, allowsCustomBackground, currentTheme } = useTheme();
  const themeColors = getCurrentThemeColors();

  // Zkontrolovat, zda máme vlastní pozadí
  const backgroundUrl = getBackgroundImageUrl();
  const customBackgroundColor = getBackgroundColor();
  const hasImage = !!backgroundUrl && allowsCustomBackground;
  const hasCustomColor = !!customBackgroundColor && !hasImage;
  const hasCustomBackground = hasImage || hasCustomColor;

  // Helper funkce pro získání barvy textu
  const getTextColor = () => {
    return getDisplayTextColor(colorMode, themeColors?.text);
  };

  // Helper funkce pro získání barvy pozadí sekce s opacity
  const getSectionBackgroundColor = (isPrimary = false) => {
    if (hasCustomBackground) {
      const baseColor = hasImage
        ? (isPrimary ? currentTheme?.colors?.primary : currentTheme?.colors?.card)
        : customBackgroundColor;

      if (baseColor) {
        return addOpacityToColor(baseColor, getOpacityForMode(colorMode));
      }
    }

    // Fallback na defaultní barvy
    return isPrimary
      ? (currentTheme?.colors?.primary || themeColors?.primary || '#f4ddc4')
      : (currentTheme?.colors?.card || themeColors?.card || '#ffffff');
  };

  return {
    // Barvy z tématu
    colors: themeColors,
    background: themeColors?.background,
    text: themeColors?.text,
    card: themeColors?.card,
    primary: themeColors?.primary,
    textSecondary: themeColors?.textSecondary,

    // Helper funkce
    getTextColor,
    getSectionBackgroundColor,

    // Stav
    colorMode,
    isDark: colorMode === 'dark',
    isLight: colorMode === 'light',
    hasCustomBackground,
    hasImage,
    hasCustomColor,
    customBackgroundColor,

    // Opacity helper
    getOpacity: () => getOpacityForMode(colorMode),
    addOpacity: (color, opacity = null) => {
      const finalOpacity = opacity !== null ? opacity : getOpacityForMode(colorMode);
      return addOpacityToColor(color, finalOpacity);
    }
  };
};

