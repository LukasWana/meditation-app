/**
 * Service Worker pro Meditation App
 * Poskytuje offline podporu a cache strategie
 */

const CACHE_NAME = 'meditation-app-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const AUDIO_CACHE = 'audio-v1';

// Statické soubory k cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Instalace Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Aktivace Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== AUDIO_CACHE) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Interceptování fetch požadavků
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignoruj non-HTTP požadavky
  if (!request.url.startsWith('http')) {
    return;
  }

  // Strategie pro různé typy souborů
  if (url.pathname.endsWith('.mp3') || url.pathname.includes('/media/')) {
    // Audio soubory - Cache First strategie
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
  } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    // Statické soubory - Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  } else if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    // Firebase API - Network First
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else {
    // Ostatní - Network First s fallback
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Cache First strategie (pro audio soubory)
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('🎵 Service Worker: Audio from cache', request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('🎵 Service Worker: Audio cached', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Service Worker: Audio fetch failed', error);
    return new Response('Audio not available offline', { status: 503 });
  }
}

// Stale While Revalidate strategie (pro statické soubory)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Network First strategie (pro API a dynamický obsah)
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('🌐 Service Worker: Network failed, trying cache', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback pro offline stránku
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }

    return new Response('Content not available offline', { status: 503 });
  }
}

// Background sync pro offline akce
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Zde by se synchronizovaly offline akce
    console.log('🔄 Service Worker: Performing background sync');
  } catch (error) {
    console.error('❌ Service Worker: Background sync failed', error);
  }
}

// Push notifikace (pro budoucí použití)
self.addEventListener('push', (event) => {
  console.log('📱 Service Worker: Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'Nová meditace je dostupná!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Meditation App', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Service Worker: Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('🔧 Service Worker: Script loaded');




