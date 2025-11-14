import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import uiDataService from '@services/uiDataService';
import theme from '@config/theme';

const UIConfigContext = createContext();

export const useUIConfig = () => {
  const context = useContext(UIConfigContext);
  if (!context) {
    throw new Error('useUIConfig must be used within a UIConfigProvider');
  }
  return context;
};

export const UIConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    colors: {
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      background: theme.colors.background
    },
    layout: {
      defaultLayout: 'grid'
    }
  });

  // Načti UI konfiguraci z Realtime Database při startu
  useEffect(() => {
    const loadUIConfig = async () => {
      try {
        // Načti UI data z DB
        const uiData = await uiDataService.loadUIData();

        if (uiData) {
          // Aktualizuj konfiguraci
          if (uiData.config) {
            setConfig(uiData.config);
          }

          // UI config logy deaktivovány - příliš mnoho výpisů
          // if (import.meta.env.MODE === 'development') {
          //   console.log('✅ UI config loaded from Realtime Database');
          // }
        }

        // Nastav real-time listener pro aktualizace
        const stopWatching = uiDataService.watchUIData((data) => {
          if (data) {
            if (data.config) {
              setConfig(data.config);
            }
            if (import.meta.env.MODE === 'development') {
              console.log('📡 UI config updated from real-time');
            }
          }
        });

        // Cleanup funkce
        return () => {
          if (stopWatching) {
            stopWatching();
          }
        };
      } catch (error) {
        console.error('❌ Failed to load UI config:', error);
        // Použij defaultní hodnoty při chybě
      }
    };

    loadUIConfig();
  }, []);

  // Merge theme s dynamickou konfigurací z DB
  const mergedTheme = useMemo(() => {
    return {
      ...theme,
      colors: {
        ...theme.colors,
        primary: config.colors.primary,
        secondary: config.colors.secondary,
        background: config.colors.background,
      }
    };
  }, [config]);

  const value = useMemo(() => ({
    config,
    colors: config.colors,
    layout: config.layout,
    theme: mergedTheme, // Poskytni celou theme konfiguraci
  }), [config, mergedTheme]);

  return (
    <UIConfigContext.Provider value={value}>
      {children}
    </UIConfigContext.Provider>
  );
};

