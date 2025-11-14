/**
 * Shader Source Cache
 * Cache pro načtené shader source soubory - optimalizace načítání
 */

// Cache pro načtené shader source soubory
const sourceCache = new Map();

// Maximální velikost cache (počet shaderů)
const MAX_CACHE_SIZE = 50;

// TTL (Time To Live) pro cache položky (default: 1 hodina)
const DEFAULT_TTL = 60 * 60 * 1000;

// Statistiky pro sledování cache hit rate
const stats = {
  hits: 0,
  misses: 0,
  total: 0
};

/**
 * Vytvoří cache klíč pro shader source
 * @param {string} shaderPath - Cesta k shaderu
 * @returns {string} Cache klíč
 */
function createCacheKey(shaderPath) {
  return shaderPath;
}

/**
 * Získá shader source z cache
 * @param {string} shaderPath - Cesta k shaderu
 * @returns {string|null} Shader source nebo null
 */
export function getCachedSource(shaderPath) {
  const key = createCacheKey(shaderPath);
  const cached = sourceCache.get(key);

  if (!cached) {
    stats.misses++;
    stats.total++;
    return null;
  }

  // Zkontroluj, zda není cache entry expirovaná
  if (Date.now() > cached.expiresAt) {
    sourceCache.delete(key);
    stats.misses++;
    stats.total++;
    return null;
  }

  // Aktualizuj čas posledního použití
  cached.lastUsed = Date.now();
  stats.hits++;
  stats.total++;
  return cached.source;
}

/**
 * Uloží shader source do cache
 * @param {string} shaderPath - Cesta k shaderu
 * @param {string} source - Shader source code
 * @param {number} ttl - Time to live v ms (volitelné)
 */
export function cacheSource(shaderPath, source, ttl = DEFAULT_TTL) {
  const key = createCacheKey(shaderPath);

  // Zkontroluj velikost cache a vyčisti staré položky, pokud je potřeba
  if (sourceCache.size >= MAX_CACHE_SIZE) {
    cleanupOldCacheEntries();
  }

  sourceCache.set(key, {
    source,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    expiresAt: Date.now() + ttl,
    shaderPath
  });
}

/**
 * Vyčistí staré cache položky (LRU - Least Recently Used)
 */
function cleanupOldCacheEntries() {
  // Seřaď podle posledního použití a odstraň 20% nejstarších
  const entries = Array.from(sourceCache.entries())
    .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

  const toRemove = Math.floor(sourceCache.size * 0.2);

  for (let i = 0; i < toRemove; i++) {
    sourceCache.delete(entries[i][0]);
  }

  console.log(`🧹 cleanupOldCacheEntries: Vyčištěno ${toRemove} shader source položek z cache`);
}

/**
 * Vyčistí expirované cache položky
 */
export function cleanupExpiredCache() {
  const now = Date.now();
  let removed = 0;

  sourceCache.forEach((value, key) => {
    if (now > value.expiresAt) {
      sourceCache.delete(key);
      removed++;
    }
  });

  if (removed > 0) {
    console.log(`🧹 cleanupExpiredCache: Vyčištěno ${removed} shader source položek`);
  }
}

/**
 * Vyčistí celou cache
 */
export function clearCache() {
  sourceCache.clear();
  stats.hits = 0;
  stats.misses = 0;
  stats.total = 0;
  console.log('🧹 clearCache: Shader source cache vyčištěna');
}

/**
 * Získá statistiky cache
 * @returns {Object} Statistiky cache
 */
export function getCacheStats() {
  const hitRate = stats.total > 0 ? (stats.hits / stats.total * 100).toFixed(2) : 0;

  return {
    size: sourceCache.size,
    maxSize: MAX_CACHE_SIZE,
    hits: stats.hits,
    misses: stats.misses,
    total: stats.total,
    hitRate: `${hitRate}%`,
    entries: Array.from(sourceCache.values()).map(entry => ({
      shaderPath: entry.shaderPath,
      age: Date.now() - entry.createdAt,
      lastUsed: Date.now() - entry.lastUsed,
      expiresAt: entry.expiresAt - Date.now()
    }))
  };
}

// Automatický cleanup expirovaných položek každých 5 minut
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupExpiredCache();
  }, 5 * 60 * 1000);
}

