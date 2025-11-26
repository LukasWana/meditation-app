import React, { createContext, useContext, useState, useEffect } from 'react';
import uiDataService from '@services/uiDataService';
import { useLanguage } from './LanguageContext';

const DEFAULT_CONFIG = {
  colors: {
    primary: '#f4ddc4',
    secondary: '#000000',
    background: '#f4ddc4'
  },
  layout: {
    defaultLayout: 'grid'
  }
};

const DEFAULT_TEXTS = {
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
};

const cloneConfig = () => ({
  colors: { ...DEFAULT_CONFIG.colors },
  layout: { ...DEFAULT_CONFIG.layout }
});

const mergeConfig = (current, incoming) => {
  if (!incoming) {
    return current;
  }
  return {
    ...current,
    ...incoming,
    colors: {
      ...current.colors,
      ...(incoming.colors || {})
    },
    layout: {
      ...current.layout,
      ...(incoming.layout || {})
    }
  };
};

const cloneTexts = () => ({
  emptyState: { ...DEFAULT_TEXTS.emptyState },
  selected: { ...DEFAULT_TEXTS.selected }
});

const mergeTexts = (current, incoming) => {
  if (!incoming) {
    return current;
  }
  const next = { ...current };
  Object.entries(incoming).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = {
        ...(current[key] || {}),
        ...value
      };
    } else {
      next[key] = value;
    }
  });
  return next;
};

const buildInitialConfig = (initialConfig) => {
  const base = cloneConfig();
  return initialConfig ? mergeConfig(base, initialConfig) : base;
};

const buildInitialTexts = (initialTexts) => {
  const base = cloneTexts();
  return initialTexts ? mergeTexts(base, initialTexts) : base;
};

const UIConfigContext = createContext();

export const useUIConfig = () => {
  const context = useContext(UIConfigContext);
  if (!context) {
    throw new Error('useUIConfig must be used within a UIConfigProvider');
  }
  return context;
};

export const UIConfigProvider = ({ children, initialConfig, initialTexts }) => {
  // Bezpečně získat language s fallbackem
  let language = 'SK'; // default
  try {
    const languageContext = useLanguage();
    language = languageContext?.language || 'SK';
  } catch (error) {
    // Pokud není LanguageProvider dostupný, použij default
    console.warn('LanguageContext not available, using default language');
  }

  const [config, setConfig] = useState(() => buildInitialConfig(initialConfig));
  const [texts, setTexts] = useState(() => buildInitialTexts(initialTexts));

  // Synchronizuj konfiguraci podle inicializačních dat
  useEffect(() => {
    if (!initialConfig) {
      return;
    }
    setConfig(prev => mergeConfig(prev, initialConfig));
  }, [initialConfig]);

  // Synchronizuj texty podle inicializačních dat
  useEffect(() => {
    if (!initialTexts) {
      return;
    }
    setTexts(prev => mergeTexts(prev, initialTexts));
  }, [initialTexts]);

  // Sleduj real-time změny UI dat
  useEffect(() => {
    const stopWatching = uiDataService.watchUIData((data) => {
      if (data) {
        if (data.config) {
          setConfig(prev => mergeConfig(prev, data.config));
        }
        if (data.texts) {
          setTexts(prev => mergeTexts(prev, data.texts));
        }
      }
    });

    return () => {
      if (stopWatching) {
        stopWatching();
      }
    };
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

