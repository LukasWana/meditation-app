/**
 * Univerzální cache service pro optimalizaci výkonu aplikace
 * Podporuje cache pro audio, obrázky, metadata a Firebase dotazy
 */

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
   * Preloading systém
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
      console.log(`Preloading audio: ${fileName}`);

      // Zkontroluj, jestli už není v cache
      if (this.has('audio', fileName)) {
        console.log(`Audio already cached: ${fileName}`);
        return Promise.resolve();
      }

      // Vytvoř Audio objekt pro preloading
      const audio = new Audio();
      audio.preload = 'metadata';
      // Odstraň crossOrigin pro Firebase Storage - nepodporuje CORS pro metadata

      const loadPromise = new Promise((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => {
          console.log(`Audio preloaded: ${fileName}`);
          resolve(audio);
        });

        audio.addEventListener('error', (e) => {
          console.warn(`Failed to preload audio: ${fileName}`, e);
          reject(e);
        });

        // Timeout po 8 sekundách (rychlejší timeout)
        setTimeout(() => {
          reject(new Error('Preload timeout'));
        }, 8000);
      });

      audio.src = url;

      return await loadPromise;
    } catch (error) {
      console.warn(`Preload failed for ${fileName}:`, error);
      // Nevrhni chybu, jen ji zaloguj
      return Promise.resolve();
    }
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

    // Preload následující 3 položky
    const nextItems = allItems.slice(currentIndex + 1, currentIndex + 4)
      .filter(item => item.downloadURL && !this.has('audio', item.fileName));

    if (nextItems.length > 0) {
      console.log(`Smart preloading ${nextItems.length} next items`);
      await this.preloadBatch(nextItems.map(item => ({
        url: item.downloadURL,
        fileName: item.fileName
      })), 'audio');
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
