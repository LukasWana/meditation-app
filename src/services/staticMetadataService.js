/**
 * Jednoduchá služba pro načítání metadat z statického JSON souboru
 * Rychlé řešení bez Firestore chyb
 */

class StaticMetadataService {
  constructor() {
    this.metadata = null;
    this.isLoading = false;
    this.cache = new Map();
    this.localStorageKey = 'audio-metadata-cache';
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hodin
  }

  /**
   * Načte metadata ze localStorage (offline cache)
   */
  loadFromLocalCache() {
    try {
      const cached = localStorage.getItem(this.localStorageKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Zkontroluj, jestli cache není starší než 24 hodin
        if (now - timestamp < this.cacheExpiry) {
          console.log('Loading metadata from local cache');
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

  /**
   * Uloží metadata do localStorage (offline cache)
   */
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

  /**
   * Načte metadata z JSON souboru
   */
  async loadMetadata() {
    if (this.isLoading) {
      return this.metadata;
    }

    this.isLoading = true;

    try {
      console.log('Loading metadata from JSON file...');

      const response = await fetch('/audio-metadata.json');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metadata = await response.json();

      this.metadata = metadata;
      this.cache = new Map(Object.entries(metadata));

      console.log(`Loaded ${Object.keys(metadata).length} metadata records from JSON`);

      // Ulož do localStorage pro offline použití
      this.saveToLocalCache();

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

  /**
   * Získá metadata pro konkrétní soubor
   */
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

  /**
   * Získá všechna metadata z cache (bez síťového requestu)
   */
  getAllFromCache() {
    return Object.fromEntries(this.cache);
  }

  /**
   * Zkontroluje, jestli máme metadata v cache
   */
  hasInCache(fileName) {
    return this.cache.has(fileName);
  }

  /**
   * Vyčistí cache
   */
  clearCache() {
    this.cache.clear();
    this.metadata = null;
    localStorage.removeItem(this.localStorageKey);
    console.log('Metadata cache cleared');
  }

  /**
   * Inicializace - načte cache při startu
   */
  async initialize() {
    console.log('Initializing StaticMetadataService...');

    // Nejdříve zkus načíst z localStorage
    if (this.loadFromLocalCache()) {
      console.log('Metadata loaded from local cache');
      return;
    }

    // Pokud není v localStorage, načti z JSON souboru
    try {
      await this.loadMetadata();
    } catch (error) {
      console.warn('Failed to initialize metadata service:', error);
    }
  }
}

// Singleton instance
export const staticMetadataService = new StaticMetadataService();
export default staticMetadataService;
