

import { AudioCache, MetadataCache, FirebaseCache, ImageCache } from './cache/index.js';
import { fastMetadataService } from './fastMetadataService.js';
import log from './logger.js';
import { parseAudioFileName } from '@utils/hudbaParser';
import { onVisibilityChange, isPageHidden } from './visibilityManager.js';
import { storage } from '@config/secure-firebase';
import { ref as fbRef, getDownloadURL as fbGetDownloadURL } from 'firebase/storage';

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

    this._isVisible = !isPageHidden();
    this._scheduleCleanup();

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.destroy();
      });
    }
    // Použití centrálního visibilityManager (deduplikace listenerů)
    this._unsubscribeVisibility = onVisibilityChange((hidden) => {
      this._isVisible = !hidden;
      this._scheduleCleanup();
    });
  }

  _scheduleCleanup() {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    if (typeof window === 'undefined') return;

    const delay = this._isVisible ? (5 * 60 * 1000) : (15 * 60 * 1000);

    if (typeof requestIdleCallback !== 'undefined') {
      this.cleanupTimeout = setTimeout(() => {
        requestIdleCallback(() => this.cleanup(), { timeout: 5000 });
        this._scheduleCleanup();
      }, delay);
    } else {
      this.cleanupTimeout = setTimeout(() => {
        this.cleanup();
        this._scheduleCleanup();
      }, delay + 2000);
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

  async preloadImage(url, cacheKey = null) {
    if (!url) return Promise.resolve(null);

    const promiseKey = `image:${url}`;
    if (this.preloadPromises.has(promiseKey)) {
      return this.preloadPromises.get(promiseKey);
    }

    const promise = this._preloadImageInternal(url, cacheKey);
    this.preloadPromises.set(promiseKey, promise);

    promise.finally(() => {
      this.preloadPromises.delete(promiseKey);
    });

    return promise;
  }

  async _preloadImageInternal(url, cacheKey = null) {
    try {
      // 1) Ulož URL do in-memory image cache (kvůli rychlému přístupu v aplikaci)
      if (cacheKey) {
        this.imageCache.setImageUrl(cacheKey, url);
      }

      // 2) Ulož do Cache Storage (kvůli tomu, aby další zobrazení už nečekalo na síť)
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open('meditation-image-cache-v1');
        const cached = await cache.match(url);
        if (!cached) {
          let response = null;
          try {
            // Preferuj CORS (lepší kompatibilita a budoucí čitelnost response), fallback na no-cors (opaque).
            response = await fetch(url, {
              method: 'GET',
              mode: 'cors',
              credentials: 'omit',
              cache: 'force-cache'
            });
          } catch (_corsErr) {
            response = await fetch(url, {
              method: 'GET',
              mode: 'no-cors',
              credentials: 'omit'
            });
          }

          // response.ok je false pro opaque, proto povol i opaque
          if (response && (response.ok || response.type === 'opaque')) {
            await cache.put(url, response.clone());
          }
        }
      }

      // 3) Před-dekoduj do memory cache pro okamžité vykreslení (když je to možné)
      await new Promise((resolve) => {
        const img = new Image();
        const done = () => resolve(null);
        img.onload = done;
        img.onerror = done;
        img.src = url;

        // decode() je nejlepší varianta, ale není všude
        if (typeof img.decode === 'function') {
          img.decode().then(done).catch(done);
        }
      });

      return url;
    } catch (error) {
      log.warn('Image preload failed:', { url, error: error?.message || error });
      return null;
    }
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
        return this._preloadFastMetadata(null, fileName);
      }

      log.cache(`Preloading audio metadata: ${fileName}`);

      // Zkontroluj, jestli už není v cache
      if (this.audioCache.has(fileName)) {
        log.cache(`Audio already cached: ${fileName}`);
        return Promise.resolve();
      }

      // Pro Firebase Storage soubory použij metadata-only preloading
      if (url.includes('firebasestorage.googleapis.com') || url.includes('firebase')) {
        return this._preloadFastMetadata(url, fileName);
      }

      // Pro ostatní URL použij tradiční Audio preloading
      return this._preloadAudioElement(url, fileName);

    } catch (error) {
      log.error(`Preload failed for ${fileName}:`, error);
      return Promise.resolve();
    }
  }

  async _preloadFastMetadata(url, fileName) {
    try {
      // Načti metadata z FastMetadataService
      const metadata = fastMetadataService.getMetadata(fileName);

      if (metadata) {
        // Ulož metadata do cache
        this.metadataCache.setMetadata(fileName, metadata);
        log.cache(`Fast metadata preloaded: ${fileName}`);
        return metadata;
      } else {
        log.cache(`No metadata found with FastMetadataService for: ${fileName}`);
        return null;
      }

    } catch (error) {
      log.error(`Metadata preload failed for ${fileName} via FastMetadataService:`, error);
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

      // Inicializuj fast metadata službu (vyřeší si cache i fallbacky)
      await fastMetadataService.initialize();

      // Načti všechna metadata z FastMetadataService
      const allMetadata = fastMetadataService.cache;

      // Rozděl načítání do malých chunků pro non-blocking UI
      const entries = Array.from(allMetadata.entries());
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

      log.success(`✅ Metadata loaded: ${allMetadata.size} entries cached via FastMetadataService`);

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
      // (nyní statický import nahoře — storage + ref/getDownloadURL)

      // Místo root složky, načti přímo meditacie/ a hudba/ složky
      log.firebase('📂 Listing Firebase Storage folders...');

      // ZAKÁZÁNO - způsobuje 403 Forbidden chybu
      // const meditacieRef = ref(storage, 'meditacie');
      // const meditacieResult = await listAll(meditacieRef);
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

      const meditacieFiles = allFiles
        .filter(item => {
          const name = item.name.toLowerCase();
          const isMp3 = name.endsWith('.mp3');
          const isMeditacie = item.folder === 'meditacie' ||
            item.folder === 'meditacie/CZ' ||
            item.folder === 'meditacie/SK' ||
            item.folder === 'meditacie/EN';
          return isMp3 && isMeditacie; // Načti MP3 soubory ze meditacie/ a jazykových podsložek
        })
        .map(item => item.name);

      log.info('🎵 Hudba files:', hudbaFiles);
      log.info('🎤 Meditacie files:', meditacieFiles);

      // Načti skutečné Firebase URL pro hudbu
      const hudbaData = {
        audioFiles: [],
        coverImages: {},
        lastUpdated: new Date().toISOString()
      };

      // Načti skutečné URL pro každý hudební soubor
      for (const fileName of hudbaFiles) {
        try {
          const fileRef = fbRef(storage, fileName);
          const downloadURL = await fbGetDownloadURL(fileRef);

          // Extrahuj pouze název souboru z cesty
          const fileNameOnly = fileName.split('/').pop();

          // Urči typ podle složky
          const fileType = fileName.startsWith('hudba/') ? 'hudba' : 'meditacie';

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

      // Načti skutečné URL pro meditacie soubory
      for (const fileName of meditacieFiles) {
        try {
          const fileRef = fbRef(storage, fileName);
          const downloadURL = await fbGetDownloadURL(fileRef);

          // Extrahuj pouze název souboru z cesty
          const fileNameOnly = fileName.split('/').pop();

          // Parsuj název souboru pro meditacie soubory
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
              folder: 'meditacie'
            };
            parsed = basicParsed;
          } else {
            // Aktualizuj parsed data pro meditacie soubory
            parsed.isHudba = false;
            parsed.isAlbum = false;
            parsed.folder = 'meditacie';
          }

          hudbaData.audioFiles.push({
            fileName,
            audioSrc: downloadURL,
            trackName: fileName.replace('.mp3', ''),
            duration: 'N/A',
            type: 'meditacie',
            isAvailable: true,
            parsed: parsed, // Přidej parsed data
            folder: 'meditacie' // Přidej informaci o složce
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
            const fileRef = fbRef(storage, item.name);
            const downloadURL = await fbGetDownloadURL(fileRef);

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
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
    if (this._unsubscribeVisibility) {
      this._unsubscribeVisibility();
      this._unsubscribeVisibility = null;
    }
    this.clear();
  }
}

// Singleton instance
const cacheServiceRefactored = new CacheServiceRefactored();

export default cacheServiceRefactored;
