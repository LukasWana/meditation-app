/**
 * Specializovaná cache pro metadata
 */

import { BaseCache } from './BaseCache.js';

export class MetadataCache extends BaseCache {
  constructor() {
    super('metadata', 200, 60 * 60 * 1000); // 200 položek, 1 hodina TTL
  }

  /**
   * Uložení metadata
   */
  setMetadata(key, metadata) {
    this.set(key, metadata);
  }

  /**
   * Získání metadata
   */
  getMetadata(key) {
    return this.get(key);
  }

  /**
   * Batch uložení metadat
   */
  setMetadataBatch(metadataEntries) {
    metadataEntries.forEach(([key, metadata]) => {
      this.setMetadata(key, metadata);
    });
  }

  /**
   * Získání všech metadat z cache
   */
  getAllMetadata() {
    const result = {};
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() - entry.timestamp <= entry.ttl) {
        result[key] = entry.value;
      }
    }
    return result;
  }
}


