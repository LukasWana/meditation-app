import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const ShaderSettingsContext = createContext();

export const useShaderSettings = () => {
  const context = useContext(ShaderSettingsContext);
  if (!context) {
    throw new Error('useShaderSettings must be used within ShaderSettingsProvider');
  }
  return context;
};

export const ShaderSettingsProvider = ({ children }) => {
  // Výchozí shader nastavení pro všechny sekce
  const defaultShaderSettings = {
    meditace: 'meditace',
    dychani: 'dychani',
    hudba: 'hudba',
    settings: 'settings'
  };

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
        // Zajisti, že všechny sekce mají výchozí hodnoty, pokud chybí
        const merged = { ...defaultShaderSettings, ...parsed };
        return merged;
      }
    } catch (e) {
      console.error('Failed to load shader settings:', e);
    }
    // Výchozí hodnoty - podle názvů v menu
    return { ...defaultShaderSettings };
  });

  // Barvy pro každou sekci (místo shaderu)
  // Výchozí barvy pro každou sekci
  const defaultColors = {
    meditace: '#f4ddc4',
    hudba: '#f4ddc4',
    dychani: '#f4ddc4',
    settings: '#f4ddc4'
  };

  const [colorSettings, setColorSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-color-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Zajisti, že všechny sekce mají výchozí barvu, pokud není nastavena
        const merged = { ...defaultColors, ...parsed };
        return merged;
      }
    } catch (e) {
      console.error('Failed to load color settings:', e);
    }
    // Vrátit výchozí barvy pro všechny sekce
    return { ...defaultColors };
  });

  // Výchozí overlay nastavení pro každou sekci
  const defaultOverlay = {
    opacity: 0.75,
    intensity: 0.8,
    blendMode: 'normal'
  };

  const defaultOverlays = {
    meditace: { ...defaultOverlay },
    hudba: { ...defaultOverlay },
    dychani: { ...defaultOverlay },
    settings: { ...defaultOverlay }
  };

  const [overlaySettings, setOverlaySettings] = useState(() => {
    try {
      const saved = localStorage.getItem('meditation-app-shader-overlay-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Zajisti, že všechny sekce mají výchozí overlay nastavení, pokud není nastaveno
        const merged = {};
        Object.keys(defaultOverlays).forEach(section => {
          merged[section] = {
            ...defaultOverlay,
            ...(parsed[section] || {})
          };
        });
        return merged;
      }
    } catch (e) {
      console.error('Failed to load shader overlay settings:', e);
    }
    // Vrátit výchozí overlay nastavení pro všechny sekce
    return { ...defaultOverlays };
  });

  // Ref pro sledování, jestli už byly výchozí hodnoty aplikovány
  const defaultsAppliedRef = useRef(false);

  // Při prvním načtení zajisti, že všechny sekce mají výchozí hodnoty a ulož je do localStorage
  useEffect(() => {
    if (defaultsAppliedRef.current) return;
    defaultsAppliedRef.current = true;

    // Zkontroluj a doplň chybějící sekce pro shader settings
    const hasAllShaderSections = Object.keys(defaultShaderSettings).every(
      key => Object.prototype.hasOwnProperty.call(shaderSettings, key)
    );
    if (!hasAllShaderSections) {
      const mergedShaderSettings = { ...defaultShaderSettings, ...shaderSettings };
      setShaderSettings(mergedShaderSettings);
      try {
        localStorage.setItem('meditation-app-shader-settings', JSON.stringify(mergedShaderSettings));
      } catch (e) {
        console.error('Failed to save shader settings:', e);
      }
    }

    // Zkontroluj a doplň chybějící sekce pro color settings
    const hasAllColorSections = Object.keys(defaultColors).every(
      key => Object.prototype.hasOwnProperty.call(colorSettings, key)
    );
    if (!hasAllColorSections) {
      const mergedColorSettings = { ...defaultColors, ...colorSettings };
      setColorSettings(mergedColorSettings);
      try {
        localStorage.setItem('meditation-app-color-settings', JSON.stringify(mergedColorSettings));
      } catch (e) {
        console.error('Failed to save color settings:', e);
      }
    }

    // Zkontroluj a doplň chybějící sekce pro overlay settings
    const hasAllOverlaySections = Object.keys(defaultOverlays).every(
      key => Object.prototype.hasOwnProperty.call(overlaySettings, key)
    );
    if (!hasAllOverlaySections) {
      const mergedOverlaySettings = {};
      Object.keys(defaultOverlays).forEach(section => {
        mergedOverlaySettings[section] = {
          ...defaultOverlay,
          ...(overlaySettings[section] || {})
        };
      });
      setOverlaySettings(mergedOverlaySettings);
      try {
        localStorage.setItem('meditation-app-shader-overlay-settings', JSON.stringify(mergedOverlaySettings));
      } catch (e) {
        console.error('Failed to save shader overlay settings:', e);
      }
    }
    // eslint-disable-next-line
  }, []); // Spustí se pouze jednou při mountu

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

  // Ulož overlay nastavení do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('meditation-app-shader-overlay-settings', JSON.stringify(overlaySettings));
    } catch (e) {
      console.error('Failed to save shader overlay settings:', e);
    }
  }, [overlaySettings]);

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
      // Při vymazání nastav výchozí barvu pro sekci
      newSettings[section] = defaultColors[section];
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
    // Vrátit barvu z nastavení nebo výchozí barvu pro sekci
    return colorSettings[section] || defaultColors[section] || null;
  };

  const getOverlaySettings = (section) => {
    return {
      ...defaultOverlay,
      ...(overlaySettings[section] || {})
    };
  };

  const setOverlaySettingsForSection = (section, settings) => {
    setOverlaySettings(prev => {
      const current = prev[section] || {};
      const merged = {
        ...defaultOverlay,
        ...current,
        ...settings
      };
      return {
        ...prev,
        [section]: merged
      };
    });
  };

  const clearOverlaySettings = (section) => {
    setOverlaySettings(prev => {
      const next = { ...prev };
      // Při vymazání nastav výchozí overlay nastavení pro sekci
      next[section] = { ...defaultOverlay };
      return next;
    });
  };

  return (
    <ShaderSettingsContext.Provider
      value={{
        shaderSettings,
        colorSettings,
        overlaySettings,
        setShaderForSection,
        getShaderForSection,
        setColorForSection,
        getColorForSection,
        clearColorForSection,
        getOverlaySettings,
        setOverlaySettingsForSection,
        clearOverlaySettings
      }}
    >
      {children}
    </ShaderSettingsContext.Provider>
  );
};

