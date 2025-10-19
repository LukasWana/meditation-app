import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Načti jazyk z localStorage nebo použij default (slovenština)
    const savedLanguage = localStorage.getItem('meditation-app-language');
    return savedLanguage || 'SK';
  });

  const [translations, setTranslations] = useState({
    SK: {
      // Hlavná navigácia
      hudba: 'hudba',
      slova: 'slova',
      meditacia: 'meditácia',
      nastavenie: 'nastavení',
      dychanie: 'dýchanie',
      pomoc: 'pomoc',

      // Podrobné názvy
      mluvene: 'mluvené meditácie',
      hudbaDesc: 'relaxačná hudba',

      // Nastavení stránka
      language: 'jazyk',
      dalsieNastavenie: 'ďalšie nastavení',
      informacie: 'informácie',
      verziaAplikacie: 'verzia aplikácie',
      dalsieFunkcie: 'ďalšie funkcie...',
      verziaAplikacieDesc: 'verzia aplikácie a ďalšie informácie...',

      // Audio prehrávač
      play: 'prehrať',
      pause: 'pozastaviť',
      close: 'zavrieť',
      activateSound: 'aktivovať zvuk',
      allowSound: 'povoliť zvuk',
      selectLanguage: 'vyberte jazyk',

      // Loading a chyby
      loading: 'načítam...',
      error: 'chyba pri načítaní',
      loadingMeditacie: 'načítam meditácie...',
      ziadneMeditacie: 'žiadne meditácie nie sú dostupné',
      skusteZmenit: 'skúste zmeniť nastavenia v menu',

      // Autoplay
      autoplay: 'automatické prehrávanie',
      autoplayEnabled: 'automatické prehrávanie zapnuté',
      autoplayDisabled: 'automatické prehrávanie vypnuté'
    },
    CZ: {
      // Hlavní navigace
      hudba: 'hudba',
      slova: 'slova',
      meditacia: 'meditace',
      nastavenie: 'nastavení',
      dychanie: 'dýchání',
      pomoc: 'pomoc',

      // Podrobné názvy
      mluvene: 'mluvené meditace',
      hudbaDesc: 'relaxační hudba',

      // Nastavení stránka
      language: 'jazyk',
      dalsieNastavenie: 'další nastavení',
      informacie: 'informace',
      verziaAplikacie: 'verze aplikace',
      dalsieFunkcie: 'další funkce...',
      verziaAplikacieDesc: 'verze aplikace a další informace...',

      // Audio přehrávač
      play: 'přehrát',
      pause: 'pozastavit',
      close: 'zavřít',
      activateSound: 'aktivovat zvuk',
      allowSound: 'povolit zvuk',
      selectLanguage: 'vyberte jazyk',

      // Loading a chyby
      loading: 'načítám...',
      error: 'chyba při načítání',
      loadingMeditacie: 'načítám meditace...',
      ziadneMeditacie: 'žádné meditace nejsou dostupné',
      skusteZmenit: 'zkuste změnit nastavení v menu',

      // Autoplay
      autoplay: 'automatické přehrávání',
      autoplayEnabled: 'automatické přehrávání zapnuto',
      autoplayDisabled: 'automatické přehrávání vypnuto'
    },
    EN: {
      // Main navigation
      hudba: 'music',
      slova: 'words',
      meditacia: 'meditation',
      nastavenie: 'settings',
      dychanie: 'breathing',
      pomoc: 'help',

      // Detailed names
      mluvene: 'spoken meditations',
      hudbaDesc: 'relaxing music',

      // Settings page
      language: 'language',
      dalsieNastavenie: 'other settings',
      informacie: 'information',
      verziaAplikacie: 'app version',
      dalsieFunkcie: 'additional features...',
      verziaAplikacieDesc: 'app version and additional information...',

      // Audio player
      play: 'play',
      pause: 'pause',
      close: 'close',
      activateSound: 'activate sound',
      allowSound: 'allow sound',
      selectLanguage: 'select language',

      // Loading and errors
      loading: 'loading...',
      error: 'loading error',
      loadingMeditacie: 'loading meditations...',
      ziadneMeditacie: 'no meditations available',
      skusteZmenit: 'try changing settings in menu',

      // Autoplay
      autoplay: 'autoplay',
      autoplayEnabled: 'autoplay enabled',
      autoplayDisabled: 'autoplay disabled'
    }
  });

  // Ulož jazyk do localStorage při změně
  useEffect(() => {
    localStorage.setItem('meditation-app-language', language);
  }, [language]);

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const getLanguageFlag = (lang) => {
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
