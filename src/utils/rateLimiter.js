/**
 * Rate Limiter pro Firebase operace
 * Chrání před zneužitím API a DoS útoky
 */

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * Zkontroluje, zda je možné provést další request
   * @returns {Promise<boolean>} - true pokud je možné provést request
   */
  async checkLimit() {
    const now = Date.now();

    // Odstraň staré requesty (starší než windowMs)
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Kontrola limitu
    if (this.requests.length >= this.maxRequests) {
      // Počkej na nejstarší request
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        // Čekej na uvolnění slotu
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Zkus znovu po čekání
        return this.checkLimit();
      }
    }

    // Přidej nový request
    this.requests.push(Date.now());
    return true;
  }

  /**
   * Resetuje rate limiter
   */
  reset() {
    this.requests = [];
  }

  /**
   * Vrací počet zbývajících requestů v aktuálním okně
   * @returns {number} - počet zbývajících requestů
   */
  getRemainingRequests() {
    const now = Date.now();
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}

// Singleton instance pro Firebase operace
// 10 requestů za sekundu pro běžné operace
export const firebaseRateLimiter = new RateLimiter(10, 1000);

// Rate limiter pro kritické operace (5 requestů za sekundu)
export const firebaseCriticalRateLimiter = new RateLimiter(5, 1000);

// Rate limiter pro batch operace (20 requestů za sekundu)
export const firebaseBatchRateLimiter = new RateLimiter(20, 1000);

/**
 * Wrapper pro Firebase operace s rate limiting
 * @param {Function} operation - Firebase operace k provedení
 * @param {RateLimiter} limiter - Rate limiter instance (výchozí: firebaseRateLimiter)
 * @returns {Promise<any>} - Výsledek operace
 */
export const withRateLimit = async (operation, limiter = firebaseRateLimiter) => {
  try {
    await limiter.checkLimit();
    return await operation();
  } catch (error) {
    console.error('Rate limited operation failed:', error);
    throw error;
  }
};

/**
 * Wrapper pro kritické Firebase operace s striktnějším rate limiting
 * @param {Function} operation - Firebase operace k provedení
 * @returns {Promise<any>} - Výsledek operace
 */
export const withCriticalRateLimit = async (operation) => {
  return withRateLimit(operation, firebaseCriticalRateLimiter);
};

/**
 * Wrapper pro batch Firebase operace s volnějším rate limiting
 * @param {Function} operation - Firebase operace k provedení
 * @returns {Promise<any>} - Výsledek operace
 */
export const withBatchRateLimit = async (operation) => {
  return withRateLimit(operation, firebaseBatchRateLimiter);
};

