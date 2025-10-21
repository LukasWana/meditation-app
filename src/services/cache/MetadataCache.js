

import { BaseCache } from './BaseCache.js';

export class MetadataCache extends BaseCache {
  constructor() {
    super('metadata', 200, 60 * 60 * 1000); // 200 položek, 1 hodina TTL
  }

  setMetadata(key, metadata) {
    this.set(key, metadata);
  }

  getMetadata(key) {
    return this.get(key);
  }

  setMetadataBatch(metadataEntries) {
    metadataEntries.forEach(([key, metadata]) => {
      this.setMetadata(key, metadata);
    });
  }

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




