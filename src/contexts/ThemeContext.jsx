import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME_ID, getThemeById } from '@data/themes';

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

  // Základní téma (statické)
  const baseTheme = getThemeById(themeId);

  // Získat data z customBackground
  const getBackgroundData = () => {
    if (!customBackground) return null;

    try {
      const parsed = JSON.parse(customBackground);
      return parsed;
    } catch (e) {
      // Pokud to není JSON, použít jako URL (starý formát)
      return { url: customBackground };
    }
  };

  // Získat URL obrázku z customBackground
  const getBackgroundImageUrl = () => {
    const data = getBackgroundData();
    return data?.url || null;
  };

  // Získat extrahované barvy z customBackground
  const getExtractedColors = () => {
    const data = getBackgroundData();
    return data?.colors || null;
  };

  // Získat aktuální barvy tématu (buď z fotky, nebo defaultní)
  const getCurrentThemeColors = () => {
    const backgroundUrl = getBackgroundImageUrl();
    const hasImage = !!backgroundUrl && baseTheme?.allowsCustomBackground;
    const extractedColors = getExtractedColors();

    // Pokud máme fotku s extrahovanými barvami, použít je
    if (hasImage && extractedColors) {
      // Sloučit extrahované barvy s defaultními (extrahované mají prioritu)
      return {
        ...baseTheme?.colors,
        ...extractedColors
      };
    }

    // Jinak použít defaultní barvy tématu
    return baseTheme?.colors || {};
  };

  // Dynamické barvy (buď z fotky, nebo defaultní)
  const themeColors = getCurrentThemeColors();

  // Aktuální téma s dynamickými barvami
  const currentTheme = baseTheme ? {
    ...baseTheme,
    colors: themeColors
  } : null;

  // Získat styl pro pozadí
  const getBackgroundStyle = () => {
    const backgroundUrl = getBackgroundImageUrl();
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
      return {
        ...baseStyle,
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
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

    // Nastavit fontFamily podle aktuálního tématu
    const fontFamily = baseTheme?.fontFamily || "'Petrona', serif";
    console.log('🎨 Setting fontFamily:', { themeId, fontFamily, themeName: baseTheme?.id });
    console.log('🎨 Theme colors:', themeColors);

    // Nastavit jako CSS custom property pro použití v CSS
    root.style.setProperty('--theme-font-family', fontFamily);

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

      if (isDarkText) {
        // Přidat CSS pro přepsání text-gray-* tříd a bg-white/* tříd na tmavých pozadích
        let styleElement = document.getElementById('dark-theme-text-override');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'dark-theme-text-override';
          document.head.appendChild(styleElement);
        }

        // Získat barvu karty pro tmavé pozadí
        const cardColor = themeColors.card || 'rgba(30, 30, 30, 0.9)';

        styleElement.textContent = `
          /* Přepsat textové barvy na bílou */
          .text-gray-800, .text-gray-700, .text-gray-600, .text-gray-500, .text-gray-400, .text-gray-300,
          .text-black, .text-gray-900 {
            color: ${themeColors.text} !important;
          }
          h1, h2, h3, h4, h5, h6, p, span, div, a, button, label {
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
          .bg-white\\/30 .text-gray-700, .bg-white\\/90 .text-gray-700 {
            color: ${themeColors.text} !important;
          }

          /* Přepsat border barvy na světlé pro tmavé pozadí */
          .border-black\\/10, .border-gray-200, .border-gray-300 {
            border-color: rgba(255, 255, 255, 0.2) !important;
          }
        `;
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
      body.style.backgroundImage = bgStyle.backgroundImage;
      body.style.backgroundSize = bgStyle.backgroundSize || 'cover';
      body.style.backgroundPosition = bgStyle.backgroundPosition || 'center';
      body.style.backgroundRepeat = bgStyle.backgroundRepeat || 'no-repeat';
      body.style.backgroundAttachment = 'fixed';
      // Aplikovat i na root pokud je potřeba
      root.style.backgroundImage = bgStyle.backgroundImage;
      root.style.backgroundSize = bgStyle.backgroundSize || 'cover';
      root.style.backgroundPosition = bgStyle.backgroundPosition || 'center';
      root.style.backgroundRepeat = bgStyle.backgroundRepeat || 'no-repeat';
      root.style.backgroundAttachment = 'fixed';
      if (appRoot) {
        appRoot.style.backgroundImage = bgStyle.backgroundImage;
        appRoot.style.backgroundSize = bgStyle.backgroundSize || 'cover';
        appRoot.style.backgroundPosition = bgStyle.backgroundPosition || 'center';
        appRoot.style.backgroundRepeat = bgStyle.backgroundRepeat || 'no-repeat';
        appRoot.style.backgroundAttachment = 'fixed';
      }
    } else {
      body.style.backgroundImage = '';
      root.style.backgroundImage = '';
      if (appRoot) {
        appRoot.style.backgroundImage = '';
      }
    }
  }, [themeId, customBackground, baseTheme, themeColors]);

  // Uložit theme ID do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-theme', themeId);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, [themeId]);

  // Uložit custom background do localStorage při změně (pro aktuální téma)
  useEffect(() => {
    try {
      const key = getBackgroundStorageKey(themeId);
      if (customBackground) {
        localStorage.setItem(key, customBackground);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to save custom background to localStorage:', error);
    }
  }, [customBackground, themeId]);

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
    // Ověřit, zda aktuální téma podporuje custom pozadí
    if (baseTheme?.allowsCustomBackground) {
      setCustomBackground(imageUrl);
    } else {
      console.warn('Current theme does not support custom background');
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
    allowsCustomBackground: baseTheme?.allowsCustomBackground || false
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

