

import { BaseCache } from './BaseCache.js';

export class FirebaseCache extends BaseCache {
  constructor() {
    super('firebase', 50, 30 * 60 * 1000); // 50 položek, 30 minut TTL
  }

  setQuery(queryKey, result) {
    this.set(queryKey, result);
  }

  getQuery(queryKey) {
    return this.get(queryKey);
  }

  hasQuery(queryKey) {
    return this.has(queryKey);
  }

  clearQueries() {
    this.clear();
  }
}







