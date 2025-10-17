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
   * Preloading pouze metadat pro Firebase Storage soubory
   */
  async _preloadFirebaseMetadata(url, fileName) {
    try {
      // Import Firebase Storage funkcí
      const { ref, getMetadata } = await import('firebase/storage');
      const { storage } = await import('@services/firebase');

      // Extrahuj název souboru z URL nebo použij poskytnutý fileName
      const fileRef = ref(storage, fileName);

      const loadPromise = Promise.race([
        getMetadata(fileRef),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Metadata preload timeout')), 3000)
        )
      ]);

      const metadata = await loadPromise;

      // Ulož metadata do cache
      const extractedMetadata = {
        size: metadata.size,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        fileName,
        estimatedDuration: this._estimateDurationFromSize(metadata.size, metadata.contentType)
      };

      this.setMetadata(fileName, extractedMetadata);
      console.log(`Firebase metadata preloaded: ${fileName}`);

      return metadata;

    } catch (error) {
      // Pokud je soubor 404, nevrhni chybu - jen zaloguj
      if (error.code === 'storage/object-not-found' || error.message.includes('404')) {
        console.log(`File not found (404): ${fileName} - skipping preload`);
        return null;
      }

      console.warn(`Firebase metadata preload failed for ${fileName}:`, error);
      throw error;
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
   * Preloading kritických dat pro plynulou navigaci - optimalizované
   */
  async preloadCriticalData() {
    try {
      console.log('Preloading critical data...');

      // Pouze cache základní informace bez síťových requestů
      const basicMetadata = {
        'muzsky4FSK-uzkost-osamelost.mp3': {
          size: 2500000, // ~2.5MB
          contentType: 'audio/mpeg',
          estimatedDuration: 180 // 3 minuty
        },
        'zensky4FSK-uzkost-osamelost.mp3': {
          size: 2500000,
          contentType: 'audio/mpeg',
          estimatedDuration: 180
        }
      };

      // Ulož základní metadata do cache bez síťových requestů
      Object.entries(basicMetadata).forEach(([fileName, metadata]) => {
        if (!this.has('metadata', fileName)) {
          this.setMetadata(fileName, {
            ...metadata,
            fileName,
            timeCreated: new Date().toISOString(),
            updated: new Date().toISOString(),
            preloaded: true
          });
        }
      });

      console.log('Critical data preloading completed (cached)');

    } catch (err) {
      console.warn('Critical data preloading failed:', err);
    }
  }

  /**
   * Preloading dat pro Slova screen - optimalizované bez síťových requestů
   */
  async preloadSlovaData() {
    try {
      console.log('Preloading slova data...');

      // Cache základní metadata bez síťových requestů
      const slovaFiles = [
        'muzsky4FSK-uzkost-osamelost.mp3',
        'zensky4FSK-uzkost-osamelost.mp3',
        'muzsky4MSK-uzkost-osamelost.mp3'
      ];

      slovaFiles.forEach(fileName => {
        if (!this.has('metadata', fileName)) {
          this.setMetadata(fileName, {
            fileName,
            size: 2500000, // ~2.5MB
            contentType: 'audio/mpeg',
            estimatedDuration: 180, // 3 minuty
            timeCreated: new Date().toISOString(),
            updated: new Date().toISOString(),
            preloaded: true
          });
        }
      });

      console.log('Slova data preloading completed (cached)');

    } catch (err) {
      console.warn('Slova data preloading failed:', err);
    }
  }

  /**
   * Preloading dat pro Hudba/Bez-slov screen - optimalizované bez síťových requestů
   */
  async preloadHudbaData() {
    try {
      console.log('Preloading hudba data...');

      // Cache základní metadata bez síťových requestů
      const hudbaFiles = [
        '00--00--00--00-ambient1.mp3',
        '00--00--00--01-ambient2.mp3',
        '00--00--00--02-nature.mp3'
      ];

      hudbaFiles.forEach(fileName => {
        if (!this.has('metadata', fileName)) {
          this.setMetadata(fileName, {
            fileName,
            size: 5000000, // ~5MB pro hudební soubory
            contentType: 'audio/mpeg',
            estimatedDuration: 300, // 5 minut
            timeCreated: new Date().toISOString(),
            updated: new Date().toISOString(),
            preloaded: true
          });
        }
      });

      console.log('Hudba data preloading completed (cached)');

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
