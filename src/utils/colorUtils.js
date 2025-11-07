/**
 * Utility funkce pro práci s barvami a detekci tmavosti
 */

/**
 * Převod hex barvy na RGB
 * @param {string} hex - Hex barva (např. "#FF0000" nebo "FF0000")
 * @returns {{r: number, g: number, b: number}|null}
 */
export const hexToRgb = (hex) => {
  if (!hex) return null;

  // Odstraň # pokud je přítomen
  const cleanHex = hex.replace('#', '');

  // Pokud je to 3-znaková hex barva, rozbal ji
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;

  if (fullHex.length !== 6) return null;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  return { r, g, b };
};

/**
 * Vypočítá relativní jas barvy (luminance)
 * @param {string} hex - Hex barva
 * @returns {number} - Luminance mezi 0 (tmavá) a 1 (světlá)
 */
export const getLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5; // Default hodnota

  // Použij vzorec pro relativní jas podle W3C
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Zjistí, zda je barva tmavá (měla by použít světlý text)
 * @param {string} hex - Hex barva
 * @returns {boolean} - true pokud je barva tmavá
 */
export const isDarkColor = (hex) => {
  if (!hex) return false;
  const luminance = getLuminance(hex);
  return luminance < 0.5; // Prahová hodnota pro tmavou barvu
};

/**
 * Zjistí, zda je shader tmavý (na základě názvu)
 * @param {string} shaderKey - Klíč shaderu
 * @returns {boolean} - true pokud je shader pravděpodobně tmavý
 */
export const isDarkShader = (shaderKey) => {
  if (!shaderKey || shaderKey === 'default' || shaderKey === '__BLACK__') {
    return true; // Default shader je tmavý
  }

  // Seznam klíčových slov, která naznačují tmavý shader
  const darkKeywords = [
    'dark', 'black', 'night', 'shadow', 'space', 'nebula', 'star', 'cosmic',
    'void', 'deep', 'ocean', 'forest', 'moon', 'aurora', 'storm', 'fire',
    'ember', 'smoke', 'cloud', 'fog', 'mist', 'rain', 'thunder'
  ];

  const lowerKey = shaderKey.toLowerCase();
  return darkKeywords.some(keyword => lowerKey.includes(keyword));
};

/**
 * Zjistí, zda by se mělo použít tmavé UI (dark mode)
 * @param {string|null} shaderKey - Klíč shaderu (může být __COLOR__#hex)
 * @param {string|null} colorHex - Hex barva (pokud je shaderKey __COLOR__)
 * @returns {boolean} - true pokud by se mělo použít tmavé UI
 */
export const shouldUseDarkMode = (shaderKey, colorHex = null) => {
  if (!shaderKey || shaderKey === '__BLACK__') {
    return true;
  }

  // Pokud je to barva, zkontroluj její tmavost
  if (shaderKey.startsWith('__COLOR__')) {
    const color = shaderKey.replace('__COLOR__', '');
    return isDarkColor(color);
  }

  // Pokud je to shader, zkontroluj podle názvu
  return isDarkShader(shaderKey);
};

