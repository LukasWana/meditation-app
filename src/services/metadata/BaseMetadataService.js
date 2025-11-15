/**
 * Base class pro všechny metadata služby
 * Poskytuje společnou funkcionalitu pro cache management a základní operace
 */
import log from '../logger';

export class BaseMetadataService {
  constructor(config = {}) {
    // Cache management
    this.cache = new Map();
    this.localStorageKey = config.localStorageKey || 'metadata-cache';
    this.cacheExpiry = config.cacheExpiry || 24 * 60 * 60 * 1000; // 24 hodin default

    // State management
    this.isLoading = false;
    this.isInitialized = false;

    // Service specific config
    this.config = config;
  }

  /**
   * Načte data z localStorage cache
   * @returns {boolean} true pokud byla cache načtena, false jinak
   */
  loadFromLocalCache() {
    try {
      const cached = localStorage.getItem(this.localStorageKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Zkontroluj, jestli cache není starší než cacheExpiry
        if (now - timestamp < this.cacheExpiry) {
          this.cache = new Map(Object.entries(data));
          log.debug(`✅ Loaded from localStorage cache: ${this.localStorageKey}`);
          return true;
        } else {
          localStorage.removeItem(this.localStorageKey);
          log.debug(`🗑️ LocalStorage cache expired: ${this.localStorageKey}`);
        }
      }
    } catch (error) {
      log.warn(`Failed to load from localStorage cache (${this.localStorageKey}):`, error);
    }
    return false;
  }

  /**
   * Uloží data do localStorage cache
   */
  saveToLocalCache() {
    try {
      const data = Object.fromEntries(this.cache);
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(cacheData));
      log.debug(`✅ Saved to localStorage cache: ${this.localStorageKey}`);
    } catch (error) {
      log.warn(`Failed to save to localStorage cache (${this.localStorageKey}):`, error);
    }
  }

  /**
   * Vymaže cache (memory + localStorage)
   */
  clearCache() {
    this.cache.clear();
    try {
      localStorage.removeItem(this.localStorageKey);
    } catch (error) {
      log.warn(`Failed to clear localStorage cache (${this.localStorageKey}):`, error);
    }
    log.debug(`🧹 Cache cleared: ${this.localStorageKey}`);
  }

  /**
   * Zkontroluje, jestli je cache platná
   * @returns {boolean} true pokud je cache platná
   */
  isCacheValid() {
    try {
      const cached = localStorage.getItem(this.localStorageKey);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        const now = Date.now();
        return (now - timestamp < this.cacheExpiry);
      }
    } catch (error) {
      // Ignore errors
    }
    return false;
  }

  /**
   * Získá metadata z cache (memory nebo localStorage)
   * @param {string} fileName - Název souboru
   * @returns {object|null} Metadata nebo null
   */
  getCachedMetadata(fileName) {
    // Zkus memory cache
    if (this.cache.has(fileName)) {
      return this.cache.get(fileName);
    }

    // Zkus localStorage cache
    if (this.loadFromLocalCache() && this.cache.has(fileName)) {
      return this.cache.get(fileName);
    }

    return null;
  }

  /**
   * Uloží metadata do cache
   * @param {string} fileName - Název souboru
   * @param {object} metadata - Metadata objekt
   */
  setCachedMetadata(fileName, metadata) {
    this.cache.set(fileName, metadata);
  }

  /**
   * Zkontroluje, jestli je služba inicializovaná
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && !this.isLoading;
  }

  /**
   * Získá velikost cache
   * @returns {number} Počet položek v cache
   */
  getCacheSize() {
    return this.cache.size;
  }

  // ===== ABSTRAKTNÍ METODY (musí implementovat potomci) =====

  /**
   * Načte všechna metadata
   * @abstract
   * @returns {Promise<Map|Object>} Metadata
   */
  async loadAllMetadata() {
    throw new Error('loadAllMetadata() must be implemented by subclass');
  }

  /**
   * Získá metadata pro konkrétní soubor
   * @abstract
   * @param {string} fileName - Název souboru
   * @returns {Promise<object|null>} Metadata nebo null
   */
  // eslint-disable-next-line no-unused-vars
  async getMetadata(_fileName) {
    throw new Error('getMetadata() must be implemented by subclass');
  }

  /**
   * Inicializuje službu
   * @abstract
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }
}

export default BaseMetadataService;



