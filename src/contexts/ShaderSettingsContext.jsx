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
        if (parsed.meditation && !parsed.meditace) {
          parsed.meditace = parsed.meditation;
          delete parsed.meditation;
        }
        if (parsed.breath && !parsed.dychani) {
          parsed.dychani = parsed.breath;
          delete parsed.breath;
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
      settings: 'settings',
      slova: 'default'
    };
  });

  // Ulož do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-shader-settings', JSON.stringify(shaderSettings));
    } catch (e) {
      console.error('Failed to save shader settings:', e);
    }
  }, [shaderSettings]);

  const setShaderForSection = (section, variant) => {
    setShaderSettings(prev => ({
      ...prev,
      [section]: variant
    }));
  };

  const getShaderForSection = (section) => {
    return shaderSettings[section] || 'default';
  };

  return (
    <ShaderSettingsContext.Provider
      value={{
        shaderSettings,
        setShaderForSection,
        getShaderForSection
      }}
    >
      {children}
    </ShaderSettingsContext.Provider>
  );
};

