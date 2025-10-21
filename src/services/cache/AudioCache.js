

import { BaseCache } from './BaseCache.js';

export class AudioCache extends BaseCache {
  constructor() {
    super('audio', 50, 24 * 60 * 60 * 1000, true); // 50 položek, 24 hodin TTL, s persistencí
  }
  setAudioUrl(fileName, url) {
    this.set(fileName, url);
  }
  getAudioUrl(fileName) {
    return this.get(fileName);
  }
  setDuration(url, duration) {
    this.set(`duration_${url}`, duration);
  }
  getDuration(url) {
    return this.get(`duration_${url}`);
  }
}

