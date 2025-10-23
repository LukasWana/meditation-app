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
  // Service Worker installing...

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        // Caching static assets
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Installation complete
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Aktivace Service Worker
self.addEventListener('activate', (event) => {


  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== AUDIO_CACHE) {

              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {

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

  // IGNORUJ VŠECHNY Firebase Storage požadavky - nechte prohlížeč je zpracovat přímo
  if (url.hostname.includes('firebasestorage.googleapis.com')) {
    return;
  }

  // IGNORUJ Firebase token endpointy - způsobují chyby
  if (url.hostname.includes('securetoken.googleapis.com')) {
    return;
  }

  // IGNORUJ Firebase Auth endpointy
  if (url.hostname.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  // Ignoruj non-GET requesty pro cache strategie (POST, PUT, DELETE nelze cachovat)
  if (request.method !== 'GET') {
    // Pro non-GET requesty použij pouze fetch bez cachování
    event.respondWith(fetch(request));
    return;
  }

  // Cache strategie podle typu souboru
  if (url.pathname.endsWith('.mp3') || url.pathname.includes('/media/') || url.hostname.includes('firebasestorage')) {
    // Audio soubory a Firebase Storage - Cache First pro šetření mobilních dat
    event.respondWith(networkFirstAudio(request, AUDIO_CACHE));
  } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    // Statické soubory - Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  } else if (url.pathname.endsWith('.svg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg') || url.pathname.endsWith('.webp') || url.pathname.endsWith('.ico')) {
    // Obrázky a SVG - Cache First pro rychlejší načítání
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    // Firebase API - Network First
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else {
    // Ostatní - Network First s fallback
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Cache First strategie pro obrázky a SVG - rychlejší načítání
async function cacheFirst(request, cacheName) {
  try {
    // Zkus cache nejdříve
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`🖼️ Cache hit for image: ${request.url}`);
      return cachedResponse;
    }

    console.log(`🖼️ Cache miss for image: ${request.url}`);

    // Pokud není v cache, zkus network
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        console.log(`🖼️ Network success for image: ${request.url}`);
        // Ulož do cache
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      } else {
        console.warn(`🖼️ Network failed for image: ${request.url} - ${networkResponse.status}`);
        return new Response('Image not found', { status: networkResponse.status });
      }
    } catch (fetchError) {
      console.error(`🖼️ Fetch error for image: ${request.url}`, fetchError);
      return new Response('Image fetch failed', { status: 503 });
    }
  } catch (error) {
    console.error('❌ Service Worker: Image fetch failed', error);
    return new Response('Image not available', { status: 503 });
  }
}

// Cache First strategie pro audio soubory - šetří mobilní data
async function networkFirstAudio(request, cacheName) {
  try {
    // Zkus cache nejdříve - šetří mobilní data
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`🎵 Cache hit for: ${request.url} (saving mobile data)`);
      return cachedResponse;
    }

    console.log(`🎵 Cache miss for: ${request.url}`);

        // Pokud není v cache, zkus network
        try {
          // Pro Firebase Storage URL použij no-cors mode
          const networkResponse = await fetch(request, {
            mode: 'no-cors',
            credentials: 'omit'
          });

          if (networkResponse.type === 'opaque') {
            console.log(`🎵 No-CORS success for: ${request.url}`);
            // Ulož opaque response do cache
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          } else {
            console.warn(`🎵 Non-opaque response for: ${request.url} - ${networkResponse.type}`);
            // Ulož i non-opaque response do cache
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
        } catch (fetchError) {
          console.error(`🎵 Fetch error for: ${request.url}`, fetchError);

          // Fallback na offline stránku
          return new Response('Offline', { status: 503 });
        }
  } catch (error) {
    console.error('❌ Service Worker: Audio fetch failed', error);

    // Pokud network selže, zkus cache znovu
    const fallbackCache = await caches.match(request);
    if (fallbackCache) {

      return fallbackCache;
    }

    return new Response('Audio not available offline', {
      status: 503,
      statusText: 'Audio not available'
    });
  }
}

// Cache First strategie pro Firebase Storage soubory
async function cacheFirstFirebase(request, cacheName) {
  try {
    // Zkus cache nejdříve
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {

      return cachedResponse;
    }

    // Pokud není v cache, zkus network s no-cors mode

    const networkResponse = await fetch(request, {
      mode: 'no-cors',
      credentials: 'omit'
    });

    if (networkResponse.ok || networkResponse.type === 'opaque') {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());

    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Service Worker: Firebase audio fetch failed', error);

    // Pokud network selže, zkus cache znovu
    const fallbackCache = await caches.match(request);
    if (fallbackCache) {

      return fallbackCache;
    }

    return new Response('Audio not available offline', {
      status: 503,
      statusText: 'Audio not available'
    });
  }
}

// Cache First strategie (deprecated - používá se networkFirstAudio)
async function cacheFirst(request, cacheName) {
  return networkFirstAudio(request, cacheName);
}

// Stale While Revalidate strategie (pro statické soubory)
async function staleWhileRevalidate(request, cacheName) {
  // Pouze GET requesty lze cachovat
  if (request.method !== 'GET') {
    return fetch(request);
  }

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

    // Cache pouze GET requesty (POST, PUT, DELETE nelze cachovat)
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {


    // Pouze GET requesty lze načíst z cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Fallback pro offline stránku (pouze GET requesty)
    if (request.destination === 'document' && request.method === 'GET') {
      return caches.match('/offline.html');
    }

    return new Response('Content not available offline', { status: 503 });
  }
}

// Background sync pro offline akce
self.addEventListener('sync', (event) => {


  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Zde by se synchronizovaly offline akce

  } catch (error) {
    console.error('❌ Service Worker: Background sync failed', error);
  }
}

// Push notifikace (pro budoucí použití)
self.addEventListener('push', (event) => {


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


  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});






