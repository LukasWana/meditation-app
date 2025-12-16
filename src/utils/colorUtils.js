/**
 * Utility funkce pro práci s barvami
 */

/**
 * Přidá opacity k barvě (rgba, rgb, hex)
 * @param {string} color - Barva v jakémkoli formátu
 * @param {number} opacity - Opacity hodnota 0-1
 * @returns {string} Barva s opacity
 */
export const addOpacityToColor = (color, opacity = 1) => {
  if (!color) return color;

  // Pokud je barva v rgba formátu, upravit alpha hodnotu
  if (color.startsWith('rgba')) {
    return color.replace(/rgba?\(([^)]+)\)/, (match, values) => {
      const parts = values.split(',').map(v => v.trim());
      if (parts.length === 4) {
        // Už máme alpha hodnotu, nahradit ji
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity})`;
      } else if (parts.length === 3) {
        // Přidat alpha hodnotu
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity})`;
      }
      return match;
    });
  }

  // Pokud je barva v rgb formátu, převést na rgba
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
  }

  // Pokud je barva v hex formátu, přidat alpha hodnotu
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    // Pokud už má alpha kanál (8 znaků), nahradit ho
    if (hex.length === 8) {
      const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
      return `#${hex.slice(0, 6)}${alphaHex}`;
    }
    // Jinak přidat alpha kanál
    const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `#${hex}${alphaHex}`;
  }

  return color;
};

/**
 * Detekuje, zda je barva tmavá (pro dark mode)
 * @param {string} textColor - Barva textu
 * @returns {boolean} True pokud je dark mode
 */
export const isDarkMode = (textColor) => {
  if (!textColor) return false;

  return (
    textColor.includes('255, 255, 255') ||
    textColor === '#ffffff' ||
    textColor === 'white' ||
    textColor.includes('rgba(255, 255, 255')
  );
};

/**
 * Získá vhodnou barvu textu podle colorMode
 * @param {string} colorMode - 'dark' nebo 'light'
 * @param {string} textColor - Aktuální barva textu z tématu
 * @returns {string} Barva textu (#ffffff pro dark, #000000 pro light)
 */
export const getDisplayTextColor = (colorMode, textColor) => {
  if (colorMode === 'dark') {
    return '#ffffff';
  }
  if (colorMode === 'light') {
    return '#000000';
  }
  // Fallback na detekci z textColor
  return isDarkMode(textColor) ? '#ffffff' : '#000000';
};

/**
 * Získá opacity hodnotu podle colorMode
 * @param {string} colorMode - 'dark' nebo 'light'
 * @returns {number} Opacity hodnota (0.5 pro light, 0.8 pro dark)
 */
export const getOpacityForMode = (colorMode) => {
  return colorMode === 'light' ? 0.5 : 0.8;
};

/**
 * Převádí barvu na rgba formát
 * @param {string} color - Barva v jakémkoli formátu
 * @returns {string} Barva v rgba formátu
 */
export const toRgba = (color) => {
  if (!color) return 'rgba(0, 0, 0, 1)';

  // Pokud už je rgba, vrátit jak je
  if (color.startsWith('rgba')) {
    return color;
  }

  // Pokud je rgb, převést na rgba
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', ', 1)');
  }

  // Pokud je hex, převést na rgba
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 1)`;
  }

  return color;
};

