import React, { createContext, useContext, useState, useEffect } from 'react';

const ShaderSettingsContext = createContext();

export const useShaderSettings = () => {
  const context = useContext(ShaderSettingsContext);
  if (!context) {
    throw new Error('useShaderSettings must be used within ShaderSettingsProvider');
  }
  return context;
};

export const ShaderSettingsProvider = ({ children }) => {
  const [shaderSettings, setShaderSettings] = useState(() => {
    // Načti z localStorage
    try {
      const saved = localStorage.getItem('meditation-app-shader-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrace starých klíčů na nové (backward compatibility)
        if (parsed.slova) {
          if (!parsed.meditace) {
            parsed.meditace = parsed.slova;
          }
          delete parsed.slova;
        }
        if (parsed.meditation) {
          if (!parsed.dychani) {
            parsed.dychani = parsed.meditation;
          }
          delete parsed.meditation;
        }
        if (parsed.breath) {
          if (!parsed.dychani) {
            parsed.dychani = parsed.breath;
          }
          delete parsed.breath;
        }
        if (parsed.meditacia) {
          if (!parsed.dychani) {
            parsed.dychani = parsed.meditacia;
          }
          delete parsed.meditacia;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load shader settings:', e);
    }
    // Výchozí hodnoty - podle názvů v menu
    return {
      meditace: 'meditace',
      dychani: 'dychani',
      hudba: 'hudba',
      settings: 'settings'
    };
  });

  // Barvy pro každou sekci (místo shaderu)
  const [colorSettings, setColorSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-color-settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load color settings:', e);
    }
    return {};
  });

  // Ulož do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-shader-settings', JSON.stringify(shaderSettings));
    } catch (e) {
      console.error('Failed to save shader settings:', e);
    }
  }, [shaderSettings]);

  // Ulož barvy do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-color-settings', JSON.stringify(colorSettings));
    } catch (e) {
      console.error('Failed to save color settings:', e);
    }
  }, [colorSettings]);

  const setShaderForSection = (section, variant) => {
    setShaderSettings(prev => ({
      ...prev,
      [section]: variant
    }));
  };

  const getShaderForSection = (section) => {
    // Pokud je shader explicitně null, vrať null (barva má prioritu)
    // Jinak vrať shader nebo default
    if (shaderSettings[section] === null) {
      return null;
    }
    return shaderSettings[section] || 'default';
  };

  const clearColorForSection = (section) => {
    setColorSettings(prev => {
      const newSettings = { ...prev };
      delete newSettings[section];
      return newSettings;
    });
  };

  const setColorForSection = (section, color) => {
    if (color) {
      setColorSettings(prev => ({
        ...prev,
        [section]: color
      }));
    } else {
      // Pokud je color null, zruš barvu
      clearColorForSection(section);
    }
  };

  const getColorForSection = (section) => {
    return colorSettings[section] || null;
  };

  return (
    <ShaderSettingsContext.Provider
      value={{
        shaderSettings,
        colorSettings,
        setShaderForSection,
        getShaderForSection,
        setColorForSection,
        getColorForSection,
        clearColorForSection
      }}
    >
      {children}
    </ShaderSettingsContext.Provider>
  );
};

