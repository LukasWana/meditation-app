

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export function register() {
  if ('serviceWorker' in navigator) {
    // V development módu přeskoč registraci
    if (import.meta.env.MODE === 'development') {
      console.log('🔧 Service Worker: Skipped in development mode');
      return;
    }

    const publicUrl = new URL(import.meta.env.BASE_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;

      if (isLocalhost) {
        // Development - zkontroluj jestli Service Worker existuje
        checkValidServiceWorker(swUrl);

        // Poslouchej změny Service Worker
        navigator.serviceWorker.ready.then(() => {
          console.log('🔧 Service Worker: Ready in development');
        });
      } else {
        // Produkce - registruj Service Worker
        registerValidSW(swUrl);
      }
    });
  }
}

function registerValidSW(swUrl) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('✅ Service Worker: Registered successfully', registration);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Nová verze je dostupná
              console.log('🔄 Service Worker: New content available');
              // Zde by se zobrazilo upozornění uživateli
            } else {
              // Obsah je cachován pro offline použití
              console.log('📱 Service Worker: Content cached for offline use');
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('❌ Service Worker: Registration failed', error);
    });
}

function checkValidServiceWorker(swUrl) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('🌐 Service Worker: No internet connection. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Unregistration failed', error);
      });
  }
}

// Utility funkce pro Service Worker
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
