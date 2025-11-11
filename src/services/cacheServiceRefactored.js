

import { AudioCache, MetadataCache, FirebaseCache, ImageCache } from './cache/index.js';
import { staticMetadataService } from './staticMetadataService.js';
import log from './logger.js';
import { parseAudioFileName } from '@utils/hudbaParser';

class CacheServiceRefactored {
  constructor() {
    // Specializované cache instance
    this.audioCache = new AudioCache();
    this.metadataCache = new MetadataCache();
    this.firebaseCache = new FirebaseCache();
    this.imageCache = new ImageCache();

    // Preloading queue management
    this.preloadQueue = new Set();
    this.preloadPromises = new Map();

    // Automatický cleanup každých 5 minut
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Cleanup při ukončení aplikace
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.destroy();
      });
    }
  }

  // ===== AUDIO CACHE DELEGATION =====
  setAudioUrl(fileName, url) {
    this.audioCache.setAudioUrl(fileName, url);
  }

  getAudioUrl(fileName) {
    return this.audioCache.getAudioUrl(fileName);
  }

  setDuration(url, duration) {
    this.audioCache.setDuration(url, duration);
  }

  getDuration(url) {
    return this.audioCache.getDuration(url);
  }

  // ===== METADATA CACHE DELEGATION =====
  setMetadata(key, metadata) {
    this.metadataCache.setMetadata(key, metadata);
  }

  getMetadata(key) {
    return this.metadataCache.getMetadata(key);
  }

  getAllMetadata() {
    return this.metadataCache.getAllMetadata();
  }

  // ===== FIREBASE CACHE DELEGATION =====
  setFirebaseQuery(queryKey, result) {
    this.firebaseCache.setQuery(queryKey, result);
  }

  getFirebaseQuery(queryKey) {
    return this.firebaseCache.getQuery(queryKey);
  }

  // ===== IMAGE CACHE DELEGATION =====
  setImageUrl(fileName, url) {
    this.imageCache.setImageUrl(fileName, url);
  }

  getImageUrl(fileName) {
    return this.imageCache.getImageUrl(fileName);
  }

  // ===== GENERIC CACHE OPERATIONS =====
  has(cacheType, key) {
    switch (cacheType) {
      case 'audio':
        return this.audioCache.has(key);
      case 'metadata':
        return this.metadataCache.has(key);
      case 'firebase':
        return this.firebaseCache.hasQuery(key);
      case 'images':
        return this.imageCache.has(key);
      default:
        return false;
    }
  }

  delete(cacheType, key) {
    switch (cacheType) {
      case 'audio':
        this.audioCache.delete(key);
        break;
      case 'metadata':
        this.metadataCache.delete(key);
        break;
      case 'firebase':
        this.firebaseCache.delete(key);
        break;
      case 'images':
        this.imageCache.delete(key);
        break;
    }
  }

  clear(cacheType = null) {
    if (cacheType) {
      switch (cacheType) {
        case 'audio':
          this.audioCache.clear();
          break;
        case 'metadata':
          this.metadataCache.clear();
          break;
        case 'firebase':
          this.firebaseCache.clear();
          break;
        case 'images':
          this.imageCache.clear();
          break;
      }
    } else {
      // Clear all caches
      this.audioCache.clear();
      this.metadataCache.clear();
      this.firebaseCache.clear();
      this.imageCache.clear();
    }
  }

  // ===== PRELOADING SYSTEM =====
  async preloadAudio(url, fileName) {
    if (this.preloadPromises.has(url)) {
      return this.preloadPromises.get(url);
    }

    const promise = this._preloadAudioInternal(url, fileName);
    this.preloadPromises.set(url, promise);

    // Vyčisti promise po dokončení
    promise.finally(() => {
      this.preloadPromises.delete(url);
    });

    return promise;
  }

  async _preloadAudioInternal(url, fileName) {
    try {
      // Validace parametrů
      if (!fileName) {
        log.warn('PreloadAudio called with undefined fileName, skipping');
        return Promise.resolve();
      }

      if (!url) {
        log.warn(`PreloadAudio called with undefined url for ${fileName}, using metadata-only preload`);
        return this._preloadFirebaseMetadata(null, fileName);
      }

      log.cache(`Preloading audio metadata: ${fileName}`);

      // Zkontroluj, jestli už není v cache
      if (this.audioCache.has(fileName)) {
        log.cache(`Audio already cached: ${fileName}`);
        return Promise.resolve();
      }

      // Pro Firebase Storage soubory použij metadata-only preloading
      if (url.includes('firebasestorage.googleapis.com') || url.includes('firebase')) {
        return this._preloadFirebaseMetadata(url, fileName);
      }

      // Pro ostatní URL použij tradiční Audio preloading
      return this._preloadAudioElement(url, fileName);

    } catch (error) {
      log.error(`Preload failed for ${fileName}:`, error);
      return Promise.resolve();
    }
  }

  async _preloadFirebaseMetadata(url, fileName) {
    try {
      // Načti metadata ze statické služby
      const metadata = staticMetadataService.getMetadata(fileName);

      if (metadata) {
        // Ulož metadata do cache
        this.metadataCache.setMetadata(fileName, metadata);
        log.cache(`Static metadata preloaded: ${fileName}`);
        return metadata;
      } else {
        log.cache(`No static metadata found for: ${fileName}`);
        return null;
      }

    } catch (error) {
      log.error(`Static metadata preload failed for ${fileName}:`, error);
      return null;
    }
  }

  async _preloadAudioElement(url, fileName) {
    // Vytvoř Audio objekt pro preloading
    const audio = new Audio();
    audio.preload = 'metadata';

    const loadPromise = new Promise((resolve, reject) => {
      audio.addEventListener('loadedmetadata', () => {
        log.cache(`Audio metadata preloaded: ${fileName}`);
        resolve(audio);
      });

      audio.addEventListener('error', (e) => {
        log.error(`Failed to preload audio: ${fileName}`, e);
        reject(e);
      });

      // Timeout po 5 sekundách (kratší pro metadata)
      setTimeout(() => {
        reject(new Error('Audio preload timeout'));
      }, 5000);
    });

    audio.src = url;
    return await loadPromise;
  }

  // ===== CRITICAL DATA PRELOADING =====
  async preloadCriticalData() {
    try {
      log.cache('🚀 Preloading metadata from database (non-blocking)...');

      // Inicializuj statickou metadata službu
      await staticMetadataService.initialize();

      // Načti všechna metadata ze statické služby
      const allMetadata = staticMetadataService.getAllFromCache();

      // Rozděl načítání do malých chunků pro non-blocking UI
      const entries = Object.entries(allMetadata);
      const chunkSize = 20; // Načti po 20 položkách

      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize);

        // Ulož chunk do cache
        this.metadataCache.setMetadataBatch(chunk);

        // Yield control back to browser pro plynulé animace
        if (i + chunkSize < entries.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      log.success(`✅ Metadata loaded: ${Object.keys(allMetadata).length} entries cached from static JSON`);
      log.info(`ℹ️ Note: New files not in static JSON will be loaded from Firebase when needed`);

      // Preload hudba data do cache
      log.cache('🎵 Starting hudba data preloading...');
      await this.preloadHudbaData();
      log.success('🎵 Hudba data preloading completed');

    } catch (err) {
      log.error('Critical data preloading failed:', err);
    }
  }

  async preloadHudbaData() {
    try {
      log.firebase('🎵 Preloading hudba data from Firebase Storage...');

      // Import Firebase Storage dynamicky
      const { ref, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('./firebase.js');

      // Místo root složky, načti přímo meditace/ a hudba/ složky
      log.firebase('📂 Listing Firebase Storage folders...');

      // ZAKÁZÁNO - způsobuje 403 Forbidden chybu
      // const meditaceRef = ref(storage, 'meditace');
      // const meditaceResult = await listAll(meditaceRef);
      // const hudbaRef = ref(storage, 'hudba');
      // const hudbaResult = await listAll(hudbaRef);

      // ZAKÁZÁNO - způsobuje 403 Forbidden chybu při přístupu k root složce
      // Místo toho se data načítají z Realtime Database
      const allFiles = [];
      log.warn('⚠️ Firebase Storage root access disabled to prevent 403 errors');

      // Filtruj MP3 soubory podle složky
      const hudbaFiles = allFiles
        .filter(item => {
          const name = item.name.toLowerCase();
          const isMp3 = name.endsWith('.mp3');
          const isHudba = item.folder === 'hudba';
          return isMp3 && isHudba; // Načti pouze MP3 soubory ze složky hudba/
        })
        .map(item => item.name);

      const meditaceFiles = allFiles
        .filter(item => {
          const name = item.name.toLowerCase();
          const isMp3 = name.endsWith('.mp3');
          const folder = (item.folder || '').toLowerCase();
          const isMeditace =
            folder === 'meditace' ||
            folder === 'meditace/cz' ||
            folder === 'meditace/sk' ||
            folder === 'meditace/en' ||
            folder === 'meditacie' ||
            folder === 'meditacie/cz' ||
            folder === 'meditacie/sk' ||
            folder === 'meditacie/en';
          return isMp3 && isMeditace; // Načti MP3 soubory z meditace/ a jazykových podsložek (legacy included)
        })
        .map(item => item.name);

      log.info('🎵 Hudba files:', hudbaFiles);
      log.info('🧘 Meditace files:', meditaceFiles);

      // Načti skutečné Firebase URL pro hudbu
      const hudbaData = {
        audioFiles: [],
        coverImages: {},
        lastUpdated: new Date().toISOString()
      };

      // Načti skutečné URL pro každý hudební soubor
      for (const fileName of hudbaFiles) {
        try {
          const fileRef = ref(storage, fileName);
          const downloadURL = await getDownloadURL(fileRef);

          // Extrahuj pouze název souboru z cesty
          const fileNameOnly = fileName.split('/').pop();

          // Urči typ podle složky
          const fileType = fileName.startsWith('hudba/') ? 'hudba' : 'meditace';

          // Vytvoř základní parsed objekt pro jednoduché soubory
          const parsed = {
            originalFileName: fileNameOnly,
            name: fileNameOnly.replace(/\.mp3$/i, ''),
            type: 'simple',
            isHudba: fileType === 'hudba',
            isAlbum: false,
            trackName: fileNameOnly.replace(/\.mp3$/i, ''),
            albumName: fileNameOnly.replace(/\.mp3$/i, ''),
            folder: 'hudba'
          };

          hudbaData.audioFiles.push({
            fileName,
            audioSrc: downloadURL,
            trackName: fileName.replace('.mp3', ''),
            duration: 'N/A',
            type: fileType,
            isAvailable: true,
            parsed: parsed, // Přidej parsed data
            folder: 'hudba' // Přidej informaci o složce
          });
        } catch (err) {
          log.error(`Failed to get URL for ${fileName}:`, err);
        }
      }

      // Načti skutečné URL pro meditace soubory
      for (const fileName of meditaceFiles) {
        try {
          const fileRef = ref(storage, fileName);
          const downloadURL = await getDownloadURL(fileRef);

          // Extrahuj pouze název souboru z cesty
          const fileNameOnly = fileName.split('/').pop();

          // Parsuj název souboru pro meditace soubory
          let parsed = parseAudioFileName(fileNameOnly);

          // Pokud se nepodařilo parsovat, vytvoř základní objekt
          if (!parsed) {
            const basicParsed = {
              originalFileName: fileNameOnly,
              name: fileNameOnly.replace(/\.mp3$/i, ''),
              type: 'simple',
              isHudba: false,
              isAlbum: false,
              trackName: fileNameOnly.replace(/\.mp3$/i, ''),
              albumName: fileNameOnly.replace(/\.mp3$/i, ''),
              folder: 'meditace'
            };
            parsed = basicParsed;
          } else {
            // Aktualizuj parsed data pro meditace soubory
            parsed.isHudba = false;
            parsed.isAlbum = false;
            parsed.folder = 'meditace';
            parsed.isMeditace = true;
            parsed.isSlova = true; // legacy alias
          }

          hudbaData.audioFiles.push({
            fileName,
            audioSrc: downloadURL,
            trackName: fileName.replace('.mp3', ''),
            duration: 'N/A',
            type: 'meditace',
            isAvailable: true,
            parsed: parsed, // Přidej parsed data
            folder: 'meditace' // Přidej informaci o složce
          });
        } catch (err) {
          log.error(`Failed to get URL for ${fileName}:`, err);
        }
      }

      // Načti obrázky alb (cover.jpg z hudba/ složky)
      log.info('🖼️ Loading album cover images...');
      for (const item of allFiles) {
        const name = item.name.toLowerCase();
        const isCover = name.endsWith('cover.jpg');
        const isHudbaFolder = item.folder === 'hudba';

        if (isCover && isHudbaFolder) {
          try {
            const fileRef = ref(storage, item.name);
            const downloadURL = await getDownloadURL(fileRef);

            // Extrahuj název alba ze složky (např. "ambient-journey/cover.jpg" -> "ambient-journey")
            const albumName = item.name.split('/')[0];
            hudbaData.coverImages[albumName] = downloadURL;
            log.info(`🖼️ Album cover loaded: ${albumName}`);
          } catch (err) {
            log.error(`Failed to get cover image for ${item.name}:`, err);
          }
        }
      }

      // Ulož do cache
      this.firebaseCache.setQuery('hudba_scanner_all_files', hudbaData);

      log.success(`✅ Hudba data preloaded: ${hudbaData.audioFiles.length} files cached with real URLs`);
      log.success(`🖼️ Cover images loaded: ${Object.keys(hudbaData.coverImages).length} images`);

    } catch (err) {
      log.error('Hudba data preloading failed:', err);
    }
  }

  // ===== UTILITY METHODS =====
  cleanup() {
    this.audioCache.cleanupExpired();
    this.metadataCache.cleanupExpired();
    this.firebaseCache.cleanupExpired();
    this.imageCache.cleanupExpired();
  }

  optimizeCache() {
    this.cleanup();
    // Optimalizace se nyní provádí automaticky v jednotlivých cache třídách
    log.cache('Cache optimized');
  }

  getStats() {
    return {
      audio: this.audioCache.getStats(),
      metadata: this.metadataCache.getStats(),
      firebase: this.firebaseCache.getStats(),
      images: this.imageCache.getStats(),
      preload: {
        queue: this.preloadQueue.size,
        active: this.preloadPromises.size
      }
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
const cacheServiceRefactored = new CacheServiceRefactored();

export default cacheServiceRefactored;
