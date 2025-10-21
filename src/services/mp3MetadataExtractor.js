import log from './logger';

class MP3MetadataExtractor {
  constructor() {
    this.metadataCache = new Map();
    this.loadingPromises = new Map();
  }

  async extractMetadata(audioUrl, fileName) {
    // Zkontroluj cache
    if (this.metadataCache.has(fileName)) {
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
      this.metadataCache.set(fileName, metadata);
      return metadata;
    } finally {
      this.loadingPromises.delete(fileName);
    }
  }

  async _loadMetadata(audioUrl, fileName) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();

      // Nastav timeout
      const timeout = setTimeout(() => {
        audio.remove();
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
        clearTimeout(timeout);
        audio.remove();

        const metadata = {
          duration: audio.duration || null,
          durationFormatted: this._formatDuration(audio.duration),
          title: this._extractTitleFromFileName(fileName),
          artist: null, // MP3 tagy nebudeme číst kvůli CORS
          album: null,
          loaded: true,
          fileName: fileName
        };

        // log.debug(`✅ Metadata loaded for ${fileName}:`, metadata);
        resolve(metadata);
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        audio.remove();
        log.warn(`❌ Failed to load metadata for ${fileName}:`, error.message);

        resolve({
          duration: null,
          durationFormatted: 'N/A',
          title: this._extractTitleFromFileName(fileName),
          artist: null,
          album: null,
          loaded: false,
          error: error.message
        });
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);

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

  async loadMetadataBatch(files, batchSize = 3) {
    log.info(`🎵 Loading metadata for ${files.length} files in batches of ${batchSize}`);

    const results = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      log.debug(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`);

      const batchPromises = batch.map(file =>
        this.extractMetadata(file.downloadURL, file.fileName)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Krátká pauza mezi batch
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    log.success(`✅ Metadata loaded for ${results.length} files`);
    return results;
  }

  getCachedMetadata(fileName) {
    return this.metadataCache.get(fileName) || null;
  }

  clearCache() {
    this.metadataCache.clear();
    this.loadingPromises.clear();
    log.info('🧹 MP3 metadata cache cleared');
  }

  getCacheStats() {
    return {
      cachedFiles: this.metadataCache.size,
      loadingFiles: this.loadingPromises.size,
      loadedFiles: Array.from(this.metadataCache.values()).filter(m => m.loaded).length
    };
  }
}

// Singleton instance
const mp3MetadataExtractor = new MP3MetadataExtractor();

export default mp3MetadataExtractor;