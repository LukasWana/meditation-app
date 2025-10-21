/**
 * Optimized Cache System
 * LRU cache s memory management a performance monitoring
 */

/**
 * LRU Cache implementace
 */
class LRUCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl; // Time to live v milisekundách
    this.cache = new Map();
    this.accessOrder = new Map();
    this.accessCounter = 0;
    this.timestamps = new Map();

    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  /**
   * Získá hodnotu z cache
   * @param {string} key - Klíč
   * @returns {any|null} - Hodnota nebo null
   */
  get(key) {
    // Kontrola TTL
    if (this.isExpired(key)) {
      this.delete(key);
      this.metrics.misses++;
      return null;
    }

    if (this.cache.has(key)) {
      // Aktualizuj access order
      this.accessOrder.set(key, ++this.accessCounter);
      this.metrics.hits++;
      return this.cache.get(key);
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Uloží hodnotu do cache
   * @param {string} key - Klíč
   * @param {any} value - Hodnota
   */
  set(key, value) {
    // Pokud je cache plný, odstraň nejstarší položku
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.accessOrder.set(key, ++this.accessCounter);
    this.timestamps.set(key, Date.now());
    this.metrics.size = this.cache.size;
  }

  /**
   * Odstraní položku z cache
   * @param {string} key - Klíč
   */
  delete(key) {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.timestamps.delete(key);
    this.metrics.size = this.cache.size;
  }

  /**
   * Zkontroluje, zda je položka expirovaná
   * @param {string} key - Klíč
   * @returns {boolean} - True pokud je expirovaná
   */
  isExpired(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp) return true;

    return Date.now() - timestamp > this.ttl;
  }

  /**
   * Odstraní nejméně používanou položku
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Vyčistí expirované položky
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, timestamp] of this.timestamps) {
      if (now - timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
  }

  /**
   * Vyčistí celý cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.timestamps.clear();
    this.accessCounter = 0;
    this.metrics.size = 0;
  }

  /**
   * Vrátí cache statistiky
   * @returns {object} - Statistiky
   */
  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests
    };
  }
}

/**
 * Specializovaný cache pro metadata
 */
class MetadataCache extends LRUCache {
  constructor() {
    super(200, 60 * 60 * 1000); // 200 položek, 1 hodina TTL
  }

  /**
   * Uloží metadata s validací
   * @param {string} fileName - Název souboru
   * @param {object} metadata - Metadata
   */
  setMetadata(fileName, metadata) {
    if (!fileName || typeof fileName !== 'string') {
      console.warn('Invalid fileName for metadata cache');
      return;
    }

    if (!metadata || typeof metadata !== 'object') {
      console.warn('Invalid metadata object');
      return;
    }

    // Validace základních vlastností metadata
    const validMetadata = {
      fileName,
      duration: metadata.duration || 0,
      title: metadata.title || '',
      artist: metadata.artist || '',
      album: metadata.album || '',
      cached: Date.now()
    };

    this.set(fileName, validMetadata);
  }

  /**
   * Získá metadata s fallback
   * @param {string} fileName - Název souboru
   * @returns {object|null} - Metadata nebo null
   */
  getMetadata(fileName) {
    const metadata = this.get(fileName);

    if (metadata) {
      // Aktualizuj access time
      metadata.lastAccessed = Date.now();
    }

    return metadata;
  }
}

/**
 * Specializovaný cache pro audio URL
 */
class AudioCache extends LRUCache {
  constructor() {
    super(50, 24 * 60 * 60 * 1000); // 50 položek, 24 hodin TTL
  }

  /**
   * Uloží audio URL
   * @param {string} fileName - Název souboru
   * @param {string} url - URL
   */
  setAudioUrl(fileName, url) {
    if (!fileName || !url) {
      console.warn('Invalid fileName or url for audio cache');
      return;
    }

    if (typeof url !== 'string' || !url.startsWith('http')) {
      console.warn('Invalid URL format');
      return;
    }

    this.set(fileName, {
      url,
      fileName,
      cached: Date.now()
    });
  }

  /**
   * Získá audio URL
   * @param {string} fileName - Název souboru
   * @returns {string|null} - URL nebo null
   */
  getAudioUrl(fileName) {
    const audioData = this.get(fileName);
    return audioData ? audioData.url : null;
  }
}

/**
 * Hlavní cache manager
 */
class OptimizedCacheManager {
  constructor() {
    this.metadataCache = new MetadataCache();
    this.audioCache = new AudioCache();
    this.firebaseCache = new LRUCache(50, 30 * 60 * 1000); // 50 položek, 30 minut TTL
    this.imageCache = new LRUCache(100, 7 * 24 * 60 * 60 * 1000); // 100 položek, 7 dní TTL

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

  /**
   * Metadata cache metody
   */
  setMetadata(fileName, metadata) {
    return this.metadataCache.setMetadata(fileName, metadata);
  }

  getMetadata(fileName) {
    return this.metadataCache.getMetadata(fileName);
  }

  /**
   * Audio cache metody
   */
  setAudioUrl(fileName, url) {
    return this.audioCache.setAudioUrl(fileName, url);
  }

  getAudioUrl(fileName) {
    return this.audioCache.getAudioUrl(fileName);
  }

  /**
   * Firebase cache metody
   */
  setFirebaseData(key, data) {
    this.firebaseCache.set(key, data);
  }

  getFirebaseData(key) {
    return this.firebaseCache.get(key);
  }

  /**
   * Image cache metody
   */
  setImageUrl(key, url) {
    this.imageCache.set(key, url);
  }

  getImageUrl(key) {
    return this.imageCache.get(key);
  }

  /**
   * Vyčistí všechny cache
   */
  cleanup() {
    try {
      this.metadataCache.cleanup();
      this.audioCache.cleanup();
      this.firebaseCache.cleanup();
      this.imageCache.cleanup();
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Vyčistí všechny cache úplně
   */
  clear() {
    this.metadataCache.clear();
    this.audioCache.clear();
    this.firebaseCache.clear();
    this.imageCache.clear();
  }

  /**
   * Vrátí statistiky všech cache
   * @returns {object} - Agregované statistiky
   */
  getStats() {
    return {
      metadata: this.metadataCache.getStats(),
      audio: this.audioCache.getStats(),
      firebase: this.firebaseCache.getStats(),
      image: this.imageCache.getStats(),
      total: {
        hits: this.metadataCache.metrics.hits +
              this.audioCache.metrics.hits +
              this.firebaseCache.metrics.hits +
              this.imageCache.metrics.hits,
        misses: this.metadataCache.metrics.misses +
                this.audioCache.metrics.misses +
                this.firebaseCache.metrics.misses +
                this.imageCache.metrics.misses,
        size: this.metadataCache.metrics.size +
              this.audioCache.metrics.size +
              this.firebaseCache.metrics.size +
              this.imageCache.metrics.size
      }
    };
  }

  /**
   * Zničí cache manager
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
const optimizedCache = new OptimizedCacheManager();

export default optimizedCache;
export { LRUCache, MetadataCache, AudioCache, OptimizedCacheManager };


