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
    console.log(`🔄 cacheFile called for ${fileName}:`, audioUrl);
    console.log(`📊 Cache initialized: ${this.isInitialized}`);
    console.log(`📊 Cache object:`, this.cache);

    if (!this.isInitialized) {
      console.warn(`⚠️ Cache not initialized for ${fileName}`);
      return false;
    }

    try {
        // Použij Service Worker pro cache - obejde CORS problémy
        console.log(`🔄 Using Service Worker cache for ${fileName}...`);

        // Zkus načíst přes Service Worker
        let response;
        try {
          console.log(`🔄 Fetching ${fileName} through Service Worker...`);
          response = await this.fetchWithServiceWorker(fileName, audioUrl);
          console.log(`📊 Service Worker response for ${fileName}:`, {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText
          });
        } catch (fetchError) {
          console.error(`❌ Service Worker fetch failed for ${fileName}:`, fetchError);
          log.error(`❌ Service Worker fetch failed for ${fileName}:`, fetchError);
          // Fallback na no-cors fetch
          return await this.cacheFileNoCors(fileName, audioUrl);
        }

      // Zkontroluj typ response
      if (response.type === 'opaque') {
        console.log(`🔄 Opaque response for ${fileName}, caching directly...`);

        // Pro opaque response ulož přímo do cache
        const cacheKeys = [
          `/audio/${fileName}`,
          audioUrl,
          fileName
        ];

        console.log(`🔄 Storing opaque response for ${fileName} in cache with keys:`, cacheKeys);
        let successCount = 0;
        for (const cacheKey of cacheKeys) {
          try {
            console.log(`🔄 Putting opaque response for ${fileName} in cache with key: ${cacheKey}`);
            await this.cache.put(cacheKey, response.clone());
            successCount++;
            console.log(`✅ Successfully cached opaque response with key: ${cacheKey}`);

            // Zkontroluj, jestli se soubor skutečně uložil
            const cachedResponse = await this.cache.match(cacheKey);
            if (cachedResponse) {
              console.log(`✅ Verified: ${fileName} is in cache with key: ${cacheKey}`);
            } else {
              console.warn(`⚠️ Verification failed: ${fileName} not found in cache with key: ${cacheKey}`);
            }
          } catch (cacheError) {
            console.warn(`⚠️ Failed to cache opaque response with key ${cacheKey}:`, cacheError.message);
            log.warn(`⚠️ Failed to cache opaque response with key ${cacheKey}:`, cacheError.message);
          }
        }

        if (successCount > 0) {
          console.log(`✅ Cached opaque response for ${fileName}`);
          log.cache(`✅ Cached opaque response for ${fileName}`);
          return true;
        } else {
          console.error(`❌ Failed to store opaque response for ${fileName} in cache`);
          log.error(`❌ Failed to store opaque response for ${fileName} in cache`);
          return false;
        }
      } else if (response.ok) {
        // Zkus získat blob pro lepší cache kompatibilitu
        try {
          console.log(`🔄 Creating blob for ${fileName}...`);
          const blob = await response.blob();
          console.log(`📊 Blob created for ${fileName}:`, {
            size: blob.size,
            type: blob.type
          });

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

          console.log(`🔄 Storing ${fileName} in cache with keys:`, cacheKeys);
          let successCount = 0;
          for (const cacheKey of cacheKeys) {
            try {
              console.log(`🔄 Putting ${fileName} in cache with key: ${cacheKey}`);
              await this.cache.put(cacheKey, cacheResponse.clone());
              successCount++;
              console.log(`✅ Successfully cached with key: ${cacheKey}`);

              // Zkontroluj, jestli se soubor skutečně uložil
              const cachedResponse = await this.cache.match(cacheKey);
              if (cachedResponse) {
                console.log(`✅ Verified: ${fileName} is in cache with key: ${cacheKey}`);
              } else {
                console.warn(`⚠️ Verification failed: ${fileName} not found in cache with key: ${cacheKey}`);
              }
            } catch (cacheError) {
              console.warn(`⚠️ Failed to cache with key ${cacheKey}:`, cacheError.message);
              log.warn(`⚠️ Failed to cache with key ${cacheKey}:`, cacheError.message);
            }
          }

          if (successCount > 0) {
            console.log(`✅ Cached ${fileName} (${this.formatFileSize(blob.size)})`);
            log.cache(`✅ Cached ${fileName} (${this.formatFileSize(blob.size)})`);
            return true;
          } else {
            console.error(`❌ Failed to store ${fileName} in cache`);
            log.error(`❌ Failed to store ${fileName} in cache`);
            return false;
          }
        } catch (blobError) {
          console.warn(`⚠️ Blob creation failed for ${fileName}, trying no-cors:`, blobError.message);
          log.warn(`⚠️ Blob creation failed for ${fileName}, trying no-cors:`, blobError.message);
          // Fallback na no-cors metodu
          return await this.cacheFileNoCors(fileName, audioUrl);
        }
      } else {
        console.error(`❌ Failed to fetch ${fileName}: ${response.status} ${response.statusText}`);
        log.error(`❌ Failed to fetch ${fileName}: ${response.status} ${response.statusText}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Error caching ${fileName}:`, error);
      log.error(`❌ Error caching ${fileName}:`, error);
      return false;
    }
  }

  // Service Worker fetch - obejde CORS problémy
  async fetchWithServiceWorker(fileName, audioUrl) {
    console.log(`🔄 Service Worker fetch for ${fileName}:`, audioUrl);

    try {
      // Použij fetch přes Service Worker s no-cors mode pro CORS problémy
      console.log(`🔄 Fetching through Service Worker with no-cors...`);
      const response = await fetch(audioUrl, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'omit'
      });

      if (response.type === 'opaque') {
        console.log(`🔄 No-CORS fetch success (opaque response)`);
        return response;
      } else {
        console.warn(`⚠️ Non-opaque response received: ${response.type}`);
        return response;
      }
    } catch (error) {
      console.error(`❌ Service Worker fetch failed for ${fileName}:`, error);
      throw error;
    }
  }

  // Extrahuj cestu ze Firebase Storage URL
  extractPathFromUrl(audioUrl) {
    try {
      const url = new URL(audioUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
      if (pathMatch) {
        return decodeURIComponent(pathMatch[1]);
      }
      return audioUrl;
    } catch (error) {
      console.warn(`⚠️ Failed to extract path from URL: ${audioUrl}`);
      return audioUrl;
    }
  }

  // Získej název souboru z URL
  getFileNameFromUrl(url) {
    try {
      // Firebase Storage URL
      if (url.includes('firebasestorage.googleapis.com')) {
        const pathMatch = url.match(/\/o\/(.+?)\?/);
        if (pathMatch) {
          return decodeURIComponent(pathMatch[1]);
        }
      }

      // Lokální URL
      if (url.includes('meditations-audio.web.app/')) {
        const pathMatch = url.match(/meditations-audio\.web\.app\/(.+)$/);
        if (pathMatch) {
          return pathMatch[1];
        }
      }

      // /audio/ klíče
      if (url.includes('/audio/')) {
        return url.split('/audio/')[1];
      }

      // Fallback - použij celou URL
      return url;
    } catch (error) {
      console.warn(`⚠️ Failed to extract filename from URL: ${url}`);
      return url;
    }
  }

  // No-CORS cache uložení
  async cacheFileNoCors(fileName, audioUrl) {
    console.log(`🔄 No-CORS cache for ${fileName}:`, audioUrl);

    try {
      // Zkus no-cors fetch
      const response = await fetch(audioUrl, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'omit'
      });

      if (response.type === 'opaque') {
        console.log(`🔄 Opaque response for ${fileName}, trying to cache...`);

        // Pro opaque response zkus uložit do cache
        const cacheKeys = [
          `/audio/${fileName}`,
          audioUrl,
          fileName
        ];

        let successCount = 0;
        for (const cacheKey of cacheKeys) {
          try {
            console.log(`🔄 No-CORS cache with key: ${cacheKey}`);

            // Zkus uložit opaque response do cache
            await this.cache.put(cacheKey, response.clone());
            successCount++;
            console.log(`✅ Successfully cached opaque response with key: ${cacheKey}`);

            // Zkontroluj, jestli se soubor skutečně uložil
            const cachedResponse = await this.cache.match(cacheKey);
            if (cachedResponse) {
              console.log(`✅ Verified: ${fileName} is in cache with key: ${cacheKey}`);
            } else {
              console.warn(`⚠️ Verification failed: ${fileName} not found in cache with key: ${cacheKey}`);
            }
          } catch (cacheError) {
            console.warn(`⚠️ No-CORS cache error with key ${cacheKey}:`, cacheError.message);
          }
        }

        console.log(`📊 No-CORS cache result for ${fileName}: ${successCount > 0}`);
        return successCount > 0;
      } else {
        console.warn(`⚠️ Non-opaque response for ${fileName}:`, response.type);
        return false;
      }
    } catch (error) {
      console.error(`❌ No-CORS cache failed for ${fileName}:`, error);
      return false;
    }
  }

  // Přímé cache uložení bez fetch
  async cacheFileDirect(fileName, audioUrl) {
    console.log(`🔄 Direct cache for ${fileName}:`, audioUrl);

    try {
      // Vytvoř request pro cache
      const request = new Request(audioUrl, {
        method: 'GET',
        headers: {
          'Accept': 'audio/mpeg, audio/*'
        }
      });

      // Zkus uložit do cache přímo
      const cacheKeys = [
        `/audio/${fileName}`,
        audioUrl,
        fileName
      ];

      let successCount = 0;
      for (const cacheKey of cacheKeys) {
        try {
          console.log(`🔄 Direct cache with key: ${cacheKey}`);

          // Zkus načíst soubor přes Service Worker
          const response = await fetch(request);
          if (response.ok) {
            await this.cache.put(cacheKey, response.clone());
            successCount++;
            console.log(`✅ Direct cached with key: ${cacheKey}`);
          } else {
            console.warn(`⚠️ Direct cache failed with key ${cacheKey}: ${response.status}`);
          }
        } catch (cacheError) {
          console.warn(`⚠️ Direct cache error with key ${cacheKey}:`, cacheError.message);
        }
      }

      return successCount > 0;
    } catch (error) {
      console.error(`❌ Direct cache failed for ${fileName}:`, error);
      return false;
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
           console.log(`🚀 Starting to cache ${audioFiles.length} audio files...`);
           log.debug('📋 Files to cache:', audioFiles.map(f => ({
             fileName: f.fileName || f.name,
             hasUrl: !!(f.downloadURL || f.audioSrc),
             url: f.downloadURL || f.audioSrc
           })));
           console.log('📋 Files to cache:', audioFiles.map(f => ({
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

      console.log(`📊 Starting to cache ${audioFiles.length} files...`);

      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const fileName = file.fileName || file.name;
        const audioUrl = file.downloadURL || file.audioSrc;

           console.log(`\n🔄 Processing file ${i + 1}/${audioFiles.length}: ${fileName}`);
           console.log(`🔗 URL: ${audioUrl}`);
           console.log(`📊 File object:`, file);

           if (!audioUrl) {
             console.warn(`⚠️ No URL for ${fileName}, skipping`);
             log.warn(`⚠️ No URL for ${fileName}, skipping`);
             errorCount++;
             continue;
           }

        // Zkontroluj, jestli už není v cache
        console.log(`🔍 Checking if ${fileName} is already cached...`);
        const isCached = await this.isFileCached(fileName);
        console.log(`📊 Is ${fileName} cached? ${isCached}`);

        if (isCached) {
          console.log(`⏭️ ${fileName} already cached, skipping`);
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
           console.log(`🔄 Caching file ${i + 1}/${audioFiles.length}: ${fileName}`);
           console.log(`🔗 URL: ${audioUrl}`);
           console.log(`📊 Starting cache operation...`);
           const success = await this.cacheFile(fileName, audioUrl);
           console.log(`📊 Cache result for ${fileName}:`, success);
           console.log(`📊 Success count before: ${successCount}, Error count before: ${errorCount}`);
           if (success) {
             successCount++;
             log.success(`✅ Successfully cached: ${fileName}`);
             console.log(`✅ Successfully cached: ${fileName}`);
           } else {
             errorCount++;
             log.error(`❌ Failed to cache: ${fileName}`);
             console.log(`❌ Failed to cache: ${fileName}`);
           }
           console.log(`📊 Success count after: ${successCount}, Error count after: ${errorCount}`);

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
      console.log('🔄 Getting cache stats...');
      log.debug('🔄 Getting cache stats...');
      const keys = await this.cache.keys();
      console.log(`📊 Found ${keys.length} total cache entries`);
      log.debug(`📊 Found ${keys.length} total cache entries`);

      // Zobraz všechny klíče v cache pro debug
      console.log('🔍 All cache keys:', keys.map(key => key.url));

      // Najdi audio soubory - Firebase Storage URL, lokální URL a /audio/ klíče
      const audioKeys = keys.filter(key => {
        const url = key.url;
        return url.includes('.mp3') ||
               url.includes('/audio/') ||
               url.includes('firebasestorage.googleapis.com') ||
               url.includes('meditations-audio.web.app/hudba/') ||
               url.includes('meditations-audio.web.app/slova/');
      });

      console.log(`🎵 Found ${audioKeys.length} audio files in cache`);
      log.debug(`🎵 Found ${audioKeys.length} audio files in cache`);

      // Debug: zobraz typy response pro každý soubor
      for (const key of audioKeys) {
        const response = await this.cache.match(key);
        if (response) {
          const fileName = this.getFileNameFromUrl(key.url);
          console.log(`📊 File: ${fileName}, Response type: ${response.type}, Headers:`, [...response.headers.entries()]);
        }
      }

      // Debug: zobraz všechny klíče v cache
      console.log('🔍 Audio cache keys:', audioKeys.map(key => key.url));
      log.debug('🔍 Audio cache keys:', audioKeys.map(key => key.url));

      // Debug: zobraz slova soubory v cache
      const slovaKeys = audioKeys.filter(key => key.url.includes('slova/'));
      console.log(`🎤 Found ${slovaKeys.length} slova files in cache`);
      log.debug(`🎤 Found ${slovaKeys.length} slova files in cache`);
      console.log('🎤 Slova cache keys:', slovaKeys.map(key => key.url));
      log.debug('🎤 Slova cache keys:', slovaKeys.map(key => key.url));

      let totalSize = 0;
      const files = [];

      for (const key of audioKeys) {
        const response = await this.cache.match(key);
        if (response) {
          let size = 0;

          // Získej název souboru z URL
          const fileName = this.getFileNameFromUrl(key.url);

          // Pro opaque responses (no-cors mode) nemůžeme získat skutečnou velikost
          if (response.type === 'opaque') {
            // Odhadni velikost na základě názvu souboru nebo použij výchozí hodnotu
            if (fileName.includes('slova/')) {
              size = 5000000; // 5MB pro slova soubory
            } else if (fileName.includes('ambient-journey/')) {
              size = 15000000; // 15MB pro ambient journey
            } else if (fileName.includes('generator') || fileName.includes('meditacie') || fileName.includes('noise-generator')) {
              size = 20000000; // 20MB pro generátory
            } else {
              size = 10000000; // 10MB pro ostatní hudbu
            }
            log.debug(`📁 File: ${fileName}, Estimated size: ${this.formatFileSize(size)} (opaque response)`);
          } else {
            // Zkus získat velikost z content-length header
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > 0) {
              size = parseInt(contentLength);
              log.debug(`📁 File: ${fileName}, Size from header: ${this.formatFileSize(size)}`);
            } else {
              // Fallback: zkus získat velikost z blob
              try {
                const blob = await response.blob();
                size = blob.size;
                log.debug(`📁 File: ${fileName}, Size from blob: ${this.formatFileSize(size)}`);
              } catch (blobError) {
                log.debug(`⚠️ Could not get blob size for ${fileName}:`, blobError);
                // Pokud ani blob nefunguje, zkus arrayBuffer
                try {
                  const arrayBuffer = await response.arrayBuffer();
                  size = arrayBuffer.byteLength;
                  log.debug(`📁 File: ${fileName}, Size from arrayBuffer: ${this.formatFileSize(size)}`);
                } catch (arrayBufferError) {
                  log.debug(`⚠️ Could not get arrayBuffer size for ${fileName}:`, arrayBufferError);
                  size = 0;
                }
              }
            }
          }

          totalSize += size;

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
      log.info('🗑️ Clearing offline cache...');
      console.log('🗑️ Clearing offline cache...');

      // Získej všechny klíče v cache
      const keys = await this.cache.keys();
      console.log(`🗑️ Found ${keys.length} total keys`);

      // Najdi audio soubory
      const audioKeys = keys.filter(key => {
        const url = key.url;
        return url.includes('.mp3') ||
               url.includes('/audio/') ||
               url.includes('firebasestorage.googleapis.com') ||
               url.includes('meditations-audio.web.app/hudba/') ||
               url.includes('meditations-audio.web.app/slova/');
      });

      console.log(`🗑️ Found ${audioKeys.length} audio files to delete`);

      // Smaž všechny audio soubory
      let deletedCount = 0;
      for (const key of audioKeys) {
        try {
          await this.cache.delete(key);
          deletedCount++;
        } catch (deleteError) {
          console.warn(`⚠️ Failed to delete key: ${key.url}`, deleteError);
        }
      }

      console.log(`🗑️ Deleted ${deletedCount} audio cache entries`);
      log.info(`🧹 Cache cleared: ${deletedCount} files removed`);
      return true;
    } catch (error) {
      log.error('❌ Error clearing cache:', error);
      console.error('❌ Error clearing cache:', error);
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
