/**
 * Metadata Request Manager
 * Správa requestů pro metadata - deduplication, batch loading, progressive loading
 */

// Map pro sledování probíhajících requestů (deduplication)
const pendingRequests = new Map();

// Map pro cache výsledků requestů
const requestCache = new Map();

// Statistiky
const stats = {
  totalRequests: 0,
  deduplicatedRequests: 0,
  cacheHits: 0,
  cacheMisses: 0
};

// TTL pro request cache (5 minut)
const REQUEST_CACHE_TTL = 5 * 60 * 1000;

/**
 * Získá cache klíč pro request
 * @param {string} fileName - Název souboru
 * @param {string} source - Zdroj (firestore, realtime, storage)
 * @returns {string} Cache klíč
 */
function getRequestKey(fileName, source = 'default') {
  return `${source}:${fileName}`;
}

/**
 * Zkontroluj, zda je request v cache
 * @param {string} fileName - Název souboru
 * @param {string} source - Zdroj
 * @returns {any|null} Cached result nebo null
 */
export function getCachedRequest(fileName, source = 'default') {
  const key = getRequestKey(fileName, source);
  const cached = requestCache.get(key);

  if (!cached) {
    stats.cacheMisses++;
    return null;
  }

  // Zkontroluj TTL
  if (Date.now() > cached.expiresAt) {
    requestCache.delete(key);
    stats.cacheMisses++;
    return null;
  }

  stats.cacheHits++;
  return cached.result;
}

/**
 * Uloží výsledek requestu do cache
 * @param {string} fileName - Název souboru
 * @param {any} result - Výsledek requestu
 * @param {string} source - Zdroj
 * @param {number} ttl - Time to live v ms
 */
export function cacheRequest(fileName, result, source = 'default', ttl = REQUEST_CACHE_TTL) {
  const key = getRequestKey(fileName, source);
  requestCache.set(key, {
    result,
    expiresAt: Date.now() + ttl,
    cachedAt: Date.now()
  });
}

/**
 * Deduplikuje request - pokud už probíhá stejný request, vrátí existující Promise
 * @param {string} fileName - Název souboru
 * @param {Function} requestFn - Funkce pro provedení requestu
 * @param {string} source - Zdroj
 * @returns {Promise} Promise s výsledkem
 */
export async function deduplicateRequest(fileName, requestFn, source = 'default') {
  const key = getRequestKey(fileName, source);

  // Zkontroluj cache
  const cached = getCachedRequest(fileName, source);
  if (cached) {
    return cached;
  }

  // Zkontroluj, zda už probíhá stejný request
  const pending = pendingRequests.get(key);
  if (pending) {
    stats.deduplicatedRequests++;
    return pending;
  }

  // Vytvoř nový request
  stats.totalRequests++;
  const requestPromise = requestFn()
    .then((result) => {
      // Ulož do cache
      cacheRequest(fileName, result, source);
      // Odstraň z pending
      pendingRequests.delete(key);
      return result;
    })
    .catch((error) => {
      // Odstraň z pending i při chybě
      pendingRequests.delete(key);
      throw error;
    });

  // Ulož do pending
  pendingRequests.set(key, requestPromise);

  return requestPromise;
}

/**
 * Batch loading s deduplication
 * @param {Array<string>} fileNames - Seznam názvů souborů
 * @param {Function} requestFn - Funkce pro provedení requestu (fileName) => Promise
 * @param {Object} options - Možnosti
 * @param {number} options.batchSize - Velikost batch (default: 5)
 * @param {number} options.delayBetweenBatches - Zpoždění mezi batch (default: 100)
 * @param {string} options.source - Zdroj
 * @returns {Promise<Map<string, any>>} Map s výsledky
 */
export async function batchLoadMetadata(
  fileNames,
  requestFn,
  options = {}
) {
  const {
    batchSize = 5,
    delayBetweenBatches = 100,
    source = 'default'
  } = options;

  const results = new Map();
  const batches = [];

  // Rozděl na batchy
  for (let i = 0; i < fileNames.length; i += batchSize) {
    batches.push(fileNames.slice(i, i + batchSize));
  }

  // Načti každý batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    // Vytvoř Promise pro každý soubor v batch s deduplication
    const batchPromises = batch.map((fileName) =>
      deduplicateRequest(
        fileName,
        () => requestFn(fileName),
        source
      )
        .then((result) => ({ fileName, result, success: true }))
        .catch((error) => ({ fileName, error, success: false }))
    );

    // Počkej na dokončení batch
    const batchResults = await Promise.allSettled(batchPromises);

    // Zpracuj výsledky
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.set(result.value.fileName, result.value.result);
      }
    });

    // Delay mezi batchy (kromě posledního)
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

/**
 * Progressive loading - načítá metadata postupně podle priority
 * @param {Array<{fileName: string, priority: number}>} items - Seznam položek s prioritou
 * @param {Function} requestFn - Funkce pro provedení requestu
 * @param {Object} options - Možnosti
 * @param {number} options.concurrentRequests - Počet současných requestů (default: 3)
 * @param {string} options.source - Zdroj
 * @returns {Promise<Map<string, any>>} Map s výsledky
 */
export async function progressiveLoadMetadata(
  items,
  requestFn,
  options = {}
) {
  const {
    concurrentRequests = 3,
    source = 'default'
  } = options;

  // Seřaď podle priority (vyšší = dříve)
  const sortedItems = [...items].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const results = new Map();
  let currentIndex = 0;

  // Funkce pro načtení dalšího requestu
  const loadNext = async () => {
    while (currentIndex < sortedItems.length) {
      const item = sortedItems[currentIndex++];
      const { fileName } = item;

      try {
        const result = await deduplicateRequest(
          fileName,
          () => requestFn(fileName),
          source
        );
        results.set(fileName, result);
      } catch (error) {
        // Ignoruj chyby, pokračuj dál
        console.warn(`Progressive load failed for ${fileName}:`, error);
      }
    }
  };

  // Spusť concurrent requesty
  const promises = Array(Math.min(concurrentRequests, sortedItems.length))
    .fill(null)
    .map(() => loadNext());

  await Promise.all(promises);

  return results;
}

/**
 * Vyčistí expirované cache položky
 */
export function cleanupExpiredCache() {
  const now = Date.now();
  // let removed = 0; // Nevyužíváno - logy deaktivovány

  requestCache.forEach((value, key) => {
    if (now > value.expiresAt) {
      requestCache.delete(key);
      // removed++; // Nevyužíváno - logy deaktivovány
    }
  });

  // Debug log deaktivován - příliš mnoho výpisů
  // if (removed > 0) {
  //   console.log(`🧹 cleanupExpiredCache: Vyčištěno ${removed} request cache položek`);
  // }
}

/**
 * Vyčistí celou cache
 */
export function clearCache() {
  requestCache.clear();
  pendingRequests.clear();
  stats.totalRequests = 0;
  stats.deduplicatedRequests = 0;
  stats.cacheHits = 0;
  stats.cacheMisses = 0;
  // Debug log deaktivován - příliš mnoho výpisů
  // console.log('🧹 clearCache: Request cache vyčištěna');
}

/**
 * Získá statistiky
 * @returns {Object} Statistiky
 */
export function getStats() {
  const hitRate = (stats.cacheHits + stats.cacheMisses) > 0
    ? (stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100).toFixed(2)
    : 0;

  const deduplicationRate = stats.totalRequests > 0
    ? (stats.deduplicatedRequests / stats.totalRequests * 100).toFixed(2)
    : 0;

  return {
    totalRequests: stats.totalRequests,
    deduplicatedRequests: stats.deduplicatedRequests,
    deduplicationRate: `${deduplicationRate}%`,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    hitRate: `${hitRate}%`,
    pendingRequests: pendingRequests.size,
    cachedRequests: requestCache.size
  };
}

// Automatický cleanup expirovaných položek každých 5 minut
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupExpiredCache();
  }, 5 * 60 * 1000);
}

