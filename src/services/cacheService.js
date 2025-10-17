/**
 * Univerzální cache service pro optimalizaci výkonu aplikace
 * Podporuje cache pro audio, obrázky, metadata a Firebase dotazy
 */

import { staticMetadataService } from './staticMetadataService';

class CacheService {
  constructor() {
    this.caches = {
      audio: new Map(),           // Audio URL cache
      images: new Map(),          // Image URL cache
      metadata: new Map(),        // Audio metadata cache
      firebase: new Map(),        // Firebase query results cache
      durations: new Map()        // Audio durations cache
    };

    this.preloadQueue = new Set(); // Queue pro preloading
    this.preloadPromises = new Map(); // Promise cache pro preloading

    // Cache limits
    this.limits = {
      audio: 50,      // Max 50 audio URLs
      images: 100,    // Max 100 images
      metadata: 200,  // Max 200 metadata entries
      firebase: 50    // Max 50 Firebase queries
    };

    // Cache TTL (Time To Live)
    this.ttl = {
      audio: 24 * 60 * 60 * 1000,    // 24 hodin
      images: 7 * 24 * 60 * 60 * 1000, // 7 dní
      metadata: 60 * 60 * 1000,       // 1 hodina
      firebase: 30 * 60 * 1000        // 30 minut
    };
  }

  /**
   * Generický setter pro cache
   */
  set(cacheType, key, value, customTTL = null) {
    if (!this.caches[cacheType]) {
      console.warn(`Unknown cache type: ${cacheType}`);
      return;
    }

    const cache = this.caches[cacheType];
    const limit = this.limits[cacheType];

    // Pokud je cache plná, odstraň nejstarší položky
    if (cache.size >= limit) {
      const entries = Array.from(cache.entries());
      const toRemove = entries.slice(0, Math.floor(limit * 0.2)); // Odstraň 20%
      toRemove.forEach(([k]) => cache.delete(k));
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl: customTTL || this.ttl[cacheType]
    };

    cache.set(key, entry);
  }

  /**
   * Generický getter pro cache
   */
  get(cacheType, key) {
    if (!this.caches[cacheType]) {
      return null;
    }

    const cache = this.caches[cacheType];
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    // Kontrola TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Kontrola existence v cache
   */
  has(cacheType, key) {
    return this.get(cacheType, key) !== null;
  }

  /**
   * Vymazání konkrétní položky z cache
   */
  delete(cacheType, key) {
    if (this.caches[cacheType]) {
      this.caches[cacheType].delete(key);
    }
  }

  /**
   * Vymazání celé cache
   */
  clear(cacheType = null) {
    if (cacheType) {
      if (this.caches[cacheType]) {
        this.caches[cacheType].clear();
      }
    } else {
      Object.values(this.caches).forEach(cache => cache.clear());
    }
  }

  /**
   * Cache pro audio URL
   */
  setAudioUrl(fileName, url) {
    this.set('audio', fileName, url);
  }

  getAudioUrl(fileName) {
    return this.get('audio', fileName);
  }

  /**
   * Cache pro image URL
   */
  setImageUrl(fileName, url) {
    this.set('images', fileName, url);
  }

  getImageUrl(fileName) {
    return this.get('images', fileName);
  }

  /**
   * Cache pro metadata
   */
  setMetadata(key, metadata) {
    this.set('metadata', key, metadata);
  }

  getMetadata(key) {
    return this.get('metadata', key);
  }

  /**
   * Cache pro Firebase dotazy
   */
  setFirebaseQuery(queryKey, result) {
    this.set('firebase', queryKey, result);
  }

  getFirebaseQuery(queryKey) {
    return this.get('firebase', queryKey);
  }

  /**
   * Cache pro audio durations
   */
  setDuration(url, duration) {
    this.set('durations', url, duration);
  }

  getDuration(url) {
    return this.get('durations', url);
  }

  /**
   * Preloading systém - optimalizovaný pro metadata-only
   */
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
      console.log(`Preloading audio metadata: ${fileName}`);

      // Zkontroluj, jestli už není v cache
      if (this.has('audio', fileName)) {
        console.log(`Audio already cached: ${fileName}`);
        return Promise.resolve();
      }

      // Pro Firebase Storage soubory použij metadata-only preloading
      if (url.includes('firebasestorage.googleapis.com') || url.includes('firebase')) {
        return this._preloadFirebaseMetadata(url, fileName);
      }

      // Pro ostatní URL použij tradiční Audio preloading
      return this._preloadAudioElement(url, fileName);

    } catch (error) {
      console.warn(`Preload failed for ${fileName}:`, error);
      // Nevrhni chybu, jen ji zaloguj
      return Promise.resolve();
    }
  }

  /**
   * Preloading metadat ze statického JSON souboru (rychlé a spolehlivé)
   */
  async _preloadFirebaseMetadata(url, fileName) {
    try {
      // Načti metadata ze statické služby
      const metadata = staticMetadataService.getMetadata(fileName);

      if (metadata) {
        // Ulož metadata do cache
        this.setMetadata(fileName, metadata);
        console.log(`Static metadata preloaded: ${fileName}`);
        return metadata;
      } else {
        console.log(`No static metadata found for: ${fileName}`);
        return null;
      }

    } catch (error) {
      console.warn(`Static metadata preload failed for ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Tradiční Audio element preloading pro non-Firebase URL
   */
  async _preloadAudioElement(url, fileName) {
      // Vytvoř Audio objekt pro preloading
      const audio = new Audio();
      audio.preload = 'metadata';

      const loadPromise = new Promise((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => {
        console.log(`Audio metadata preloaded: ${fileName}`);
          resolve(audio);
        });

        audio.addEventListener('error', (e) => {
          console.warn(`Failed to preload audio: ${fileName}`, e);
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

  /**
   * Odhad délky audio souboru na základě velikosti
   */
  _estimateDurationFromSize(sizeInBytes, contentType) {
    if (!sizeInBytes || !contentType) return null;

    const bitrates = {
      'audio/mpeg': 128000, // 128 kbps pro MP3
      'audio/mp3': 128000,
      'audio/wav': 1411000, // 1411 kbps pro WAV
      'audio/ogg': 128000,  // 128 kbps pro OGG
      'audio/m4a': 128000   // 128 kbps pro M4A
    };

    const bitrate = bitrates[contentType] || 128000; // Default 128 kbps
    const durationInSeconds = (sizeInBytes * 8) / bitrate;

    return Math.round(durationInSeconds);
  }

  async preloadImage(url, fileName) {
    try {
      console.log(`Preloading image: ${fileName}`);

      const img = new Image();
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => {
          console.log(`Image preloaded: ${fileName}`);
          resolve(img);
        };

        img.onerror = (e) => {
          console.warn(`Failed to preload image: ${fileName}`, e);
          reject(e);
        };

        // Timeout po 5 sekundách
        setTimeout(() => {
          reject(new Error('Image preload timeout'));
        }, 5000);
      });

      img.src = url;

      return await loadPromise;
    } catch (error) {
      console.warn(`Preload failed for ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Batch preloading pro více souborů
   */
  async preloadBatch(items, type = 'audio') {
    if (!items || items.length === 0) return;

    const preloadPromises = items.map(item => {
      if (!item || !item.url) return Promise.resolve();

      if (type === 'audio') {
        return this.preloadAudio(item.url, item.fileName).catch(err => {
          console.warn(`Batch preload failed for ${item.fileName}:`, err);
          return Promise.resolve(); // Pokračuj i při chybě
        });
      } else if (type === 'image') {
        return this.preloadImage(item.url, item.fileName).catch(err => {
          console.warn(`Batch preload failed for ${item.fileName}:`, err);
          return Promise.resolve(); // Pokračuj i při chybě
        });
      }
      return Promise.resolve();
    });

    try {
      const results = await Promise.allSettled(preloadPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      console.log(`Batch preload completed: ${successful}/${items.length} ${type} files`);
    } catch (error) {
      console.warn(`Batch preload failed:`, error);
    }
  }

  /**
   * Inteligentní preloading na základě uživatelského chování
   */
  async smartPreload(currentItem, allItems) {
    if (!currentItem || !allItems) return;

    // Najdi index aktuální položky
    const currentIndex = allItems.findIndex(item =>
      item.fileName === currentItem.fileName ||
      item.downloadURL === currentItem.downloadURL
    );

    if (currentIndex === -1) return;

    // Preload následující 3 položky - pouze metadata
    const nextItems = allItems.slice(currentIndex + 1, currentIndex + 4)
      .filter(item => item.downloadURL && !this.has('metadata', item.fileName));

    if (nextItems.length > 0) {
      console.log(`Smart preloading metadata for ${nextItems.length} next items`);
      await this.preloadMetadataBatch(nextItems.map(item => ({
        url: item.downloadURL,
        fileName: item.fileName
      })));
    }
  }

  /**
   * Batch preloading pouze metadat
   */
  async preloadMetadataBatch(items) {
    if (!items || items.length === 0) return;

    const preloadPromises = items.map(async (item) => {
      if (!item || !item.fileName) return Promise.resolve();

      try {
        const result = await this._preloadFirebaseMetadata(item.url, item.fileName);
        return result !== null; // Vrať true pokud bylo preloading úspěšné
      } catch (err) {
        // Ignoruj 404 chyby - soubory prostě neexistují
        if (err.code === 'storage/object-not-found' || err.message.includes('404')) {
          console.log(`File not found during batch preload: ${item.fileName}`);
          return false;
        }
        console.warn(`Metadata batch preload failed for ${item.fileName}:`, err);
        return false;
      }
    });

    try {
      const results = await Promise.allSettled(preloadPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      const notFound = results.filter(r => r.status === 'fulfilled' && r.value === false).length;
      console.log(`Metadata batch preload completed: ${successful} successful, ${notFound} not found, ${items.length} total`);
    } catch (error) {
      console.warn(`Metadata batch preload failed:`, error);
    }
  }

  /**
   * Rychlé preloading metadat pro inicializaci
   */
  async fastPreloadMetadata(items, maxItems = 5) {
    if (!items || items.length === 0) return;

    const itemsToPreload = items.slice(0, maxItems)
      .filter(item => item.fileName && !this.has('metadata', item.fileName));

    if (itemsToPreload.length === 0) return;

    console.log(`Fast preloading metadata for ${itemsToPreload.length} items`);

    // Načti metadata postupně s malým delay
    for (let i = 0; i < itemsToPreload.length; i++) {
      const item = itemsToPreload[i];

      try {
        await this._preloadFirebaseMetadata(item.downloadURL || item.audioSrc, item.fileName);

        // Delay mezi requesty pro snížení zátěže
        if (i < itemsToPreload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (err) {
        console.warn(`Fast metadata preload failed for ${item.fileName}:`, err);
      }
    }
  }

  /**
   * Preloading kritických dat pro plynulou navigaci - ze statického JSON
   */
  async preloadCriticalData() {
    try {
      console.log('Preloading critical data from static JSON...');

      // Inicializuj statickou metadata službu
      await staticMetadataService.initialize();

      // Načti všechna metadata ze statické služby
      const allMetadata = staticMetadataService.getAllFromCache();

      // Ulož do cache
      Object.entries(allMetadata).forEach(([fileName, metadata]) => {
        if (!this.has('metadata', fileName)) {
          this.setMetadata(fileName, metadata);
        }
      });

      console.log(`Critical data preloading completed: ${Object.keys(allMetadata).length} files`);

    } catch (err) {
      console.warn('Critical data preloading failed:', err);
    }
  }

  /**
   * Preloading dat pro Slova screen - ze statického JSON
   */
  async preloadSlovaData() {
    try {
      console.log('Preloading slova data from static JSON...');

      // Načti metadata ze statické služby cache
      const allMetadata = staticMetadataService.getAllFromCache();

      // Filtruj soubory pro mluvené slovo
      const slovaFiles = Object.entries(allMetadata).filter(([fileName, metadata]) => {
        const isMp3 = fileName.toLowerCase().endsWith('.mp3');
        const isSpokenWord = /^(muzsky|zensky)/.test(fileName);
        return isMp3 && isSpokenWord;
      });

      // Ulož do cache
      slovaFiles.forEach(([fileName, metadata]) => {
        if (!this.has('metadata', fileName)) {
          this.setMetadata(fileName, metadata);
        }
      });

      console.log(`Slova data preloading completed: ${slovaFiles.length} files`);

    } catch (err) {
      console.warn('Slova data preloading failed:', err);
    }
  }

  /**
   * Preloading dat pro Hudba/Bez-slov screen - ze statického JSON
   */
  async preloadHudbaData() {
    try {
      console.log('Preloading hudba data from static JSON...');

      // Načti metadata ze statické služby cache
      const allMetadata = staticMetadataService.getAllFromCache();

      // Filtruj hudební soubory
      const hudbaFiles = Object.entries(allMetadata).filter(([fileName, metadata]) => {
        const isMp3 = fileName.toLowerCase().endsWith('.mp3');
        // Hudební formát podle useFirebaseHudbaScanner
        const isHudba = /\d{2}--\d{2}--\d{2}--\d{2}-/.test(fileName);
        return isMp3 && isHudba;
      });

      // Ulož do cache
      hudbaFiles.forEach(([fileName, metadata]) => {
        if (!this.has('metadata', fileName)) {
          this.setMetadata(fileName, metadata);
        }
      });

      console.log(`Hudba data preloading completed: ${hudbaFiles.length} files`);

    } catch (err) {
      console.warn('Hudba data preloading failed:', err);
    }
  }

  /**
   * Optimalizace cache pro lepší výkon
   */
  optimizeCache() {
    try {
      // Vyčisti staré položky
      this.cleanup();

      // Optimalizuj velikosti cache
      Object.entries(this.caches).forEach(([type, cache]) => {
        if (cache.size > this.limits[type] * 0.8) {
          // Pokud je cache 80% plná, vyčisti 20% nejstarších položek
          const entries = Array.from(cache.entries());
          const toRemove = entries.slice(0, Math.floor(cache.size * 0.2));
          toRemove.forEach(([key]) => cache.delete(key));
        }
      });

      console.log('Cache optimized');
    } catch (err) {
      console.warn('Cache optimization failed:', err);
    }
  }

  /**
   * Získání cache statistik
   */
  getStats() {
    const stats = {};

    Object.entries(this.caches).forEach(([type, cache]) => {
      stats[type] = {
        size: cache.size,
        limit: this.limits[type],
        ttl: this.ttl[type]
      };
    });

    stats.preload = {
      queue: this.preloadQueue.size,
      active: this.preloadPromises.size
    };

    return stats;
  }

  /**
   * Cleanup starých položek
   */
  cleanup() {
    Object.entries(this.caches).forEach(([type, cache]) => {
      const now = Date.now();
      const entries = Array.from(cache.entries());

      entries.forEach(([key, entry]) => {
        if (now - entry.timestamp > entry.ttl) {
          cache.delete(key);
        }
      });
    });
  }
}

// Singleton instance
const cacheService = new CacheService();

// Automatický cleanup každých 5 minut
setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);

export default cacheService;
