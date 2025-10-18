/**
 * Cache test utility pro testování localStorage cache
 */

import fastMetadataService from '@services/fastMetadataService';

export const testCachePerformance = async () => {
  console.log('🧪 Testing cache performance...');

  const startTime = performance.now();

  // Test 1: Načtení z cache
  console.log('📊 Test 1: Loading from cache');
  const cacheStart = performance.now();
  const metadata = await fastMetadataService.loadAllMetadata();
  const cacheEnd = performance.now();

  console.log(`⚡ Cache load time: ${(cacheEnd - cacheStart).toFixed(2)}ms`);
  console.log(`📁 Loaded ${metadata.size} metadata records`);

  // Test 2: Kontrola platnosti cache
  console.log('📊 Test 2: Cache validity check');
  const isValid = fastMetadataService.isCacheValid();
  console.log(`✅ Cache is valid: ${isValid}`);

  // Test 3: Cache statistics
  console.log('📊 Test 3: Cache statistics');
  const stats = {
    totalRecords: metadata.size,
    cacheKey: fastMetadataService.cacheKey,
    lastUpdate: fastMetadataService.lastUpdate,
    isLoading: fastMetadataService.isLoading
  };

  console.log('📈 Cache stats:', stats);

  const endTime = performance.now();
  console.log(`🎯 Total test time: ${(endTime - startTime).toFixed(2)}ms`);

  return {
    loadTime: cacheEnd - cacheStart,
    totalTime: endTime - startTime,
    recordCount: metadata.size,
    isValid: isValid,
    stats: stats
  };
};

export const clearCache = () => {
  console.log('🗑️ Clearing cache...');
  fastMetadataService.clearCache();
  console.log('✅ Cache cleared');
};

export const getCacheInfo = () => {
  return {
    cacheKey: fastMetadataService.cacheKey,
    lastUpdate: fastMetadataService.lastUpdate,
    isLoading: fastMetadataService.isLoading,
    isValid: fastMetadataService.isCacheValid()
  };
};

// Export pro použití v konzoli
if (typeof window !== 'undefined') {
  window.testCachePerformance = testCachePerformance;
  window.clearCache = clearCache;
  window.getCacheInfo = getCacheInfo;
}

