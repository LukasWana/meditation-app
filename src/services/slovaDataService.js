import log from './logger.js';

class SlovaDataService {
  constructor() {
    this.slovaData = {
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

  // Inicializace slova dat z cache
  async initialize() {
    if (this.isInitialized) {
      log.debug('SlovaDataService already initialized, skipping...');
      return;
    }

    try {
      log.info('Initializing slova data service...');

      // Import realtime metadata service
      const { realtimeMetadataService } = await import('./realtimeMetadataService');
      const allMetadata = await realtimeMetadataService.getAllMetadata();

      log.debug('Cache service loaded, checking metadata...');
      log.debug('All metadata keys count:', Object.keys(allMetadata).length);

      if (!allMetadata || Object.keys(allMetadata).length === 0) {
        log.warn('No metadata in cache for slova processing');
        return;
      }

      log.debug(`Processing ${Object.keys(allMetadata).length} metadata entries for slova...`);
      log.debug('Sample metadata keys:', Object.keys(allMetadata).slice(0, 5));
      log.debug('Sample metadata values:', Object.values(allMetadata).slice(0, 3).map(meta => ({
        fileName: meta.fileName,
        folder: meta.folder,
        fullPath: meta.fullPath
      })));

      // Filtruj pouze slova soubory
      let slovaMetadata = Object.values(allMetadata).filter(meta => {
        const isSlova = meta.folder === 'slova' ||
                        meta.fileName?.includes('slova/') ||
                        meta.fullPath?.includes('slova/');
        return isSlova;
      });

      // Pokud se nenašly žádné slova soubory, zkus najít všechny soubory s 'slova' v názvu
      if (slovaMetadata.length === 0) {
        log.warn('No slova files found with folder filter, trying broader search...');
        slovaMetadata = Object.values(allMetadata).filter(meta => {
          const fileName = meta.fileName || meta.fullPath || '';
          return fileName.toLowerCase().includes('slova') ||
                 fileName.toLowerCase().includes('muzsky') ||
                 fileName.toLowerCase().includes('zensky');
        });
      }

      log.info(`Found ${slovaMetadata.length} slova files`);

      // Transformuj metadata na formát pro UI
      const transformedItems = slovaMetadata.map(meta => {
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
          folder: 'slova',
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
        this.slovaData[lang].all = transformedItems.filter(item => {
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
        this.slovaData[lang].male = [...this.slovaData[lang].all];
        this.slovaData[lang].female = [...this.slovaData[lang].all];
      });

      this.isInitialized = true;
      log.success('Slova data service initialized successfully');
      log.debug('Slova data summary:', {
        sk: { male: this.slovaData.sk.male.length, female: this.slovaData.sk.female.length, all: this.slovaData.sk.all.length },
        cz: { male: this.slovaData.cz.male.length, female: this.slovaData.cz.female.length, all: this.slovaData.cz.all.length },
        en: { male: this.slovaData.en.male.length, female: this.slovaData.en.female.length, all: this.slovaData.en.all.length }
      });
      log.debug('SK male items sample:', this.slovaData.sk.male.slice(0, 3));
      log.debug('SK female items sample:', this.slovaData.sk.female.slice(0, 3));

    } catch (error) {
      log.error('Failed to initialize slova data service:', error);
    }
  }

  // Filtruj slova položky podle pohlaví a jazyka
  filterSlovaItems(items, userGender, userLanguage) {
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

  // Získej slova data pro konkrétní jazyk a pohlaví
  getSlovaData(userGender = 'all', userLanguage = 'sk') {
    // Pokud není inicializovaný, vrať prázdné pole
    if (!this.isInitialized) {
      log.warn('SlovaDataService not initialized');
      console.warn('⚠️ SlovaDataService not initialized');
      return [];
    }

    console.log(`🔍 getSlovaData called: userGender=${userGender}, userLanguage=${userLanguage}`);

    // Získej všechny slova soubory pro daný jazyk
    const allSlovaFiles = this.getAllSlovaFilesForLanguage(userLanguage);

    console.log(`🔍 allSlovaFiles count: ${allSlovaFiles.length}`);
    if (allSlovaFiles.length > 0) {
      console.log(`🔍 Sample file names:`, allSlovaFiles.slice(0, 3).map(f => f.fileName));
    }

    // Filtruj podle pohlaví
    const filtered = this.filterSlovaItems(allSlovaFiles, userGender, userLanguage);
    console.log(`🔍 After filtering: ${filtered.length} items`);

    return filtered;
  }

  // Získej všechny slova soubory pro daný jazyk
  getAllSlovaFilesForLanguage(userLanguage) {
    const langKey = userLanguage.toLowerCase();
    const allFiles = [];

    // Debug: zobraz strukturu dat
    console.log(`🔍 getAllSlovaFilesForLanguage: langKey=${langKey}`);
    console.log(`🔍 this.slovaData[${langKey}]:`, this.slovaData[langKey]);
    console.log(`🔍 Available languages:`, Object.keys(this.slovaData));

    // Získej všechny soubory pro daný jazyk (male, female, all)
    ['male', 'female', 'all'].forEach(gender => {
      const files = this.slovaData[langKey]?.[gender] || [];
      console.log(`🔍 ${langKey}.${gender}: ${files.length} files`);
      allFiles.push(...files);
    });

    console.log(`🔍 Total files for ${langKey}: ${allFiles.length}`);
    return allFiles;
  }

  // Získej statistiky
  getStats(userGender = 'all', userLanguage = 'sk') {
    const items = this.getSlovaData(userGender, userLanguage);
    return {
      totalFiles: items.length,
      byLanguage: {},
      byGender: {},
      totalDuration: items.reduce((sum, item) => sum + (item.durationSeconds || 0), 0)
    };
  }
}

export const slovaDataService = new SlovaDataService();
