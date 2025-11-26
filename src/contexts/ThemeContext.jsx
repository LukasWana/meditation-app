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

  const [customBackground, setCustomBackground] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-custom-background');
      return saved || null;
    } catch (error) {
      console.warn('Failed to load custom background from localStorage:', error);
      return null;
    }
  });

  // Aktuální téma
  const currentTheme = getThemeById(themeId);

  // Získat styl pro pozadí
  const getBackgroundStyle = () => {
    const baseStyle = {
      backgroundColor: currentTheme?.colors?.background || '#f4ddc4',
      transition: 'background-color 0.3s ease'
    };

    // Pokud máme custom pozadí a téma ho podporuje
    if (customBackground && currentTheme?.allowsCustomBackground) {
      return {
        ...baseStyle,
        backgroundImage: `url(${customBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }

    return baseStyle;
  };

  // Aplikovat pozadí a fontFamily na body, root a #root element
  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const appRoot = document.getElementById('root');
    const bgStyle = getBackgroundStyle();

    // Nastavit fontFamily podle aktuálního tématu
    const fontFamily = currentTheme?.fontFamily || "'Petrona', serif";
    console.log('🎨 Setting fontFamily:', { themeId, fontFamily, themeName: currentTheme?.id });

    // Nastavit jako CSS custom property pro použití v CSS
    root.style.setProperty('--theme-font-family', fontFamily);

    // Nastavit také přímo s !important pro zajištění, že se aplikuje
    body.style.setProperty('font-family', fontFamily, 'important');
    root.style.setProperty('font-family', fontFamily, 'important');
    if (appRoot) {
      appRoot.style.setProperty('font-family', fontFamily, 'important');
    }

    body.style.transition = 'background-color 0.3s ease, font-family 0.3s ease';
    root.style.transition = 'background-color 0.3s ease, font-family 0.3s ease';
    if (appRoot) {
      appRoot.style.transition = 'background-color 0.3s ease, font-family 0.3s ease';
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
  }, [themeId, customBackground, currentTheme]);

  // Uložit theme ID do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-theme', themeId);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, [themeId]);

  // Uložit custom background do localStorage při změně
  useEffect(() => {
    try {
      if (customBackground) {
        localStorage.setItem('meditation-app-custom-background', customBackground);
      } else {
        localStorage.removeItem('meditation-app-custom-background');
      }
    } catch (error) {
      console.warn('Failed to save custom background to localStorage:', error);
    }
  }, [customBackground]);

  // Funkce pro změnu tématu
  const changeTheme = (newThemeId) => {
    const theme = getThemeById(newThemeId);
    if (theme) {
      setThemeId(newThemeId);
      // Pokud nové téma nepodporuje custom background, vymaž ho
      if (!theme.allowsCustomBackground) {
        setCustomBackground(null);
      }
    }
  };

  // Funkce pro nastavení custom pozadí
  const setCustomBackgroundImage = (imageUrl) => {
    // Ověřit, zda aktuální téma podporuje custom pozadí
    if (currentTheme?.allowsCustomBackground) {
      setCustomBackground(imageUrl);
    } else {
      console.warn('Current theme does not support custom background');
    }
  };

  // Funkce pro odstranění custom pozadí
  const removeCustomBackground = () => {
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
    allowsCustomBackground: currentTheme?.allowsCustomBackground || false
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

