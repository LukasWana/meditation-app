import { BaseMetadataService } from './metadata/BaseMetadataService.js';

class StaticMetadataService extends BaseMetadataService {
  constructor() {
    super({
      localStorageKey: 'audio-metadata-cache',
      cacheExpiry: 48 * 60 * 60 * 1000 // 48 hodin (prodlouženo)
    });
    this.metadata = null;
  }

  loadFromLocalCache() {
    const result = super.loadFromLocalCache();
    if (result) {
      // Synchronizuj metadata property s cache
      this.metadata = Object.fromEntries(this.cache);
    }
    return result;
  }

  async loadAllMetadata() {
    if (this.isLoading) {
      return this.metadata;
    }

    this.isLoading = true;

    try {
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

  async getMetadata(fileName) {
    // Použij base class metodu pro cache lookup
    return this.getCachedMetadata(fileName);
  }

  getAllFromCache() {
    return Object.fromEntries(this.cache);
  }

  hasInCache(fileName) {
    return this.cache.has(fileName);
  }

  clearCache() {
    super.clearCache();
    this.metadata = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    if (this.isLoading) return;

    // Nejdříve zkus načíst z localStorage
    if (this.loadFromLocalCache()) {
      this.isInitialized = true;
      return;
    }

    // Pokud není v localStorage, načti z JSON souboru
    try {
      await this.loadAllMetadata();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize metadata service:', error);
    }
  }
}

// Singleton instance
export const staticMetadataService = new StaticMetadataService();
export default staticMetadataService;
