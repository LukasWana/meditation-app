

import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import log from './logger';
import { parseAudioFileName } from '@utils/hudbaParser';

class FastMetadataService {
  constructor() {
    this.metadata = new Map();
    this.isLoading = false;
    this.lastUpdate = null;
    this.cacheKey = 'fast-metadata-cache';
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 dní - delší cache pro lepší performance
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

  async loadAllMetadata() {
    if (this.isLoading) {
      return this.metadata;
    }

    // Nejdříve zkus načíst z cache
    if (this.loadFromCache()) {
      this.isLoading = false;
      return this.metadata;
    }

    this.isLoading = true;

    try {
      log.info('🚀 Loading metadata from Firebase Storage structure...');

      // Načti pouze hudba složku
      const hudbaRef = ref(storage, 'hudba');
      log.debug(`🔍 Loading from Firebase Storage path: hudba`);
      const result = await listAll(hudbaRef);
      log.debug(`📊 Firebase Storage result:`, {
        itemsCount: result.items.length,
        prefixesCount: result.prefixes.length,
        items: result.items.map(i => i.name),
        prefixes: result.prefixes.map(p => p.name)
      });

      const allFiles = [];

      // Přidej soubory z hudba složky
      result.items.forEach(item => {
        const fileData = {
          ...item,
          name: item.name, // Nejdříve bez prefixu
          folder: 'hudba'
        };
        log.debug(`📄 Adding root hudba file:`, fileData);
        allFiles.push(fileData);
      });

      // Prohledej podsložky hudba složky
      log.debug(`🔍 Found hudba subfolders:`, result.prefixes.map(p => p.name));
      for (const folderRef of result.prefixes) {
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
              subFolder: folderRef.name
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
                  subFolder: subFolderRef.name
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

    // Zpracuj soubory a vytvoř metadata
    await this.processFiles(allFiles);

    // Načti délky audio souborů
    await this.loadAudioDurations();

      this.lastUpdate = new Date();
      this.saveToCache();

      log.success(`✅ Fast metadata loading completed: ${this.metadata.size} files processed`);

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

    // Filtruj pouze soubory z hudba složky
    const hudbaFiles = files.filter(file => file.folder === 'hudba');
    const mp3Files = hudbaFiles.filter(file => file.name.toLowerCase().endsWith('.mp3'));
    const imageFiles = hudbaFiles.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name));

    log.debug(`🎵 Filtered to hudba files only:`, {
      totalFiles: files.length,
      hudbaFiles: hudbaFiles.length,
      mp3Files: mp3Files.length,
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
      }
    }

    // Pak zpracuj MP3 soubory
    log.info(`🎵 Processing ${mp3Files.length} MP3 files...`);
    for (const file of mp3Files) {
      try {
        const metadata = await this.createMetadataFromFile(file);
        this.metadata.set(file.name, metadata);
      } catch (error) {
        log.warn(`Failed to process file ${file.name}:`, error);
      }
    }
  }

  async createMetadataFromFile(file) {
    const fileName = file.name;
    const fileNameOnly = fileName.split('/').pop();

    // Parsuj název souboru
    const parsed = parseAudioFileName(fileNameOnly);

      // Vytvoř základní metadata
      const metadata = {
        fileName: file.folder === 'root' ? fileName : `${file.folder}/${fileName}`,
        fileNameOnly: fileNameOnly,
        folder: file.folder,
        subFolder: file.subFolder || null,
        type: file.subFolder ? 'album_track' : 'audio',
        contentType: 'audio/mpeg',
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
        // Parsované informace - aktualizuj s informacemi o složce
        parsed: {
          ...parsed,
          isHudba: file.folder === 'hudba',
          isSlova: file.folder === 'slova',
          isAlbum: file.subFolder ? true : false,
          albumName: file.subFolder || null,
          trackName: parsed?.trackName || parsed?.name || fileNameOnly.replace(/\.mp3$/i, ''),
        },
        // Urči typ podle struktury složek
        isHudba: file.folder === 'hudba',
        isSlova: file.folder === 'slova',
        isAlbum: file.subFolder ? true : false,
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

  getSlovaMetadata() {
    return Array.from(this.metadata.values()).filter(meta =>
      meta.isSlova && meta.type === 'audio'
    );
  }

  getCoverImages() {
    const covers = new Map();
    Array.from(this.metadata.values())
      .filter(meta => meta.type === 'image' && meta.isCover)
      .forEach(meta => {
        if (meta.albumName) {
          covers.set(meta.albumName, meta.downloadURL);
        }
      });
    return covers;
  }

  async initialize(forceReload = false) {
    log.info('Initializing FastMetadataService...');

    // Nejdříve zkus načíst z cache (pokud není forceReload)
    if (!forceReload && this.loadFromCache()) {
      log.success('Metadata loaded from cache');
      return;
    }

    if (forceReload) {
      log.info('Force reloading metadata from Firebase...');
    }

    // Pokud není v cache, načti z Firebase
    try {
      await this.loadAllMetadata();
    } catch (error) {
      log.warn('Failed to initialize metadata service:', error);
    }
  }

  async refresh() {
    this.metadata.clear();
    localStorage.removeItem(this.cacheKey);
    await this.loadAllMetadata();
  }
}

// Singleton instance
export const fastMetadataService = new FastMetadataService();
export default fastMetadataService;
