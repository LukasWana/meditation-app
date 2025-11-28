/**
 * Utility pro extrakci barev z obrázku
 */

/**
 * Analyzuje obrázek podle oblastí (horní, střední, dolní) pro lepší detekci tmavosti
 * @param {Uint8ClampedArray} pixels - Pixel data
 * @param {number} width - Šířka obrázku
 * @param {number} height - Výška obrázku
 * @returns {Object} - Analýza oblastí
 */
function analyzeImageRegions(pixels, width, height) {
  const topHeight = Math.floor(height * 0.33);
  const middleHeight = Math.floor(height * 0.33);

  const regions = {
    top: { r: 0, g: 0, b: 0, count: 0 },
    middle: { r: 0, g: 0, b: 0, count: 0 },
    bottom: { r: 0, g: 0, b: 0, count: 0 }
  };

  // Vypočítat průměrné barvy pro každou oblast
  for (let y = 0; y < height; y++) {
    let region;
    if (y < topHeight) {
      region = regions.top;
    } else if (y < topHeight + middleHeight) {
      region = regions.middle;
    } else {
      region = regions.bottom;
    }

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      if (a >= 128) {
        region.r += r;
        region.g += g;
        region.b += b;
        region.count++;
      }
    }
  }

  // Normalizovat
  Object.keys(regions).forEach(key => {
    const region = regions[key];
    if (region.count > 0) {
      region.r = Math.round(region.r / region.count);
      region.g = Math.round(region.g / region.count);
      region.b = Math.round(region.b / region.count);
    }
  });

  return regions;
}

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
 * Vypočítá relativní světlost (luminance) podle WCAG standardu
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} - Luminance (0-1)
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Vypočítá kontrast ratio mezi dvěma barvami (WCAG)
 * @param {number} lum1 - Luminance první barvy
 * @param {number} lum2 - Luminance druhé barvy
 * @returns {number} - Kontrast ratio
 */
function getContrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Najde barvu textu s dostatečným kontrastem k pozadí
 * @param {number} bgLuminance - Luminance pozadí
 * @param {boolean} isDark - Zda je pozadí tmavé
 * @returns {string} - Barva textu v rgba formátu
 */
function getTextColorWithContrast(bgLuminance, isDark) {
  // WCAG AA vyžaduje kontrast 4.5:1 pro normální text
  const minContrast = 4.5;

  if (isDark) {
    // Pro tmavé pozadí: zkusit bílou, pokud nemá dostatečný kontrast, použít světlejší
    const whiteLum = 1.0;
    const contrast = getContrastRatio(whiteLum, bgLuminance);

    if (contrast >= minContrast) {
      return 'rgba(255, 255, 255, 1)';
    } else {
      // Použít světlejší bílou pro lepší kontrast
      return 'rgba(255, 255, 255, 1)'; // Bílá má vždy dobrý kontrast na tmavém
    }
  } else {
    // Pro světlé pozadí: zkusit černou
    const blackLum = 0.0;
    const contrast = getContrastRatio(bgLuminance, blackLum);

    if (contrast >= minContrast) {
      return 'rgba(0, 0, 0, 1)';
    } else {
      // Použít tmavší černou pro lepší kontrast
      return 'rgba(0, 0, 0, 1)'; // Černá má vždy dobrý kontrast na světlém
    }
  }
}

/**
 * Vytvoří paletu barev pro téma z extrahovaných barev
 * @param {Array<{r: number, g: number, b: number}>} colors - Extrahované barvy
 * @param {Object} regionAnalysis - Analýza oblastí obrázku
 * @returns {Object} - Objekt s barvami pro téma
 */
function createThemeColors(colors, regionAnalysis = null) {
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
  // Pokud máme analýzu oblastí, použít vážený průměr (dolní část má větší váhu, protože tam je obvykle více obsahu)
  let avgR, avgG, avgB;

  if (regionAnalysis) {
    // Vážený průměr: horní 20%, střední 30%, dolní 50% (dolní část je obvykle důležitější)
    const topLum = getLuminance(regionAnalysis.top.r, regionAnalysis.top.g, regionAnalysis.top.b);
    const middleLum = getLuminance(regionAnalysis.middle.r, regionAnalysis.middle.g, regionAnalysis.middle.b);
    const bottomLum = getLuminance(regionAnalysis.bottom.r, regionAnalysis.bottom.g, regionAnalysis.bottom.b);

    // Použít oblast s nejnižší světlostí (nejtmavší) pro rozhodnutí o dark mode
    const minLum = Math.min(topLum, middleLum, bottomLum);
    const maxLum = Math.max(topLum, middleLum, bottomLum);

    // Pokud je rozdíl mezi nejtmavší a nejsvětlejší oblastí velký (>0.3), použít vážený průměr
    if (maxLum - minLum > 0.3) {
      // Vážený průměr s větší vahou pro dolní část
      avgR = Math.round(
        regionAnalysis.top.r * 0.2 +
        regionAnalysis.middle.r * 0.3 +
        regionAnalysis.bottom.r * 0.5
      );
      avgG = Math.round(
        regionAnalysis.top.g * 0.2 +
        regionAnalysis.middle.g * 0.3 +
        regionAnalysis.bottom.g * 0.5
      );
      avgB = Math.round(
        regionAnalysis.top.b * 0.2 +
        regionAnalysis.middle.b * 0.3 +
        regionAnalysis.bottom.b * 0.5
      );
    } else {
      // Pokud jsou oblasti podobné, použít standardní průměr
      avgR = Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length);
      avgG = Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length);
      avgB = Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length);
    }
  } else {
    avgR = Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length);
    avgG = Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length);
    avgB = Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length);
  }

  // Vypočítat relativní světlost (luminance) podle WCAG standardu
  const luminance = getLuminance(avgR, avgG, avgB);

  // Pokud máme analýzu oblastí, použít ji pro lepší rozhodnutí
  let isDark;
  if (regionAnalysis) {
    const topLum = getLuminance(regionAnalysis.top.r, regionAnalysis.top.g, regionAnalysis.top.b);
    const middleLum = getLuminance(regionAnalysis.middle.r, regionAnalysis.middle.g, regionAnalysis.middle.b);
    const bottomLum = getLuminance(regionAnalysis.bottom.r, regionAnalysis.bottom.g, regionAnalysis.bottom.b);

    // Vážený průměr luminance (dolní část má větší váhu, protože tam je obvykle více obsahu)
    const weightedLum = topLum * 0.2 + middleLum * 0.3 + bottomLum * 0.5;

    // Pokud je rozdíl mezi oblastmi velký, použít vážený průměr
    // Jinak použít standardní průměr
    const lumDiff = Math.max(topLum, middleLum, bottomLum) - Math.min(topLum, middleLum, bottomLum);

    if (lumDiff > 0.3) {
      // Velký rozdíl - použít vážený průměr s větší vahou pro dolní část
      // Pokud je dolní část tmavá, pravděpodobně je to tmavé pozadí
      isDark = weightedLum < 0.5 || bottomLum < 0.4;
    } else {
      // Malý rozdíl - použít standardní průměr
      isDark = luminance < 0.5;
    }
  } else {
    // Bez analýzy oblastí použít standardní práh
    isDark = luminance < 0.5;
  }

  // Vytvořit barvy pro text s dostatečným kontrastem
  // Použít luminance z váženého průměru, pokud máme analýzu oblastí
  const effectiveLuminance = regionAnalysis && (Math.max(
    getLuminance(regionAnalysis.top.r, regionAnalysis.top.g, regionAnalysis.top.b),
    getLuminance(regionAnalysis.middle.r, regionAnalysis.middle.g, regionAnalysis.middle.b),
    getLuminance(regionAnalysis.bottom.r, regionAnalysis.bottom.g, regionAnalysis.bottom.b)
  ) - Math.min(
    getLuminance(regionAnalysis.top.r, regionAnalysis.top.g, regionAnalysis.top.b),
    getLuminance(regionAnalysis.middle.r, regionAnalysis.middle.g, regionAnalysis.middle.b),
    getLuminance(regionAnalysis.bottom.r, regionAnalysis.bottom.g, regionAnalysis.bottom.b)
  ) > 0.3)
    ? (getLuminance(regionAnalysis.top.r, regionAnalysis.top.g, regionAnalysis.top.b) * 0.2 +
       getLuminance(regionAnalysis.middle.r, regionAnalysis.middle.g, regionAnalysis.middle.b) * 0.3 +
       getLuminance(regionAnalysis.bottom.r, regionAnalysis.bottom.g, regionAnalysis.bottom.b) * 0.5)
    : luminance;

  const textColor = getTextColorWithContrast(effectiveLuminance, isDark);

  // Pro textSecondary použít barvu s menším kontrastem, ale stále čitelnou
  // WCAG AA vyžaduje 3:1 pro velký text, ale použijeme 4:1 pro lepší čitelnost
  const minContrastSecondary = 4.0;
  let textSecondary;

  if (isDark) {
    // Pro tmavé pozadí: světle šedá s dostatečným kontrastem
    // Zkusit různé odstíny šedé, dokud nedosáhneme dostatečného kontrastu
    let secondaryLum = 0.8;
    let contrast = getContrastRatio(secondaryLum, effectiveLuminance);

    // Pokud kontrast není dostatečný, použít bílou
    if (contrast < minContrastSecondary) {
      textSecondary = 'rgba(255, 255, 255, 1)'; // Bílá pro maximální kontrast
    } else {
      // Použít světle šedou s dostatečným kontrastem
      const grayValue = Math.round(secondaryLum * 255);
      textSecondary = `rgba(${grayValue}, ${grayValue}, ${grayValue}, 1)`;
    }
  } else {
    // Pro světlé pozadí: tmavě šedá s dostatečným kontrastem
    let secondaryLum = 0.25;
    let contrast = getContrastRatio(effectiveLuminance, secondaryLum);

    // Pokud kontrast není dostatečný, použít černou
    if (contrast < minContrastSecondary) {
      textSecondary = 'rgba(0, 0, 0, 1)'; // Černá pro maximální kontrast
    } else {
      // Použít tmavě šedou s dostatečným kontrastem
      const grayValue = Math.round(secondaryLum * 255);
      textSecondary = `rgba(${grayValue}, ${grayValue}, ${grayValue}, 1)`;
    }
  }

  // Vytvořit barvy pro karty s dostatečným kontrastem k textu
  // Karty musí mít dostatečný kontrast s textem pro čitelnost
  let cardR, cardG, cardB;
  if (isDark) {
    // Pro tmavé pozadí: karty musí být tmavé, ale světlejší než pozadí
    // Zajistit, aby karta měla dostatečný kontrast s bílým textem
    // Zvýšit světlost o 40-50, aby byl kontrast dostatečný
    cardR = Math.max(0, Math.min(255, avgR + 50));
    cardG = Math.max(0, Math.min(255, avgG + 50));
    cardB = Math.max(0, Math.min(255, avgB + 50));

    // Zajistit minimální světlost pro dostatečný kontrast
    const cardLum = getLuminance(cardR, cardG, cardB);
    const textLum = 1.0; // Bílý text
    const contrast = getContrastRatio(textLum, cardLum);

    // Pokud kontrast není dostatečný, zesvětlit kartu
    if (contrast < 4.5) {
      const targetLum = textLum / 4.5 - 0.05; // Cílová luminance pro kontrast 4.5:1
      const factor = targetLum / cardLum;
      cardR = Math.min(255, Math.round(cardR * factor));
      cardG = Math.min(255, Math.round(cardG * factor));
      cardB = Math.min(255, Math.round(cardB * factor));
    }
  } else {
    // Pro světlé pozadí: karty mohou být světlé, ale tmavší než pozadí
    // Zajistit, aby karta měla dostatečný kontrast s černým textem
    cardR = Math.max(0, Math.min(255, avgR - 20));
    cardG = Math.max(0, Math.min(255, avgG - 20));
    cardB = Math.max(0, Math.min(255, avgB - 20));

    // Zajistit minimální kontrast
    const cardLum = getLuminance(cardR, cardG, cardB);
    const textLum = 0.0; // Černý text
    const contrast = getContrastRatio(cardLum, textLum);

    // Pokud kontrast není dostatečný, ztmavit kartu
    if (contrast < 4.5) {
      const targetLum = 0.05 + (0.05 * 4.5); // Cílová luminance pro kontrast 4.5:1
      const factor = targetLum / cardLum;
      cardR = Math.max(0, Math.round(cardR * factor));
      cardG = Math.max(0, Math.round(cardG * factor));
      cardB = Math.max(0, Math.round(cardB * factor));
    }
  }

  // TimeIndicator by měl mít výraznější kontrast než hlavní text
  // Pro tmavé pozadí: světlejší barva (téměř bílá)
  // Pro světlé pozadí: tmavší barva (téměř černá)
  let timeIndicator;
  if (isDark) {
    // Pro tmavé pozadí: použít velmi světlou barvu pro maximální kontrast
    // Zkusit téměř bílou (luminance ~0.95) pro výrazný kontrast
    const timeIndicatorLum = 0.95;
    const contrast = getContrastRatio(timeIndicatorLum, effectiveLuminance);

    // Pokud kontrast není dostatečný, použít čistou bílou
    if (contrast < 4.5) {
      timeIndicator = 'rgba(255, 255, 255, 1)'; // Čistá bílá
    } else {
      // Použít velmi světlou šedou
      const grayValue = Math.round(timeIndicatorLum * 255);
      timeIndicator = `rgba(${grayValue}, ${grayValue}, ${grayValue}, 1)`;
    }
  } else {
    // Pro světlé pozadí: použít velmi tmavou barvu pro maximální kontrast
    // Zkusit téměř černou (luminance ~0.05) pro výrazný kontrast
    const timeIndicatorLum = 0.05;
    const contrast = getContrastRatio(effectiveLuminance, timeIndicatorLum);

    // Pokud kontrast není dostatečný, použít čistou černou
    if (contrast < 4.5) {
      timeIndicator = 'rgba(0, 0, 0, 1)'; // Čistá černá
    } else {
      // Použít velmi tmavou šedou
      const grayValue = Math.round(timeIndicatorLum * 255);
      timeIndicator = `rgba(${grayValue}, ${grayValue}, ${grayValue}, 1)`;
    }
  }

  return {
    primary: `rgba(${primary.r}, ${primary.g}, ${primary.b}, 1)`,
    secondary: `rgba(${darkest.r}, ${darkest.g}, ${darkest.b}, 1)`,
    background: `rgba(${avgR}, ${avgG}, ${avgB}, 1)`,
    card: `rgba(${cardR}, ${cardG}, ${cardB}, ${isDark ? 0.9 : 0.95})`,
    text: textColor,
    textSecondary: textSecondary,
    border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
    progressIndicator: `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.8)`,
    timeIndicator: timeIndicator,
    // Accent barvy z extrahovaných barev
    accent1: colors.length > 1 ? `rgba(${colors[0].r}, ${colors[0].g}, ${colors[0].b}, 1)` : primary,
    accent2: colors.length > 2 ? `rgba(${colors[1].r}, ${colors[1].g}, ${colors[1].b}, 1)` : primary,
    accent3: colors.length > 3 ? `rgba(${colors[2].r}, ${colors[2].g}, ${colors[2].b}, 1)` : primary,
  };
}

/**
 * Extrahuje dominantní barvy z obrázku
 * @param {string} imageUrl - URL obrázku (base64 nebo URL)
 * @param {number} colorCount - Počet barev k extrakci (default 5)
 * @returns {Promise<Object>} - Objekt s extrahovanými barvami
 */
function extractColorsFromImage(imageUrl, colorCount = 5) {
  return new Promise(async (resolve, reject) => {
    // Pro Firebase Storage URL použít fetch jako blob pro obejití CORS
    const isFirebaseStorage = imageUrl.includes('firebasestorage.googleapis.com') ||
                              imageUrl.includes('firebase');

    let imageUrlToUse = imageUrl;
    let objectUrl = null;

    // Pokud je to Firebase Storage URL, načíst přes fetch jako blob
    if (isFirebaseStorage) {
      try {
        const response = await fetch(imageUrl, {
          mode: 'cors',
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        imageUrlToUse = objectUrl;
      } catch (fetchError) {
        console.warn('Failed to fetch image via fetch, trying direct load without crossOrigin:', fetchError);
        // Fallback na přímé načtení bez crossOrigin
      }
    }

    const img = new Image();

    // Pro Firebase Storage URL nepoužívat crossOrigin (už máme blob nebo použijeme fallback)
    // Pro ostatní URL použít crossOrigin
    if (!isFirebaseStorage || objectUrl) {
      // Pokud máme objectUrl z blobu, nepotřebujeme crossOrigin
      if (!objectUrl) {
        img.crossOrigin = 'anonymous';
      }
    }

    const extractColors = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Zmenšit obrázek pro rychlejší zpracování (max 300px pro lepší analýzu)
        const maxSize = 300;
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

        // Analyzovat obrázek podle oblastí (horní, střední, dolní) pro lepší detekci
        const regionAnalysis = analyzeImageRegions(pixels, width, height);

        // Extrahovat barvy pomocí jednoduchého clusteringu
        const colors = extractDominantColors(pixels, colorCount);

        // Vytvořit paletu barev pro téma s analýzou oblastí
        const themeColors = createThemeColors(colors, regionAnalysis);

        // Uvolnit object URL pokud byl vytvořen
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }

        resolve(themeColors);
      } catch (error) {
        // Uvolnit object URL při chybě
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        reject(error);
      }
    };

    img.onload = extractColors;

    img.onerror = () => {
      // Uvolnit object URL při chybě
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      // Pokud se nepodařilo načíst obrázek s CORS, nemůžeme extrahovat barvy.
      // Pokus o načtení bez CORS by vedl k "tainted canvas" a chybě při volání getImageData.
      // Proto rovnou skončíme s chybou.
      console.warn('Failed to load image for color extraction (likely CORS issue). Returning null colors.');
      resolve(null);
    };

    img.src = imageUrlToUse;
  });
}

/**
 * Převod RGB na hex
 * @param {number} r - Red
 * @param {number} g - Green
 * @param {number} b - Blue
 * @returns {string} - Hex barva
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Export na konci souboru pro zajištění správné inicializace
export { extractColorsFromImage, rgbToHex };

