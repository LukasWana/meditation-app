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
      slova: 'meditácia',
      meditacia: 'dýchanie',
      meditace: 'meditácia',
      dychani: 'dýchanie',
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
      nadechVydech: 'nádech výdech',
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
      dlzka: 'dĺžka',
      rytmus: 'rytmus',
      nastaveniaZvuku: 'nastavenia zvuku',
      zvolteZvuk: 'zvoľte zvuk',
      zvolteZvukNadech: 'nádech',
      zvolteZvukVydech: 'výdech',
      ziadnyZvuk: 'žiadny zvuk',
      zvuky: 'zvuky',
      galeriaZvukovychTemat: 'galéria zvukových tém',
      vyberteZvuky: 'Vyberte zvuky',
      zobrazitGaleriu: 'zobraziť galériu',
      ilustracia: 'ilustrácia',
      fadeInOut: 'fade in/out',
      fadeInOutDescription: 'Plynulé zesilovanie a zoslabovanie zvuku pri nádychu a výdychu',
      povolene: 'povolené',
      zakazane: 'zakázané',
      hotovo: 'hotovo',
      vybrany: 'vybraný',
      nastavteCasNaPripravu: 'Nastavte čas na prípravu pred začiatkom meditácie',
      potvrditVymazaniCache: 'Naozaj chcete vymazať všetky stiahnuté súbory?',
      minut: 'min',
      dlzkaMeditacie: 'Dĺžka meditácie (minúty)',
      pripravaNaMeditaci: 'Príprava na meditáciu...',
      selected: '✓ Vybraté',
      emptyState: 'Žiadne súbory nenájdené',

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
      jsemZena: 'jsem Žena',
      pohlavie: 'Pohlavie',
      obecnyObsah: 'Obecný obsah',

      // Profily dýchania
      profilyDychani: 'Profily dýchania',
      ulozit: 'uložiť',
      nahrat: 'nahrať',
      nahravani: 'Nahrávanie...'
    },
    CZ: {
      // Hlavní navigace
      hudba: 'hudba',
      slova: 'meditace',
      meditacia: 'dýchání',
      meditace: 'meditace',
      dychani: 'dýchání',
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
      nadechVydech: 'nádech výdech',
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
      dlzka: 'délka',
      rytmus: 'rytmus',
      nastaveniaZvuku: 'nastavení zvuku',
      zvolteZvuk: 'vyberte zvuk',
      zvolteZvukNadech: 'nádech',
      zvolteZvukVydech: 'výdech',
      ziadnyZvuk: 'žádný zvuk',
      zvuky: 'zvuky',
      galeriaZvukovychTemat: 'galerie zvukových témat',
      vyberteZvuky: 'Vyberte zvuky',
      zobrazitGaleriu: 'zobrazit galerii',
      ilustracia: 'ilustrace',
      fadeInOut: 'fade in/out',
      fadeInOutDescription: 'Plynulé zesilování a zeslabování zvuku při nádechu a výdechu',
      povolene: 'povoleno',
      zakazane: 'zakázáno',
      hotovo: 'hotovo',
      vybrany: 'vybraný',
      nastavteCasNaPripravu: 'Nastavte čas na přípravu před začátkem meditace',
      potvrditVymazaniCache: 'Opravdu chcete vymazat všechny stažené soubory?',
      minut: 'min',
      dlzkaMeditacie: 'Délka meditace (minuty)',
      pripravaNaMeditaci: 'Příprava na meditaci...',
      selected: '✓ Vybráno',
      emptyState: 'Žádné soubory nenalezeny',

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
      jsemZena: 'jsem Žena',
      pohlavie: 'Pohlavie',
      obecnyObsah: 'Obecný obsah',

      // Profily dýchání
      profilyDychani: 'Profily dýchání',
      ulozit: 'uložit',
      nahrat: 'nahrát',
      nahravani: 'Nahrávání...'
    },
    EN: {
      // Main navigation
      hudba: 'music',
      slova: 'meditation',
      meditacia: 'breathing',
      meditace: 'meditation',
      dychani: 'breathing',
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
      nadechVydech: 'inhale exhale',
      rytmusDychania: 'breathing rhythm',
      nadech: 'inhale',
      vydech: 'exhale',
      sekund: 'seconds',
      vyberteRytmus: 'select rhythm',
      vlastniRytmus: 'custom rhythm',
      rychlejsi: 'faster',
      pomalsi: 'slower',
      casKPriprave: 'preparation time',
      priprava: 'preparation',
      dlzka: 'duration',
      rytmus: 'rhythm',
      nastaveniaZvuku: 'sound settings',
      zvolteZvuk: 'select sound',
      zvolteZvukNadech: 'sound for inhale',
      zvolteZvukVydech: 'sound for exhale',
      ziadnyZvuk: 'no sound',
      zvuky: 'sounds',
      galeriaZvukovychTemat: 'sound theme gallery',
      vyberteZvuky: 'Select sounds',
      zobrazitGaleriu: 'show gallery',
      ilustracia: 'illustration',
      fadeInOut: 'fade in/out',
      fadeInOutDescription: 'Smooth volume increase and decrease of sound during inhale and exhale',
      povolene: 'enabled',
      zakazane: 'disabled',
      hotovo: 'done',
      vybrany: 'selected',
      nastavteCasNaPripravu: 'Set preparation time before meditation starts',
      potvrditVymazaniCache: 'Do you really want to delete all downloaded files?',
      minut: 'min',
      dlzkaMeditacie: 'Meditation duration (minutes)',
      pripravaNaMeditaci: 'Preparing for meditation...',
      selected: '✓ Selected',
      emptyState: 'No files found',

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
      jsemZena: 'I am Female',
      pohlavie: 'Gender',
      obecnyObsah: 'General content',

      // Breathing profiles
      profilyDychani: 'Breathing Profiles',
      ulozit: 'save',
      nahrat: 'upload',
      nahravani: 'Uploading...'
    }
  });

  // Načti překlady z Realtime Database při startu
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Načti UI data z DB
        const uiData = await uiDataService.loadUIData();

        if (uiData && uiData.translations) {
          // Slouč překlady z DB s defaultními (merge místo replace)
          // Tím zajistíme, že pokud v DB chybí nějaký klíč, použije se defaultní hodnota
          setTranslations(prev => {
            const merged = { ...prev };
            // Klíče, které se NIKDY nepřepisují z DB (vždy použijeme defaultní hodnoty)
            const protectedKeys = ['slova', 'meditacia'];

            ['SK', 'CZ', 'EN'].forEach(lang => {
              if (uiData.translations[lang]) {
                // Vytvoř kopii DB překladů bez chráněných klíčů
                const dbTranslationsWithoutProtected = { ...uiData.translations[lang] };
                protectedKeys.forEach(key => {
                  delete dbTranslationsWithoutProtected[key];
                });

                merged[lang] = {
                  ...prev[lang], // Defaultní překlady (s novými hodnotami)
                  ...dbTranslationsWithoutProtected, // Překlady z DB (bez chráněných klíčů)
                  // Chráněné klíče se vždy používají z defaultních hodnot
                  ...Object.fromEntries(
                    protectedKeys.map(key => [key, prev[lang]?.[key]])
                  )
                };
              }
            });
            // Pro debug: zkontroluj, zda DB obsahuje staré překlady
            if (import.meta.env.MODE === 'development') {
              console.log('🔍 Checking translations:', {
                defaultSlova: prev.SK?.slova,
                defaultMeditacia: prev.SK?.meditacia,
                dbSlova: uiData.translations.SK?.slova,
                dbMeditacia: uiData.translations.SK?.meditacia,
                finalSlova: merged.SK?.slova,
                finalMeditacia: merged.SK?.meditacia
              });
            }
            return merged;
          });

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
            // Slouč překlady z DB s aktuálními (merge místo replace)
            setTranslations(prev => {
              const merged = { ...prev };
              // Klíče, které se NIKDY nepřepisují z DB (vždy použijeme defaultní hodnoty)
              const protectedKeys = ['slova', 'meditacia'];

              ['SK', 'CZ', 'EN'].forEach(lang => {
                if (data.translations[lang]) {
                  // Vytvoř kopii DB překladů bez chráněných klíčů
                  const dbTranslationsWithoutProtected = { ...data.translations[lang] };
                  protectedKeys.forEach(key => {
                    delete dbTranslationsWithoutProtected[key];
                  });

                  merged[lang] = {
                    ...prev[lang], // Aktuální překlady
                    ...dbTranslationsWithoutProtected, // Nové překlady z DB (bez chráněných klíčů)
                    // Chráněné klíče se vždy používají z aktuálních hodnot
                    ...Object.fromEntries(
                      protectedKeys.map(key => [key, prev[lang]?.[key]])
                    )
                  };
                }
              });
              return merged;
            });
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
