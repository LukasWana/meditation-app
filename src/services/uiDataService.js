import { realtimeDatabase as database } from '@config/secure-firebase';
import { ref, get, onValue, off } from 'firebase/database';
import log from './logger';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * UI Data Service
 * Načítá všechna UI data (texty, překlady, konfigurace) z Realtime Database
 */
class UIDataService {
  constructor() {
    this.listeners = new Map();
    this.uiData = null;
    this.cacheKey = 'meditation-app-ui-data';
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hodin
    this.databaseReadyPromise = null;
  }

  async ensureDatabaseReady(timeout = 5000) {
    if (database) {
      return database;
    }

    if (!this.databaseReadyPromise) {
      this.databaseReadyPromise = new Promise((resolve, reject) => {
        const start = Date.now();

        const check = async () => {
          if (database) {
            this.databaseReadyPromise = null;
            resolve(database);
            return;
          }

          if (Date.now() - start >= timeout) {
            this.databaseReadyPromise = null;
            reject(new Error('Firebase Realtime Database is not ready yet'));
            return;
          }

          await wait(50);
          return check();
        };

        check();
      });
    }

    return this.databaseReadyPromise;
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
      const dbInstance = await this.ensureDatabaseReady();
      const uiDataRef = ref(dbInstance, 'ui-data');
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
   * @returns {Object} Defaultní UI data
   */
  getDefaultUIData() {
    return {
      translations: {
        SK: {
          hudba: 'hudba',
          slova: 'meditácia',
          meditacia: 'dýchanie',
          nastavenie: 'nastavenie',
          pomoc: 'pomoc',
          loading: 'načítam...',
          galeriaZvukovychTemat: 'galéria zvukových tém',
          vyberteZvuky: 'Vyberte zvuky',
          zvolteZvukNadech: 'nádech',
          zvolteZvukVydech: 'výdech',
          ziadnyZvuk: 'žiadny zvuk',
          zobrazitGaleriu: 'zobraziť galériu'
        },
        CZ: {
          hudba: 'hudba',
          slova: 'meditace',
          meditacia: 'dýchání',
          nastavenie: 'nastavení',
          pomoc: 'pomoc',
          loading: 'načítám...',
          galeriaZvukovychTemat: 'galerie zvukových témat',
          vyberteZvuky: 'Vyberte zvuky',
          zvolteZvukNadech: 'nádech',
          zvolteZvukVydech: 'výdech',
          ziadnyZvuk: 'žádný zvuk',
          zobrazitGaleriu: 'zobrazit galerii'
        },
        EN: {
          hudba: 'music',
          slova: 'meditation',
          meditacia: 'breathing',
          nastavenie: 'settings',
          pomoc: 'help',
          loading: 'loading...',
          galeriaZvukovychTemat: 'sound theme gallery',
          vyberteZvuky: 'Select sounds',
          zvolteZvukNadech: 'sound for inhale',
          zvolteZvukVydech: 'sound for exhale',
          ziadnyZvuk: 'no sound',
          zobrazitGaleriu: 'show gallery'
        }
      },
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
      texts: {
        emptyState: {
          SK: 'Žádné soubory nenalezeny',
          CZ: 'Žádné soubory nenalezeny',
          EN: 'No files found'
        },
        selected: {
          SK: '✓ Vybráno',
          CZ: '✓ Vybráno',
          EN: '✓ Selected'
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
    let unsubscribe = null;
    let isActive = true;

    const startListener = async () => {
      try {
        const dbInstance = await this.ensureDatabaseReady();
        if (!isActive) {
          return;
        }

        const uiDataRef = ref(dbInstance, 'ui-data');

        const listener = onValue(uiDataRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            log.debug('📡 Real-time UI data update received');

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

        unsubscribe = () => {
          off(uiDataRef, 'value', listener);
          this.listeners.delete('ui-data');
          log.debug('✅ Stopped watching UI data');
        };

        this.listeners.set('ui-data', unsubscribe);
      } catch (error) {
        log.error('❌ Failed to watch UI data:', error);
      }
    };

    startListener();

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }

  /**
   * Získá aktuální UI data (bez načítání z DB)
   * @returns {Object|null} Aktuální UI data nebo null
   */
  getUIData() {
    return this.uiData;
  }

  /**
   * Získá překlady pro konkrétní jazyk
   * @param {string} language - Jazyk kódu (SK, CZ, EN)
   * @returns {Object} Překlady pro daný jazyk
   */
  getTranslations(language) {
    if (!this.uiData || !this.uiData.translations) {
      const defaults = this.getDefaultUIData();
      return defaults.translations[language] || defaults.translations.SK;
    }
    return this.uiData.translations[language] || this.uiData.translations.SK || {};
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
   * Získá texty pro konkrétní jazyk
   * @param {string} language - Jazyk kódu (SK, CZ, EN)
   * @returns {Object} Texty pro daný jazyk
   */
  getTexts(_language) {
    if (!this.uiData || !this.uiData.texts) {
      const defaults = this.getDefaultUIData();
      return defaults.texts;
    }
    return this.uiData.texts;
  }

  /**
   * Vyčistí všechny listeners
   */
  cleanup() {
    this.listeners.forEach((unsubscribe, key) => {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
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

