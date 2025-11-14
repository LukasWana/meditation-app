import React, { createContext, useContext, useState, useEffect } from 'react';
import uiDataService from '@services/uiDataService';

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
      primary: '#f4ddc4',
      secondary: '#000000',
      background: '#f4ddc4'
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

  const value = {
    config,
    colors: config.colors,
    layout: config.layout
  };

  return (
    <UIConfigContext.Provider value={value}>
      {children}
    </UIConfigContext.Provider>
  );
};

