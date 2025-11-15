import log from './logger';

class MP3MetadataExtractor {
  constructor() {
    this.metadataCache = new Map();
    this.loadingPromises = new Map();
    this.maxCacheSize = 100; // LRU cache limit
    this.accessOrder = []; // Pro LRU tracking
  }

  async extractMetadata(audioUrl, fileName) {
    // Zkontroluj cache
    if (this.metadataCache.has(fileName)) {
      // Aktualizuj access order pro LRU
      this._updateAccessOrder(fileName);
      log.debug(`🎵 Using cached metadata for ${fileName}`);
      return this.metadataCache.get(fileName);
    }

    // Zkontroluj, jestli se už načítá
    if (this.loadingPromises.has(fileName)) {
      log.debug(`🎵 Waiting for existing load for ${fileName}`);
      return await this.loadingPromises.get(fileName);
    }

    // Spusť načítání
    const loadPromise = this._loadMetadata(audioUrl, fileName);
    this.loadingPromises.set(fileName, loadPromise);

    try {
      const metadata = await loadPromise;
      this._setCachedMetadata(fileName, metadata);
      return metadata;
    } finally {
      this.loadingPromises.delete(fileName);
    }
  }

  // LRU cache management
  _updateAccessOrder(fileName) {
    // Odstraň z aktuální pozice
    const index = this.accessOrder.indexOf(fileName);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    // Přidej na konec (nejnovější)
    this.accessOrder.push(fileName);
  }

  _setCachedMetadata(fileName, metadata) {
    // Pokud cache je plná, odstraň nejstarší položku
    if (this.metadataCache.size >= this.maxCacheSize && !this.metadataCache.has(fileName)) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.metadataCache.delete(oldestKey);
        log.debug(`🧹 LRU cache: removed oldest entry ${oldestKey}`);
      }
    }

    // Přidej novou položku
    this.metadataCache.set(fileName, metadata);
    this._updateAccessOrder(fileName);
  }

  async _loadMetadata(audioUrl, fileName) {
    return new Promise((resolve) => {
      const audio = new Audio();
      let isResolved = false;

      // Helper funkce pro cleanup
      const cleanup = () => {
        if (isResolved) return;
        isResolved = true;

        // Odstraň všechny event listenery před odstraněním audio elementu
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('abort', handleAbort);

        // Vyčisti audio element
        audio.src = '';
        audio.load();
        audio.remove();
      };

      // Nastav timeout
      const timeout = setTimeout(() => {
        cleanup();
        log.warn(`⏰ Timeout loading metadata for ${fileName}`);
        resolve({
          duration: null,
          durationFormatted: 'N/A',
          title: this._extractTitleFromFileName(fileName),
          artist: null,
          album: null,
          loaded: false
        });
      }, 10000); // 10 sekund timeout

      const handleLoadedMetadata = () => {
        if (isResolved) return;
        clearTimeout(timeout);

        const metadata = {
          duration: audio.duration || null,
          durationFormatted: this._formatDuration(audio.duration),
          title: this._extractTitleFromFileName(fileName),
          artist: null, // MP3 tagy nebudeme číst kvůli CORS
          album: null,
          loaded: true,
          fileName: fileName
        };

        cleanup();
        resolve(metadata);
      };

      const handleError = (error) => {
        if (isResolved) return;
        clearTimeout(timeout);
        log.warn(`❌ Failed to load metadata for ${fileName}:`, error?.message || 'Unknown error');

        cleanup();
        resolve({
          duration: null,
          durationFormatted: 'N/A',
          title: this._extractTitleFromFileName(fileName),
          artist: null,
          album: null,
          loaded: false,
          error: error?.message || 'Unknown error'
        });
      };

      const handleAbort = () => {
        if (isResolved) return;
        clearTimeout(timeout);
        cleanup();
        resolve({
          duration: null,
          durationFormatted: 'N/A',
          title: this._extractTitleFromFileName(fileName),
          artist: null,
          album: null,
          loaded: false,
          error: 'Load aborted'
        });
      };

      // Přidej event listenery
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);
      audio.addEventListener('abort', handleAbort);

      // Nastav src a spusť načítání
      audio.src = audioUrl;
      audio.preload = 'metadata';
    });
  }

  _extractTitleFromFileName(fileName) {
    // Odstraň .mp3 příponu
    const nameWithoutExt = fileName.replace(/\.mp3$/i, '');

    // Pro slova: odstran prefixy jako "zensky4FSK-", "muzsky4FSK-"
    if (nameWithoutExt.includes('4FSK-')) {
      return nameWithoutExt.replace(/^(zensky|muzsky)4FSK-/, '');
    }

    // Pro hudba: použij celý název
    return nameWithoutExt;
  }

  _formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'N/A';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async loadMetadataBatch(files, concurrency = 5) {
    log.info(`🎵 Loading metadata for ${files.length} files with concurrency limit of ${concurrency}`);

    const results = [];
    const executing = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Vytvoř promise pro načtení metadata
      const promise = this.extractMetadata(file.downloadURL, file.fileName)
        .then(metadata => {
          // Odstraň z executing po dokončení
          executing.splice(executing.indexOf(promise), 1);
          return metadata;
        })
        .catch(error => {
          log.warn(`⚠️ Failed to load metadata for ${file.fileName}:`, error.message);
          executing.splice(executing.indexOf(promise), 1);
          return null;
        });

      executing.push(promise);
      results.push(promise);

      // Pokud dosáhneme concurrency limitu, počkej na dokončení jednoho
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }

      // Yield control back to browser každých 10 souborů pro plynulé UI
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Počkej na dokončení všech zbývajících
    await Promise.all(executing);

    // Získej výsledky z promises
    const resolvedResults = await Promise.all(results);

    log.success(`✅ Metadata loaded for ${resolvedResults.filter(r => r !== null).length}/${files.length} files`);
    return resolvedResults;
  }

  getCachedMetadata(fileName) {
    return this.metadataCache.get(fileName) || null;
  }

  clearCache() {
    this.metadataCache.clear();
    this.loadingPromises.clear();
    this.accessOrder = [];
    log.info('🧹 MP3 metadata cache cleared');
  }

  getCacheStats() {
    return {
      cachedFiles: this.metadataCache.size,
      maxCacheSize: this.maxCacheSize,
      loadingFiles: this.loadingPromises.size,
      loadedFiles: Array.from(this.metadataCache.values()).filter(m => m.loaded).length,
      cacheUtilization: `${this.metadataCache.size}/${this.maxCacheSize} (${Math.round((this.metadataCache.size / this.maxCacheSize) * 100)}%)`
    };
  }
}

// Singleton instance
const mp3MetadataExtractor = new MP3MetadataExtractor();

export default mp3MetadataExtractor;