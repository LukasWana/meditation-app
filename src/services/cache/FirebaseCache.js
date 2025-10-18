/**
 * Specializovaná cache pro Firebase dotazy
 */

import { BaseCache } from './BaseCache.js';

export class FirebaseCache extends BaseCache {
  constructor() {
    super('firebase', 50, 30 * 60 * 1000); // 50 položek, 30 minut TTL
  }

  /**
   * Uložení výsledku Firebase dotazu
   */
  setQuery(queryKey, result) {
    this.set(queryKey, result);
  }

  /**
   * Získání výsledku Firebase dotazu
   */
  getQuery(queryKey) {
    return this.get(queryKey);
  }

  /**
   * Kontrola existence dotazu v cache
   */
  hasQuery(queryKey) {
    return this.has(queryKey);
  }

  /**
   * Vyčištění všech Firebase dotazů
   */
  clearQueries() {
    this.clear();
  }
}


