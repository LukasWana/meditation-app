import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { THEMES, DEFAULT_THEME_ID, getThemeById } from '@data/themes';

// Import defaultních obrázků pozadí
import defaultBg1 from '@assets/backgrounds/pexels-arts-1496373.jpg';
import defaultBg2 from '@assets/backgrounds/pexels-brakou-1723637.jpg';
import defaultBg3 from '@assets/backgrounds/pexels-eberhardgross-1624496.jpg';
import defaultBg4 from '@assets/backgrounds/pexels-gabriel-peter-219375-719396.jpg';
import defaultBg5 from '@assets/backgrounds/pexels-zetong-li-880728-1784578-min.jpg';
import defaultBg6 from '@assets/backgrounds/samuel-ferrara-dKJXkKCF2D8-unsplash.jpg';
import defaultBg7 from '@assets/backgrounds/will-turner-KWzUuVg7U-0-unsplash.jpg';

// Seznam defaultních obrázků
const DEFAULT_BACKGROUNDS = [
  defaultBg1,
  defaultBg2,
  defaultBg3,
  defaultBg4,
  defaultBg5,
  defaultBg6,
  defaultBg7
];

export const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-theme');
      return saved || DEFAULT_THEME_ID;
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
      return DEFAULT_THEME_ID;
    }
  });

  // Dark/Light mode - 'dark' nebo 'light'
  const [colorMode, setColorMode] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-color-mode');
      // Migrace: pokud je uložený 'auto', převést na 'light'
      if (saved === 'auto') {
        localStorage.setItem('meditation-app-color-mode', 'light');
        return 'light';
      }
      return saved === 'dark' || saved === 'light' ? saved : 'light';
    } catch (error) {
      console.warn('Failed to load color mode from localStorage:', error);
      return 'light';
    }
  });

  // Helper funkce pro získání klíče localStorage pro pozadí daného tématu
  const getBackgroundStorageKey = (themeId) => {
    return `meditation-app-custom-background-${themeId}`;
  };

  // Helper funkce pro načtení pozadí pro dané téma
  const loadBackgroundForTheme = (themeId) => {
    try {
      const key = getBackgroundStorageKey(themeId);
      const saved = localStorage.getItem(key);

      // Zpětná kompatibilita - pokud není pozadí pro toto téma, zkusit starý klíč
      if (!saved) {
        const oldKey = 'meditation-app-custom-background';
        const oldSaved = localStorage.getItem(oldKey);
        if (oldSaved) {
          // Migrovat staré pozadí na nové téma
          localStorage.setItem(key, oldSaved);
          // Nechat starý klíč pro případ, že by ho jiné téma potřebovalo
          return oldSaved;
        }
      }

      return saved || null;
    } catch (error) {
      console.warn('Failed to load custom background from localStorage:', error);
      return null;
    }
  };

  const [customBackground, setCustomBackground] = useState(() => {
    const initialThemeId = (() => {
      try {
        const saved = localStorage.getItem('meditation-app-theme');
        return saved || DEFAULT_THEME_ID;
      } catch (error) {
        return DEFAULT_THEME_ID;
      }
    })();
    return loadBackgroundForTheme(initialThemeId);
  });

  // Základní téma (statické) - memoizovat, aby se neměnilo při každém renderu
  const baseTheme = useMemo(() => getThemeById(themeId), [themeId]);

  // Získat data z customBackground
  const getBackgroundData = () => {
    if (!customBackground) {
      console.log('🔍 getBackgroundData: customBackground je null');
      return null;
    }

    try {
      const parsed = JSON.parse(customBackground);
      console.log('🔍 getBackgroundData: úspěšně parsováno:', {
        hasUrl: !!parsed.url,
        hasColors: !!parsed.colors,
        colorKeys: parsed.colors ? Object.keys(parsed.colors) : [],
        primaryColor: parsed.colors?.primary
      });
      return parsed;
    } catch (e) {
      console.warn('⚠️ getBackgroundData: chyba při parsování:', e);
      // Pokud to není JSON, použít jako URL (starý formát)
      return { url: customBackground };
    }
  };

  // Získat URL obrázku z customBackground nebo použít defaultní
  const getBackgroundImageUrl = () => {
    const data = getBackgroundData();
    if (data?.url) {
      return data.url;
    }

    // Pokud není custom pozadí, použít defaultní obrázek
    // Použít deterministický výběr podle themeId pro konzistenci
    if (DEFAULT_BACKGROUNDS.length > 0) {
      // Vytvořit hash z themeId pro deterministický výběr
      let hash = 0;
      for (let i = 0; i < themeId.length; i++) {
        hash = ((hash << 5) - hash) + themeId.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
      }
      const index = Math.abs(hash) % DEFAULT_BACKGROUNDS.length;
      return DEFAULT_BACKGROUNDS[index];
    }

    return null;
  };

  // Získat extrahované barvy z customBackground
  const getExtractedColors = () => {
    const data = getBackgroundData();
    const colors = data?.colors || null;

    // Debug: zkontrolovat, zda jsou barvy správně načteny
    if (data && !colors) {
      console.warn('⚠️ Background data existuje, ale barvy chybí:', data);
    }
    if (colors) {
      console.log('✅ Extrahované barvy načteny:', {
        keys: Object.keys(colors),
        primary: colors.primary,
        hasPrimary: !!colors.primary,
        isObject: typeof colors === 'object',
        isEmpty: Object.keys(colors).length === 0
      });
    } else {
      console.log('⚠️ getExtractedColors: žádné barvy nenalezeny');
    }

    return colors;
  };

  // Získat uložené vlastnosti tématu z customBackground (useRoundedStyle, fontFamily)
  const getSavedThemeProperties = () => {
    const data = getBackgroundData();
    return {
      useRoundedStyle: data?.useRoundedStyle ?? null,
      fontFamily: data?.fontFamily ?? null
    };
  };

  // Helper funkce pro úpravu barvy pro dark mode (ztmaví barvu)
  const adjustColorForDarkMode = (color) => {
    // Pokud je barva v rgba/rgb formátu, ztmavit ji
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const r = Math.max(0, Math.min(255, Math.floor(parseInt(rgbaMatch[1]) * 0.25)));
      const g = Math.max(0, Math.min(255, Math.floor(parseInt(rgbaMatch[2]) * 0.25)));
      const b = Math.max(0, Math.min(255, Math.floor(parseInt(rgbaMatch[3]) * 0.25)));
      const alpha = rgbaMatch[4] || '1';
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    // Fallback pro jiné formáty
    return 'rgba(30, 30, 30, 1)';
  };

  // Helper funkce pro úpravu barvy pro light mode (zesvětlí barvu, ale zachová odstín)
  const adjustColorForLightMode = (color) => {
    // Pokud je barva v rgba/rgb formátu, zesvětlit ji, ale zachovat odstín
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      // Pro light mode použít světlejší variantu, ale zachovat odstín původní barvy
      // Smíchat s bílou (70% původní barvy + 30% bílé)
      const r = Math.max(0, Math.min(255, Math.floor(parseInt(rgbaMatch[1]) * 0.7 + 255 * 0.3)));
      const g = Math.max(0, Math.min(255, Math.floor(parseInt(rgbaMatch[2]) * 0.7 + 255 * 0.3)));
      const b = Math.max(0, Math.min(255, Math.floor(parseInt(rgbaMatch[3]) * 0.7 + 255 * 0.3)));
      const alpha = rgbaMatch[4] || '1';
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    // Fallback pro jiné formáty - použít světlou béžovou
    return 'rgba(244, 221, 196, 1)';
  };

  // Získat aktuální barvy tématu (buď z fotky, nebo defaultní)
  const getCurrentThemeColors = () => {
    const backgroundData = getBackgroundData();
    // hasCustomBackground je true pouze pokud máme custom pozadí (ne defaultní obrázek)
    const hasCustomBackground = !!backgroundData && !!backgroundData.url && baseTheme?.allowsCustomBackground;
    const extractedColors = getExtractedColors();
    const hasExtractedColors = extractedColors && typeof extractedColors === 'object' && Object.keys(extractedColors).length > 0;
    let colors = {};

    // Debug log pro diagnostiku
    console.log('🎨 getCurrentThemeColors:', {
      hasCustomBackground,
      hasExtractedColors,
      customBackgroundExists: !!customBackground,
      backgroundData: backgroundData ? { hasUrl: !!backgroundData.url, hasColors: !!backgroundData.colors } : null,
      extractedColorsPrimary: extractedColors?.primary,
      extractedColorsKeys: extractedColors ? Object.keys(extractedColors) : [],
      baseThemePrimary: baseTheme?.colors?.primary,
      baseThemeId: baseTheme?.id,
      allowsCustomBackground: baseTheme?.allowsCustomBackground
    });

    // Pokud máme custom pozadí s extrahovanými barvami, použít je
    if (hasCustomBackground && hasExtractedColors) {
      // Sloučit extrahované barvy s defaultními (extrahované mají prioritu)
      colors = {
        ...baseTheme?.colors,
        ...extractedColors
      };
      console.log('✅ Používám extrahované barvy z custom pozadí:', {
        primary: colors.primary,
        extractedPrimary: extractedColors.primary,
        baseThemePrimary: baseTheme?.colors?.primary,
        allKeys: Object.keys(colors),
        extractedKeys: Object.keys(extractedColors)
      });

      // OVĚŘENÍ: Zkontrolovat, zda se extrahované barvy skutečně použily
      if (colors.primary === baseTheme?.colors?.primary && extractedColors.primary !== baseTheme?.colors?.primary) {
        console.error('❌ CHYBA: Extrahované barvy se nepoužily!', {
          colorsPrimary: colors.primary,
          extractedPrimary: extractedColors.primary,
          baseThemePrimary: baseTheme?.colors?.primary
        });
        // Vynutit použití extrahovaných barev
        colors = {
          ...colors,
          ...extractedColors
        };
        console.log('🔧 Opraveno - vynucuji extrahované barvy:', colors.primary);
      }
    } else if (hasCustomBackground && !hasExtractedColors) {
      // Máme custom pozadí, ale barvy se nepodařilo extrahovat - použít defaultní barvy tématu
      colors = baseTheme?.colors || {};
      console.warn('⚠️ Máme custom pozadí, ale barvy chybí - používám defaultní barvy:', colors.primary);
    } else {
      // Jinak použít defaultní barvy tématu
      colors = baseTheme?.colors || {};
      console.log('ℹ️ Používám defaultní barvy tématu:', colors.primary);
    }

    // Pokud je nastaven colorMode, upravit barvy podle volby
    // Zachovat extrahované barvy (primary, progressIndicator, timeIndicator, accent barvy) BEZ úprav
    const useExtractedColors = hasCustomBackground && hasExtractedColors;

    console.log('🎨 ColorMode úprava:', {
      colorMode,
      useExtractedColors,
      hasCustomBackground,
      hasExtractedColors,
      extractedPrimary: extractedColors?.primary,
      colorsPrimaryBefore: colors.primary,
      colorsPrimaryIsExtracted: useExtractedColors && colors.primary === extractedColors?.primary
    });

    if (colorMode === 'dark') {
      // Vynutit tmavý režim - tmavší barvy
      // Pokud máme extrahované barvy, použít je PŘÍMO z extractedColors objektu (ne z colors, který může obsahovat defaultní)
      // Jinak použít upravené defaultní barvy

      // DŮLEŽITÉ: Použít extrahované barvy PŘÍMO z extractedColors objektu, ne z colors objektu
      // protože colors může obsahovat defaultní barvy, pokud se extrahovaná barva náhodou shoduje
      const finalPrimary = useExtractedColors && extractedColors?.primary ? extractedColors.primary : (baseTheme?.colors?.primary ? adjustColorForDarkMode(baseTheme.colors.primary) : 'rgba(30, 30, 30, 1)');
      const finalProgressIndicator = useExtractedColors && extractedColors?.progressIndicator ? extractedColors.progressIndicator : (finalPrimary || 'rgba(30, 30, 30, 1)');
      const finalTimeIndicator = useExtractedColors && extractedColors?.timeIndicator ? extractedColors.timeIndicator : 'rgba(255, 255, 255, 1)';
      const finalAccent1 = useExtractedColors && extractedColors?.accent1 ? extractedColors.accent1 : finalPrimary;
      const finalAccent2 = useExtractedColors && extractedColors?.accent2 ? extractedColors.accent2 : finalPrimary;
      const finalAccent3 = useExtractedColors && extractedColors?.accent3 ? extractedColors.accent3 : finalPrimary;

      // Získat extrahovanou barvu karty, pokud existuje
      const extractedCard = useExtractedColors && extractedColors?.card ? extractedColors.card : null;

      console.log('🌙 Dark mode - zachovávám extrahované barvy:', {
        useExtractedColors,
        finalPrimary,
        finalProgressIndicator,
        finalTimeIndicator,
        finalAccent1,
        extractedCard,
        colorsPrimaryAfterMerge: colors.primary,
        baseThemePrimary: baseTheme?.colors?.primary
      });

      // Helper pro ztmavení barvy karty (méně agresivní než adjustColorForDarkMode)
      const darkenCardColor = (color) => {
        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
          // Ztmavit na cca 30-40% původní světlosti, ale zachovat trochu barvy
          // + malá příměs šedé pro neutralizaci příliš sytých barev
          const r = Math.max(15, Math.min(255, Math.floor(parseInt(rgbaMatch[1]) * 0.3 + 10)));
          const g = Math.max(15, Math.min(255, Math.floor(parseInt(rgbaMatch[2]) * 0.3 + 10)));
          const b = Math.max(15, Math.min(255, Math.floor(parseInt(rgbaMatch[3]) * 0.3 + 10)));
          const alpha = 0.95; // Pevná průhlednost pro karty
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return 'rgba(15, 15, 15, 0.95)';
      };

      // Určit barvu karty - buď ztmavená extrahovaná, nebo defaultní tmavá
      const finalCardColor = extractedCard
        ? darkenCardColor(extractedCard)
        : 'rgba(15, 15, 15, 0.95)';

      // Vytvořit nový objekt s barvami - NEPOUŽÍVAT ...colors, protože může obsahovat staré/defaultní hodnoty
      colors = {
        // Základní barvy pro dark mode
        text: 'rgba(255, 255, 255, 1)',
        textSecondary: 'rgba(180, 180, 180, 1)',
        background: 'rgba(10, 10, 10, 1)', // Vždy tmavá barva pozadí
        card: finalCardColor, // Použít vypočítanou barvu karty
        // POUŽÍT EXTRAHOVANÉ BARVY - ty mají prioritu
        primary: finalPrimary,
        progressIndicator: finalProgressIndicator,
        timeIndicator: finalTimeIndicator,
        // Zachovat accent barvy
        accent1: finalAccent1,
        accent2: finalAccent2,
        accent3: finalAccent3,
        // Zachovat ostatní barvy z baseTheme, pokud nejsou extrahované
        secondary: colors.secondary || baseTheme?.colors?.secondary,
        border: colors.border || baseTheme?.colors?.border
      };

      console.log('🌙 Dark mode - výsledná primary barva:', colors.primary);
    } else if (colorMode === 'light') {
      // Vynutit světlý režim
      // Pokud máme extrahované barvy, použít je PŘÍMO z extractedColors objektu (ne z colors, který může obsahovat defaultní)
      // Jinak použít upravené defaultní barvy

      // DŮLEŽITÉ: Použít extrahované barvy PŘÍMO z extractedColors objektu, ne z colors objektu
      // protože colors může obsahovat defaultní barvy, pokud se extrahovaná barva náhodou shoduje
      const finalPrimary = useExtractedColors && extractedColors?.primary ? extractedColors.primary : (baseTheme?.colors?.primary ? adjustColorForLightMode(baseTheme.colors.primary) : 'rgba(244, 221, 196, 1)');
      const finalProgressIndicator = useExtractedColors && extractedColors?.progressIndicator ? extractedColors.progressIndicator : (finalPrimary || 'rgba(244, 221, 196, 1)');
      const finalTimeIndicator = useExtractedColors && extractedColors?.timeIndicator ? extractedColors.timeIndicator : 'rgba(0, 0, 0, 1)';
      const finalAccent1 = useExtractedColors && extractedColors?.accent1 ? extractedColors.accent1 : finalPrimary;
      const finalAccent2 = useExtractedColors && extractedColors?.accent2 ? extractedColors.accent2 : finalPrimary;
      const finalAccent3 = useExtractedColors && extractedColors?.accent3 ? extractedColors.accent3 : finalPrimary;

      // Získat extrahovanou barvu karty, pokud existuje
      const extractedCard = useExtractedColors && extractedColors?.card ? extractedColors.card : null;

      console.log('☀️ Light mode - zachovávám extrahované barvy:', {
        useExtractedColors,
        finalPrimary,
        finalProgressIndicator,
        finalTimeIndicator,
        finalAccent1,
        extractedCard,
        colorsPrimaryAfterMerge: colors.primary,
        baseThemePrimary: baseTheme?.colors?.primary
      });

      // Helper pro zesvětlení barvy karty
      const lightenCardColor = (color) => {
        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
          // Zesvětlit - mix s bílou (cca 85% bílé, 15% původní barvy)
          const r = Math.min(255, Math.floor(parseInt(rgbaMatch[1]) * 0.15 + 255 * 0.85));
          const g = Math.min(255, Math.floor(parseInt(rgbaMatch[2]) * 0.15 + 255 * 0.85));
          const b = Math.min(255, Math.floor(parseInt(rgbaMatch[3]) * 0.15 + 255 * 0.85));
          const alpha = 0.95;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return 'rgba(255, 255, 255, 0.95)';
      };

      // Určit barvu karty - buď zesvětlená extrahovaná, nebo defaultní světlá
      const finalCardColor = extractedCard
        ? lightenCardColor(extractedCard)
        : 'rgba(255, 255, 255, 0.95)';

      // Vytvořit nový objekt s barvami - NEPOUŽÍVAT ...colors, protože může obsahovat staré/defaultní hodnoty
      colors = {
        // Základní barvy pro light mode
        text: 'rgba(0, 0, 0, 1)',
        textSecondary: 'rgba(100, 100, 100, 1)',
        background: 'rgba(255, 255, 255, 1)', // Vždy světlá barva pozadí
        card: finalCardColor, // Použít vypočítanou barvu karty
        // POUŽÍT EXTRAHOVANÉ BARVY - ty mají prioritu
        primary: finalPrimary,
        progressIndicator: finalProgressIndicator,
        timeIndicator: finalTimeIndicator,
        // Zachovat accent barvy
        accent1: finalAccent1,
        accent2: finalAccent2,
        accent3: finalAccent3,
        // Zachovat ostatní barvy z baseTheme, pokud nejsou extrahované
        secondary: colors.secondary || baseTheme?.colors?.secondary,
        border: colors.border || baseTheme?.colors?.border
      };

      console.log('☀️ Light mode - výsledná primary barva:', colors.primary);
    }
    return colors;
  };

  // Dynamické barvy (buď z fotky, nebo defaultní) - přepočítá se při změně colorMode
  // Použít useMemo pro optimalizaci - přepočítá se při změně colorMode, themeId, customBackground nebo baseTheme
  // Poznámka: getCurrentThemeColors() čte customBackground a baseTheme přímo, takže není potřeba ho přidat do dependencies
  const themeColors = useMemo(() => {
    // Zavolat getCurrentThemeColors() přímo, aby použil aktuální hodnoty
    // Tato funkce čte customBackground a baseTheme přímo, takže když se změní, useMemo se přepočítá
    const colors = getCurrentThemeColors();

    // Debug: zkontrolovat, zda customBackground obsahuje barvy
    let customBgHasColors = false;
    let customBgPrimary = null;
    if (customBackground) {
      try {
        const parsed = JSON.parse(customBackground);
        customBgHasColors = !!parsed?.colors;
        customBgPrimary = parsed?.colors?.primary;
      } catch (e) {
        // Ignorovat chyby parsování
      }
    }

    console.log('🔄 themeColors memo aktualizován:', {
      primary: colors.primary,
      customBackground: customBackground ? 'exists' : 'null',
      customBackgroundLength: customBackground ? customBackground.length : 0,
      customBgHasColors,
      customBgPrimary,
      colorMode,
      themeId,
      baseThemeId: baseTheme?.id,
      baseThemePrimary: baseTheme?.colors?.primary
    });

    // FINÁLNÍ OVĚŘENÍ: Pokud máme custom pozadí s barvami, VŽDY použít extrahované barvy
    // Toto je poslední kontrola, která zajistí, že se extrahované barvy použijí i když se něco pokazilo
    if (customBgHasColors && customBgPrimary) {
      const backgroundData = getBackgroundData();
      if (backgroundData?.colors) {
        const extractedColors = backgroundData.colors;
        console.log('🔍 Finální ověření - kontroluji extrahované barvy:', {
          extractedPrimary: extractedColors.primary,
          currentPrimary: colors.primary,
          baseThemePrimary: baseTheme?.colors?.primary,
          customBgHasColors,
          customBgPrimary
        });

        // VŽDY použít extrahované barvy, pokud existují - přepsat jakékoliv defaultní barvy
        if (extractedColors.primary) {
          // Pokud je primary barva stále defaultní (nebo upravená defaultní), použít extrahovanou
          const isDefaultPrimary = colors.primary === baseTheme?.colors?.primary ||
                                   colors.primary === adjustColorForDarkMode(baseTheme?.colors?.primary) ||
                                   colors.primary === adjustColorForLightMode(baseTheme?.colors?.primary);

          if (isDefaultPrimary && extractedColors.primary !== baseTheme?.colors?.primary) {
            console.warn('⚠️ Primary barva je stále defaultní - VYNUCUJI extrahovanou:', {
              currentPrimary: colors.primary,
              extractedPrimary: extractedColors.primary,
              baseThemePrimary: baseTheme?.colors?.primary
            });
            // Použít extrahovanou barvu PŘÍMO
            colors.primary = extractedColors.primary;
          }
        }
        // Vždy použít extrahované barvy pro ostatní vlastnosti
        if (extractedColors.progressIndicator) {
          colors.progressIndicator = extractedColors.progressIndicator;
        }
        if (extractedColors.timeIndicator) {
          colors.timeIndicator = extractedColors.timeIndicator;
        }
        if (extractedColors.accent1) {
          colors.accent1 = extractedColors.accent1;
        }
        if (extractedColors.accent2) {
          colors.accent2 = extractedColors.accent2;
        }
        if (extractedColors.accent3) {
          colors.accent3 = extractedColors.accent3;
        }
        console.log('✅ Finální ověření - extrahované barvy:', {
          primary: colors.primary,
          extractedPrimary: extractedColors.primary,
          baseThemePrimary: baseTheme?.colors?.primary,
          areEqual: colors.primary === extractedColors.primary
        });
      }
    }

    return colors;
  }, [colorMode, themeId, customBackground, baseTheme]);

  // Aktuální téma s dynamickými barvami a uloženými vlastnostmi
  const currentTheme = useMemo(() => {
    if (!baseTheme) return null;

    // Získat uložené vlastnosti z customBackground (pokud existují)
    const savedProperties = getSavedThemeProperties();
    const backgroundUrl = getBackgroundImageUrl();
    const hasImage = !!backgroundUrl && baseTheme?.allowsCustomBackground;

    // Pokud máme vlastní pozadí, použít uložené vlastnosti, jinak použít z baseTheme
    const useRoundedStyle = hasImage && savedProperties.useRoundedStyle !== null
      ? savedProperties.useRoundedStyle
      : baseTheme?.useRoundedStyle ?? false;

    const fontFamily = hasImage && savedProperties.fontFamily
      ? savedProperties.fontFamily
      : baseTheme?.fontFamily || "'Petrona', serif";

    return {
      ...baseTheme,
      colors: themeColors,
      useRoundedStyle,
      fontFamily
    };
  }, [baseTheme, themeColors, customBackground]);

  // Získat styl pro pozadí
  const getBackgroundStyle = () => {
    const backgroundUrl = getBackgroundImageUrl();
    // Použít obrázek pokud existuje (buď custom nebo defaultní) a téma ho podporuje
    const hasImage = !!backgroundUrl && baseTheme?.allowsCustomBackground;
    const themeColors = getCurrentThemeColors();

    // Barva pozadí pro body/root - použít barvy z fotky pokud jsou, jinak defaultní
    let backgroundColor = themeColors?.background || currentTheme?.colors?.background || '#f4ddc4';
    if (hasImage) {
      // Pokud je barva v rgba formátu, převést na rgb (odstranit alpha)
      if (backgroundColor.startsWith('rgba')) {
        const rgbMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          backgroundColor = `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`;
        }
      } else if (backgroundColor.startsWith('rgb(')) {
        // Už je v rgb formátu, nechat beze změny
      } else {
        // Jiný formát, nechat beze změny
      }
    }

    const baseStyle = {
      backgroundColor: backgroundColor,
      transition: 'background-color 0.3s ease, background-image 0.3s ease'
    };

    // Pokud máme custom pozadí a téma ho podporuje
    if (hasImage) {
      // Určit barvu overlay podle colorMode
      let overlayColor;

      // Pokud je dark mode, použít tmavý overlay
      if (colorMode === 'dark') {
        overlayColor = 'rgba(0, 0, 0, 0.8)'; // Černá s 80% průhledností pro tmavší efekt
      } else if (colorMode === 'light') {
        // Pro light mode použít světlý overlay
        overlayColor = 'rgba(255, 255, 255, 0.6)'; // Bílá s 60% průhledností
      }

      // Použít linear-gradient pro průhlednost 60% (opacity 0.6) nad dynamickou barvou
      // Vytvořit overlay s 60% průhledností nad obrázkem
      return {
        ...baseStyle,
        backgroundImage: `linear-gradient(${overlayColor}, ${overlayColor}), url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundBlendMode: 'normal'
      };
    }

    return baseStyle;
  };

  // Získat backgroundColor pro obrazovky - transparent když je obrázek
  const getScreenBackgroundColor = () => {
    const backgroundUrl = getBackgroundImageUrl();
    const hasImage = !!backgroundUrl && baseTheme?.allowsCustomBackground;
    const themeColors = getCurrentThemeColors();

    // Pokud je obrázek, vrátit transparent, aby bylo vidět pozadí z body
    if (hasImage) {
      return 'transparent';
    }

    // Použít barvy z fotky pokud jsou, jinak defaultní
    return themeColors?.background || currentTheme?.colors?.background || '#f4ddc4';
  };

  // Aplikovat pozadí, barvy a fontFamily na body, root a #root element
  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const appRoot = document.getElementById('root');
    const bgStyle = getBackgroundStyle();
    const themeColors = getCurrentThemeColors();

    // Nastavit fontFamily podle aktuálního tématu (může být z uložených vlastností)
    const fontFamily = currentTheme?.fontFamily || baseTheme?.fontFamily || "'Petrona', serif";
    const useRoundedStyle = currentTheme?.useRoundedStyle ?? false;
    console.log('🎨 Setting fontFamily:', { themeId, fontFamily, themeName: baseTheme?.id, useRoundedStyle });
    console.log('🎨 Theme colors:', themeColors);

    // Nastavit jako CSS custom property pro použití v CSS
    root.style.setProperty('--theme-font-family', fontFamily);
    root.style.setProperty('--theme-use-rounded-style', useRoundedStyle ? '1' : '0');

    // Nastavit data atribut pro CSS selektor
    if (useRoundedStyle) {
      root.setAttribute('data-rounded-style', 'true');
    } else {
      root.removeAttribute('data-rounded-style');
    }

    // Nastavit barvy jako CSS custom properties
    if (themeColors) {
      Object.entries(themeColors).forEach(([key, value]) => {
        const cssVarName = `--theme-color-${key}`;
        root.style.setProperty(cssVarName, value);
      });
    }

    // Nastavit také přímo s !important pro zajištění, že se aplikuje
    body.style.setProperty('font-family', fontFamily, 'important');
    root.style.setProperty('font-family', fontFamily, 'important');
    if (appRoot) {
      appRoot.style.setProperty('font-family', fontFamily, 'important');
    }

    // Nastavit barvu textu globálně (pro tmavé fotky bílý text, pro světlé černý)
    if (themeColors?.text) {
      body.style.setProperty('color', themeColors.text, 'important');
      root.style.setProperty('color', themeColors.text, 'important');
      if (appRoot) {
        appRoot.style.setProperty('color', themeColors.text, 'important');
      }

      // Přidat CSS třídu pro tmavé pozadí, která přepíše Tailwind text-gray-* třídy a bg-white/* třídy
      const isDarkText = themeColors.text.includes('255, 255, 255') || themeColors.text === '#ffffff' || themeColors.text === 'white';
      const isLightText = themeColors.text.includes('0, 0, 0') || themeColors.text === '#000000' || themeColors.text === 'black';

      // Aplikovat CSS pro tmavé i světlé pozadí
      if (isDarkText || isLightText) {
        // Přidat CSS pro přepsání text-gray-* tříd a bg-white/* tříd na tmavých pozadích
        let styleElement = document.getElementById('dark-theme-text-override');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'dark-theme-text-override';
          document.head.appendChild(styleElement);
        }

        // Získat barvu karty
        const cardColor = themeColors.card || (isDarkText ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.95)');

        if (isDarkText) {
          // CSS pro tmavé pozadí (bílý text)
          styleElement.textContent = `
            /* Přepsat textové barvy na bílou pro tmavé pozadí */
            .text-gray-800, .text-gray-700, .text-gray-600, .text-gray-500, .text-gray-400, .text-gray-300,
            .text-black, .text-gray-900 {
              color: ${themeColors.text} !important;
            }

            /* Zajistit, aby všechny textové elementy měly správnou barvu */
            h1, h2, h3, h4, h5, h6, p, span, div, a, button, label, input, textarea, select {
              color: inherit;
            }

            /* Přepsat bílé pozadí na tmavé, aby byl bílý text viditelný */
            .bg-white, .bg-white\\/50, .bg-white\\/70, .bg-white\\/30, .bg-white\\/20, .bg-white\\/90, .bg-white\\/95,
            .bg-white\\/10, .bg-white\\/40, .bg-white\\/60, .bg-white\\/80 {
              background-color: ${cardColor} !important;
            }

            /* Přepsat hover stavy pro bílé pozadí */
            .hover\\:bg-white:hover, .hover\\:bg-white\\/70:hover, .hover\\:bg-white\\/30:hover,
            .hover\\:bg-white\\/40:hover, .hover\\:bg-white\\/90:hover {
              background-color: ${cardColor} !important;
              opacity: 0.95;
            }

            /* Přepsat text-gray-* barvy v komponentách s bílým pozadím */
            .bg-white .text-gray-700, .bg-white\\/50 .text-gray-700, .bg-white\\/70 .text-gray-700,
            .bg-white\\/30 .text-gray-700, .bg-white\\/90 .text-gray-700,
            .bg-white .text-gray-800, .bg-white\\/50 .text-gray-800, .bg-white\\/70 .text-gray-800 {
              color: ${themeColors.text} !important;
            }

            /* Přepsat border barvy na světlé pro tmavé pozadí */
            .border-black\\/10, .border-gray-200, .border-gray-300 {
              border-color: rgba(255, 255, 255, 0.3) !important;
            }

            /* Zajistit, aby text na kartách měl správnou barvu */
            [style*="background-color"] {
              color: ${themeColors.text} !important;
            }
          `;
        } else {
          // CSS pro světlé pozadí (černý text)
          styleElement.textContent = `
            /* Přepsat textové barvy na černou pro světlé pozadí */
            .text-gray-800, .text-gray-700, .text-gray-600, .text-gray-500, .text-gray-400, .text-gray-300,
            .text-black, .text-gray-900 {
              color: ${themeColors.text} !important;
            }

            /* Zajistit, aby všechny textové elementy měly správnou barvu */
            h1, h2, h3, h4, h5, h6, p, span, div, a, button, label, input, textarea, select {
              color: inherit;
            }

            /* Přepsat border barvy na tmavé pro světlé pozadí */
            .border-black\\/10, .border-gray-200, .border-gray-300 {
              border-color: rgba(0, 0, 0, 0.15) !important;
            }
          `;
        }
      } else {
        // Odstranit CSS pro tmavé pozadí, pokud není potřeba
        const styleElement = document.getElementById('dark-theme-text-override');
        if (styleElement) {
          styleElement.remove();
        }
      }
    }

    body.style.transition = 'background-color 0.3s ease, background-image 0.3s ease, font-family 0.3s ease, color 0.3s ease';
    root.style.transition = 'background-color 0.3s ease, background-image 0.3s ease, font-family 0.3s ease, color 0.3s ease';
    if (appRoot) {
      appRoot.style.transition = 'background-color 0.3s ease, background-image 0.3s ease, font-family 0.3s ease, color 0.3s ease';
    }

    // Nastavit pozadí na body, root a #root
    if (bgStyle.backgroundColor) {
      body.style.backgroundColor = bgStyle.backgroundColor;
      root.style.backgroundColor = bgStyle.backgroundColor;
      if (appRoot) {
        appRoot.style.backgroundColor = bgStyle.backgroundColor;
      }
    }

    if (bgStyle.backgroundImage) {
      // Aplikovat pozadí s !important pro zajištění, že se správně aplikuje
      // background-size: cover zachovává poměr stran a vyplní celý prostor bez deformace
      // Použít scroll místo fixed pro lepší kompatibilitu
      body.style.setProperty('background-image', bgStyle.backgroundImage, 'important');
      body.style.setProperty('background-size', 'cover', 'important');
      body.style.setProperty('background-position', 'center center', 'important');
      body.style.setProperty('background-repeat', 'no-repeat', 'important');
      body.style.setProperty('background-attachment', 'scroll', 'important');
      // Zajistit, aby se obrázek nedeformoval
      body.style.setProperty('image-rendering', 'auto', 'important');

      // Aplikovat i na root
      root.style.setProperty('background-image', bgStyle.backgroundImage, 'important');
      root.style.setProperty('background-size', 'cover', 'important');
      root.style.setProperty('background-position', 'center center', 'important');
      root.style.setProperty('background-repeat', 'no-repeat', 'important');
      root.style.setProperty('background-attachment', 'scroll', 'important');
      root.style.setProperty('image-rendering', 'auto', 'important');

      if (appRoot) {
        appRoot.style.setProperty('background-image', bgStyle.backgroundImage, 'important');
        appRoot.style.setProperty('background-size', 'cover', 'important');
        appRoot.style.setProperty('background-position', 'center center', 'important');
        appRoot.style.setProperty('background-repeat', 'no-repeat', 'important');
        appRoot.style.setProperty('background-attachment', 'scroll', 'important');
        appRoot.style.setProperty('image-rendering', 'auto', 'important');
      }
    } else {
      body.style.backgroundImage = '';
      root.style.backgroundImage = '';
      if (appRoot) {
        appRoot.style.backgroundImage = '';
      }
    }
  }, [themeId, customBackground, baseTheme, themeColors, colorMode, currentTheme]);

  // Uložit theme ID do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-theme', themeId);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, [themeId]);

  // Debug: sledovat změny customBackground
  useEffect(() => {
    console.log('🔄 customBackground změněn:', {
      exists: !!customBackground,
      length: customBackground?.length,
      themeId
    });

    if (customBackground) {
      try {
        const parsed = JSON.parse(customBackground);
        console.log('🔄 customBackground obsahuje:', {
          hasUrl: !!parsed.url,
          hasColors: !!parsed.colors,
          primaryColor: parsed.colors?.primary,
          colorKeys: parsed.colors ? Object.keys(parsed.colors) : []
        });
      } catch (e) {
        console.warn('🔄 Chyba při parsování customBackground:', e);
      }
    }
  }, [customBackground, themeId]);

  // Uložit custom background do localStorage při změně (pro aktuální téma)
  useEffect(() => {
    try {
      const key = getBackgroundStorageKey(themeId);
      if (customBackground) {
        localStorage.setItem(key, customBackground);
        console.log('💾 Uloženo do localStorage:', key);
      } else {
        localStorage.removeItem(key);
        console.log('🗑️ Odstraněno z localStorage:', key);
      }
    } catch (error) {
      console.warn('Failed to save custom background to localStorage:', error);
    }
  }, [customBackground, themeId]);

  // Uložit color mode do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-color-mode', colorMode);
    } catch (error) {
      console.warn('Failed to save color mode to localStorage:', error);
    }
  }, [colorMode]);

  // Funkce pro změnu color mode
  const changeColorMode = (mode) => {
    if (mode === 'dark' || mode === 'light') {
      setColorMode(mode);
    }
  };

  // Funkce pro změnu tématu
  const changeTheme = (newThemeId) => {
    const theme = getThemeById(newThemeId);
    if (theme) {
      // Nejdříve uložit aktuální pozadí pro aktuální téma
      try {
        const currentKey = getBackgroundStorageKey(themeId);
        if (customBackground) {
          localStorage.setItem(currentKey, customBackground);
        }
      } catch (error) {
        console.warn('Failed to save current theme background:', error);
      }

      // Změnit téma
      setThemeId(newThemeId);

      // Načíst pozadí pro nové téma (pokud existuje)
      if (theme.allowsCustomBackground) {
        const newBackground = loadBackgroundForTheme(newThemeId);
        setCustomBackground(newBackground);
      } else {
        // Pokud nové téma nepodporuje custom background, skrýt ho
        // ale neukládat null - pozadí zůstane v localStorage pro případ návratu
        setCustomBackground(null);
      }
    }
  };

  // Funkce pro nastavení custom pozadí
  const setCustomBackgroundImage = (imageUrl) => {
    console.log('📸 setCustomBackgroundImage voláno:', {
      imageUrlType: typeof imageUrl,
      imageUrlLength: imageUrl?.length,
      allowsCustomBackground: baseTheme?.allowsCustomBackground,
      baseThemeId: baseTheme?.id
    });

    // Ověřit, zda aktuální téma podporuje custom pozadí
    if (baseTheme?.allowsCustomBackground) {
      // Zkontrolovat, zda imageUrl obsahuje barvy
      let hasColors = false;
      let primaryColor = null;
      if (imageUrl && typeof imageUrl === 'string') {
        try {
          const parsed = JSON.parse(imageUrl);
          hasColors = !!parsed?.colors;
          primaryColor = parsed?.colors?.primary;
          console.log('📸 Parsování imageUrl:', {
            hasUrl: !!parsed.url,
            hasColors,
            primaryColor
          });
        } catch (e) {
          console.warn('📸 Chyba při parsování imageUrl:', e);
        }
      }

      setCustomBackground(imageUrl);
      console.log('📸 setCustomBackground voláno s:', {
        hasColors,
        primaryColor
      });
    } else {
      console.warn('⚠️ Current theme does not support custom background');
    }
  };

  // Funkce pro odstranění custom pozadí (pro aktuální téma)
  const removeCustomBackground = () => {
    try {
      const key = getBackgroundStorageKey(themeId);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove custom background from localStorage:', error);
    }
    setCustomBackground(null);
  };

  const value = {
    themes: THEMES,
    currentTheme,
    themeId,
    changeTheme,
    customBackground,
    setCustomBackground: setCustomBackgroundImage,
    removeCustomBackground,
    getBackgroundStyle,
    getScreenBackgroundColor,
    getCurrentThemeColors,
    getBackgroundImageUrl,
    allowsCustomBackground: baseTheme?.allowsCustomBackground || false,
    colorMode,
    changeColorMode,
    themeColors // Přidat memoizované themeColors pro reaktivní aktualizace
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

