/**
 * Utility pro extrakci barev z obrázku
 */

/**
 * Extrahuje dominantní barvy z obrázku
 * @param {string} imageUrl - URL obrázku (base64 nebo URL)
 * @param {number} colorCount - Počet barev k extrakci (default 5)
 * @returns {Promise<Object>} - Objekt s extrahovanými barvami
 */
export const extractColorsFromImage = (imageUrl, colorCount = 5) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Zmenšit obrázek pro rychlejší zpracování (max 200px)
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Získat pixel data
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Extrahovat barvy pomocí jednoduchého clusteringu
        const colors = extractDominantColors(pixels, colorCount);

        // Vytvořit paletu barev pro téma
        const themeColors = createThemeColors(colors);

        resolve(themeColors);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
};

/**
 * Extrahuje dominantní barvy z pixelů pomocí jednoduchého algoritmu
 * @param {Uint8ClampedArray} pixels - Pixel data (RGBA)
 * @param {number} colorCount - Počet barev
 * @returns {Array<{r: number, g: number, b: number}>} - Pole RGB barev
 */
function extractDominantColors(pixels, colorCount) {
  // Vzorkovat každý N-tý pixel pro rychlejší zpracování
  const sampleRate = 10;
  const colorMap = new Map();

  for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    // Ignorovat průhledné pixely
    if (a < 128) continue;

    // Zaokrouhlit barvy pro seskupení podobných barev
    const roundedR = Math.round(r / 10) * 10;
    const roundedG = Math.round(g / 10) * 10;
    const roundedB = Math.round(b / 10) * 10;
    const key = `${roundedR},${roundedG},${roundedB}`;

    if (!colorMap.has(key)) {
      colorMap.set(key, { r, g, b, count: 0 });
    }
    colorMap.get(key).count++;
  }

  // Seřadit podle četnosti a vzít top N
  const sortedColors = Array.from(colorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, colorCount);

  // Pokud nemáme dost barev, doplnit průměrnými barvami
  if (sortedColors.length < colorCount) {
    const avgR = Math.round(
      Array.from(colorMap.values()).reduce((sum, c) => sum + c.r, 0) / colorMap.size
    );
    const avgG = Math.round(
      Array.from(colorMap.values()).reduce((sum, c) => sum + c.g, 0) / colorMap.size
    );
    const avgB = Math.round(
      Array.from(colorMap.values()).reduce((sum, c) => sum + c.b, 0) / colorMap.size
    );

    while (sortedColors.length < colorCount) {
      sortedColors.push({ r: avgR, g: avgG, b: avgB });
    }
  }

  return sortedColors;
}

/**
 * Vytvoří paletu barev pro téma z extrahovaných barev
 * @param {Array<{r: number, g: number, b: number}>} colors - Extrahované barvy
 * @returns {Object} - Objekt s barvami pro téma
 */
function createThemeColors(colors) {
  if (colors.length === 0) {
    return null;
  }

  // Seřadit barvy podle jasu (lightness)
  const sortedByLightness = [...colors].sort((a, b) => {
    const lightnessA = (a.r + a.g + a.b) / 3;
    const lightnessB = (b.r + b.g + b.b) / 3;
    return lightnessB - lightnessA;
  });

  const darkest = sortedByLightness[sortedByLightness.length - 1];
  const primary = sortedByLightness[Math.floor(sortedByLightness.length / 2)];

  // Vypočítat průměrnou barvu pro background
  const avgR = Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length);
  const avgG = Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length);
  const avgB = Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length);

  // Vypočítat relativní světlost (luminance) podle WCAG standardu
  // Luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B (normalizované hodnoty 0-1)
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const luminance = getLuminance(avgR, avgG, avgB);
  // Pokud je luminance < 0.5, je to tmavá barva
  // Použít nižší práh (0.4) pro lepší detekci tmavých fotek
  const isDark = luminance < 0.4;

  // Vytvořit barvy pro text (kontrastní k pozadí)
  const textColor = isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';
  const textSecondary = isDark ? 'rgba(200, 200, 200, 1)' : 'rgba(102, 102, 102, 1)';

  // Vytvořit barvy pro karty (lehce upravené pozadí)
  // Pokud je tmavé pozadí (bílý text), karty musí být tmavé, aby byl text viditelný
  let cardR, cardG, cardB;
  if (isDark) {
    // Pro tmavé pozadí: karty musí být tmavé (ale trochu světlejší než pozadí)
    cardR = Math.max(0, Math.min(255, avgR + 30));
    cardG = Math.max(0, Math.min(255, avgG + 30));
    cardB = Math.max(0, Math.min(255, avgB + 30));
  } else {
    // Pro světlé pozadí: karty mohou být světlé
    cardR = Math.max(0, Math.min(255, avgR - 10));
    cardG = Math.max(0, Math.min(255, avgG - 10));
    cardB = Math.max(0, Math.min(255, avgB - 10));
  }

  return {
    primary: `rgba(${primary.r}, ${primary.g}, ${primary.b}, 1)`,
    secondary: `rgba(${darkest.r}, ${darkest.g}, ${darkest.b}, 1)`,
    background: `rgba(${avgR}, ${avgG}, ${avgB}, 1)`,
    card: `rgba(${cardR}, ${cardG}, ${cardB}, ${isDark ? 0.9 : 0.95})`,
    text: textColor,
    textSecondary: textSecondary,
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    progressIndicator: `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.8)`,
    timeIndicator: textSecondary,
    // Accent barvy z extrahovaných barev
    accent1: colors.length > 1 ? `rgba(${colors[0].r}, ${colors[0].g}, ${colors[0].b}, 1)` : primary,
    accent2: colors.length > 2 ? `rgba(${colors[1].r}, ${colors[1].g}, ${colors[1].b}, 1)` : primary,
    accent3: colors.length > 3 ? `rgba(${colors[2].r}, ${colors[2].g}, ${colors[2].b}, 1)` : primary,
  };
}

/**
 * Převod RGB na hex
 * @param {number} r - Red
 * @param {number} g - Green
 * @param {number} b - Blue
 * @returns {string} - Hex barva
 */
export const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

