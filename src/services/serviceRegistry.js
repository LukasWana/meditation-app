/**
 * Service Registry
 * Centralizovaná správa všech services v aplikaci
 *
 * @typedef {Object} ServiceEntry
 * @property {Object} service - Instance service
 * @property {number} priority - Priorita inicializace (nižší = vyšší priorita)
 */

import { fastMetadataService } from './fastMetadataService';
import cacheServiceRefactored from './cacheServiceRefactored';
import offlineCacheService from './offlineCacheService';
import { slovaDataService } from './slovaDataService';
import uiDataService from './uiDataService';

/**
 * Registry všech services v aplikaci
 * Services jsou organizovány do kategorií podle jejich účelu
 */
export const SERVICE_REGISTRY = {
  metadata: {
    fast: { service: fastMetadataService, priority: 1 },
    // Ostatní jsou nyní sloučené do fastMetadataService
    realtime: { service: fastMetadataService, priority: 2 },
    static: { service: fastMetadataService, priority: 3 },
    firestore: { service: fastMetadataService, priority: 4 },
    unified: { service: fastMetadataService, priority: 5 }
  },
  cache: {
    main: { service: cacheServiceRefactored, priority: 1 },
    offline: { service: offlineCacheService, priority: 2 },
    enhanced: { service: offlineCacheService, priority: 3 }
  },
  data: {
    slova: { service: slovaDataService, priority: 1 },
    ui: { service: uiDataService, priority: 1 }
  },
  preloader: {
    global: { service: fastMetadataService, priority: 1 }
  }
};

/**
 * Získá všechny services z registry
 * @returns {Array<ServiceEntry>} Pole všech services seřazených podle priority
 */
export function getAllServices() {
  const allServices = [];

  Object.values(SERVICE_REGISTRY).forEach(category => {
    Object.values(category).forEach(entry => {
      allServices.push(entry);
    });
  });

  // Seřaď podle priority
  return allServices.sort((a, b) => a.priority - b.priority);
}

/**
 * Získá services z konkrétní kategorie
 * @param {string} category - Název kategorie (metadata, cache, data, preloader)
 * @returns {Array<ServiceEntry>} Pole services z dané kategorie seřazených podle priority
 */
export function getServicesByCategory(category) {
  const categoryServices = SERVICE_REGISTRY[category];
  if (!categoryServices) {
    return [];
  }

  return Object.values(categoryServices).sort((a, b) => a.priority - b.priority);
}

/**
 * Získá konkrétní service z registry
 * @param {string} category - Název kategorie
 * @param {string} name - Název service
 * @returns {ServiceEntry|null} Service entry nebo null
 */
export function getService(category, name) {
  const categoryServices = SERVICE_REGISTRY[category];
  if (!categoryServices) {
    return null;
  }

  return categoryServices[name] || null;
}

export default SERVICE_REGISTRY;
