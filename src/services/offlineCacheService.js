import log from './logger';

class OfflineCacheService {
  constructor() {
    this.cacheName = 'meditation-audio-cache';
    this.maxCacheSize = 500 * 1024 * 1024; // 500MB
    this.cache = null;
    this.isInitialized = false;
    this.downloadProgress = new Map(); // fileName -> progress
    this.downloadQueue = [];
    this.isDownloading = false;
  }

  async initialize() {
    if (this.isInitialized) {
      log.debug('✅ Cache already initialized');
      return true;
    }

    try {
      log.debug('🔄 Initializing offline cache service...');
      if ('caches' in window) {
        log.debug('✅ Cache API supported, opening cache...');
        this.cache = await caches.open(this.cacheName);
        this.isInitialized = true;
        log.success('✅ Offline cache service initialized successfully');
        return true;
      } else {
        log.warn('⚠️ Cache API not supported, offline mode disabled');
        return false;
      }
    } catch (error) {
      log.error('❌ Failed to initialize offline cache:', error);
      return false;
    }
  }

  // Zkontroluj, jestli je soubor v cache
  async isFileCached(fileName) {
    if (!this.isInitialized) return false;

    try {
      // Extrahuj jen jméno souboru z cesty
      const justFileName = fileName.split('/').pop();

      // Zkus najít podle relativní cesty s jen jménem souboru (nezávisle na portu)
      const relativePath = `/audio/${justFileName}`;
      const allKeys = await this.cache.keys();
      const matchingKey = allKeys.find(key => key.url.endsWith(relativePath));

      if (matchingKey) {
        log.debug(`🔍 Cache result for ${fileName}: FOUND with key ${matchingKey.url}`);
        return true;
      }

      // Zkus různé varianty klíčů
      const possibleKeys = [
        `/audio/${justFileName}`,
        `https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/${encodeURIComponent(justFileName)}?alt=media`,
        justFileName,
        fileName,
        // Zkus i s původní cestou
        `/audio/${fileName}`
      ];

      for (const cacheKey of possibleKeys) {
        log.debug(`🔍 Checking cache for key: ${cacheKey}`);
        const response = await this.cache.match(cacheKey);
        if (response) {
          log.debug(`🔍 Cache result for ${fileName}: FOUND with key ${cacheKey}`);
          return true;
        }
      }

      log.debug(`🔍 Cache result for ${fileName}: NOT FOUND`);
      return false;
    } catch (error) {
      log.error(`❌ Error checking cache for ${fileName}:`, error);
      return false;
    }
  }

  // Získej soubor z cache
  async getCachedFile(fileName) {
    if (!this.isInitialized) return null;

    try {
      // Extrahuj jen jméno souboru z cesty
      const justFileName = fileName.split('/').pop();

      // Zkus najít podle relativní cesty s jen jménem souboru (nezávisle na portu)
      const relativePath = `/audio/${justFileName}`;
      const allKeys = await this.cache.keys();
      const matchingKey = allKeys.find(key => key.url.endsWith(relativePath));

      if (matchingKey) {
        const response = await this.cache.match(matchingKey);
        if (response) {
          log.cache(`✅ Retrieved ${fileName} from cache with key ${matchingKey.url}`);
          return response;
        }
      }

      // Zkus různé varianty klíčů
      const possibleKeys = [
        `/audio/${justFileName}`,
        `https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/${encodeURIComponent(justFileName)}?alt=media`,
        justFileName,
        fileName,
        // Zkus i s původní cestou
        `/audio/${fileName}`
      ];

      for (const cacheKey of possibleKeys) {
        const response = await this.cache.match(cacheKey);
        if (response) {
          log.cache(`✅ Retrieved ${fileName} from cache with key ${cacheKey}`);
          return response;
        }
      }

      log.cache(`❌ File ${fileName} not found in cache`);
      return null;
    } catch (error) {
      log.error(`❌ Error getting cached file ${fileName}:`, error);
      return null;
    }
  }

  // Ulož soubor do cache
  async cacheFile(fileName, audioUrl) {
    if (!this.isInitialized) return false;

    try {
      // Zkus nejdříve normální fetch bez no-cors
      let response;
      try {
        response = await fetch(audioUrl, {
          method: 'GET',
          credentials: 'omit'
        });
      } catch (fetchError) {
        log.warn(`⚠️ Normal fetch failed for ${fileName}, trying XHR method:`, fetchError.message);
        // Fallback na XHR metodu
        return await this.cacheFileWithXHR(fileName, audioUrl);
      }

      if (response.ok) {
        // Zkus získat blob pro lepší cache kompatibilitu
        try {
          const blob = await response.blob();
          const cacheResponse = new Response(blob, {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': blob.size.toString(),
              'Cache-Control': 'max-age=31536000',
            }
          });

          // Ulož s několika klíči pro lepší kompatibilitu
          const cacheKeys = [
            `/audio/${fileName}`,
            audioUrl,
            fileName
          ];

          let successCount = 0;
          for (const cacheKey of cacheKeys) {
            try {
              await this.cache.put(cacheKey, cacheResponse.clone());
              successCount++;
            } catch (cacheError) {
              log.warn(`⚠️ Failed to cache with key ${cacheKey}:`, cacheError.message);
            }
          }

          if (successCount > 0) {
            log.cache(`✅ Cached ${fileName} (${this.formatFileSize(blob.size)})`);
            return true;
          } else {
            log.error(`❌ Failed to store ${fileName} in cache`);
            return false;
          }
        } catch (blobError) {
          log.warn(`⚠️ Blob creation failed for ${fileName}, trying XHR method:`, blobError.message);
          // Fallback na XHR metodu
          return await this.cacheFileWithXHR(fileName, audioUrl);
        }
      } else {
        log.error(`❌ Failed to fetch ${fileName}: ${response.status} ${response.statusText}`);
        return false;
      }

    } catch (error) {
      log.error(`❌ Error caching ${fileName}:`, error);
      // Fallback na XHR metodu
      return await this.cacheFileWithXHR(fileName, audioUrl);
    }
  }

  // Fallback metoda s XMLHttpRequest
  async cacheFileWithXHR(fileName, audioUrl) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', audioUrl, true);
      xhr.responseType = 'blob';
      xhr.timeout = 30000; // 30 sekund timeout

      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            const blob = xhr.response;
            const response = new Response(blob, {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': blob.size.toString(),
                'Cache-Control': 'max-age=31536000',
              }
            });

            // Ulož s několika klíči pro lepší kompatibilitu
            const cacheKeys = [
              `/audio/${fileName}`,
              audioUrl,
              fileName
            ];

            let successCount = 0;
            for (const cacheKey of cacheKeys) {
              try {
                await this.cache.put(cacheKey, response.clone());
                successCount++;
              } catch (cacheError) {
                log.warn(`⚠️ XHR failed to cache with key ${cacheKey}:`, cacheError.message);
              }
            }

            if (successCount > 0) {
              log.cache(`✅ Cached ${fileName} via XHR (${this.formatFileSize(blob.size)})`);
              resolve(true);
            } else {
              log.error(`❌ XHR failed to store ${fileName} in cache`);
              resolve(false);
            }
          } catch (error) {
            log.error(`❌ Error storing ${fileName} in cache via XHR:`, error);
            resolve(false);
          }
        } else {
          log.error(`❌ XHR failed for ${fileName}: ${xhr.status} ${xhr.statusText}`);
          resolve(false);
        }
      };

      xhr.onerror = () => {
        log.error(`❌ XHR network error for ${fileName}`);
        resolve(false);
      };

      xhr.ontimeout = () => {
        log.error(`❌ XHR timeout for ${fileName}`);
        resolve(false);
      };

      try {
        xhr.send();
      } catch (sendError) {
        log.error(`❌ XHR send error for ${fileName}:`, sendError);
        resolve(false);
      }
    });
  }


  // Načti všechny audio soubory do cache
  async cacheAllAudioFiles(audioFiles, onProgress = null) {
    if (!this.isInitialized) {
      log.warn('⚠️ Cache not initialized, cannot cache files');
      return false;
    }

    if (this.isDownloading) {
      log.warn('⚠️ Download already in progress');
      return false;
    }

    this.isDownloading = true;
    this.downloadQueue = [...audioFiles];
    this.downloadProgress.clear();

    try {
      log.info(`🚀 Starting to cache ${audioFiles.length} audio files...`);
      log.debug('📋 Files to cache:', audioFiles.map(f => ({
        fileName: f.fileName || f.name,
        hasUrl: !!(f.downloadURL || f.audioSrc),
        url: f.downloadURL || f.audioSrc
      })));

      // Debug: zobraz slova soubory
      const slovaFiles = audioFiles.filter(f =>
        (f.fileName || f.name) && (f.fileName || f.name).includes('slova/')
      );
      log.debug('🎤 Slova files to cache:', slovaFiles.length);
      log.debug('🎤 Sample slova files:', slovaFiles.slice(0, 3).map(f => ({
        fileName: f.fileName || f.name,
        hasUrl: !!(f.downloadURL || f.audioSrc)
      })));

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const fileName = file.fileName || file.name;
        const audioUrl = file.downloadURL || file.audioSrc;

        if (!audioUrl) {
          log.warn(`⚠️ No URL for ${fileName}, skipping`);
          errorCount++;
          continue;
        }

        // Zkontroluj, jestli už není v cache
        if (await this.isFileCached(fileName)) {
          log.cache(`⏭️ ${fileName} already cached, skipping`);
          successCount++;
          continue;
        }

        // Aktualizuj progress
        const progress = {
          current: i + 1,
          total: audioFiles.length,
          fileName: fileName,
          percentage: Math.round(((i + 1) / audioFiles.length) * 100)
        };
        this.downloadProgress.set(fileName, progress);

        if (onProgress) {
          onProgress(progress);
        }

        log.debug(`🔄 Caching file ${i + 1}/${audioFiles.length}: ${fileName}`);
        log.debug(`🔗 URL: ${audioUrl}`);

        // Stáhni a ulož do cache
        const success = await this.cacheFile(fileName, audioUrl);
        if (success) {
          successCount++;
          log.success(`✅ Successfully cached: ${fileName}`);
        } else {
          errorCount++;
          log.error(`❌ Failed to cache: ${fileName}`);
        }

        // Malé zpoždění, aby se nezatížil server
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      log.success(`✅ Caching completed: ${successCount} success, ${errorCount} errors`);
      return { success: successCount, errors: errorCount };

    } catch (error) {
      log.error('❌ Error during bulk caching:', error);
      return { success: 0, errors: audioFiles.length };
    } finally {
      this.isDownloading = false;
      this.downloadQueue = [];
    }
  }

  // Získej statistiky cache
  async getCacheStats() {
    if (!this.isInitialized) {
      log.warn('⚠️ Cache not initialized, cannot get stats');
      return null;
    }

    try {
      log.debug('🔄 Getting cache stats...');
      const keys = await this.cache.keys();
      log.debug(`📊 Found ${keys.length} total cache entries`);

      const audioKeys = keys.filter(key => key.url.includes('/audio/'));
      log.debug(`🎵 Found ${audioKeys.length} audio files in cache`);

      // Debug: zobraz všechny klíče v cache
      log.debug('🔍 All cache keys:', audioKeys.map(key => key.url));

      // Debug: zobraz slova soubory v cache
      const slovaKeys = audioKeys.filter(key => key.url.includes('slova/'));
      log.debug(`🎤 Found ${slovaKeys.length} slova files in cache`);
      log.debug('🎤 Slova cache keys:', slovaKeys.map(key => key.url));

      let totalSize = 0;
      const files = [];

      for (const key of audioKeys) {
        const response = await this.cache.match(key);
        if (response) {
          let size = 0;

          // Pro opaque responses (no-cors mode) nemůžeme získat skutečnou velikost
          if (response.type === 'opaque') {
            // Odhadni velikost na základě názvu souboru nebo použij výchozí hodnotu
            const fileName = key.url.split('/audio/')[1];
            if (fileName.includes('slova/')) {
              size = 5000000; // 5MB pro slova soubory
            } else {
              size = 10000000; // 10MB pro hudbu
            }
            log.debug(`📁 File: ${fileName}, Estimated size: ${this.formatFileSize(size)} (opaque response)`);
          } else {
            // Zkus získat velikost z content-length header
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > 0) {
              size = parseInt(contentLength);
              log.debug(`📁 File: ${key.url.split('/audio/')[1]}, Size from header: ${this.formatFileSize(size)}`);
            } else {
              // Fallback: zkus získat velikost z blob
              try {
                const blob = await response.blob();
                size = blob.size;
                log.debug(`📁 File: ${key.url.split('/audio/')[1]}, Size from blob: ${this.formatFileSize(size)}`);
              } catch (blobError) {
                log.debug(`⚠️ Could not get blob size for ${key.url.split('/audio/')[1]}:`, blobError);
                // Pokud ani blob nefunguje, zkus arrayBuffer
                try {
                  const arrayBuffer = await response.arrayBuffer();
                  size = arrayBuffer.byteLength;
                  log.debug(`📁 File: ${key.url.split('/audio/')[1]}, Size from arrayBuffer: ${this.formatFileSize(size)}`);
                } catch (arrayBufferError) {
                  log.debug(`⚠️ Could not get arrayBuffer size for ${key.url.split('/audio/')[1]}:`, arrayBufferError);
                  size = 0;
                }
              }
            }
          }

          totalSize += size;

          const fileName = key.url.split('/audio/')[1];
          files.push({
            fileName,
            size,
            sizeFormatted: this.formatFileSize(size)
          });

          log.debug(`📁 File: ${fileName}, Size: ${this.formatFileSize(size)} (${response.type === 'opaque' ? 'estimated' : 'actual'})`);
        }
      }

      const stats = {
        totalFiles: audioKeys.length,
        totalSize,
        totalSizeFormatted: this.formatFileSize(totalSize),
        files,
        isOfflineReady: audioKeys.length > 0
      };

      log.debug('📊 Cache stats result:', stats);
      return stats;
    } catch (error) {
      log.error('❌ Error getting cache stats:', error);
      return null;
    }
  }

  // Vymaž cache
  async clearCache() {
    if (!this.isInitialized) return false;

    try {
      // Získej všechny klíče v cache
      const keys = await this.cache.keys();
      const audioKeys = keys.filter(key => key.url.includes('/audio/'));

      // Smaž všechny audio soubory
      for (const key of audioKeys) {
        await this.cache.delete(key);
      }

      log.info(`🧹 Cache cleared: ${audioKeys.length} files removed`);
      return true;
    } catch (error) {
      log.error('❌ Error clearing cache:', error);
      return false;
    }
  }

  // Zkontroluj dostupnost offline režimu
  async checkOfflineAvailability() {
    if (!this.isInitialized) return false;

    try {
      const stats = await this.getCacheStats();
      return stats && stats.isOfflineReady;
    } catch (error) {
      log.error('❌ Error checking offline availability:', error);
      return false;
    }
  }

  // Získej progress stahování
  getDownloadProgress(fileName) {
    return this.downloadProgress.get(fileName) || null;
  }

  // Zkontroluj, jestli se stahuje
  isDownloading() {
    return this.isDownloading;
  }

  // Formátování velikosti souboru
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Získej URL pro přehrávání (z cache nebo originál)
  async getAudioUrl(fileName, originalUrl) {
    if (!this.isInitialized) return originalUrl;

    try {
      const cachedResponse = await this.getCachedFile(fileName);
      if (cachedResponse) {
        // Pro opaque responses nemůžeme vytvořit blob URL
        // Vraťme originál URL - Service Worker to vyřeší
        if (cachedResponse.type === 'opaque') {
          log.audio(`🎵 Using original URL for opaque cached file: ${fileName}`);
          return originalUrl;
        }

        // Pro normální responses vytvoř blob URL
        try {
          const blob = await cachedResponse.blob();
          const blobUrl = URL.createObjectURL(blob);
          log.audio(`🎵 Using blob URL for cached file: ${fileName}`);
          return blobUrl;
        } catch (blobError) {
          log.error(`❌ Error creating blob URL for ${fileName}:`, blobError);
          return originalUrl;
        }
      } else {
        log.audio(`❌ Not in cache: ${fileName}`);
      }
    } catch (error) {
      log.error(`❌ Error getting cached URL for ${fileName}:`, error);
    }

    log.audio(`🎵 Using original audio: ${originalUrl}`);
    return originalUrl;
  }
}

// Singleton instance
const offlineCacheService = new OfflineCacheService();
export default offlineCacheService;
