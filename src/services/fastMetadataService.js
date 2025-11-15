import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import log from './logger';
import { parseAudioFileName } from '@utils/hudbaParser';
import { realtimeMetadataService } from './realtimeMetadataService';
import { staticMetadataService } from './staticMetadataService';
import errorHandler from '@utils/error-handler';
import { deduplicateRequest } from '@utils/metadataRequestManager';
import { BaseMetadataService } from './metadata/BaseMetadataService.js';

class FastMetadataService extends BaseMetadataService {
  constructor() {
    super({
      localStorageKey: 'fast-metadata-cache-v2',
      cacheExpiry: 7 * 24 * 60 * 60 * 1000 // 7 dní - delší cache pro lepší performance
    });
    this.metadata = this.cache; // Použij cache z base class jako metadata Map
    this.lastUpdate = null;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('fast-metadata-cache');
      }
    } catch (error) {
      log.debug('Legacy cache removal failed (safe to ignore):', error?.message);
    }
  }

  normalizeStoragePath(value = '') {
    if (!value || typeof value !== 'string') {
      return value;
    }
    return value
      .replace(/meditace%2F/gi, 'meditacie%2F')
      .replace(/meditace\//gi, 'meditacie/');
  }

  normalizeMetadataEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      return entry;
    }

    const normalized = { ...entry };

    if (normalized.fileName) {
      normalized.fileName = this.normalizeStoragePath(normalized.fileName);
    }

    if (normalized.fullPath) {
      normalized.fullPath = this.normalizeStoragePath(normalized.fullPath);
    }

    if (normalized.downloadURL) {
      normalized.downloadURL = this.normalizeStoragePath(normalized.downloadURL);
    }

    if (normalized.audioSrc) {
      normalized.audioSrc = this.normalizeStoragePath(normalized.audioSrc);
    }

    return normalized;
  }

  loadFromLocalCache() {
    const result = super.loadFromLocalCache();
    if (result) {
      // Normalizuj načtená data
      const normalizedEntries = Array.from(this.cache.entries()).map(([key, value]) => {
        const normalizedValue = this.normalizeMetadataEntry(value);
        const normalizedKey = this.normalizeStoragePath(key);
        return [normalizedKey || key, normalizedValue];
      });
      this.cache.clear();
      normalizedEntries.forEach(([key, value]) => {
        this.cache.set(key, value);
      });
      this.metadata = this.cache; // Synchronizuj reference

      // Získej timestamp z localStorage
      try {
        const cached = localStorage.getItem(this.localStorageKey);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          this.lastUpdate = new Date(timestamp);
        }
      } catch (error) {
        // Ignore
      }

      log.info(`⚡ Fast load: ${this.cache.size} metadata records from cache`);
    }
    return result;
  }

  saveToLocalCache() {
    try {
      // Normalizuj data před uložením
      const data = Object.fromEntries(
        Array.from(this.cache.entries()).map(([key, value]) => {
          const normalizedKey = this.normalizeStoragePath(key);
          const normalizedValue = this.normalizeMetadataEntry(value);
          return [normalizedKey || key, normalizedValue];
        })
      );
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(cacheData));
      log.info('Metadata saved to cache');
    } catch (error) {
      log.warn('Failed to save to cache:', error);
    }
  }

  clearCache() {
    super.clearCache();
    this.metadata = this.cache; // Synchronizuj reference
    this.lastUpdate = null;
    log.info('Cache cleared - will reload from Firebase');
  }

  isCacheValid() {
    return super.isCacheValid();
  }

  async loadAllMetadata() {
    if (this.isLoading) {
      return this.metadata;
    }

    this.isLoading = true;

    try {
      // Pokud cache obsahuje platná data, použij ji hned (nejrychlejší varianta)
      if (this.loadFromLocalCache()) {
        log.success(`✅ Metadata loaded from cache (${this.metadata.size} records)`);
        return this.metadata;
      }

      log.info('🚀 Loading metadata snapshot from Realtime Database...');

      // Použij deduplication pro getAllMetadata request
      const realtimeMetadata = await deduplicateRequest(
        'all-metadata',
        () => realtimeMetadataService.getAllMetadata(),
        'realtime'
      );

      this.metadata.clear();

      if (realtimeMetadata && Object.keys(realtimeMetadata).length > 0) {
        Object.entries(realtimeMetadata).forEach(([key, value]) => {
          const normalized = this.normalizeRealtimeMetadata(value);
          if (normalized) {
            const metadataKey = normalized.fileName || key;
            this.metadata.set(metadataKey, normalized);
          }
        });
        log.success(`✅ Loaded ${this.metadata.size} files from Realtime Database snapshot`);
      } else {
        log.warn('⚠️ Realtime Database did not return metadata, falling back to static bundle');
        await staticMetadataService.initialize();
        const staticMetadata = staticMetadataService.getAllFromCache();
        Object.entries(staticMetadata || {}).forEach(([key, value]) => {
          if (value) {
            this.metadata.set(this.normalizeStoragePath(key), value);
          }
        });
        log.success(`✅ Loaded ${this.metadata.size} files from static metadata bundle`);
      }

      this.lastUpdate = new Date();
      this.saveToLocalCache();

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
    const dychaniFiles = files.filter(file => file.folder === 'dychani');
    const mp3Files = hudbaFiles.filter(file => file.name.toLowerCase().endsWith('.mp3'));
    const oggFiles = dychaniFiles.filter(file => {
      const fileName = file.name.toLowerCase();
      return fileName.endsWith('.ogg') || fileName.endsWith('.oga') || fileName.endsWith('.mp3');
    });
    const imageFiles = hudbaFiles.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name));

    log.debug(`🎵 Filtered files:`, {
      totalFiles: files.length,
      hudbaFiles: hudbaFiles.length,
      dychaniFiles: dychaniFiles.length,
      mp3Files: mp3Files.length,
      oggFiles: oggFiles.length,
      imageFiles: imageFiles.length
    });

    log.info(`📊 Processing ${mp3Files.length} MP3 files and ${imageFiles.length} images`);
    log.debug(`🎵 MP3 files:`, mp3Files.map(f => ({
      name: f.name,
      folder: f.folder,
      subFolder: f.subFolder
    })));

    // Nejdříve zpracuj cover obrázky pro lepší UX
    log.info(`🖼️ Processing ${imageFiles.length} images first for better UX...`);
    for (const file of imageFiles) {
      try {
        const metadata = await this.createImageMetadata(file);
        this.metadata.set(file.name, metadata);
        log.debug(`✅ Cover image processed: ${file.name}`);
      } catch (error) {
        log.warn(`Failed to process image ${file.name}:`, error);
        errorHandler.handleError(error, {
          type: 'metadata_image_processing_error',
          fileName: file.name,
          folder: file.folder
        });
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
        errorHandler.handleError(error, {
          type: 'metadata_audio_processing_error',
          fileName: file.name,
          folder: file.folder
        });
      }
    }

    // Zpracuj OGG soubory (dychani)
    log.info(`🎵 Processing ${oggFiles.length} OGG files for dychani...`);
    for (const file of oggFiles) {
      try {
        const metadata = await this.createMetadataFromFile(file);
        // Použij metadata.fileName jako klíč (obsahuje celou cestu včetně složky)
        this.metadata.set(metadata.fileName, metadata);
      } catch (error) {
        log.warn(`Failed to process dychani file ${file.name}:`, error);
        errorHandler.handleError(error, {
          type: 'metadata_dychani_processing_error',
          fileName: file.name,
          folder: file.folder
        });
      }
    }

    log.success(`✅ Processed ${this.metadata.size} files`);
  }

  async createMetadataFromFile(file) {
    const fileName = file.name;
    const fileNameOnly = fileName.split('/').pop();

    // Normalizuj název složky (zpětná kompatibilita pro stará data)
    const normalizedFolder = (() => {
      if (file.folder === 'slova' || file.folder === 'meditacie') return 'meditace';
      if (file.folder === 'dychanie') return 'dychani';
      return file.folder;
    })();

    // Parsuj název souboru
    const parsed = parseAudioFileName(fileNameOnly);

    // Vytvoř základní metadata
    const metadata = {
      fileName: normalizedFolder === 'root' ? fileName : `${normalizedFolder}/${fileName}`,
      fileNameOnly,
      folder: normalizedFolder,
      subFolder: file.subFolder || null,
      type: file.subFolder ? 'album_track' : 'audio',
      contentType: 'audio/mpeg',
      timeCreated: new Date().toISOString(),
      updated: new Date().toISOString(),
      // Parsované informace - aktualizuj s informacemi o složce
      parsed: {
        ...parsed,
        isHudba: normalizedFolder === 'hudba',
        isMeditace: normalizedFolder === 'meditace',
        isDychani: normalizedFolder === 'dychani',
        isAlbum: !!file.subFolder,
        albumName: file.subFolder || null,
        trackName: parsed?.trackName || parsed?.name || fileNameOnly.replace(/\.(mp3|ogg|oga)$/i, ''),
      },
      // Urči typ podle struktury složek
      isHudba: normalizedFolder === 'hudba',
      isMeditace: normalizedFolder === 'meditace',
      isDychani: normalizedFolder === 'dychani',
      isAlbum: !!file.subFolder,
      albumName: file.subFolder || null,
      trackName: parsed?.trackName || parsed?.name || fileNameOnly.replace(/\.mp3$/i, ''),
      // Délka se načte z audio elementu
      duration: null, // Bude naplněno později
      durationFormatted: 'N/A'
    };

    // Debug log pro každý soubor
    log.debug(`🎵 Created metadata for ${fileName}:`, {
      originalFileName: fileName,
      constructedFileName: metadata.fileName,
      fileFolder: file.folder,
      fileSubFolder: file.subFolder,
      trackName: metadata.trackName,
      albumName: metadata.albumName,
      isAlbum: metadata.isAlbum,
      isHudba: metadata.isHudba
    });

    // Získej download URL - přidej správný prefix s retry mechanismem
    metadata.downloadURL = await this._getDownloadURLWithRetry(file);

    // Debug log pro download URL
    log.debug(`🔗 Download URL for ${fileName}:`, {
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
          log.debug(`⏱️ Duration loaded for ${fileName}: ${metadata.durationFormatted}`);
        }
      } catch (error) {
        log.warn(`Failed to load duration for ${fileName}:`, error);
      }
    }

    return metadata;
  }

  async _getDownloadURLWithRetry(file, retries = 3) {
    const fileName = file.name;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const fullPath = file.folder === 'root' ? fileName : `${file.folder}/${fileName}`;
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
    const fileName = file.name;
    const fileNameOnly = fileName.split('/').pop();

    const metadata = {
      fileName: file.folder === 'root' ? fileName : `${file.folder}/${fileName}`,
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
    log.debug(`🖼️ Processing image ${fileName}:`, {
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

    log.info(`🎵 Loading durations for ${audioFiles.length} audio files...`);

    // Firebase Storage má CORS problémy s načítáním délky audio souborů
    // Prozatím nastavíme všechny délky na 'N/A' a necháme je načíst při přehrávání
    audioFiles.forEach(metadata => {
      metadata.duration = null;
      metadata.durationFormatted = 'N/A';
      log.debug(`⚠️ Duration set to N/A for ${metadata.fileName} (CORS issue with Firebase Storage)`);
    });

    log.success(`✅ Audio durations set to N/A for ${audioFiles.length} files (CORS issue with Firebase Storage)`);
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

  getAllMetadata() {
    return Object.fromEntries(this.metadata);
  }

  getHudbaMetadata() {
    return Array.from(this.metadata.values()).filter(meta =>
      meta.isHudba && meta.type === 'audio'
    );
  }

  getMeditaceMetadata() {
    return Array.from(this.metadata.values()).filter(meta =>
      meta.isMeditace && meta.type === 'audio'
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
        log.debug(`✅ Cover image mapped: ${meta.albumName} -> ${meta.downloadURL ? 'OK' : 'MISSING URL'}`);
      } else {
        log.debug(`⚠️ Cover image missing albumName or downloadURL:`, {
          fileName: meta.fileName,
          albumName: meta.albumName,
          hasDownloadURL: !!meta.downloadURL
        });
      }
    });

    log.debug(`📊 Cover images map:`, Array.from(covers.keys()));
    return covers;
  }

  /**
   * Normalizuje metadata z Realtime Database do formátu, který očekává filtr
   */
  normalizeRealtimeMetadata(data) {
    if (!data) return null;

    // Získej fileName - může být v různých polích
    const rawFileName = data.fileName || data.fullPath || data.name || '';
    const fileName = this.normalizeStoragePath(rawFileName);

    if (!fileName) {
      return null;
    }

    const fileNameOnly = fileName.split('/').pop();

    // Zkontroluj, zda je to obrázek (cover.jpg, cover.png, atd.)
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileNameOnly);

    // Pokud je to obrázek, zpracuj ho jako cover obrázek
    if (isImage) {
      let folder = data.folder;
      if (!folder) {
        if (fileName.includes('hudba/')) {
          folder = 'hudba';
        } else if (fileName.includes('meditacie/')) {
          folder = 'meditace';
        } else if (fileName.includes('meditace/')) {
          folder = 'meditace'; // legacy
        } else if (fileName.includes('dychani/')) {
          folder = 'dychani';
        } else if (fileName.includes('dychanie/')) {
          folder = 'dychani'; // legacy
        }
      }

      if (folder === 'slova' || folder === 'meditacie') {
        folder = 'meditace';
      } else if (folder === 'dychanie') {
        folder = 'dychani';
      }

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
        fileName,
        fileNameOnly,
        folder: folder,
        subFolder: albumName,
        type: 'image',
        contentType: data.contentType || this.getImageContentType(fileNameOnly),
        timeCreated: data.timeCreated || data.lastUpdated || new Date().toISOString(),
        updated: data.updated || data.lastUpdated || new Date().toISOString(),
        downloadURL: this.normalizeStoragePath(data.downloadURL || data.audioSrc),
        size: data.size || null,
        isCover: isCover,
        albumName: albumName
      };
    }

    // Jinak zpracuj jako audio soubor
    // Urči folder podle fileName nebo pole folder
    let folder = data.folder;
    if (!folder) {
      if (fileName.includes('hudba/')) {
        folder = 'hudba';
      } else if (fileName.includes('meditacie/')) {
        folder = 'meditace';
      } else if (fileName.includes('meditace/')) {
        folder = 'meditace'; // legacy
      } else if (fileName.includes('dychani/')) {
        folder = 'dychani';
      } else if (fileName.includes('dychanie/')) {
        folder = 'dychani'; // legacy
      }
    }

    if (folder === 'slova' || folder === 'meditacie') {
      folder = 'meditace';
    } else if (folder === 'dychanie') {
      folder = 'dychani';
    }

    // Urči type podle struktury
    let type = data.type;
    if (!type) {
      // Pokud je soubor v podsložce, je to album_track
      if (folder === 'hudba' && fileName.split('/').length > 2) {
        type = 'album_track';
      } else if (folder === 'hudba') {
        type = 'audio';
      } else {
        type = 'audio'; // default
      }
    }

    // Urči isHudba podle folder
    const isHudba = folder === 'hudba' || (data.category === 'music' || data.category === 'hudba');
    const isMeditace = folder === 'meditace' || data.category === 'meditace';
    const isDychani = folder === 'dychani' || data.category === 'dychani';

    // Parsuj název souboru pro získání informací o albu
    const parsed = parseAudioFileName(fileNameOnly);

    // Vytvoř normalizovaná metadata
    const normalizedDownloadURL = this.normalizeStoragePath(data.downloadURL || data.audioSrc);

    const normalized = {
      fileName,
      fileNameOnly,
      folder: folder,
      subFolder: folder === 'hudba' && fileName.split('/').length > 2 ? fileName.split('/')[1] : null,
      type: type,
      contentType: data.contentType || 'audio/mpeg',
      timeCreated: data.timeCreated || data.lastUpdated || new Date().toISOString(),
      updated: data.updated || data.lastUpdated || new Date().toISOString(),
      downloadURL: normalizedDownloadURL,
      audioSrc: normalizedDownloadURL,
      duration: data.duration || null,
      durationFormatted: data.durationFormatted || data.durationDetailed || 'N/A',
      size: data.size || null,
      // Parsované informace
      parsed: {
        ...parsed,
        isHudba: isHudba,
        isMeditace: isMeditace,
        isDychani: isDychani,
        // legacy alias
        isSlova: isMeditace,
        isAlbum: folder === 'hudba' && fileName.split('/').length > 2,
        albumName: folder === 'hudba' && fileName.split('/').length > 2 ? fileName.split('/')[1] : null,
        trackName: parsed?.trackName || parsed?.name || fileNameOnly.replace(/\.mp3$/i, ''),
      },
      // Top level vlastnosti
      isHudba: isHudba,
      isMeditace: isMeditace,
      isDychani: isDychani,
      // legacy alias
      isSlova: isMeditace,
      isAlbum: folder === 'hudba' && fileName.split('/').length > 2,
      albumName: folder === 'hudba' && fileName.split('/').length > 2 ? fileName.split('/')[1] : null,
      trackName: parsed?.trackName || parsed?.name || fileNameOnly.replace(/\.mp3$/i, ''),
    };

    return normalized;
  }

  async initialize(forceReload = false) {
    if (this.isInitialized && !forceReload) {
      log.debug('FastMetadataService already initialized');
      return;
    }

    if (this.isLoading) {
      log.debug('FastMetadataService already loading, waiting...');
      // Počkej na dokončení probíhající inicializace
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;
    log.info('Initializing FastMetadataService...');

    try {
      if (forceReload) {
        log.info('Force reloading metadata from Firebase...');
        this.metadata.clear();
        localStorage.removeItem(this.localStorageKey);
      }

      // Nejdříve zkus načíst z Realtime Database (nejrychlejší a nejaktuálnější)
      try {
        log.info('🔄 Trying to load metadata from Realtime Database...');

        // POČKEJ na inicializaci realtimeMetadataService před použitím
        try {
          const initialized = await realtimeMetadataService.waitForInitialization(10000);
          if (!initialized) {
            log.warn('⚠️ RealtimeMetadataService initialization timeout');
          }
        } catch (err) {
          log.debug('RealtimeMetadataService wait error:', err);
        }

        const realtimeMetadata = await realtimeMetadataService.getAllMetadata();

        if (realtimeMetadata && Object.keys(realtimeMetadata).length > 0) {
          log.success(`✅ Loaded ${Object.keys(realtimeMetadata).length} metadata records from Realtime Database`);

          // Převeď na Map a normalizuj data do správného formátu
          this.metadata.clear();
          Object.entries(realtimeMetadata).forEach(([key, value]) => {
            // Normalizuj data z Realtime Database do formátu, který očekává filtr
            const normalized = this.normalizeRealtimeMetadata(value);
            if (normalized) {
              // Použij fileName jako klíč, nebo key pokud fileName není
              const metadataKey = normalized.fileName || key;
              this.metadata.set(metadataKey, normalized);
            }
          });

          // Ulož do cache
          this.saveToLocalCache();
          this.isInitialized = true;
          log.success(`✅ FastMetadataService initialized from Realtime Database (${this.metadata.size} records)`);

          // Načti cover obrázky z Firebase Storage (pokud nejsou v Realtime Database)
          const coverImagesCount = Array.from(this.metadata.values()).filter(m => m.type === 'image' && m.isCover).length;
          if (coverImagesCount === 0) {
            log.info('🖼️ No cover images in Realtime Database, loading from Firebase Storage...');
            await this.loadCoverImagesFromStorage();
          } else {
            log.success(`✅ Found ${coverImagesCount} cover images in Realtime Database`);
          }

          return;
        } else {
          log.warn('⚠️ Realtime Database is empty, trying cache...');
        }
      } catch (error) {
        log.warn('⚠️ Failed to load from Realtime Database, trying cache:', error.message);
      }

      // Pokud Realtime Database neobsahuje data, zkus cache (pokud není forceReload)
      if (!forceReload && this.loadFromLocalCache()) {
        const cachedCount = this.metadata.size;
        log.success(`✅ Metadata loaded from cache (${cachedCount} records)`);
        this.isInitialized = true;

        // Pokud máme méně než 10 souborů v cache, zkus načíst z Realtime Database znovu
        if (cachedCount < 10) {
          log.warn('⚠️ Cache contains very few files, trying Realtime Database again...');
          try {
            // POČKEJ na inicializaci realtimeMetadataService před použitím
            try {
              await realtimeMetadataService.waitForInitialization(10000);
            } catch (err) {
              log.debug('RealtimeMetadataService wait error:', err);
            }

            const realtimeMetadata = await realtimeMetadataService.getAllMetadata();
            if (realtimeMetadata && Object.keys(realtimeMetadata).length > cachedCount) {
              log.success(`✅ Found ${Object.keys(realtimeMetadata).length} records in Realtime Database (more than cache)`);
              this.metadata.clear();
              Object.entries(realtimeMetadata).forEach(([key, value]) => {
                const normalized = this.normalizeRealtimeMetadata(value);
                if (normalized) {
                  const metadataKey = normalized.fileName || key;
                  this.metadata.set(metadataKey, normalized);
                }
              });
              this.saveToLocalCache();
              return;
            }
          } catch (error) {
            log.warn('⚠️ Failed to reload from Realtime Database:', error.message);
          }
        }

        return;
      }

      // Fallback na Firebase Storage, pokud Realtime Database ani cache neobsahují data
      try {
        log.info('🔄 Loading metadata from Firebase Storage...');
        await this.loadAllMetadata();
        this.isInitialized = true;
        log.success('✅ FastMetadataService initialized from Firebase Storage');
      } catch (error) {
        log.warn('❌ Failed to initialize metadata service:', error);
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Počká na dokončení inicializace (pokud probíhá) nebo vrátí okamžitě, pokud je už inicializován
   */
  async waitForInitialization(maxWait = 10000) {
    if (this.isInitialized) {
      return true;
    }

    const startTime = Date.now();
    while (!this.isInitialized && (Date.now() - startTime) < maxWait) {
      if (!this.isLoading) {
        // Pokud není inicializován a není v procesu načítání, zkus inicializovat
        await this.initialize();
        if (this.isInitialized) {
          return true;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.isInitialized;
  }

  async refresh() {
    this.clearCache();
    await this.loadAllMetadata();
  }

  /**
   * Načte cover obrázky z Firebase Storage pro alba, která jsou v metadata
   */
  async loadCoverImagesFromStorage() {
    try {
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
            this.saveToLocalCache();
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
}

// Singleton instance
export const fastMetadataService = new FastMetadataService();
export default fastMetadataService;
