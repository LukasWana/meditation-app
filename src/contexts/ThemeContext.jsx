import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { THEMES, DEFAULT_THEME_ID, getThemeById } from '@data/themes';
import cacheService from '@services/cacheServiceRefactored';

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

  // Helper funkce pro získání klíče localStorage pro pozadí (globální – nezávislé na tématu)
  const getBackgroundStorageKey = () => {
    return 'meditation-app-custom-background';
  };

  // Helper funkce pro načtení pozadí
  const loadBackground = () => {
    try {
      const key = getBackgroundStorageKey();
      const saved = localStorage.getItem(key);
      return saved || null;
    } catch (error) {
      console.warn('Failed to load custom background from localStorage:', error);
      return null;
    }
  };

  const [customBackground, setCustomBackground] = useState(() => {
    return loadBackground();
  });

  // Základní téma (statické) - memoizovat, aby se neměnilo při každém renderu
  const baseTheme = useMemo(() => getThemeById(themeId), [themeId]);

  // Poznámka: Migrace useRoundedStyle v customBackground již není potřeba.
  // Styl (fontFamily, useRoundedStyle) se vždy bere z baseTheme, ne z uložených dat pozadí.

  // Přednačti aktuální pozadí do Cache Storage hned po startu / změně pozadí,
  // aby se při zobrazení už nemuselo čekat na síť.
  useEffect(() => {
    const backgroundUrl = (() => {
      try {
        const data = (() => {
          if (!customBackground) return null;
          try {
            return JSON.parse(customBackground);
          } catch (_e) {
            return { url: customBackground };
          }
        })();

        // Pokud je to barva, není co přednačítat
        if (data?.backgroundColor) return null;

        if (data?.url) return data.url;
        if (data?.downloadURL) return data.downloadURL;
        if (data?.firebasePath && (data.firebasePath.startsWith('http://') || data.firebasePath.startsWith('https://'))) {
          return data.firebasePath;
        }
        return null;
      } catch (_err) {
        return null;
      }
    })();

    if (!backgroundUrl || !baseTheme?.allowsCustomBackground) {
      setLoadedBackgroundUrl(null);
      return;
    }

    setLoadedBackgroundUrl(null);

    cacheService.preloadImage(backgroundUrl, `theme-background:${themeId}`).then((resolvedUrl) => {
      setLoadedBackgroundUrl(resolvedUrl || backgroundUrl);
    }).catch(() => { 
      setLoadedBackgroundUrl(backgroundUrl);
    });
  }, [customBackground, baseTheme, themeId]);

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

  // State pro sledování, zda je to první načtení (pro fade-in animaci)
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // State pro vybranou barvu progress baru (extrahovaná z fotky)
  const [progressBarColor, setProgressBarColor] = useState(null);

  // State pro asynchronně načtený obrázek
  const [loadedBackgroundUrl, setLoadedBackgroundUrl] = useState(null);

  // Získat zamýšlené URL (pro logiku tématu)
  const getTargetBackgroundImageUrl = () => {
    const data = getBackgroundData();
    if (!data || data.backgroundColor) return null;
    if (data?.url) return data.url;
    if (data?.downloadURL) return data.downloadURL;
    if (data?.firebasePath && (data.firebasePath.startsWith('http://') || data.firebasePath.startsWith('https://'))) return data.firebasePath;
    return null;
  };

  const getBackgroundImageUrl = () => {
    return loadedBackgroundUrl;
  };

  // Získat barvu progress baru (uloženou nebo extrahovanou)
  const getProgressBarColor = () => {
    // Pokud máme uloženou barvu, použij ji
    if (progressBarColor) {
      return progressBarColor;
    }

    // Jinak zkusím extrahovat z fotky
    const data = getBackgroundData();
    if (data?.colors && data.colors.length > 0) {
      // Vrátí první dominantní barvu
      return data.colors[0];
    }

    // Fallback barva
    const themeColors = getCurrentThemeColors();
    return themeColors?.primary || themeColors?.text || 'rgba(0, 0, 0, 1)';
  };

  // Nastavit barvu progress baru
  const setProgressBarColorCustom = (color) => {
    setProgressBarColor(color);
    try {
      localStorage.setItem('meditation-app-progress-bar-color', color);
    } catch (error) {
      console.warn('Failed to save progress bar color to localStorage:', error);
    }
  };

  // Načíst uloženou barvu progress baru při startu
  useEffect(() => {
    try {
      const saved = localStorage.getItem('meditation-app-progress-bar-color');
      if (saved) {
        setProgressBarColor(saved);
      }
    } catch (error) {
      console.warn('Failed to load progress bar color from localStorage:', error);
    }
  }, []);

  // Získat barvu pozadí z customBackground
  const getBackgroundColor = () => {
    const data = getBackgroundData();
    return data?.backgroundColor || null;
  };

  // Získat extrahované barvy z customBackground
  const getExtractedColors = () => {
    const data = getBackgroundData();
    return data?.colors || null;
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
    const targetBackgroundUrl = getTargetBackgroundImageUrl();
    const customBackgroundColor = getBackgroundColor();
    const hasImage = !!targetBackgroundUrl && baseTheme?.allowsCustomBackground;
    const extractedColors = getExtractedColors();
    let colors = {};

    // Pokud máme custom barvu pozadí, použít ji jako background
    if (customBackgroundColor) {
      colors = {
        ...baseTheme?.colors,
        background: customBackgroundColor
      };
    } else if (hasImage && extractedColors) {
      // Pokud máme fotku s extrahovanými barvami, použít je
      // console.log('🎨 Používám extrahované barvy z obrázku:', extractedColors);
      // Sloučit extrahované barvy s defaultními (extrahované mají prioritu)
      colors = {
        ...baseTheme?.colors,
        ...extractedColors
      };
    } else {
      // Jinak použít defaultní barvy tématu
      colors = baseTheme?.colors || {};
    }

    // Pokud je nastaven colorMode, upravit barvy podle volby
    if (colorMode === 'dark') {
      // Vynutit tmavý režim - tmavší barvy
      // Vždy použít tmavou barvu pozadí, bez ohledu na původní hodnotu
      colors = {
        ...colors,
        text: 'rgba(255, 255, 255, 1)',
        textSecondary: 'rgba(180, 180, 180, 1)',
        background: 'rgba(10, 10, 10, 1)', // Vždy tmavá barva pozadí
        card: 'rgba(15, 15, 15, 0.95)', // Vždy tmavá barva karty
        primary: colors.primary ? adjustColorForDarkMode(colors.primary) : 'rgba(30, 30, 30, 1)',
        timeIndicator: 'rgba(255, 255, 255, 1)' // Bílá pro dark mode
      };
    } else if (colorMode === 'light') {
      // Vynutit světlý režim
      // Vždy použít světlou barvu pozadí, bez ohledu na původní hodnotu
      colors = {
        ...colors,
        text: 'rgba(0, 0, 0, 1)',
        textSecondary: 'rgba(100, 100, 100, 1)',
        background: 'rgba(255, 255, 255, 1)', // Vždy světlá barva pozadí
        card: 'rgba(255, 255, 255, 0.95)', // Vždy světlá barva karty
        primary: colors.primary ? adjustColorForLightMode(colors.primary) : 'rgba(244, 221, 196, 1)',
        timeIndicator: 'rgba(0, 0, 0, 1)' // Černá pro light mode
      };
    }
    return colors;
  };

  // Dynamické barvy (buď z fotky, nebo defaultní) - přepočítá se při změně colorMode
  // Použít useMemo pro optimalizaci - přepočítá se při změně colorMode, themeId, customBackground nebo baseTheme
  const themeColors = useMemo(() => getCurrentThemeColors(), [colorMode, themeId, customBackground, baseTheme]);

  // Aktuální téma s dynamickými barvami a uloženými vlastnostmi
  const currentTheme = useMemo(() => {
    if (!baseTheme) return null;

    // Styl vždy pochází z aktuálně vybraného tématu, ne z uložených dat pozadí.
    // Tím se zajistí, že přepnutí tématu změní písmo a zaoblení, i když je aktivní vlastní pozadí.
    const useRoundedStyle = baseTheme?.useRoundedStyle ?? false;
    const fontFamily = baseTheme?.fontFamily || "'Petrona', serif";

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
    const customBackgroundColor = getBackgroundColor();
    const themeColors = getCurrentThemeColors();

    // Pokud máme custom barvu pozadí, použít ji
    if (customBackgroundColor) {
      return {
        backgroundColor: customBackgroundColor,
        transition: 'background-color 0.3s ease, background-image 0.3s ease'
      };
    }

    // Pokud máme obrázek, použít ho
    const hasImage = !!backgroundUrl && baseTheme?.allowsCustomBackground;

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

      // Pokud je dark mode, použít tmavý overlay (upraveno pro lepší efekt)
      if (colorMode === 'dark') {
        overlayColor = 'rgba(0, 0, 0, 0.6)'; // Černá s 60% průhledností pro jemnější tmavý efekt
      } else if (colorMode === 'light') {
        // Pro light mode použít světlý overlay
        overlayColor = 'rgba(255, 255, 255, 0.5)'; // Bílá s 50% průhledností pro světlejší efekt
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
  // Vrací rgba(0,0,0,0) místo 'transparent' pro kompatibilitu s Framer Motion animacemi
  const getScreenBackgroundColor = () => {
    const customBackgroundColor = getBackgroundColor();
    const targetBackgroundUrl = getTargetBackgroundImageUrl();
    const hasImage = !!targetBackgroundUrl && baseTheme?.allowsCustomBackground;
    const themeColors = getCurrentThemeColors();

    // Pokud máme custom barvu, použít ji
    if (customBackgroundColor) {
      return customBackgroundColor;
    }

    // Pokud je obrázek, vrátit rgba(0,0,0,0) místo 'transparent' pro animovatelnost
    if (hasImage) {
      return 'rgba(0, 0, 0, 0)';
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
    // Nastavit jako CSS custom property pro použití v CSS
    root.style.setProperty('--theme-font-family', fontFamily);
    root.style.setProperty('--theme-use-rounded-style', useRoundedStyle ? '1' : '0');
    // Radius pro rounded styl (umožňuje per-téma hodnotu)
    const roundedRadiusPx =
      (currentTheme?.roundedRadiusPx ?? baseTheme?.roundedRadiusPx) ??
      (useRoundedStyle ? 12 : 0);
    root.style.setProperty('--theme-rounded-radius', `${roundedRadiusPx}px`);
    // Radius pro čtvercové prvky (umožňuje per-téma hodnotu)
    // Pro rounded témata: kruh (50%), pro non-rounded (Calma): čtverec (0%)
    const roundedSquareRadius =
      (currentTheme?.roundedSquareRadius ?? baseTheme?.roundedSquareRadius) ??
      (useRoundedStyle ? '50%' : '0%');
    root.style.setProperty('--theme-rounded-square-radius', roundedSquareRadius);

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

      // Aplikovat CSS POUZE pro tmavé pozadí (dark mode)
      if (isDarkText) {
        // Přidat CSS pro přepsání text-gray-* tříd a bg-white/* tříd na tmavých pozadích
        let styleElement = document.getElementById('dark-theme-text-override');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'dark-theme-text-override';
          document.head.appendChild(styleElement);
        }

        // Získat barvu karty
        const cardColor = themeColors.card || 'rgba(0, 0, 0, 0.4)';

        // CSS pro tmavé pozadí (bílý text)
        styleElement.textContent = `
            /* Přepsat textové barvy na bílou pro tmavé pozadí */
            .text-gray-800, .text-gray-700, .text-gray-600, .text-gray-500, .text-gray-400, .text-gray-300,
            .text-black, .text-gray-900, .text-gray-100, .text-gray-200 {
              color: ${themeColors.text} !important;
            }

            /* Zajistit, aby všechny textové elementy měly správnou barvu */
            h1, h2, h3, h4, h5, h6, p, span, div, a, button, label, input, textarea, select {
              color: inherit;
            }

            /* Přepsat bílé pozadí na tmavé, aby byl bílý text viditelný */
            .bg-white, .bg-white\\/50, .bg-white\\/70, .bg-white\\/30, .bg-white\\/20, .bg-white\\/90, .bg-white\\/95,
            .bg-white\\/10, .bg-white\\/40, .bg-white\\/60, .bg-white\\/80, .bg-white\\/5 {
              background-color: ${cardColor} !important;
            }

            /* Přepsat bg-gray pozadí na tmavé */
            .bg-gray-50, .bg-gray-100, .bg-gray-200, .bg-gray-300, .bg-gray-400, .bg-gray-500,
            .bg-gray-600, .bg-gray-700, .bg-gray-800, .bg-gray-900 {
              background-color: ${cardColor} !important;
            }

            /* Přepsat bg-black pozadí */
            .bg-black, .bg-black\\/10, .bg-black\\/20, .bg-black\\/30, .bg-black\\/40,
            .bg-black\\/50, .bg-black\\/60, .bg-black\\/70, .bg-black\\/80, .bg-black\\/90 {
              background-color: ${cardColor} !important;
            }

            /* Přepsat hover stavy pro bílé pozadí */
            .hover\\:bg-white:hover, .hover\\:bg-white\\/70:hover, .hover\\:bg-white\\/30:hover,
            .hover\\:bg-white\\/40:hover, .hover\\:bg-white\\/90:hover, .hover\\:bg-white\\/50:hover,
            .hover\\:bg-white\\/20:hover, .hover\\:bg-white\\/60:hover, .hover\\:bg-white\\/80:hover {
              background-color: ${cardColor} !important;
              opacity: 0.95;
            }

            /* Přepsat hover stavy pro bg-gray */
            .hover\\:bg-gray-50:hover, .hover\\:bg-gray-100:hover, .hover\\:bg-gray-200:hover,
            .hover\\:bg-gray-300:hover, .hover\\:bg-gray-400:hover {
              background-color: ${cardColor} !important;
              opacity: 0.95;
            }

            /* Přepsat hover stavy pro bg-black */
            .hover\\:bg-black:hover, .hover\\:bg-black\\/10:hover, .hover\\:bg-black\\/20:hover {
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
            .border-black\\/10, .border-black\\/20, .border-gray-200, .border-gray-300, .border-gray-400 {
              border-color: rgba(255, 255, 255, 0.3) !important;
            }

            /* Přepsat focus ring barvy */
            .focus\\:ring-blue-500:focus, .focus\\:ring-gray-500:focus {
              --tw-ring-color: ${themeColors.primary || 'rgba(255, 255, 255, 0.5)'} !important;
            }

            .focus\\:border-blue-500:focus, .focus\\:border-gray-500:focus {
              border-color: ${themeColors.primary || 'rgba(255, 255, 255, 0.5)'} !important;
            }

            /* Specifické přepsání pro placeholder */
            ::placeholder {
              color: ${themeColors.textSecondary || 'rgba(255, 255, 255, 0.7)'} !important;
            }

            .placeholder-gray-500::placeholder,
            .placeholder-gray-400::placeholder {
              color: ${themeColors.textSecondary || 'rgba(255, 255, 255, 0.7)'} !important;
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

    // Nastavit transition - při prvním načtení použít 2s fade-in, jinak 0.3s
    const transitionDuration = isFirstLoad ? '2s' : '0.3s';
    const backgroundTransition = `background-color ${transitionDuration} ease, background-image ${transitionDuration} ease`;
    body.style.transition = `${backgroundTransition}, font-family 0.3s ease, color 0.3s ease`;
    root.style.transition = `${backgroundTransition}, font-family 0.3s ease, color 0.3s ease`;
    if (appRoot) {
      appRoot.style.transition = `${backgroundTransition}, font-family 0.3s ease, color 0.3s ease`;
    }

    // Při prvním načtení použít CSS pro fade-in efekt pozadí pomocí ::before pseudo-elementu
    if (isFirstLoad) {
      // Vytvořit nebo aktualizovat style element pro fade-in
      let fadeInStyle = document.getElementById('background-fade-in');
      if (!fadeInStyle) {
        fadeInStyle = document.createElement('style');
        fadeInStyle.id = 'background-fade-in';
        document.head.appendChild(fadeInStyle);
      }
      fadeInStyle.textContent = `
        body::before,
        html::before,
        #root::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          opacity: 0;
          transition: opacity 2s ease;
          pointer-events: none;
        }
      `;
    }

    // Nastavit pozadí na body, root a #root
    if (bgStyle.backgroundColor) {
      root.style.setProperty('--theme-bg-color', bgStyle.backgroundColor);
      body.style.backgroundColor = bgStyle.backgroundColor;
      root.style.backgroundColor = bgStyle.backgroundColor;
      if (appRoot) {
        appRoot.style.backgroundColor = bgStyle.backgroundColor;
      }
    } else {
      root.style.removeProperty('--theme-bg-color');
    }

    if (bgStyle.backgroundImage) {
      // Pokud máme obrázek, zajistit, aby #root měl transparentní pozadí, aby bylo vidět pozadí z body
      if (appRoot) {
        appRoot.style.setProperty('background-color', 'transparent', 'important');
      }
      
      // Nastavit CSS proměnnou pro pozadí
      root.style.setProperty('--bg-image', bgStyle.backgroundImage);
      
      // Vyčistit přímé background-image styly, které mohly být aplikovány dříve
      body.style.backgroundImage = '';
      root.style.backgroundImage = '';
      if (appRoot) {
        appRoot.style.backgroundImage = '';
      }
    } else {
      root.style.removeProperty('--bg-image');
      body.style.backgroundImage = '';
      root.style.backgroundImage = '';
      if (appRoot) {
        appRoot.style.backgroundImage = '';
      }
    }

    // Při prvním načtení spustit fade-in animaci
    if (isFirstLoad && (bgStyle.backgroundColor || bgStyle.backgroundImage)) {
      // Použít requestAnimationFrame pro zajištění, že se styly aplikují před animací
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Animovat opacity z 0 na 1
          body.style.opacity = '1';
          root.style.opacity = '1';
          if (appRoot) {
            appRoot.style.opacity = '1';
          }

          // Po dokončení animace označit, že už není první načtení
          setTimeout(() => {
            setIsFirstLoad(false);
            // Odstranit opacity style, aby neovlivňovalo další změny
            body.style.opacity = '';
            root.style.opacity = '';
            if (appRoot) {
              appRoot.style.opacity = '';
            }
          }, 4000); // 2 sekundy pro fade-in
        });
      });
    }
  }, [themeId, customBackground, baseTheme, themeColors, colorMode, currentTheme, isFirstLoad]);

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
      const key = getBackgroundStorageKey();
      if (customBackground) {
        localStorage.setItem(key, customBackground);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to save custom background to localStorage:', error);
    }
  }, [customBackground]);

  // Uložit do localStorage při změně colorMode
  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-color-mode', colorMode);
      
      // KISS: Přidat třídy na body pro globální CSS stylování (např. .glass-panel)
      if (colorMode === 'dark') {
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
      } else {
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
      }
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
      // Změnit téma – pozadí zůstává beze změny (je globální).
      // Všechna témata mají allowsCustomBackground=true.
      setThemeId(newThemeId);
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
      const key = getBackgroundStorageKey();
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
    getBackgroundColor,
    allowsCustomBackground: baseTheme?.allowsCustomBackground || false,
    colorMode,
    changeColorMode,
    progressBarColor,
    setProgressBarColor: setProgressBarColorCustom,
    getProgressBarColor
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

