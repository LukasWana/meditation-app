import log from './logger.js';

class MeditaceDataService {
  constructor() {
    this.meditaceData = {
      sk: { male: [], female: [], all: [] },
      cz: { male: [], female: [], all: [] },
      en: { male: [], female: [], all: [] }
    };
    this.isInitialized = false;
  }

  // Helper funkce pro extrakci tématu z názvu souboru
  extractTopicFromFileName(fileName) {
    const topics = {
      'uzkost': 'Úzkosť',
      'osamelost': 'Osamelosť',
      'strach': 'Strach',
      'stres': 'Stres',
      'praca': 'Práca',
      'spank': 'Spánok',
      'pokoj': 'Pokoj',
      'relax': 'Relax'
    };

    for (const [key, value] of Object.entries(topics)) {
      if (fileName.toLowerCase().includes(key)) {
        return value;
      }
    }
    return 'Meditácia';
  }

  // Helper funkce pro extrakci názvu z názvu souboru
  extractTitleFromFileName(fileName) {
    const nameWithoutExt = fileName.replace(/\.mp3$/i, '');
    const parts = nameWithoutExt.split('/');
    const lastPart = parts[parts.length - 1];

    // Odstraň prefixy jako "muzsky4FSK-", "zensky4MSK-", "zensky4FSK-", "muzsky4MSK-"
    const cleanName = lastPart.replace(/^(muzsky|zensky)\d*[A-Z]+-?/i, '');

    // Nahraď pomlčky mezerami a velkými písmeny
    return cleanName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Helper funkce pro formátování velikosti
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper funkce pro formátování délky
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Inicializace meditace dat z cache
  async initialize() {
    if (this.isInitialized) {
      log.debug('MeditaceDataService already initialized, skipping...');
      return;
    }

    try {
      log.info('Initializing meditace data service...');

      // Import realtime metadata service
      const { realtimeMetadataService } = await import('./realtimeMetadataService');
      const allMetadata = await realtimeMetadataService.getAllMetadata();

      log.debug('Cache service loaded, checking metadata...');
      log.debug('All metadata keys count:', Object.keys(allMetadata).length);

      if (!allMetadata || Object.keys(allMetadata).length === 0) {
        log.warn('No metadata in cache for meditace processing');
        return;
      }

      log.debug(`Processing ${Object.keys(allMetadata).length} metadata entries for meditace...`);
      log.debug('Sample metadata keys:', Object.keys(allMetadata).slice(0, 5));
      log.debug('Sample metadata values:', Object.values(allMetadata).slice(0, 3).map(meta => ({
        fileName: meta.fileName,
        folder: meta.folder,
        fullPath: meta.fullPath
      })));

      // Filtruj pouze meditace soubory
      let meditaceMetadata = Object.values(allMetadata).filter(meta => {
        const isMeditace = meta.folder === 'meditace' ||
                        meta.folder === 'meditacie' ||
                        meta.fileName?.includes('meditace/') ||
                        meta.fileName?.includes('meditacie/') ||
                        meta.fullPath?.includes('meditace/') ||
                        meta.fullPath?.includes('meditacie/');
        return isMeditace;
      });

      // Pokud se nenašly žádné meditace soubory, zkus najít všechny soubory s klíčovými slovy
      if (meditaceMetadata.length === 0) {
        log.warn('No meditace files found with folder filter, trying broader search...');
        meditaceMetadata = Object.values(allMetadata).filter(meta => {
          const fileName = meta.fileName || meta.fullPath || '';
          return fileName.toLowerCase().includes('meditace') ||
                 fileName.toLowerCase().includes('muzsky') ||
                 fileName.toLowerCase().includes('zensky');
        });
      }

      log.info(`Found ${meditaceMetadata.length} meditace files`);

      // Transformuj metadata na formát pro UI
      const transformedItems = meditaceMetadata.map(meta => {
        const fileName = meta.fileName || meta.fullPath || '';

        // Extrahuj pohlaví z názvu souboru
        const isMale = fileName.includes('muzsky') || fileName.includes('male');
        const isFemale = fileName.includes('zensky') || fileName.includes('female');
        const gender = isMale ? 'male' : isFemale ? 'female' : 'none';
        const topic = this.extractTopicFromFileName(fileName);
        const is4F = fileName.includes('4F');
        const is4M = fileName.includes('4M');
        const mediaType = is4F ? '4F' : is4M ? '4M' : 'unknown';
        const displayName = meta.displayName || meta.title || this.extractTitleFromFileName(fileName);
        const duration = meta.durationFormatted || meta.duration || 'N/A';
        const durationSeconds = meta.duration || 0;

        return {
          fileName: fileName,
          audioSrc: meta.downloadURL || meta.audioSrc,
          title: displayName,
          duration: duration,
          durationSeconds: durationSeconds,
          gender: gender,
          topic: topic,
          mediaType: mediaType,
          size: meta.size || 0,
          sizeFormatted: this.formatFileSize(meta.size || 0),
          folder: 'meditace',
          downloadURL: meta.downloadURL,
          parsed: {
            gender: gender,
            topic: topic,
            title: displayName,
            mediaType: mediaType,
            is4F: is4F,
            is4M: is4M
          }
        };
      });

      // Ulož data pouze podle jazyka (bez filtrování podle pohlaví)
      const languages = ['sk', 'cz', 'en'];

      languages.forEach(lang => {
        // Ulož všechny soubory pro daný jazyk
        this.meditaceData[lang].all = transformedItems.filter(item => {
          const fileName = item.fileName;
          if (lang === 'sk') {
            return fileName.includes('SK') || (!fileName.includes('CZ') && !fileName.includes('EN'));
          } else if (lang === 'cz') {
            return fileName.includes('CZ');
          } else if (lang === 'en') {
            return fileName.includes('EN');
          }
          return false;
        });

        // Pro kompatibilitu, ulož stejná data do male a female
        this.meditaceData[lang].male = [...this.meditaceData[lang].all];
        this.meditaceData[lang].female = [...this.meditaceData[lang].all];
      });

      this.isInitialized = true;
      log.success('Meditace data service initialized successfully');
      log.debug('Meditace data summary:', {
        sk: { male: this.meditaceData.sk.male.length, female: this.meditaceData.sk.female.length, all: this.meditaceData.sk.all.length },
        cz: { male: this.meditaceData.cz.male.length, female: this.meditaceData.cz.female.length, all: this.meditaceData.cz.all.length },
        en: { male: this.meditaceData.en.male.length, female: this.meditaceData.en.female.length, all: this.meditaceData.en.all.length }
      });
      log.debug('SK male items sample:', this.meditaceData.sk.male.slice(0, 3));
      log.debug('SK female items sample:', this.meditaceData.sk.female.slice(0, 3));

    } catch (error) {
      log.error('Failed to initialize meditace data service:', error);
    }
  }

  // Filtruj meditace položky podle pohlaví a jazyka
  filterMeditaceItems(items, userGender, userLanguage) {
    const filteredItems = items.filter(item => {
      const fileName = item.fileName;
      const userLang = userLanguage.toLowerCase();
      const languageMap = { 'sk': 'sk', 'SK': 'sk', 'cz': 'cz', 'CZ': 'cz', 'en': 'en', 'EN': 'en' };
      const normalizedUserLang = languageMap[userLang] || 'sk';

      // Jazykové filtrování
      let languageMatch = false;
      if (normalizedUserLang === 'sk') {
        // Pro SK zobraz soubory s SK v názvu nebo bez jazykového označení
        languageMatch = fileName.includes('SK') ||
                       (!fileName.includes('CZ') && !fileName.includes('EN'));
      } else if (normalizedUserLang === 'cz') {
        languageMatch = fileName.includes('CZ');
      } else if (normalizedUserLang === 'en') {
        languageMatch = fileName.includes('EN');
      }

      // Pohlaví filtrování
      let genderMatch = false;
      if (userGender === 'all' || !userGender || userGender === 'none') {
        genderMatch = true;
      } else if (userGender === 'male') {
        // Pro muže: preferuj 4M mediaType, pak male gender
        genderMatch = item.mediaType === '4M' || (item.gender === 'male' && item.mediaType !== '4F');
      } else if (userGender === 'female') {
        // Pro ženy: preferuj 4F mediaType, pak female gender
        genderMatch = item.mediaType === '4F' || (item.gender === 'female' && item.mediaType !== '4M');
      } else {
        genderMatch = true;
      }


      return languageMatch && genderMatch;
    });

    // Seskup podle tématu a vezmi jen první z každého tématu
    const filesByTopic = filteredItems.reduce((acc, item) => {
      if (!item.topic) return acc;
      if (!acc[item.topic]) {
        acc[item.topic] = [];
      }
      acc[item.topic].push(item);
      return acc;
    }, {});

    const finalItems = [];
    Object.keys(filesByTopic).forEach(topicKey => {
      const topicFiles = filesByTopic[topicKey];

      // Najdi soubor vhodný pro aktuální pohlaví
      let selectedFile = topicFiles[0]; // fallback na první soubor

      if (userGender === 'male') {
        // Pro muže: preferuj 4M mediaType (pro muže), pak male gender
        const maleFile = topicFiles.find(f => f.mediaType === '4M');
        if (maleFile) {
          selectedFile = maleFile;
        } else {
          // Fallback na male gender pokud není 4M
          const maleGenderFile = topicFiles.find(f => f.gender === 'male');
          if (maleGenderFile) selectedFile = maleGenderFile;
        }
      } else if (userGender === 'female') {
        // Pro ženy: preferuj 4F mediaType (pro ženy), pak female gender
        const femaleFile = topicFiles.find(f => f.mediaType === '4F');
        if (femaleFile) {
          selectedFile = femaleFile;
        } else {
          // Fallback na female gender pokud není 4F
          const femaleGenderFile = topicFiles.find(f => f.gender === 'female');
          if (femaleGenderFile) selectedFile = femaleGenderFile;
        }
      }

      if (selectedFile && selectedFile.parsed) {
        const voiceGender = selectedFile.parsed.gender === 'female' ? 'žena' : 'muž';
        const topic = selectedFile.parsed.topic || topicKey.replace('-', ' ');

        finalItems.push({
          key: `${topicKey}-${selectedFile.parsed.gender}`,
          title: selectedFile.parsed.title || `${voiceGender} hlas - ${topic}`,
          audioSrc: selectedFile.audioSrc || selectedFile.fileName,
          duration: selectedFile.duration || 'N/A',
          voiceInfo: `${voiceGender} hlas`,
          isAvailable: true,
          allFiles: topicFiles,
          parsed: selectedFile.parsed,
          fileName: selectedFile.fileName,
          downloadURL: selectedFile.downloadURL
        });
      }
    });

    return finalItems;
  }

  // Získej meditace data pro konkrétní jazyk a pohlaví
  getMeditaceData(userGender = 'all', userLanguage = 'sk') {
    // Pokud není inicializovaný, vrať prázdné pole
    if (!this.isInitialized) {
      log.warn('MeditaceDataService not initialized');
      console.warn('⚠️ MeditaceDataService not initialized');
      return [];
    }

    console.log(`🔍 getMeditaceData called: userGender=${userGender}, userLanguage=${userLanguage}`);

    // Získej všechny meditace soubory pro daný jazyk
    const allMeditaceFiles = this.getAllMeditaceFilesForLanguage(userLanguage);

    console.log(`🔍 allMeditaceFiles count: ${allMeditaceFiles.length}`);
    if (allMeditaceFiles.length > 0) {
      console.log(`🔍 Sample file names:`, allMeditaceFiles.slice(0, 3).map(f => f.fileName));
    }

    // Filtruj podle pohlaví
    const filtered = this.filterMeditaceItems(allMeditaceFiles, userGender, userLanguage);
    console.log(`🔍 After filtering: ${filtered.length} items`);

    return filtered;
  }

  // Získej všechny meditace soubory pro daný jazyk
  getAllMeditaceFilesForLanguage(userLanguage) {
    const langKey = userLanguage.toLowerCase();
    const allFiles = [];

    // Debug: zobraz strukturu dat
    console.log(`🔍 getAllMeditaceFilesForLanguage: langKey=${langKey}`);
    console.log(`🔍 this.meditaceData[${langKey}]:`, this.meditaceData[langKey]);
    console.log(`🔍 Available languages:`, Object.keys(this.meditaceData));

    // Získej všechny soubory pro daný jazyk (male, female, all)
    ['male', 'female', 'all'].forEach(gender => {
      const files = this.meditaceData[langKey]?.[gender] || [];
      console.log(`🔍 ${langKey}.${gender}: ${files.length} files`);
      allFiles.push(...files);
    });

    console.log(`🔍 Total files for ${langKey}: ${allFiles.length}`);
    return allFiles;
  }

  // Získej statistiky
  getStats(userGender = 'all', userLanguage = 'sk') {
    const items = this.getMeditaceData(userGender, userLanguage);
    return {
      totalFiles: items.length,
      byLanguage: {},
      byGender: {},
      totalDuration: items.reduce((sum, item) => sum + (item.durationSeconds || 0), 0)
    };
  }
}

export const meditaceDataService = new MeditaceDataService();
