

import { BaseCache } from './BaseCache.js';

export class ImageCache extends BaseCache {
  constructor() {
    super('images', 100, 7 * 24 * 60 * 60 * 1000); // 100 položek, 7 dní TTL
  }

  setImageUrl(fileName, url) {
    this.set(fileName, url);
  }

  getImageUrl(fileName) {
    return this.get(fileName);
  }
}





