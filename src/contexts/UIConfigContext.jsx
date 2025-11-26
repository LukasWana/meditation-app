import React, { createContext, useContext, useState, useEffect } from 'react';
import uiDataService from '@services/uiDataService';
import { useLanguage } from './LanguageContext';

const UIConfigContext = createContext();

export const useUIConfig = () => {
  const context = useContext(UIConfigContext);
  if (!context) {
    throw new Error('useUIConfig must be used within a UIConfigProvider');
  }
  return context;
};

export const UIConfigProvider = ({ children }) => {
  // Bezpečně získat language s fallbackem
  let language = 'SK'; // default
  try {
    const languageContext = useLanguage();
    language = languageContext?.language || 'SK';
  } catch (error) {
    // Pokud není LanguageProvider dostupný, použij default
    console.warn('LanguageContext not available, using default language');
  }

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
  const [texts, setTexts] = useState({
    emptyState: {
      SK: 'Žádné soubory nenalezeny',
      CZ: 'Žádné soubory nenalezeny',
      EN: 'No files found'
    },
    selected: {
      SK: '✓ Vybráno',
      CZ: '✓ Vybráno',
      EN: '✓ Selected'
    }
  });

  // Načti UI konfiguraci a texty z Realtime Database při startu
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

          // Aktualizuj texty
          if (uiData.texts) {
            setTexts(uiData.texts);
          }

          if (import.meta.env.MODE === 'development') {
            console.log('✅ UI config and texts loaded from Realtime Database');
          }
        }

        // Nastav real-time listener pro aktualizace
        const stopWatching = uiDataService.watchUIData((data) => {
          if (data) {
            if (data.config) {
              setConfig(data.config);
            }
            if (data.texts) {
              setTexts(data.texts);
            }
            if (import.meta.env.MODE === 'development') {
              console.log('📡 UI config and texts updated from real-time');
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

  // Získej text podle aktuálního jazyka
  const getText = (key) => {
    if (!texts[key]) return '';
    return texts[key][language] || texts[key].SK || texts[key].CZ || texts[key].EN || '';
  };

  const value = {
    config,
    texts,
    getText,
    colors: config.colors,
    layout: config.layout
  };

  return (
    <UIConfigContext.Provider value={value}>
      {children}
    </UIConfigContext.Provider>
  );
};

