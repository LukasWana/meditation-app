import { useState, useEffect, useMemo } from 'react';
import { useFirebaseCDNScanner } from '@hooks/useFirebaseCDNScanner';
import unifiedMetadataService from '@services/unifiedMetadataService';

// Fallback duration není potřeba - metadata jsou ve Firestore
const getFallbackDuration = (_fileName) => null;

export const useFirebaseAudioFilter = (userGender, userLanguage = 'sk') => {
  // Debug: zobraz přijaté parametry

  // State pro sledování načtení metadata
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  // Použij CDN scanner pro dynamické načítání
  const {
    availableFiles,
    filesByTopic,
    availableTopics,
    stats,
    isLoading: cdnLoading,
    error: cdnError,
    refreshCDN,
    getFilesByGender
  } = useFirebaseCDNScanner();

  // Filtruj soubory tuy pohlaví uživatele a jazyka - reaguje na změnu gender a language
  const filteredFiles = useMemo(() => {
    const genderFiltered = getFilesByGender(userGender);


    const languageFiltered = genderFiltered.filter(file => {
      if (!file.parsed) {
        return false;
      }

      // Filtruj podle jazyka
      const fileLanguage = file.parsed.language;
      const userLang = userLanguage.toLowerCase();

      // Mapování jazykových kódů - podporuj jak velká, tak malá písmena
      const languageMap = {
        'sk': 'sk',
        'SK': 'sk',
        'cz': 'cz',
        'CZ': 'cz',
        'en': 'en',
        'EN': 'en'
      };

      const normalizedUserLang = languageMap[userLang] || 'sk';

      console.log(`🔍 File: ${file.fileName}, fileLanguage: ${fileLanguage}, userLang: ${normalizedUserLang}, match: ${fileLanguage === normalizedUserLang}`);

      // Filtruj podle složky - každý jazyk má svou vlastní složku
      const fileName = file.fileName;

      if (normalizedUserLang === 'sk') {
        // Pro SK zobraz soubory ze složky "meditacie/SK/"
        return fileName.startsWith('meditacie/SK/');
      } else if (normalizedUserLang === 'cz') {
        // Pro CZ zobraz soubory ze složky "meditacie/CZ/"
        return fileName.startsWith('meditacie/CZ/');
      } else if (normalizedUserLang === 'en') {
        // Pro EN zobraz soubory ze složky "meditacie/EN/"
        return fileName.startsWith('meditacie/EN/');
      }

      // Fallback - zobraz všechny soubory
      return true;
    });

    console.log(`🔍 Language filtered files: ${languageFiltered.length} for language: ${userLanguage}`);

    // Vrať pouze soubory v požadovaném jazyce - žádný fallback
    return languageFiltered;
  }, [userGender, userLanguage, availableFiles, getFilesByGender]);

  // Sleduj načtení metadata a aktualizuj state
  useEffect(() => {
    const checkMetadataLoaded = async () => {
      if (unifiedMetadataService.isReady()) {
        setMetadataLoaded(true);
        console.log('✅ Unified metadata loaded, updating durations');
      } else if (!unifiedMetadataService.isLoading && !unifiedMetadataService.isInitialized) {
        // Inicializuj metadata službu pokud ještě není spuštěna
        try {
          await unifiedMetadataService.initialize();
          setMetadataLoaded(true);
          console.log('✅ Unified metadata initialized and loaded');
        } catch (error) {
          console.warn('❌ Failed to initialize unified metadata:', error);
        }
      }
    };

    // Zkontroluj ihned
    checkMetadataLoaded();

    // Nastav interval pro kontrolu každých 500ms
    const interval = setInterval(checkMetadataLoaded, 500);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  // Získej názvy souborů pro kompatibilitu s useAudioFilter
  const audioFileNames = availableFiles.map(file => file.fileName);

  // Získej doporučené soubory - zobraz všechny kombinace hlasů a pohlaví pro každé téma
  const troubleItems = useMemo(() => {
    const getTroubleItems = () => {
    console.log('Filtrované soubory pro uživatele:', filteredFiles);

    // Načti metadata pro soubory, které nejsou v cache (synchronně)
    if (metadataLoaded && filteredFiles.length > 0) {
      filteredFiles.forEach(file => {
        if (!unifiedMetadataService.getCachedMetadata(file.fileName)) {
          // Zkus načíst z MP3 přímo
          const mp3Metadata = unifiedMetadataService.extractMP3MetadataLazy(file.fileName);
          if (mp3Metadata) {
            unifiedMetadataService.cache.set(file.fileName, mp3Metadata);
          }
        }
      });
    }

    const topicConfig = {
      'uzkost-osamelost': {},
      'strach-osamelost': {},
      'stres-praca': {},
      'spank': {},
      'depresia': {},
      'relaxacia': {}
    };

    // Seskup soubory podle témat
    const filesByTopic = filteredFiles.reduce((acc, file) => {
      if (!file.parsed?.topic) return acc;

      if (!acc[file.parsed.topic]) {
        acc[file.parsed.topic] = [];
      }
      acc[file.parsed.topic].push(file);
      return acc;
    }, {});

    console.log('Seskupené soubory podle témat:', filesByTopic);

    // Pro každé téma zobraz všechny dostupné kombinace hlasů a pohlaví
    const result = [];

    Object.keys(filesByTopic).forEach(topicKey => {
      const topicFiles = filesByTopic[topicKey];
      const config = topicConfig[topicKey] || { icon: '🎵' };

      // Zobraz pouze první soubor pro toto téma (varianty se přepínají v playeru)
      const file = topicFiles[0]; // Vezmi první soubor
      if (file && file.parsed) {
        const voiceGender = file.parsed.gender === 'female' ? 'žena' : 'muž';
        const voiceType = file.parsed.type || 'MSK';
        const topic = file.parsed.topic || topicKey.replace('-', ' ');

        // Získej skutečnou délku z unified metadata služby
        const unifiedMetadata = unifiedMetadataService.getCachedMetadata(file.fileName);
        let actualDuration = 'N/A';

        if (unifiedMetadata?.durationFormatted) {
          actualDuration = unifiedMetadata.durationFormatted;
        } else if (file.duration && file.duration !== 'N/A') {
          actualDuration = file.duration;
        } else {
          // Zkus načíst duration z cache nebo metadata
          const cachedDuration = unifiedMetadata?.duration;
          if (cachedDuration && cachedDuration > 0) {
            // Převeď sekundy na MM:SS formát
            const minutes = Math.floor(cachedDuration / 60);
            const seconds = Math.floor(cachedDuration % 60);
            actualDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          } else {
            // Fallback duration pro slova soubory
            const fallbackDuration = getFallbackDuration(file.fileName);
            if (fallbackDuration) {
              actualDuration = fallbackDuration;
            } else {
              actualDuration = metadataLoaded ? 'Načítám...' : 'N/A';
            }
          }
        }

        result.push({
          key: `${topicKey}-${file.parsed.gender}-${file.parsed.type}`,
          title: file.parsed.title || `${voiceGender} hlas - ${topic}`,
          audioSrc: file.downloadURL || file.fileName,
          duration: actualDuration,
          voiceInfo: `${voiceGender} hlas (${voiceType})`,
          isAvailable: file.isAvailable || true,
          allFiles: topicFiles, // Zachovej všechny soubory pro přepínání v playeru
          parsed: file.parsed // Přidej parsed data pro další použití
        });
      }

      console.log(`Téma ${topicKey}: ${topicFiles.length} souborů zobrazeno`);
    });

    console.log('Finální troubleItems (všechny kombinace):', result);
    return result;
    };

    return getTroubleItems();
  }, [filteredFiles, availableFiles, metadataLoaded]);

  // Získej statistiky pro uživatele
  const getUserStats = () => {
    return {
      totalAvailable: stats.availableFiles,
      filteredForUser: filteredFiles.length,
      topicsAvailable: availableTopics.length,
      gender: userGender,
      language: userLanguage,
      lastUpdated: stats.lastUpdated
    };
  };

  return {
    // Data
    audioFiles: availableFiles,
    filteredFiles,
    filesByTopic,
    availableTopics,
    troubleItems,
    userStats: getUserStats(),

    // State
    isLoading: cdnLoading,
    error: cdnError,

    // Getters
    getAudioForTopic: (topic) => {
      const topicFiles = filesByTopic[topic] || [];
      const bestFile = topicFiles.find(file => {
        if (!file.parsed) return false;
        return file.parsed.isForUser(userGender);
      }) || topicFiles[0];
      return bestFile?.fileName || null;
    },
    getBestAudio: () => {
      return filteredFiles[0]?.fileName || null;
    },
    getFilesForTopic: (topic) => {
      return filesByTopic[topic] || [];
    },
    getAudioInfo: (fileName) => {
      const file = availableFiles.find(f => f.fileName === fileName);
      return file?.parsed || null;
    },
    isAudioSuitableForUser: (fileName) => {
      const file = availableFiles.find(f => f.fileName === fileName);
      return file?.parsed?.isForUser(userGender) || false;
    },
    getRecommendedFiles: (limit = 5) => {
      return filteredFiles.slice(0, limit).map(file => ({
        fileName: file.fileName,
        ...file.parsed
      }));
    },

    // Actions
    refreshAudioFiles: refreshCDN
  };
};
