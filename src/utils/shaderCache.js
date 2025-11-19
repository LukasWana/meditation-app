/**
 * Shader Cache
 * Cache pro úspěšně zkompilované shadery - optimalizace výkonu
 */

// Cache pro zkompilované shadery
const shaderCache = new Map();
const programCache = new Map();

// Maximální velikost cache (počet shaderů)
const MAX_CACHE_SIZE = 100;

// TTL (Time To Live) pro cache položky (default: 30 minut)
const DEFAULT_TTL = 30 * 60 * 1000;

/**
 * Vytvoří cache klíč pro shader
 * @param {string} shaderSource - Zdrojový kód shaderu
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0
 * @param {string} shaderPath - Cesta k shaderu (volitelné)
 * @returns {string} Cache klíč
 */
function createCacheKey(shaderSource, isWebGL2, shaderPath = null) {
  const sourceHash = hashString(shaderSource);
  const version = isWebGL2 ? 'webgl2' : 'webgl1';
  const path = shaderPath || 'inline';
  return `${version}:${path}:${sourceHash}`;
}

/**
 * Jednoduchý hash funkce pro string
 * @param {string} str - String k hashování
 * @returns {string} Hash
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Získá zkompilovaný shader z cache
 * @param {string} shaderSource - Zdrojový kód shaderu
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0
 * @param {string} shaderPath - Cesta k shaderu (volitelné)
 * @returns {Object|null} Cache entry nebo null
 */
export function getCachedShader(shaderSource, isWebGL2, shaderPath = null) {
  const key = createCacheKey(shaderSource, isWebGL2, shaderPath);
  const cached = shaderCache.get(key);

  if (!cached) {
    return null;
  }

  // Zkontroluj, zda není cache entry expirovaná
  if (Date.now() > cached.expiresAt) {
    shaderCache.delete(key);
    return null;
  }

  // Aktualizuj čas posledního použití
  cached.lastUsed = Date.now();
  return cached;
}

/**
 * Uloží zkompilovaný shader do cache
 * @param {string} shaderSource - Zdrojový kód shaderu
 * @param {WebGLShader} shader - Zkompilovaný shader
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0
 * @param {string} shaderPath - Cesta k shaderu (volitelné)
 * @param {number} ttl - Time to live v ms (volitelné)
 */
export function cacheShader(shaderSource, shader, isWebGL2, shaderPath = null, ttl = DEFAULT_TTL) {
  const key = createCacheKey(shaderSource, isWebGL2, shaderPath);

  // Zkontroluj velikost cache a vyčisti staré položky, pokud je potřeba
  if (shaderCache.size >= MAX_CACHE_SIZE) {
    cleanupOldCacheEntries();
  }

  shaderCache.set(key, {
    shader,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    expiresAt: Date.now() + ttl,
    shaderPath,
    isWebGL2
  });
}

/**
 * Získá zkompilovaný program z cache
 * @param {string} vertexSource - Zdrojový kód vertex shaderu
 * @param {string} fragmentSource - Zdrojový kód fragment shaderu
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0
 * @param {string} shaderPath - Cesta k shaderu (volitelné)
 * @returns {Object|null} Cache entry nebo null
 */
export function getCachedProgram(vertexSource, fragmentSource, isWebGL2, shaderPath = null) {
  const vertexKey = createCacheKey(vertexSource, isWebGL2, shaderPath);
  const fragmentKey = createCacheKey(fragmentSource, isWebGL2, shaderPath);
  const programKey = `${vertexKey}:${fragmentKey}`;

  const cached = programCache.get(programKey);

  if (!cached) {
    return null;
  }

  // Zkontroluj, zda není cache entry expirovaná
  if (Date.now() > cached.expiresAt) {
    programCache.delete(programKey);
    return null;
  }

  // Aktualizuj čas posledního použití
  cached.lastUsed = Date.now();
  return cached;
}

/**
 * Uloží zkompilovaný program do cache
 * @param {string} vertexSource - Zdrojový kód vertex shaderu
 * @param {string} fragmentSource - Zdrojový kód fragment shaderu
 * @param {WebGLProgram} program - Zkompilovaný program
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0
 * @param {string} shaderPath - Cesta k shaderu (volitelné)
 * @param {number} ttl - Time to live v ms (volitelné)
 */
export function cacheProgram(vertexSource, fragmentSource, program, isWebGL2, shaderPath = null, ttl = DEFAULT_TTL) {
  const vertexKey = createCacheKey(vertexSource, isWebGL2, shaderPath);
  const fragmentKey = createCacheKey(fragmentSource, isWebGL2, shaderPath);
  const programKey = `${vertexKey}:${fragmentKey}`;

  // Zkontroluj velikost cache a vyčisti staré položky, pokud je potřeba
  if (programCache.size >= MAX_CACHE_SIZE) {
    cleanupOldCacheEntries();
  }

  programCache.set(programKey, {
    program,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    expiresAt: Date.now() + ttl,
    shaderPath,
    isWebGL2
  });
}

/**
 * Vyčistí staré cache položky (LRU - Least Recently Used)
 */
function cleanupOldCacheEntries() {
  // Seřaď podle posledního použití a odstraň 20% nejstarších
  const shaderEntries = Array.from(shaderCache.entries())
    .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

  const programEntries = Array.from(programCache.entries())
    .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

  const shadersToRemove = Math.floor(shaderCache.size * 0.2);
  const programsToRemove = Math.floor(programCache.size * 0.2);

  for (let i = 0; i < shadersToRemove; i++) {
    shaderCache.delete(shaderEntries[i][0]);
  }

  for (let i = 0; i < programsToRemove; i++) {
    programCache.delete(programEntries[i][0]);
  }

  console.log(`🧹 cleanupOldCacheEntries: Vyčištěno ${shadersToRemove} shaderů a ${programsToRemove} programů z cache`);
}

/**
 * Vyčistí expirované cache položky
 */
export function cleanupExpiredCache() {
  const now = Date.now();
  let shadersRemoved = 0;
  let programsRemoved = 0;

  shaderCache.forEach((value, key) => {
    if (now > value.expiresAt) {
      shaderCache.delete(key);
      shadersRemoved++;
    }
  });

  programCache.forEach((value, key) => {
    if (now > value.expiresAt) {
      programCache.delete(key);
      programsRemoved++;
    }
  });

  if (shadersRemoved > 0 || programsRemoved > 0) {
    console.log(`🧹 cleanupExpiredCache: Vyčištěno ${shadersRemoved} shaderů a ${programsRemoved} programů`);
  }
}

/**
 * Vyčistí celou cache
 */
export function clearCache() {
  shaderCache.clear();
  programCache.clear();
  console.log('🧹 clearCache: Cache vyčištěna');
}

/**
 * Získá statistiky cache
 * @returns {Object} Statistiky cache
 */
export function getCacheStats() {
  return {
    shaderCount: shaderCache.size,
    programCount: programCache.size,
    maxSize: MAX_CACHE_SIZE,
    shaderEntries: Array.from(shaderCache.values()).map(entry => ({
      age: Date.now() - entry.createdAt,
      lastUsed: Date.now() - entry.lastUsed,
      expiresAt: entry.expiresAt - Date.now(),
      shaderPath: entry.shaderPath
    })),
    programEntries: Array.from(programCache.values()).map(entry => ({
      age: Date.now() - entry.createdAt,
      lastUsed: Date.now() - entry.lastUsed,
      expiresAt: entry.expiresAt - Date.now(),
      shaderPath: entry.shaderPath
    }))
  };
}

// Automatický cleanup expirovaných položek každých 5 minut
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupExpiredCache();
  }, 5 * 60 * 1000);
}





