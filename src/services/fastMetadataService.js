
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage, ensureFirebase } from '@config/secure-firebase';
import log from './logger';
import { parseAudioFileName } from '@utils/hudbaParser';
import { LOCAL_BREATHING_FILES } from '@config/localBreathingFiles';
import localBreathingMetadata from '@config/localBreathingMetadata.json';

class FastMetadataService {
  constructor() {
    this.metadata = new Map();
    this.isLoading = false;
    this.isInitialized = false;
    this.lastUpdate = null;
    this.cacheKey = 'fast-metadata-cache-v5';
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hodin
  }

  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        if (now - timestamp < this.cacheExpiry) {
          log.info(`⚡ Fast load: ${Object.keys(data).length} metadata records from cache`);
          this.metadata = new Map(Object.entries(data));
          this.lastUpdate = new Date(timestamp);
          return true;
        } else {
          localStorage.removeItem(this.cacheKey);
        }
      }
    } catch (error) {
      log.warn('Failed to load from cache:', error);
    }
    return false;
  }

  saveToCache() {
    try {
      const data = Object.fromEntries(this.metadata);
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      log.info('Metadata saved to cache');
    } catch (error) {
      log.warn('Failed to save to cache:', error);
    }
  }

  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      this.metadata.clear();
      this.lastUpdate = null;
      log.info('Cache cleared - will reload from Firebase');
    } catch (error) {
      log.warn('Failed to clear cache:', error);
    }
  }

  isCacheValid() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        const now = Date.now();
        return (now - timestamp) < this.cacheExpiry;
      }
    } catch (error) {
      log.warn('Failed to check cache validity:', error);
    }
    return false;
  }

  async getAllMetadata() {
    await ensureFirebase();
    console.log('🚀 [CRITICAL DEBUG] fastMetadataService.getAllMetadata() CALLED', {
      isLoading: this.isLoading,
      isInitialized: this.isInitialized,
      currentMetadataSize: this.metadata.size,
      timestamp: new Date().toISOString()
    });

    if (this.isLoading) {
      console.warn('⚠️ [DEBUG] Already loading metadata, returning current state');
      log.warn('⚠️ Already loading metadata, returning current state');
      return this.metadata;
    }

    // Nejdříve zkus načíst z cache
    console.log('🔍 [DEBUG] Trying to load from cache...');
    if (this.loadFromCache()) {
      this.isLoading = false;
      this.isInitialized = true;
      console.log('✅ [DEBUG] Loaded from cache, metadata size:', this.metadata.size);
      log.success('✅ Loaded metadata from cache');
      return this.metadata;
    }
    console.log('❌ [DEBUG] Cache load failed, loading from Firebase Storage...');

    this.isLoading = true;

    try {
      log.info('🚀 Loading metadata from Firebase Storage structure...');
      console.log('🔍 [Firebase Storage DEBUG] Starting metadata load from Firebase Storage');

      let hasPartialErrors = false;
      const allFiles = [];

      // Načti hudba složku
      try {
        const hudbaRef = ref(storage, 'hudba');
        log.debug(`🔍 Loading from Firebase Storage path: hudba`);
        console.log('🔍 [Firebase Storage] Loading hudba folder...');
        const hudbaResult = await listAll(hudbaRef);
        log.debug(`📊 Firebase Storage result for hudba:`, {
          itemsCount: hudbaResult.items.length,
          prefixesCount: hudbaResult.prefixes.length
        });
        console.log(`✅ [Firebase Storage] Hudba folder loaded:`, {
          items: hudbaResult.items.length,
          prefixes: hudbaResult.prefixes.length
        });

        // Přidej soubory z hudba složky
        hudbaResult.items.forEach(item => {
          const fileData = {
            ...item,
            name: item.name,
            folder: 'hudba',
            fullPath: item.fullPath || `hudba/${item.name}`
          };
          log.debug(`📄 Adding root hudba file:`, fileData);
          allFiles.push(fileData);
        });

        // Prohledej podsložky hudba složky
        log.debug(`🔍 Found hudba subfolders:`, hudbaResult.prefixes.map(p => p.name));
        for (const folderRef of hudbaResult.prefixes) {
          try {
            log.debug(`📁 Processing folder: ${folderRef.name}`);
            const folderResult = await listAll(folderRef);
            log.debug(`📄 Found ${folderResult.items.length} items and ${folderResult.prefixes.length} subfolders in ${folderRef.name}`);

            // Přidej soubory z této složky
            folderResult.items.forEach(item => {
              allFiles.push({
                ...item,
                name: `${folderRef.name}/${item.name}`,
                folder: 'hudba', // Oprava: folder musí být 'hudba', ne název podsložky
                subFolder: folderRef.name,
                fullPath: item.fullPath || `hudba/${folderRef.name}/${item.name}`
              });
            });

            // Prohledej podsložky této složky
            log.debug(`🔍 Checking subfolders for ${folderRef.name}:`, folderResult.prefixes.map(p => p.name));
            for (const subFolderRef of folderResult.prefixes) {
              try {
                log.debug(`📁 Processing subfolder: ${subFolderRef.name}`);
                const subFolderResult = await listAll(subFolderRef);
                log.debug(`📄 Found ${subFolderResult.items.length} items in ${subFolderRef.name}`);
                subFolderResult.items.forEach(item => {
                  const fileData = {
                    ...item,
                    name: `${subFolderRef.name}/${item.name}`,
                    folder: 'hudba', // Oprava: folder musí být 'hudba'
                    subFolder: subFolderRef.name,
                    fullPath: item.fullPath || `hudba/${subFolderRef.name}/${item.name}`
                  };
                  log.debug(`📄 Adding subfolder file:`, fileData);
                  allFiles.push(fileData);
                });
              } catch (subErr) {
                log.warn(`Failed to check subfolder ${subFolderRef.name}:`, subErr);
              }
            }
          } catch (err) {
            log.warn(`Failed to check folder ${folderRef.name}:`, err);
          }
        }
      } catch (hudbaError) {
        log.warn(`Failed to load hudba folder:`, hudbaError);
        console.error('❌ [Firebase Storage] Failed to load hudba folder:', hudbaError);
        hasPartialErrors = true;
      }

      // Načti dychanie složku (LOKÁLNĚ)
      try {
        console.log('🔍 [Local Assets] Loading dychanie folder from local config...');
        log.info('🔍 Loading dychanie folder from local config');
        
        LOCAL_BREATHING_FILES.forEach(filePath => {
          const parts = filePath.split('/');
          const subFolder = parts.length > 1 ? parts[0] : null;
          
          allFiles.push({
            name: filePath, // "prana-breath/bg00.ogg"
            folder: 'dychanie',
            subFolder: subFolder,
            fullPath: `dychanie/${filePath}` // "dychanie/prana-breath/bg00.ogg"
          });
        });
        
        console.log(`✅ [Local Assets] Dychanie folder loaded locally: ${LOCAL_BREATHING_FILES.length} files`);
      } catch (dychanieError) {
        log.warn(`Failed to load local dychanie files:`, dychanieError);
        hasPartialErrors = true;
      }

      // ✅ NOVÉ: Načti background složku (obrázky)
      try {
        const backgroundRef = ref(storage, 'background');
        log.debug(`🔍 Loading from Firebase Storage path: background`);
        const backgroundResult = await listAll(backgroundRef);
        log.debug(`📊 Firebase Storage result for background:`, {
          itemsCount: backgroundResult.items.length,
          prefixesCount: backgroundResult.prefixes.length
        });

        // Přidej obrázky z background složky
        backgroundResult.items.forEach(item => {
          const fileName = item.name.toLowerCase();
          const isImageFile = fileName.endsWith('.jpg') ||
            fileName.endsWith('.jpeg') ||
            fileName.endsWith('.png') ||
            fileName.endsWith('.gif') ||
            fileName.endsWith('.webp');

          if (isImageFile) {
            allFiles.push({
              ...item,
              name: item.name,
              folder: 'background',
              fullPath: item.fullPath || `background/${item.name}`
            });
            log.debug(`📄 Adding background image:`, item.name);
          }
        });

        // Prohledej podsložky background (pokud existují)
        for (const folderRef of backgroundResult.prefixes) {
          try {
            const folderResult = await listAll(folderRef);
            folderResult.items.forEach(item => {
              const fileName = item.name.toLowerCase();
              const isImageFile = fileName.endsWith('.jpg') ||
                fileName.endsWith('.jpeg') ||
                fileName.endsWith('.png') ||
                fileName.endsWith('.gif') ||
                fileName.endsWith('.webp');

              if (isImageFile) {
                allFiles.push({
                  ...item,
                  name: `${folderRef.name}/${item.name}`,
                  folder: 'background',
                  subFolder: folderRef.name,
                  fullPath: item.fullPath || `background/${folderRef.name}/${item.name}`
                });
              }
            });
          } catch (err) {
            log.warn(`Failed to check background subfolder ${folderRef.name}:`, err);
          }
        }
      } catch (backgroundError) {
        log.warn(`Failed to load background folder:`, backgroundError);
        hasPartialErrors = true;
      }

      // ✅ NOVÉ: Načti meditacie složku s jazykovými podsložkami
      try {
        const meditacieRef = ref(storage, 'meditacie');
        log.debug(`🔍 Loading from Firebase Storage path: meditacie`);
        console.log('🔍 [Firebase Storage] Loading meditacie folder...');
        const meditacieResult = await listAll(meditacieRef);
        log.debug(`📊 Firebase Storage result for meditacie:`, {
          itemsCount: meditacieResult.items.length,
          prefixesCount: meditacieResult.prefixes.length
        });
        console.log(`✅ [Firebase Storage] Meditacie folder loaded:`, {
          items: meditacieResult.items.length,
          prefixes: meditacieResult.prefixes.length
        });

        // Prohledej jazykové podsložky (CZ, SK, EN)
        for (const langFolderRef of meditacieResult.prefixes) {
          try {
            log.debug(`📁 Processing meditacie language folder: ${langFolderRef.name}`);
            const langResult = await listAll(langFolderRef);

            langResult.items.forEach(item => {
              const fileName = item.name.toLowerCase();
              const isAudioFile = fileName.endsWith('.mp3') ||
                fileName.endsWith('.ogg') ||
                fileName.endsWith('.oga');

              if (isAudioFile) {
                allFiles.push({
                  ...item,
                  name: `${langFolderRef.name}/${item.name}`,
                  folder: 'meditacie',
                  language: langFolderRef.name,
                  fullPath: item.fullPath || `meditacie/${langFolderRef.name}/${item.name}`
                });
                log.debug(`📄 Adding meditacie file: ${langFolderRef.name}/${item.name}`);
              }
            });
          } catch (err) {
            log.warn(`Failed to check meditacie folder ${langFolderRef.name}:`, err);
          }
        }
      } catch (meditacieError) {
        log.warn(`Failed to load meditacie folder:`, meditacieError);
        console.error('❌ [Firebase Storage] Failed to load meditacie folder:', meditacieError);
        hasPartialErrors = true;
      }

      // Root jazykové složky (CZ/SK/EN) se nepoužívají – držíme se struktury meditacie/{LANG}/

      // Zpracuj soubory a vytvoř metadata
      await this.processFiles(allFiles);

      // Načti délky audio souborů
      await this.loadAudioDurations();

      this.lastUpdate = new Date();
      
      if (!hasPartialErrors) {
        this.saveToCache();
      } else {
        log.warn('⚠️ Not saving to cache due to partial load errors (cache poisoning prevention)');
        console.warn('⚠️ [Firebase Storage] Skipping cache save because some folders failed to load');
      }

      log.success(`✅ Fast metadata loading completed: ${this.metadata.size} files processed`);

      this.isInitialized = true;
      return this.metadata;

    } catch (error) {
      log.error('Failed to load metadata:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async processFiles(files) {
    log.debug(`🔍 Processing ${files.length} total files:`, files.map(f => ({
      name: f.name,
      folder: f.folder,
      subFolder: f.subFolder
    })));

    // Debug: vypiš rozdělení podle složek
    const folderStats = files.reduce((acc, file) => {
      acc[file.folder] = (acc[file.folder] || 0) + 1;
      return acc;
    }, {});
    log.debug(`📊 Files by folder:`, folderStats);

    // Filtruj soubory podle složek
    const hudbaFiles = files.filter(file => file.folder === 'hudba');
    const dychanieFiles = files.filter(file => file.folder === 'dychanie');
    const meditacieFiles = files.filter(file => file.folder === 'meditacie');
    const backgroundFiles = files.filter(file => file.folder === 'background');

    const mp3Files = hudbaFiles.filter(file => {
      // FIX: file.name je "ALBUM/filename.mp3", takže musíme extrahovat jen filename
      const fileName = file.name.toLowerCase();
      const actualFileName = fileName.split('/').pop(); // Extrahuj "filename.mp3" z "ALBUM/filename.mp3"
      return actualFileName.endsWith('.mp3');
    });
    const oggFiles = dychanieFiles.filter(file => {
      const fileName = file.name.toLowerCase();
      return fileName.endsWith('.ogg') || fileName.endsWith('.oga') || fileName.endsWith('.mp3');
    });
    const meditacieAudioFiles = meditacieFiles.filter(file => {
      // FIX: file.name je "LANG/filename.mp3", takže musíme extrahovat jen filename
      // Použijeme split a vezmeme poslední část
      const fileName = file.name.toLowerCase();
      const actualFileName = fileName.split('/').pop(); // Extrahuj "filename.mp3" z "LANG/filename.mp3"
      return actualFileName.endsWith('.mp3') || actualFileName.endsWith('.ogg') || actualFileName.endsWith('.oga');
    });
    const imageFiles = hudbaFiles.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name));
    const backgroundImageFiles = backgroundFiles.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name));

    log.debug(`🎵 Filtered files:`, {
      totalFiles: files.length,
      hudbaFiles: hudbaFiles.length,
      dychanieFiles: dychanieFiles.length,
      meditacieFiles: meditacieFiles.length,
      backgroundFiles: backgroundFiles.length,
      mp3Files: mp3Files.length,
      oggFiles: oggFiles.length,
      meditacieAudioFiles: meditacieAudioFiles.length,
      imageFiles: imageFiles.length,
      backgroundImageFiles: backgroundImageFiles.length
    });

    log.info(`📊 Processing ${mp3Files.length} MP3 files, ${imageFiles.length} images, ${meditacieAudioFiles.length} meditacie files, ${backgroundImageFiles.length} background images`);
    log.debug(`🎵 MP3 files:`, mp3Files.map(f => ({
      name: f.name,
      folder: f.folder,
      subFolder: f.subFolder
    })));

    // Nejdříve zpracuj cover obrázky pro lepší UX
    log.info(`🖼️ Processing ${imageFiles.length} cover images first for better UX...`);
    for (const file of imageFiles) {
      try {
        const metadata = await this.createImageMetadata(file);
        this.metadata.set(file.name, metadata);
        log.debug(`✅ Cover image processed: ${file.name}`);
      } catch (error) {
        log.warn(`Failed to process image ${file.name}:`, error);
      }
    }

    // ✅ NOVÉ: Zpracuj background obrázky
    log.info(`🖼️ Processing ${backgroundImageFiles.length} background images...`);
    for (const file of backgroundImageFiles) {
      try {
        const metadata = await this.createImageMetadata(file);
        metadata.isBackground = true;
        this.metadata.set(file.name, metadata);
        log.debug(`✅ Background image processed: ${file.name}`);
      } catch (error) {
        log.warn(`Failed to process background image ${file.name}:`, error);
      }
    }

    // Pak zpracuj MP3 soubory
    log.info(`🎵 Processing ${mp3Files.length} MP3 files...`);
    for (const file of mp3Files) {
      try {
        const metadata = await this.createMetadataFromFile(file);
        // Použij metadata.fileName jako klíč (obsahuje celou cestu včetně složky)
        this.metadata.set(metadata.fileName, metadata);
      } catch (error) {
        log.warn(`Failed to process file ${file.name}:`, error);
      }
    }

    // Zpracuj OGG soubory (dychanie)
    log.info(`🎵 Processing ${oggFiles.length} OGG files for dychanie...`);
    for (const file of oggFiles) {
      try {
        const metadata = await this.createMetadataFromFile(file);
        // Použij metadata.fileName jako klíč (obsahuje celou cestu včetně složky)
        this.metadata.set(metadata.fileName, metadata);
      } catch (error) {
        log.warn(`Failed to process dychanie file ${file.name}:`, error);
      }
    }

    // ✅ NOVÉ: Zpracuj meditacie audio soubory
    log.info(`🎵 Processing ${meditacieAudioFiles.length} meditacie audio files...`);
    for (const file of meditacieAudioFiles) {
      try {
        const metadata = await this.createMetadataFromFile(file);
        // Přidej informace o jazyce
        if (file.language) {
          metadata.language = file.language;
        }
        metadata.category = 'meditacie';
        this.metadata.set(metadata.fileName, metadata);
        log.debug(`✅ Meditacie file processed: ${metadata.fileName}`);
      } catch (error) {
        log.warn(`Failed to process meditacie file ${file.name}:`, error);
      }
    }

    log.success(`✅ Processed ${this.metadata.size} files`);
  }

  async createMetadataFromFile(file) {
    const filePath = file.fullPath || (file.folder === 'root' ? file.name : `${file.folder}/${file.name}`);
    const fileNameOnly = filePath.split('/').pop();
    const normalizedFolder = file.folder === 'root' ? (filePath.split('/')[0] || 'root') : file.folder;
    const isMeditaciePath = normalizedFolder === 'meditacie' ||
      filePath.startsWith('meditacie/');
    const isSlova = isMeditaciePath;

    // Parsuj název souboru
    const parsed = parseAudioFileName(fileNameOnly);

    // Vytvoř základní metadata
    const metadata = {
      fileName: filePath,
      fileNameOnly: fileNameOnly,
      folder: normalizedFolder,
      subFolder: file.subFolder || null,
      type: normalizedFolder === 'dychanie' ? 'dychanie' : (file.subFolder ? 'album_track' : 'audio'),
      contentType: fileNameOnly.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'audio/ogg',
      timeCreated: new Date().toISOString(),
      updated: new Date().toISOString(),
      // Parsované informace - aktualizuj s informacemi o složce
      parsed: {
        ...parsed,
        isHudba: normalizedFolder === 'hudba',
        isSlova: isSlova,
        isDychanie: normalizedFolder === 'dychanie',
        isAlbum: file.subFolder ? true : false,
        albumName: file.subFolder || null,
        trackName: parsed?.trackName || parsed?.name || fileNameOnly.replace(/\.(mp3|ogg|oga)$/i, ''),
      },
      // Urči typ podle struktury složek
      isHudba: normalizedFolder === 'hudba',
      isSlova: isSlova,
      isAlbum: file.subFolder ? true : false,
      albumName: file.subFolder || null,
      trackName: parsed?.trackName || parsed?.name || fileNameOnly.replace(/\.mp3$/i, ''),
      // Délka se načte z audio elementu
      duration: null, // Bude naplněno později
      durationFormatted: 'N/A'
    };

    // Debug log pro každý soubor
    log.debug(`🎵 Created metadata for ${filePath}:`, {
      originalFileName: filePath,
      constructedFileName: metadata.fileName,
      fileFolder: normalizedFolder,
      fileSubFolder: file.subFolder,
      trackName: metadata.trackName,
      albumName: metadata.albumName,
      isAlbum: metadata.isAlbum,
      isHudba: metadata.isHudba
    });

    // Získej download URL a nahraj metadata - pro dychanie složku použijeme lokální cestu a předpočítaná metadata
    if (normalizedFolder === 'dychanie') {
      metadata.downloadURL = '/' + filePath;
      
      const localMeta = localBreathingMetadata[filePath];
      if (localMeta) {
        metadata.duration = localMeta.duration;
        metadata.durationFormatted = localMeta.durationFormatted;
        metadata.waveformData = localMeta.waveformData;
        metadata.waveformMax = localMeta.waveformMax;
        log.debug(`⚡ Offline metadata loaded for ${filePath}`);
      }
    } else {
      metadata.downloadURL = await this._getDownloadURLWithRetry(file);

      // Debug log pro download URL
      log.debug(`🔗 Download URL for ${filePath}:`, {
        downloadURL: metadata.downloadURL ? 'OK' : 'FAILED',
        isAlbum: metadata.isAlbum,
        albumName: metadata.albumName
      });

      // Načti délku skladby
      if (metadata.downloadURL) {
        try {
          const duration = await this._loadAudioDuration(metadata.downloadURL);
          if (duration) {
            metadata.duration = duration;
            metadata.durationFormatted = this.formatDuration(duration);
            log.debug(`⏱️ Duration loaded for ${filePath}: ${metadata.durationFormatted}`);
          }
        } catch (error) {
          log.warn(`Failed to load duration for ${filePath}:`, error);
        }
      }
    }

    return metadata;
  }

  async _getDownloadURLWithRetry(file, retries = 3) {
    await ensureFirebase();
    const fileName = file.name;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const fullPath = file.fullPath || (file.folder === 'root' ? fileName : `${file.folder}/${fileName}`);
        log.debug(`🔗 Constructing fullPath for ${fileName}:`, {
          fileName,
          folder: file.folder,
          subFolder: file.subFolder,
          fullPath
        });
        const fileRef = ref(storage, fullPath);
        const downloadURL = await getDownloadURL(fileRef);

        log.debug(`✅ Download URL loaded for ${fileName} (attempt ${attempt + 1}): OK`);
        return downloadURL;
      } catch (error) {
        log.warn(`Attempt ${attempt + 1} failed for ${fileName}:`, error.message);

        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          log.debug(`🔄 Retrying ${fileName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          log.error(`❌ Failed to get download URL for ${fileName} after ${retries + 1} attempts`);
          return null;
        }
      }
    }
    return null;
  }

  async createImageMetadata(file) {
    const filePath = file.fullPath || (file.folder === 'root' ? file.name : `${file.folder}/${file.name}`);
    const fileNameOnly = filePath.split('/').pop();

    const metadata = {
      fileName: filePath,
      fileNameOnly: fileNameOnly,
      folder: file.folder,
      subFolder: file.subFolder || null,
      type: 'image',
      contentType: this.getImageContentType(fileNameOnly),
      timeCreated: new Date().toISOString(),
      updated: new Date().toISOString(),
      isCover: fileNameOnly.toLowerCase().includes('cover'),
      albumName: file.subFolder || null
    };

    // Debug log pro cover obrázky
    log.debug(`🖼️ Processing image ${filePath}:`, {
      isCover: metadata.isCover,
      albumName: metadata.albumName,
      subFolder: file.subFolder
    });

    // Získej download URL s retry mechanismem
    metadata.downloadURL = await this._getDownloadURLWithRetry(file);

    return metadata;
  }

  async loadAudioDurations() {
    const audioFiles = Array.from(this.metadata.values()).filter(meta =>
      (meta.type === 'audio' || meta.type === 'album_track') && meta.downloadURL
    );

    log.info(`🎵 Preserving loaded durations and setting N/A only as fallback...`);

    audioFiles.forEach(metadata => {
      if (!metadata.duration) {
        metadata.duration = null;
        metadata.durationFormatted = 'N/A';
        log.debug(`⚠️ Duration set to N/A for ${metadata.fileName} (CORS issue with Firebase Storage)`);
      } else {
        log.debug(`⏱️ Preserved duration for ${metadata.fileName}: ${metadata.durationFormatted}`);
      }
    });

    log.success(`✅ Audio durations preserved and initialized for ${audioFiles.length} files`);
  }

  async getAudioDuration(audioSrc, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const duration = await this._loadAudioDuration(audioSrc);
        if (duration) {
          return duration;
        }

        if (attempt < retries) {
          log.debug(`🔄 Retry ${attempt + 1}/${retries} for ${audioSrc}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      } catch (error) {
        log.warn(`Attempt ${attempt + 1} failed for ${audioSrc}:`, error);
        if (attempt === retries) {
          return null;
        }
      }
    }
    return null;
  }

  _loadAudioDuration(audioSrc) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      // Nepoužívej crossOrigin pro Firebase Storage soubory kvůli CORS problémům
      // audio.crossOrigin = 'anonymous';
      audio.preload = 'metadata';

      const timeout = setTimeout(() => {
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
        resolve(null);
      }, 8000); // Zvýšeno na 8s

      const onLoaded = () => {
        clearTimeout(timeout);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
        const duration = audio.duration;
        if (isFinite(duration) && duration > 0) {
          resolve(duration);
        } else {
          resolve(null);
        }
      };

      const onError = () => {
        clearTimeout(timeout);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
        reject(new Error('Audio loading failed'));
      };

      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', onError);
      audio.src = audioSrc;
    });
  }

  formatDuration(seconds) {
    if (!seconds || !isFinite(seconds) || seconds <= 0) {
      return 'N/A';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getImageContentType(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  getMetadata(fileName) {
    return this.metadata.get(fileName);
  }

  getAllFromCache() {
    return Object.fromEntries(this.metadata);
  }

  getHudbaMetadata() {
    return Array.from(this.metadata.values()).filter(meta =>
      meta.isHudba && meta.type === 'audio'
    );
  }

  getSlovaMetadata() {
    return Array.from(this.metadata.values()).filter(meta =>
      (meta.isSlova || meta.folder === 'meditacie') && meta.type === 'audio'
    );
  }

  getCoverImages() {
    const covers = new Map();
    const coverImages = Array.from(this.metadata.values())
      .filter(meta => meta.type === 'image' && meta.isCover);

    log.debug(`🖼️ Found ${coverImages.length} cover images in metadata`);

    coverImages.forEach(meta => {
      if (meta.albumName && meta.downloadURL) {
        covers.set(meta.albumName, meta.downloadURL);
      }
    });

    log.debug(`📊 Cover images map:`, Array.from(covers.keys()));
    return covers;
  }

  getMetadataByFolder(folder) {
    return Array.from(this.metadata.values()).filter(meta =>
      meta.folder === folder && (meta.type === 'audio' || meta.type === 'album_track')
    );
  }

  getMetadataBySubFolder(folder, subFolder) {
    return Array.from(this.metadata.values()).filter(meta =>
      meta.folder === folder && meta.subFolder === subFolder && (meta.type === 'audio' || meta.type === 'album_track')
    );
  }

  getStats() {
    const slovaFiles = this.getMetadataByFolder('meditacie');
    const hudbaFiles = this.getMetadataByFolder('hudba');
    const backgroundFiles = Array.from(this.metadata.values()).filter(m => m.folder === 'background');

    return {
      totalFiles: this.metadata.size,
      slovaFiles: slovaFiles.length,
      hudbaFiles: hudbaFiles.length,
      backgroundFiles: backgroundFiles.length,
      isInitialized: this.isInitialized,
      isLoading: this.isLoading
    };
  }

  isReady() {
    return this.isInitialized && !this.isLoading;
  }

  /**
   * Normalizuje metadata z Realtime Database do formátu, který očekává filtr
   */
  normalizeRealtimeMetadata(data) {
    if (!data) return null;

    // Získej fileName - může být v různých polích
    const fileName = data.fileName || data.fullPath || data.name || '';

    if (!fileName) {
      return null;
    }

    const fileNameOnly = fileName.split('/').pop();
    const isMeditaciePath = fileName.startsWith('meditacie/');

    // Zkontroluj, zda je to obrázek (cover.jpg, cover.png, atd.)
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileNameOnly);

    // Pokud je to obrázek, zpracuj ho jako cover obrázek
    if (isImage) {
      const folder = data.folder || (fileName.includes('hudba/') ? 'hudba' : (isMeditaciePath ? 'meditacie' : (fileName.includes('dychanie/') ? 'dychanie' : null)));
      const isCover = fileNameOnly.toLowerCase().includes('cover');

      // Urči albumName ze struktury souboru
      // Podporuje různé formáty: "hudba/ambient-journey/cover.jpg" nebo "ambient-journey/cover.jpg"
      let albumName = null;
      const pathParts = fileName.split('/');

      if (folder === 'hudba') {
        // Pokud je cesta "hudba/album/cover.jpg" -> albumName je "album"
        if (pathParts.length > 2 && pathParts[0] === 'hudba') {
          albumName = pathParts[1];
        }
        // Pokud je cesta "album/cover.jpg" (bez hudba/) -> albumName je "album"
        else if (pathParts.length > 1 && pathParts[0] !== 'hudba') {
          albumName = pathParts[0];
        }
        // Pokud je v datech subFolder, použij ho
        else if (data.subFolder) {
          albumName = data.subFolder;
        }
      }

      log.debug(`🖼️ Normalizing cover image:`, {
        fileName: fileName,
        folder: folder,
        pathParts: pathParts,
        albumName: albumName,
        isCover: isCover,
        hasDownloadURL: !!(data.downloadURL || data.audioSrc)
      });

      return {
        fileName: fileName,
        fileNameOnly: fileNameOnly,
        folder: folder,
        subFolder: albumName,
        type: 'image',
        contentType: data.contentType || this.getImageContentType(fileNameOnly),
        timeCreated: data.timeCreated || data.lastUpdated || new Date().toISOString(),
        updated: data.updated || data.lastUpdated || new Date().toISOString(),
        downloadURL: data.downloadURL || data.audioSrc,
        size: data.size || null,
        isCover: isCover,
        albumName: albumName
      };
    }

    // Jinak zpracuj jako audio soubor
    // Urči folder podle fileName nebo pole folder
    const folder = data.folder || (fileName.includes('hudba/') ? 'hudba' : (isMeditaciePath ? 'meditacie' : (fileName.includes('dychanie/') ? 'dychanie' : null)));

    // Urči type podle struktury
    let type = data.type;
    if (!type) {
      // Pokud je soubor v podsložce, je to album_track
      if (folder === 'hudba' && fileName.split('/').length > 2) {
        type = 'album_track';
      } else if (folder === 'hudba') {
        type = 'audio';
      } else if (folder === 'dychanie') {
        type = 'dychanie';
      } else {
        type = 'audio'; // default
      }
    }

    // Urči isHudba podle folder
    const isHudba = folder === 'hudba' || (data.category === 'music' || data.category === 'hudba');
    const isSlova = folder === 'meditacie';

    // Parsuj název souboru pro získání informací o albu
    const parsed = parseAudioFileName(fileNameOnly);

    // Vytvoř normalizovaná metadata
    const normalized = {
      fileName: fileName,
      fileNameOnly: fileNameOnly,
      folder: folder,
      subFolder: (folder === 'hudba' || folder === 'dychanie') && fileName.split('/').length > 2 ? fileName.split('/')[1] : (data.subFolder || null),
      type: type,
      contentType: data.contentType || 'audio/mpeg',
      timeCreated: data.timeCreated || data.lastUpdated || new Date().toISOString(),
      updated: data.updated || data.lastUpdated || new Date().toISOString(),
      downloadURL: data.downloadURL || data.audioSrc,
      duration: data.duration || null,
      durationFormatted: data.durationFormatted || data.durationDetailed || 'N/A',
      size: data.size || null,
      // ✅ NOVÉ: Přidej waveform data s normalizací
      waveformData: this.normalizeWaveformData(data.waveformData),
      waveformGenerated: data.waveformGenerated || null,
      waveformSamples: data.waveformSamples || null,
      // Parsované informace
      parsed: {
        ...parsed,
        isHudba: isHudba,
        isSlova: isSlova,
        isAlbum: folder === 'hudba' && fileName.split('/').length > 2,
        albumName: folder === 'hudba' && fileName.split('/').length > 2 ? fileName.split('/')[1] : null,
        trackName: parsed?.trackName || parsed?.name || fileNameOnly.replace(/\.mp3$/i, ''),
      },
      // Top level vlastnosti
      isHudba: isHudba,
      isSlova: isSlova,
      isAlbum: folder === 'hudba' && fileName.split('/').length > 2,
      albumName: folder === 'hudba' && fileName.split('/').length > 2 ? fileName.split('/')[1] : null,
      trackName: parsed?.trackName || parsed?.name || fileNameOnly.replace(/\.mp3$/i, ''),
    };

    return normalized;
  }

  async initialize(forceReload = false) {
    console.log('🎯 [CRITICAL DEBUG] fastMetadataService.initialize() CALLED', {
      forceReload,
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      metadataSize: this.metadata.size,
      timestamp: new Date().toISOString()
    });

    // PRODUCTION DEBUG: Vždy loguj inicializaci
    console.log('🚀 [PRODUCTION] FastMetadataService initialization starting...');

    // Guard proti vícenásobné inicializaci
    if (this.isInitialized && !forceReload) {
      console.log('✅ [DEBUG] Already initialized, skipping');
      console.log('✅ [PRODUCTION] FastMetadataService already initialized with', this.metadata.size, 'files');
      return;
    }

    // Pokud už inicializace probíhá, počkej na ni
    if (this.isLoading) {
      console.log('⏳ [DEBUG] FastMetadataService already initializing, waiting...');
      // Počkej až do 5 sekund na dokončení inicializace
      let waitCount = 0;
      while (this.isLoading && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      if (this.isInitialized) {
        console.log('✅ [DEBUG] FastMetadataService initialization completed after wait');
        return;
      }
    }

    log.info('Initializing FastMetadataService...');
    console.log('🔄 [DEBUG] FastMetadataService.initialize() starting actual initialization');

    if (forceReload) {
      log.info('Force reloading metadata from Firebase...');
      this.metadata.clear();
      this.isInitialized = false;
      localStorage.removeItem(this.cacheKey);
    }

    this.isLoading = true;

    // Realtime Database logic removed - moved to FastMetadataService internal storage scanner
    console.log('🔄 FastMetadataService: Loading from cache or storage...');


    // Pokud Realtime Database neobsahuje data, zkus cache (pokud není forceReload)
    if (!forceReload && this.loadFromCache()) {
      const cachedCount = this.metadata.size;
      this.isLoading = false;
      this.isInitialized = true; // Nastav flag, že je inicializovaný
      log.success(`✅ Metadata loaded from cache (${cachedCount} records)`);
      console.log(`✅ FastMetadataService loaded from cache: ${cachedCount} records`);


      // Cache search is enough if RTDB is gone
      return;
    }

    // Fallback na Firebase Storage
    try {
      console.log('🔄 [DEBUG] About to call getAllMetadata() from initialize...');
      console.log('🔄 [PRODUCTION] Loading metadata from Firebase Storage...');
      log.info('🔄 Loading metadata from Firebase Storage...');
      await this.getAllMetadata();
      this.isLoading = false;
      this.isInitialized = true; // Nastav flag, že je inicializovaný
      console.log('✅ [DEBUG] FastMetadataService initialized successfully, metadata size:', this.metadata.size);
      console.log('✅ [PRODUCTION] FastMetadataService initialization completed with', this.metadata.size, 'files');
      log.success('✅ FastMetadataService initialized from Firebase Storage');
    } catch (error) {
      this.isLoading = false;
      console.error('❌❌❌ [CRITICAL ERROR] FastMetadataService initialization FAILED:', error);
      console.error('❌ [PRODUCTION] FastMetadataService FAILED - this is why audio is not working!');
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      log.warn('❌ Failed to initialize metadata service:', error);
      console.error('❌ FastMetadataService initialization failed:', error);
    }
  }

  async refresh() {
    this.metadata.clear();
    localStorage.removeItem(this.cacheKey);
    await this.getAllMetadata();
  }

  /**
   * Načte cover obrázky z Firebase Storage pro alba, která jsou v metadata
   */
  async loadCoverImagesFromStorage() {
    try {
      await ensureFirebase();
      log.info('🖼️ Loading cover images from Firebase Storage...');

      // Najdi všechna alba v metadata (soubory v podsložkách hudba/)
      const albums = new Set();
      Array.from(this.metadata.values()).forEach(meta => {
        if (meta.folder === 'hudba' && meta.subFolder) {
          albums.add(meta.subFolder);
        } else if (meta.folder === 'hudba' && meta.fileName && meta.fileName.split('/').length > 2) {
          const albumName = meta.fileName.split('/')[1];
          albums.add(albumName);
        }
      });

      log.debug(`📊 Found ${albums.size} albums to load cover images for:`, Array.from(albums));

      // Pro každé album zkus načíst cover obrázek
      for (const albumName of albums) {
        // Zkontroluj, zda už máme cover obrázek pro toto album
        const existingCover = Array.from(this.metadata.values()).find(
          m => m.type === 'image' && m.isCover && m.albumName === albumName
        );

        if (existingCover && existingCover.downloadURL) {
          log.debug(`✅ Cover image already exists for album: ${albumName}`);
          continue;
        }

        // Zkus různé možné cesty k cover obrázku
        const possiblePaths = [
          `hudba/${albumName}/cover.jpg`,
          `hudba/${albumName}/cover.png`,
          `hudba/${albumName}/Cover.jpg`,
          `hudba/${albumName}/Cover.png`,
        ];

        for (const imagePath of possiblePaths) {
          try {
            const imageRef = ref(storage, imagePath);
            const downloadURL = await getDownloadURL(imageRef);

            // Vytvoř metadata pro cover obrázek
            const coverMetadata = {
              fileName: imagePath,
              fileNameOnly: imagePath.split('/').pop(),
              folder: 'hudba',
              subFolder: albumName,
              type: 'image',
              contentType: this.getImageContentType(imagePath.split('/').pop()),
              timeCreated: new Date().toISOString(),
              updated: new Date().toISOString(),
              downloadURL: downloadURL,
              size: null,
              isCover: true,
              albumName: albumName
            };

            // Ulož do metadata
            this.metadata.set(imagePath, coverMetadata);
            log.success(`✅ Cover image loaded for album: ${albumName} from ${imagePath}`);

            // Ulož do cache
            this.saveToCache();
            break; // Našli jsme cover, nemusíme zkoušet další cesty
          } catch (error) {
            // Obrázek na této cestě neexistuje, zkus další
            continue;
          }
        }
      }

      log.success(`✅ Finished loading cover images from Firebase Storage`);
    } catch (error) {
      log.warn('⚠️ Failed to load cover images from Firebase Storage:', error);
    }
  }

  /**
   * Normalizuje waveform data - přebírá logic z původního realtimeMetadataService
   */
  normalizeWaveformData(waveformData) {
    if (!waveformData) {
      return null;
    }

    // Pokud je to pole, vrať jak je
    if (Array.isArray(waveformData)) {
      return waveformData;
    }

    // Pokud je to objekt s numerickými klíči, převeď na pole
    if (typeof waveformData === 'object' && waveformData !== null) {
      const keys = Object.keys(waveformData);
      // Zkontroluj, zda jsou všechny klíče čísla
      const allNumericKeys = keys.every(key => /^\d+$/.test(key));

      if (allNumericKeys) {
        // Seřaď klíče numericky a vrať jako pole
        const sortedKeys = keys.map(k => parseInt(k, 10)).sort((a, b) => a - b);
        return sortedKeys.map(k => waveformData[k.toString()]);
      }
    }

    return waveformData;
  }
}


// Singleton instance
export const fastMetadataService = new FastMetadataService();
export default fastMetadataService;
