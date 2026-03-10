import React, { createContext, useContext, useState, useEffect } from 'react';
import uiDataService from '@services/uiDataService';

const PROTECTED_TRANSLATION_KEYS = ['slova', 'meditacia'];

import skTranslations from '../locales/sk.json';
import czTranslations from '../locales/cz.json';
import enTranslations from '../locales/en.json';

export const DEFAULT_TRANSLATIONS = {
  SK: skTranslations,
  CZ: czTranslations,
  EN: enTranslations
};

const cloneTranslations = (source = DEFAULT_TRANSLATIONS) => ({
  SK: { ...source.SK },
  CZ: { ...source.CZ },
  EN: { ...source.EN }
});

const sanitizeIncomingTranslations = (incoming = {}) => {
  return ['SK', 'CZ', 'EN'].reduce((acc, lang) => {
    if (!incoming[lang]) {
      return acc;
    }
    acc[lang] = { ...incoming[lang] };
    PROTECTED_TRANSLATION_KEYS.forEach(key => {
      delete acc[lang][key];
    });
    return acc;
  }, {});
};

const mergeTranslations = (current, incoming) => {
  if (!incoming) {
    return current;
  }

  const sanitized = sanitizeIncomingTranslations(incoming);
  const next = {
    SK: { ...current.SK },
    CZ: { ...current.CZ },
    EN: { ...current.EN }
  };

  ['SK', 'CZ', 'EN'].forEach(lang => {
    if (!sanitized[lang]) {
      return;
    }

    next[lang] = {
      ...next[lang],
      ...sanitized[lang]
    };

    PROTECTED_TRANSLATION_KEYS.forEach(key => {
      next[lang][key] = current[lang]?.[key] ?? DEFAULT_TRANSLATIONS[lang][key];
    });
  });

  return next;
};

const buildInitialTranslations = (initialTranslations) => {
  const base = cloneTranslations();
  if (!initialTranslations) {
    return base;
  }
  return mergeTranslations(base, initialTranslations);
};

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children, initialTranslations }) => {
  const [language, setLanguage] = useState(() => {
    // Načti jazyk z localStorage nebo použij default (slovenština)
    const savedLanguage = localStorage.getItem('meditation-app-language');
    return savedLanguage || 'SK';
  });

  const [translations, setTranslations] = useState(() => buildInitialTranslations(initialTranslations));

  // Synchronizuj překlady z inicializačního hooku
  useEffect(() => {
    if (!initialTranslations) {
      return;
    }
    setTranslations(prev => mergeTranslations(prev, initialTranslations));
  }, [initialTranslations]);

  // Sleduj real-time změny UI dat kvůli překladům
  useEffect(() => {
    const stopWatching = uiDataService.watchUIData((data) => {
      if (data && data.translations) {
        setTranslations(prev => mergeTranslations(prev, data.translations));
      }
    });

    return () => {
      if (stopWatching) {
        stopWatching();
      }
    };
  }, []);

  // Ulož jazyk do localStorage při změně
  useEffect(() => {
    localStorage.setItem('meditation-app-language', language);
  }, [language]);

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('meditation-app-language', newLanguage);
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const getLanguageFlag = () => {
    // Tato funkce se už nepoužívá - vlajky se načítají z SVG souborů
    return null;
  };

  const getLanguageName = (lang) => {
    const names = {
      SK: 'Slovenčina',
      CZ: 'Čeština',
      EN: 'English'
    };
    return names[lang] || 'Slovenčina';
  };

  const value = {
    language,
    changeLanguage,
    t,
    getLanguageFlag,
    getLanguageName,
    translations,
    availableLanguages: ['SK', 'CZ', 'EN']
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
