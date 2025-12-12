

class StaticMetadataService {
  constructor() {
    this.metadata = null;
    this.isLoading = false;
    this.isInitialized = false;
    this.cache = new Map();
    this.localStorageKey = 'audio-metadata-cache';
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hodin
  }

  loadFromLocalCache() {
    try {
      const cached = localStorage.getItem(this.localStorageKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Zkontroluj, jestli cache není starší než 48 hodin (prodlouženo)
        if (now - timestamp < (48 * 60 * 60 * 1000)) {
          console.log(`⚡ Fast load: ${Object.keys(data).length} metadata records from localStorage cache`);
          this.metadata = data;
          this.cache = new Map(Object.entries(data));
          return true;
        } else {
          console.log('Local cache expired, clearing');
          localStorage.removeItem(this.localStorageKey);
        }
      }
    } catch (error) {
      console.warn('Failed to load from local cache:', error);
    }
    return false;
  }

  saveToLocalCache() {
    try {
      const data = Object.fromEntries(this.cache);
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(cacheData));
      console.log('Metadata saved to local cache');
    } catch (error) {
      console.warn('Failed to save to local cache:', error);
    }
  }

  async getAllMetadata() {
    if (this.isLoading) {
      return this.metadata;
    }

    this.isLoading = true;

    try {
      console.log('Loading metadata from JSON file (non-blocking)...');

      // Použij AbortController pro možnost zrušení requestu
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('/audio-metadata.json', {
        signal: controller.signal,
        priority: 'low' // Nízká priorita pro neblokování animací
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metadata = await response.json();

      this.metadata = metadata;
      this.cache = new Map(Object.entries(metadata));

      console.log(`✅ Loaded ${Object.keys(metadata).length} metadata records from JSON`);

      // Ulož do localStorage asynchronně v pozadí
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          this.saveToLocalCache();
        });
      } else {
        setTimeout(() => this.saveToLocalCache(), 100);
      }

      return metadata;
    } catch (error) {
      console.error('Failed to load metadata from JSON:', error);

      // Fallback na local cache
      if (this.loadFromLocalCache()) {
        return this.metadata;
      }

      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  getMetadata(fileName) {
    // Nejdříve zkontroluj memory cache
    if (this.cache.has(fileName)) {
      return this.cache.get(fileName);
    }

    // Zkontroluj localStorage cache
    if (this.loadFromLocalCache() && this.cache.has(fileName)) {
      return this.cache.get(fileName);
    }

    return null;
  }

  getAllFromCache() {
    return Object.fromEntries(this.cache);
  }

  hasInCache(fileName) {
    return this.cache.has(fileName);
  }

  clearCache() {
    this.cache.clear();
    this.metadata = null;
    localStorage.removeItem(this.localStorageKey);
    console.log('Metadata cache cleared');
  }

  async initialize(forceReload = false) {
    // Guard proti vícenásobné inicializaci
    if (this.isInitialized && !forceReload) {
      return;
    }

    // Pokud už probíhá načítání, počkej
    if (this.isLoading) {
      let waitCount = 0;
      while (this.isLoading && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      if (this.isInitialized) {
        return;
      }
    }

    console.log('Initializing StaticMetadataService...');

    if (forceReload) {
      this.cache.clear();
      this.metadata = null;
      this.isInitialized = false;
      localStorage.removeItem(this.localStorageKey);
    }

    // Nejdříve zkus načíst z localStorage
    if (!forceReload && this.loadFromLocalCache()) {
      console.log('Metadata loaded from local cache');
      this.isInitialized = true;
      return;
    }

    // Pokud není v localStorage, načti z JSON souboru
    try {
      await this.getAllMetadata();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize metadata service:', error);
    }
  }
}

// Singleton instance
export const staticMetadataService = new StaticMetadataService();
export default staticMetadataService;
