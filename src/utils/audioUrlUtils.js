/**
 * Utility funkce pro práci s audio URL
 */

/**
 * Extrahuje název souboru z URL nebo vrátí původní hodnotu
 * @param {string} url - URL nebo název souboru
 * @returns {string|null} - Název souboru nebo null
 */
export const extractFileNameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  // Pokud už je to název souboru (ne URL), vrať ho
  if (!url.startsWith('http')) {
    return url; // Vrať celou cestu, ne jen název souboru
  }

  try {
    // Pro Firebase Storage URL: https://firebasestorage.googleapis.com/v0/b/.../o/filename.mp3?alt=media
    const match = url.match(/\/o\/([^?]+)/);
    if (match) {
      const fullPath = decodeURIComponent(match[1]);
      // Vrať celou cestu k souboru (např. "hudba/ambient-journey/filename.mp3")
      return fullPath;
    }

    // Fallback pro běžné URL
    const pathname = new URL(url).pathname;
    return pathname.startsWith('/') ? pathname.substring(1) : pathname;
  } catch (error) {
    // Pokud to není validní URL, zkusíme to jako název souboru
    return url.includes('/') ? url : url;
  }
};

/**
 * Zkontroluje, jestli je URL validní
 * @param {string} url - URL k ověření
 * @returns {boolean} - True pokud je URL validní
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Získá doménu z URL
 * @param {string} url - URL
 * @returns {string|null} - Doména nebo null
 */
export const getDomainFromUrl = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};
