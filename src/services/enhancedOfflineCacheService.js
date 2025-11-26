import log from './logger';

class EnhancedOfflineCacheService {
  constructor() {
    this.cacheName = 'meditation-audio-cache';
    this.maxCacheSize = 500 * 1024 * 1024; // 500MB
    this.cache = null;
    this.isInitialized = false;
  }

  async initialize(forceReload = false) {
    if (this.isInitialized && !forceReload) return true;

    if (forceReload) {
      this.isInitialized = false;
      if (this.cache) {
        try {
          await caches.delete(this.cacheName);
        } catch (error) {
          log.warn('⚠️ Failed to delete cache on force reload:', error);
        }
      }
    }

    try {
      if ('caches' in window) {
        this.cache = await caches.open(this.cacheName);
        this.isInitialized = true;
        log.success('✅ Enhanced offline cache service initialized');
        return true;
      } else {
        log.warn('⚠️ Cache API not supported');
        return false;
      }
    } catch (error) {
      log.error('❌ Failed to initialize enhanced offline cache:', error);
      return false;
    }
  }

  // Zkontroluj, jestli je soubor dostupný offline
  async isFileAvailableOffline(fileName) {
    if (!this.isInitialized) return false;

    try {
      const cacheKeys = [
        `/audio/${fileName}`,
        fileName,
        `https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/${encodeURIComponent(fileName)}?alt=media`,
        // Přidej i lokální cesty pro obrázky a SVG
        `/${fileName}`,
        `/assets/${fileName}`,
        `/public/${fileName}`
      ];

      for (const key of cacheKeys) {
        const cachedResponse = await this.cache.match(key);
        if (cachedResponse && (cachedResponse.ok || cachedResponse.type === 'opaque')) {
          return true;
        }
      }
      return false;
    } catch (error) {
      log.error('❌ Error checking offline availability:', error);
      return false;
    }
  }

  // Získej soubor z cache
  async getFile(fileName) {
    if (!this.isInitialized) return null;

    try {
      const cacheKeys = [
        `/audio/${fileName}`,
        fileName,
        `https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/${encodeURIComponent(fileName)}?alt=media`,
        // Přidej i lokální cesty pro obrázky a SVG
        `/${fileName}`,
        `/assets/${fileName}`,
        `/public/${fileName}`
      ];

      for (const key of cacheKeys) {
        const cachedResponse = await this.cache.match(key);
        if (cachedResponse && (cachedResponse.ok || cachedResponse.type === 'opaque')) {
          // Pro opaque response nemůžeme vytvořit blob URL
          if (cachedResponse.type === 'opaque') {
            console.log(`🎵 Found opaque response for: ${fileName}, using cache key: ${key}`);
            // Vrať cache key místo blob URL
            return key;
          } else {
            // Vytvoř blob URL z cached response
            const blob = await cachedResponse.blob();
            return URL.createObjectURL(blob);
          }
        }
      }
      return null;
    } catch (error) {
      log.error('❌ Error getting offline URL:', error);
      return null;
    }
  }

  // Fallback strategie pro načítání audio souboru - OFFLINE-FIRST pro šetření mobilních dat
  async getAudioUrl(fileName, onlineUrl) {
    if (!fileName) return null;

    try {
      // 1. Zkus offline cache PRVNÍ - šetří mobilní data
      const offlineUrl = await this.getFile(fileName);
      if (offlineUrl) {
        log.debug(`🎵 Using offline URL for: ${fileName} (saving mobile data)`);
        // Pokud je to cache key (pro opaque responses), vrať ho přímo
        if (offlineUrl.startsWith('/audio/') || offlineUrl.includes('firebasestorage')) {
          return offlineUrl;
        }
        return offlineUrl;
      }

      // 2. Zkontroluj, jestli je uživatel offline
      if (!navigator.onLine) {
        log.warn(`⚠️ Offline and no cached version for: ${fileName}`);
        return null;
      }

      // 3. Pokud je online a není offline cache, vrať online URL (Service Worker se postará o cache)
      if (onlineUrl) {
        log.debug(`🎵 Using online URL for: ${fileName} (Service Worker will handle caching)`);
        return onlineUrl;
      }

      // 4. Pokud není ani online ani offline, vrať null
      log.warn(`⚠️ No URL available for: ${fileName}`);
      return null;
    } catch (error) {
      log.error('❌ Error getting audio URL:', error);
      return null;
    }
  }

  // Zkontroluj, jestli je soubor v cache
  async isFileCached(fileName) {
    return await this.isFileAvailableOffline(fileName);
  }

  // Získej statistiky cache
  async getCacheStats() {
    if (!this.isInitialized) return null;

    try {
      const keys = await this.cache.keys();
      const audioKeys = keys.filter(key =>
        key.url.includes('/audio/') ||
        key.url.includes('firebasestorage') ||
        key.url.includes('.mp3') ||
        key.url.includes('.svg') ||
        key.url.includes('.png') ||
        key.url.includes('.jpg') ||
        key.url.includes('.jpeg') ||
        key.url.includes('.webp') ||
        key.url.includes('.ico')
      );

      let totalSize = 0;
      const files = [];

      for (const key of audioKeys) {
        try {
          const response = await this.cache.match(key);
          if (response) {
            const blob = await response.blob();
            const size = blob.size;
            totalSize += size;
            files.push({
              url: key.url,
              size: size,
              sizeFormatted: this.formatFileSize(size)
            });
          }
        } catch (error) {
          log.warn('⚠️ Error getting file size:', error);
        }
      }

      return {
        totalFiles: files.length,
        totalSize: totalSize,
        totalSizeFormatted: this.formatFileSize(totalSize),
        files: files,
        isOfflineReady: files.length > 0
      };
    } catch (error) {
      log.error('❌ Error getting cache stats:', error);
      return null;
    }
  }

  // Formátuj velikost souboru
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Vymaž cache
  async clearCache() {
    if (!this.isInitialized) return false;

    try {
      await caches.delete(this.cacheName);
      this.cache = await caches.open(this.cacheName);
      log.success('✅ Cache cleared successfully');
      return true;
    } catch (error) {
      log.error('❌ Error clearing cache:', error);
      return false;
    }
  }
}

// Exportuj singleton instanci
const enhancedOfflineCacheService = new EnhancedOfflineCacheService();
export default enhancedOfflineCacheService;
