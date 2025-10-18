/**
 * Specializovaná cache pro audio soubory
 */

import { BaseCache } from './BaseCache.js';

export class AudioCache extends BaseCache {
  constructor() {
    super('audio', 50, 24 * 60 * 60 * 1000, true); // 50 položek, 24 hodin TTL, s persistencí
  }

  /**
   * Uložení audio URL
   */
  setAudioUrl(fileName, url) {
    this.set(fileName, url);
  }

  /**
   * Získání audio URL
   */
  getAudioUrl(fileName) {
    return this.get(fileName);
  }

  /**
   * Uložení duration audio souboru
   */
  setDuration(url, duration) {
    this.set(`duration_${url}`, duration);
  }

  /**
   * Získání duration audio souboru
   */
  getDuration(url) {
    return this.get(`duration_${url}`);
  }
}


