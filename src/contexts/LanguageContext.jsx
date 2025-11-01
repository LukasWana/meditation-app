import React, { createContext, useContext, useState, useEffect } from 'react';
import uiDataService from '@services/uiDataService';

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
      nastavenie: 'nastavenie',
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
      informacieText: 'Keď liečime vlastnú vnútornú krajinu, vlny uzdravenia sa šíria ďalej – do tela, ktoré ožíva, do vzťahov, ktoré prehĺbavajú, do priestoru, ktorý naplňujeme. Meditácia je návratom domov. Domov k sebe, kde čaká pokoj, z ktorého môže vyrásť skutočná radosť a autentické stretnutie s druhými. Nestávame sa niekým iným. Len odhaľujeme to, čo bolo vždy prítomné – čistú esenciu bytia. A v tejto esencii rezonujeme s univerzálnou frekvenciou lásky, ktorá lieči a spája všetko živé.',

      // Dýchanie a rytmus
      dychanie: 'dýchanie',
      rytmusDychania: 'rytmus dýchania',
      nadech: 'nádech',
      vydech: 'výdech',
      sekund: 'sekúnd',
      vyberteRytmus: 'vyberte rytmus',
      vlastniRytmus: 'vlastný rytmus',
      rychlejsi: 'rýchlejší',
      pomalsi: 'pomalší',
      casKPriprave: 'čas k príprave',
      priprava: 'príprava',
      nastaveniaZvuku: 'nastavenia zvuku',
      zvolteZvuk: 'zvoľte zvuk',
      zvolteZvukNadech: 'nádech',
      zvolteZvukVydech: 'výdech',
      ziadnyZvuk: 'žiadny zvuk',
      galeriaZvukovychTemat: 'galéria zvukových tém',
      zobrazitGaleriu: 'zobraziť galériu',
      ilustracia: 'ilustrácia',
      fadeInOut: 'fade in/out',
      povolene: 'povolené',
      zakazane: 'zakázané',

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
      autoplayDisabled: 'automatické prehrávanie vypnuté',

      // Gender
      jsemMuz: 'jsem Muž',
      jsemZena: 'jsem Žena'
    },
    CZ: {
      // Hlavní navigace
      hudba: 'hudba',
      slova: 'slova',
      meditacia: 'meditace',
      nastavenie: 'nastavení',
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
      informacieText: 'Když léčíme vlastní vnitřní krajinu, vlny uzdravení se šíří dál – do těla, které ožívá, do vztahů, které prohlubují, do prostoru, který naplňujeme. Meditace je návratem domů. Domů k sobě, kde čeká klid, ze kterého může vyrůst pravá radost a autentické setkání s druhými. Nestáváme se někým jiným. Pouze odhalujeme to, co bylo vždy přítomné – čistou esenci bytí. A v této esenci rezonujeme s univerzální frekvencí lásky, která léčí a spojuje vše živé.',

      // Dýchání a rytmus
      dychanie: 'dýchání',
      rytmusDychania: 'rytmus dýchání',
      nadech: 'nádech',
      vydech: 'výdech',
      sekund: 'sekund',
      vyberteRytmus: 'vyberte rytmus',
      vlastniRytmus: 'vlastní rytmus',
      rychlejsi: 'rychlejší',
      pomalsi: 'pomalejší',
      casKPriprave: 'čas k přípravě',
      priprava: 'příprava',
      nastaveniaZvuku: 'nastavení zvuku',
      zvolteZvuk: 'vyberte zvuk',
      zvolteZvukNadech: 'nádech',
      zvolteZvukVydech: 'výdech',
      ziadnyZvuk: 'žádný zvuk',
      galeriaZvukovychTemat: 'galerie zvukových témat',
      zobrazitGaleriu: 'zobrazit galerii',
      ilustracia: 'ilustrace',
      fadeInOut: 'fade in/out',
      povolene: 'povoleno',
      zakazane: 'zakázáno',

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
      autoplayDisabled: 'automatické přehrávání vypnuto',

      // Gender
      jsemMuz: 'jsem Muž',
      jsemZena: 'jsem Žena'
    },
    EN: {
      // Main navigation
      hudba: 'music',
      slova: 'words',
      meditacia: 'meditation',
      nastavenie: 'settings',
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
      informacieText: 'When we heal our own inner landscape, waves of healing spread further – into the body that comes alive, into relationships that deepen, into the space we fill. Meditation is a return home. Home to ourselves, where peace awaits, from which true joy and authentic encounters with others can grow. We do not become someone else. We only reveal what has always been present – the pure essence of being. And in this essence, we resonate with the universal frequency of love that heals and connects all that is alive.',

      // Breathing and rhythm
      dychanie: 'breathing',
      rytmusDychania: 'breathing rhythm',
      nadech: 'inhale',
      vydech: 'exhale',
      sekund: 'seconds',
      vyberteRytmus: 'select rhythm',
      vlastniRytmus: 'custom rhythm',
      rychlejsi: 'faster',
      pomalsi: 'slower',
      casKPriprave: 'preparation time',
      nastaveniaZvuku: 'sound settings',
      zvolteZvuk: 'select sound',
      zvolteZvukNadech: 'sound for inhale',
      zvolteZvukVydech: 'sound for exhale',
      ziadnyZvuk: 'no sound',
      galeriaZvukovychTemat: 'sound theme gallery',
      zobrazitGaleriu: 'show gallery',
      ilustracia: 'illustration',
      fadeInOut: 'fade in/out',
      povolene: 'enabled',
      zakazane: 'disabled',

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
      autoplayDisabled: 'autoplay disabled',

      // Gender
      jsemMuz: 'I am Male',
      jsemZena: 'I am Female'
    }
  });

  // Načti překlady z Realtime Database při startu
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Načti UI data z DB
        const uiData = await uiDataService.loadUIData();

        if (uiData && uiData.translations) {
          // Aktualizuj překlady z DB
          setTranslations(uiData.translations);

          if (import.meta.env.MODE === 'development') {
            console.log('✅ Translations loaded from Realtime Database');
          }
        } else {
          if (import.meta.env.MODE === 'development') {
            console.warn('⚠️ No translations found in DB, using defaults');
          }
        }

        // Nastav real-time listener pro aktualizace
        const stopWatching = uiDataService.watchUIData((data) => {
          if (data && data.translations) {
            setTranslations(data.translations);
            if (import.meta.env.MODE === 'development') {
              console.log('📡 Translations updated from real-time');
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
        console.error('❌ Failed to load translations:', error);
        // Použij defaultní překlady při chybě
      }
    };

    loadTranslations();
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
