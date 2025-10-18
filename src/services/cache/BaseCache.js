/**
 * Základní cache třída s TTL, limit managementem a localStorage persistencí
 */

export class BaseCache {
  constructor(type, limit = 100, ttl = 60 * 60 * 1000, enablePersistence = false) {
    this.cache = new Map();
    this.type = type;
    this.limit = limit;
    this.ttl = ttl;
    this.enablePersistence = enablePersistence;
    this.storageKey = `cache_${type}`;

    // Načti data z localStorage při inicializaci
    if (this.enablePersistence) {
      this.loadFromStorage();
    }
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

    // Ulož do localStorage pokud je persistence povolena
    if (this.enablePersistence) {
      this.saveToStorage();
    }
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

    // Aktualizuj localStorage pokud je persistence povolena
    if (this.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Vyčištění celé cache
   */
  clear() {
    this.cache.clear();

    // Vyčisti localStorage pokud je persistence povolena
    if (this.enablePersistence) {
      this.clearStorage();
    }
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
      ttl: this.ttl,
      persistence: this.enablePersistence
    };
  }

  /**
   * Uložení cache do localStorage
   */
  saveToStorage() {
    if (!this.enablePersistence || typeof window === 'undefined') {
      return;
    }

    try {
      const dataToSave = {};
      const now = Date.now();

      // Ulož pouze neexpirované položky
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp <= entry.ttl) {
          dataToSave[key] = entry;
        }
      }

      localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn(`Failed to save ${this.type} cache to localStorage:`, error);
    }
  }

  /**
   * Načtení cache z localStorage
   */
  loadFromStorage() {
    if (!this.enablePersistence || typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        // Načti pouze neexpirované položky
        for (const [key, entry] of Object.entries(data)) {
          if (now - entry.timestamp <= entry.ttl) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to load ${this.type} cache from localStorage:`, error);
    }
  }

  /**
   * Vyčištění localStorage
   */
  clearStorage() {
    if (!this.enablePersistence || typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn(`Failed to clear ${this.type} cache from localStorage:`, error);
    }
  }
}


