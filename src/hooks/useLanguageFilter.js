import { useLanguage } from '@contexts/LanguageContext';

export const useLanguageFilter = () => {
  const { language } = useLanguage();

  const filterAudioByLanguage = (audioFiles, section = 'meditace') => {
    if (!audioFiles || audioFiles.length === 0) {
      return [];
    }

    // Hudba se zobrazuje pro všechny jazyky
    if (section === 'hudba') {
      return audioFiles;
    }

    // Pro sekci slova filtruj podle jazyka
    if (section === 'meditace' || section === 'slova') {
      return audioFiles.filter(file => {
        const fileName = file.fileName || file.audioSrc || '';

        // Zkontroluj jazyk v názvu souboru
        // Formát: zensky4MSK-uzkost-osamelost.mp3
        // Kde MSK = mužský slovenský, FSK = ženský slovenský
        // atd.

        if (fileName.includes('MSK') || fileName.includes('FSK')) {
          // Slovenské soubory
          return language === 'SK';
        } else if (fileName.includes('MCZ') || fileName.includes('FCZ')) {
          // České soubory
          return language === 'CZ';
        } else if (fileName.includes('MEN') || fileName.includes('FEN')) {
          // Anglické soubory
          return language === 'EN';
        }

        // Pokud není jazyk specifikován v názvu, zobraz pro všechny jazyky
        return true;
      });
    }

    return audioFiles;
  };

  const getLanguagePath = (basePath) => {
    if (!basePath) return '';

    // Pro sekci slova přidej jazykovou podsložku
    if (basePath.includes('slova') || basePath.includes('meditace')) {
      return `${basePath}/${language}`;
    }

    return basePath;
  };

  const isFileForCurrentLanguage = (fileName) => {
    if (!fileName) return false;

    const languageCodes = {
      SK: ['MSK', 'FSK'],
      CZ: ['MCZ', 'FCZ'],
      EN: ['MEN', 'FEN']
    };

    const currentLanguageCodes = languageCodes[language] || [];
    return currentLanguageCodes.some(code => fileName.includes(code));
  };

  return {
    language,
    filterAudioByLanguage,
    getLanguagePath,
    isFileForCurrentLanguage
  };
};
