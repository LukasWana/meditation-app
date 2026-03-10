/**
 * Utility pro Service Worker
 */

export const unregister = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Unregistration failed', error);
      });
  }
};

export const serviceWorkerUtils = {
  // Zkontroluj jestli je aplikace offline
  isOffline: () => !navigator.onLine,

  // Zkontroluj jestli je Service Worker aktivní
  isServiceWorkerActive: () => 'serviceWorker' in navigator && navigator.serviceWorker.controller,

  // Získej informace o cache
  getCacheInfo: async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const cacheInfo = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheInfo[cacheName] = keys.length;
      }

      return cacheInfo;
    }
    return {};
  },

  // Vymaž všechny cache
  clearAllCaches: async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🗑️ Service Worker: All caches cleared');
    }
  },

  // Získej velikost cache
  getCacheSize: async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      return totalSize;
    }
    return 0;
  }
};
