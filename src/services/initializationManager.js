/**
 * Initialization Manager
 * Orchestrace inicializace všech services v aplikaci
 */

import SERVICE_REGISTRY, { getAllServices, getServicesByCategory } from './serviceRegistry';
import log from './logger';

/**
 * Stav inicializace service
 * @typedef {Object} ServiceStatus
 * @property {string} name - Název service
 * @property {string} category - Kategorie service
 * @property {boolean} initialized - Zda je service inicializovaný
 * @property {boolean} loading - Zda se právě inicializuje
 * @property {Error|null} error - Chyba při inicializaci (pokud nějaká)
 * @property {number} priority - Priorita inicializace
 */

class InitializationManager {
  constructor() {
    this.status = new Map(); // service -> ServiceStatus
    this.initializationPromises = new Map(); // service -> Promise
    this.isInitializing = false;
    this.retryAttempts = new Map(); // service -> number of attempts
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 sekunda
  }

  /**
   * Inicializuje všechny services podle priority
   * @param {boolean} forceReload - Zda vynutit reload všech services
   * @param {Function} onProgress - Callback pro sledování průběhu (service, status)
   * @returns {Promise<Object>} Výsledek inicializace s detaily
   */
  async initializeAll(forceReload = false, onProgress = null) {
    if (this.isInitializing && !forceReload) {
      log.warn('⚠️ Initialization already in progress');
      return this.getInitializationStatus();
    }

    this.isInitializing = true;
    log.info('🚀 Starting initialization of all services...');

    const allServices = getAllServices();
    const results = {
      total: allServices.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      // Inicializuj services podle priority
      for (const entry of allServices) {
        const serviceName = this._getServiceName(entry);
        const category = this._getServiceCategory(entry);

        try {
          if (onProgress) {
            onProgress(entry.service, { status: 'initializing', category, name: serviceName });
          }

          const success = await this.initializeService(entry, forceReload);

          if (success) {
            results.successful++;
            log.success(`✅ ${category}.${serviceName} initialized successfully`);
          } else {
            results.skipped++;
            log.debug(`⏭️ ${category}.${serviceName} skipped (already initialized)`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            service: `${category}.${serviceName}`,
            error: error.message
          });
          log.error(`❌ ${category}.${serviceName} initialization failed:`, error);
        }
      }

      log.success(`✅ Initialization completed: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`);
    } finally {
      this.isInitializing = false;
    }

    return {
      ...results,
      status: this.getInitializationStatus()
    };
  }

  /**
   * Inicializuje services z konkrétní kategorie
   * @param {string} category - Název kategorie
   * @param {boolean} forceReload - Zda vynutit reload
   * @param {Function} onProgress - Callback pro sledování průběhu
   * @returns {Promise<Object>} Výsledek inicializace
   */
  async initializeCategory(category, forceReload = false, onProgress = null) {
    log.info(`🚀 Starting initialization of ${category} services...`);

    const categoryServices = getServicesByCategory(category);
    const results = {
      category,
      total: categoryServices.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const entry of categoryServices) {
      const serviceName = this._getServiceName(entry);

      try {
        if (onProgress) {
          onProgress(entry.service, { status: 'initializing', category, name: serviceName });
        }

        const success = await this.initializeService(entry, forceReload);

        if (success) {
          results.successful++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          service: `${category}.${serviceName}`,
          error: error.message
        });
        log.error(`❌ ${category}.${serviceName} initialization failed:`, error);
      }
    }

    log.success(`✅ ${category} initialization completed: ${results.successful} successful, ${results.failed} failed`);
    return results;
  }

  /**
   * Inicializuje konkrétní service s retry logikou
   * @param {Object} entry - Service entry z registry
   * @param {boolean} forceReload - Zda vynutit reload
   * @returns {Promise<boolean>} Zda byla inicializace úspěšná
   */
  async initializeService(entry, forceReload = false) {
    const service = entry.service;
    const serviceKey = this._getServiceKey(entry);

    // Zkontroluj, jestli už není inicializovaný
    const status = this.status.get(serviceKey);
    if (status && status.initialized && !forceReload) {
      return false; // Už je inicializovaný
    }

    // Zkontroluj, jestli se právě inicializuje
    if (status && status.loading) {
      const promise = this.initializationPromises.get(serviceKey);
      if (promise) {
        await promise;
        return this.status.get(serviceKey)?.initialized || false;
      }
    }

    // Aktualizuj status
    this._updateStatus(serviceKey, {
      initialized: false,
      loading: true,
      error: null
    });

    // Vytvoř promise pro inicializaci
    const initPromise = this._initializeWithRetry(service, serviceKey, forceReload);
    this.initializationPromises.set(serviceKey, initPromise);

    try {
      const result = await initPromise;
      this._updateStatus(serviceKey, {
        initialized: result,
        loading: false,
        error: null
      });
      return result;
    } catch (error) {
      this._updateStatus(serviceKey, {
        initialized: false,
        loading: false,
        error: error
      });
      throw error;
    } finally {
      this.initializationPromises.delete(serviceKey);
    }
  }

  /**
   * Inicializuje service s retry logikou
   * @param {Object} service - Service instance
   * @param {string} serviceKey - Klíč service
   * @param {boolean} forceReload - Zda vynutit reload
   * @returns {Promise<boolean>} Zda byla inicializace úspěšná
   */
  async _initializeWithRetry(service, serviceKey, forceReload = false) {
    let attempts = this.retryAttempts.get(serviceKey) || 0;

    while (attempts < this.maxRetries) {
      try {
        // Zkontroluj, jestli service má metodu initialize
        if (typeof service.initialize === 'function') {
          const result = await service.initialize(forceReload);

          // Některé services vrací boolean, jiné void
          if (typeof result === 'boolean') {
            if (result) {
              this.retryAttempts.delete(serviceKey);
              return true;
            }
          } else {
            // Pokud service nevrací boolean, považuj to za úspěch
            this.retryAttempts.delete(serviceKey);
            return true;
          }
        } else {
          // Service nemá metodu initialize, považuj to za úspěch
          log.debug(`⚠️ Service ${serviceKey} does not have initialize method, skipping`);
          return true;
        }
      } catch (error) {
        attempts++;
        this.retryAttempts.set(serviceKey, attempts);

        if (attempts >= this.maxRetries) {
          log.error(`❌ Service ${serviceKey} failed after ${attempts} attempts:`, error);
          throw error;
        }

        log.warn(`⚠️ Service ${serviceKey} initialization failed (attempt ${attempts}/${this.maxRetries}), retrying...`);
        await this._delay(this.retryDelay * attempts); // Exponential backoff
      }
    }

    return false;
  }

  /**
   * Získá stav inicializace všech services
   * @returns {Object} Status všech services
   */
  getInitializationStatus() {
    const status = {};

    this.status.forEach((serviceStatus, serviceKey) => {
      status[serviceKey] = {
        ...serviceStatus,
        retryAttempts: this.retryAttempts.get(serviceKey) || 0
      };
    });

    return {
      isInitializing: this.isInitializing,
      services: status,
      summary: {
        total: this.status.size,
        initialized: Array.from(this.status.values()).filter(s => s.initialized).length,
        loading: Array.from(this.status.values()).filter(s => s.loading).length,
        failed: Array.from(this.status.values()).filter(s => s.error).length
      }
    };
  }

  /**
   * Získá stav konkrétního service
   * @param {string} category - Kategorie service
   * @param {string} name - Název service
   * @returns {ServiceStatus|null} Status service nebo null
   */
  getServiceStatus(category, name) {
    const serviceKey = `${category}.${name}`;
    return this.status.get(serviceKey) || null;
  }

  /**
   * Aktualizuje status service
   * @private
   */
  _updateStatus(serviceKey, updates) {
    const current = this.status.get(serviceKey) || {};
    this.status.set(serviceKey, {
      ...current,
      ...updates
    });
  }

  /**
   * Získá klíč service pro status mapu
   * @private
   */
  _getServiceKey(entry) {
    // Najdi service v registry
    for (const [category, services] of Object.entries(SERVICE_REGISTRY)) {
      for (const [name, serviceEntry] of Object.entries(services)) {
        if (serviceEntry.service === entry.service) {
          return `${category}.${name}`;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Získá název service
   * @private
   */
  _getServiceName(entry) {
    for (const [, services] of Object.entries(SERVICE_REGISTRY)) {
      for (const [name, serviceEntry] of Object.entries(services)) {
        if (serviceEntry.service === entry.service) {
          return name;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Získá kategorii service
   * @private
   */
  _getServiceCategory(entry) {
    for (const [category, services] of Object.entries(SERVICE_REGISTRY)) {
      for (const [, serviceEntry] of Object.entries(services)) {
        if (serviceEntry.service === entry.service) {
          return category;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Zpoždění pro retry
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const initializationManager = new InitializationManager();
export default initializationManager;
