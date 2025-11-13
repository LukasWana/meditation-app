import { database } from './firebase';
import { ref, get, onValue, off } from 'firebase/database';
import log from './logger';

/**
 * UI Data Service
 * Načítá všechna UI data (texty, překlady, konfigurace) z Realtime Database
 */
class UIDataService {
  constructor() {
    this.database = database;
    this.listeners = new Map();
    this.uiData = null;
    this.cacheKey = 'meditation-app-ui-data';
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hodin
  }

  /**
   * Načte všechna UI data z Realtime Database
   * @returns {Promise<Object>} UI data obsahující translations, config, texts
   */
  async loadUIData() {
    try {
      // Nejdříve zkus cache
      const cached = this.loadFromCache();
      if (cached) {
        log.debug('✅ UI data loaded from cache');
        this.uiData = cached;
        return cached;
      }

      // Pokud cache není, načti z DB
      const uiDataRef = ref(this.database, 'ui-data');
      const snapshot = await get(uiDataRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        log.debug('✅ UI data loaded from Realtime Database');

        // Ulož do cache
        this.saveToCache(data);
        this.uiData = data;

        return data;
      } else {
        log.warn('⚠️ No UI data found in Realtime Database, using defaults');
        const defaults = this.getDefaultUIData();
        this.uiData = defaults;
        return defaults;
      }
    } catch (error) {
      log.error('❌ Failed to load UI data:', error);

      // Fallback na cache nebo defaultní hodnoty
      const cached = this.loadFromCache();
      if (cached) {
        log.debug('✅ Using cached UI data as fallback');
        this.uiData = cached;
        return cached;
      }

      const defaults = this.getDefaultUIData();
      this.uiData = defaults;
      return defaults;
    }
  }

  /**
   * Vrátí defaultní UI data (fallback)
   * @returns {Object} Defaultní UI data - pouze config, texty jsou v LanguageContext
   */
  getDefaultUIData() {
    return {
      config: {
        colors: {
          primary: '#f4ddc4',
          secondary: '#000000',
          background: '#f4ddc4'
        },
        layout: {
          defaultLayout: 'grid'
        }
      },
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Načte UI data z localStorage cache
   * @returns {Object|null} Cachovaná UI data nebo null
   */
  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      // Kontrola expirace
      if (parsed.expiresAt && parsed.expiresAt < now) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return parsed.data;
    } catch (error) {
      log.warn('⚠️ Failed to load UI data from cache:', error);
      return null;
    }
  }

  /**
   * Uloží UI data do localStorage cache
   * @param {Object} data - UI data k uložení
   */
  saveToCache(data) {
    try {
      const cacheData = {
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + this.cacheExpiry
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      log.debug('💾 UI data saved to cache');
    } catch (error) {
      log.warn('⚠️ Failed to save UI data to cache:', error);
    }
  }

  /**
   * Sleduje změny UI dat v Realtime Database
   * @param {Function} callback - Callback funkce při změně dat
   * @returns {Function} Cleanup funkce
   */
  watchUIData(callback) {
    try {
      const uiDataRef = ref(this.database, 'ui-data');

      const listener = onValue(uiDataRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          log.debug('📡 Real-time UI data update received');

          // Ulož do cache
          this.saveToCache(data);
          this.uiData = data;

          callback(data);
        } else {
          log.debug('📡 Real-time UI data update: no data');
          callback(null);
        }
      }, (error) => {
        log.error('❌ Real-time UI data listener error:', error);
      });

      // Ulož listener pro cleanup
      this.listeners.set('ui-data', listener);

      // Vrať cleanup funkci
      return () => {
        off(uiDataRef, 'value', listener);
        this.listeners.delete('ui-data');
        log.debug('✅ Stopped watching UI data');
      };
    } catch (error) {
      log.error('❌ Failed to watch UI data:', error);
      throw error;
    }
  }

  /**
   * Získá aktuální UI data (bez načítání z DB)
   * @returns {Object|null} Aktuální UI data nebo null
   */
  getUIData() {
    return this.uiData;
  }

  /**
   * Získá UI konfiguraci
   * @returns {Object} UI konfigurace
   */
  getConfig() {
    if (!this.uiData || !this.uiData.config) {
      const defaults = this.getDefaultUIData();
      return defaults.config;
    }
    return this.uiData.config;
  }

  /**
   * Vyčistí všechny listeners
   */
  cleanup() {
    this.listeners.forEach((listener, key) => {
      try {
        const uiDataRef = ref(this.database, key);
        off(uiDataRef, 'value', listener);
      } catch (error) {
        log.warn(`⚠️ Failed to cleanup listener for ${key}:`, error);
      }
    });
    this.listeners.clear();
  }
}

// Singleton instance
export const uiDataService = new UIDataService();
export default uiDataService;

