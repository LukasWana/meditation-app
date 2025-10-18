/**
 * Základní cache třída s TTL a limit managementem
 */

export class BaseCache {
  constructor(type, limit = 100, ttl = 60 * 60 * 1000) {
    this.cache = new Map();
    this.type = type;
    this.limit = limit;
    this.ttl = ttl;
  }

  /**
   * Přidání položky do cache s TTL
   */
  set(key, value, customTTL = null) {
    // Pokud je cache plná, odstraň nejstarší položky
    if (this.cache.size >= this.limit) {
      this.cleanupOldEntries();
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl: customTTL || this.ttl
    };

    this.cache.set(key, entry);
  }

  /**
   * Získání položky z cache s kontrolou TTL
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Kontrola TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Kontrola existence v cache
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Odstranění položky z cache
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Vyčištění celé cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Vyčištění starých položek (20% nejstarších)
   */
  cleanupOldEntries() {
    const entries = Array.from(this.cache.entries());
    const toRemove = entries.slice(0, Math.floor(this.limit * 0.2));
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Vyčištění expirovaných položek
   */
  cleanupExpired() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Získání statistik cache
   */
  getStats() {
    return {
      type: this.type,
      size: this.cache.size,
      limit: this.limit,
      ttl: this.ttl
    };
  }
}

