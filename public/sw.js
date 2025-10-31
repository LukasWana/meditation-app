/**
 * Service Worker pro Meditation App
 * Poskytuje offline podporu a cache strategie
 */

// const CACHE_NAME = 'meditation-app-v1'; // Není používán
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

  // Pro MP3 soubory a Firebase Storage: nejdříve zkontroluj cache, pak nech prohlížeč zpracovat
  // Důležité pro Android - cachované soubory musí fungovat, ale nové soubory musí být bez opaque responses
  if (url.hostname.includes('firebasestorage.googleapis.com') || url.pathname.endsWith('.mp3') || url.pathname.includes('/media/') || request.headers.get('accept')?.includes('audio/')) {
    // Zkus cache nejdříve - pokud je soubor v cache, vrať ho
    event.respondWith(
      caches.open('meditation-audio-cache').then(async (cache) => {
        // Zkus najít podle originál URL
        let cachedResponse = await cache.match(request);

        // Pokud není podle originál URL, zkus najít podle různých variant klíčů
        if (!cachedResponse) {
          const fileName = url.pathname.split('/').pop();
          const possibleKeys = [
            `/audio/${fileName}`,
            `/audio/${url.pathname.split('/').slice(-2).join('/')}`, // slova/SK/filename.mp3
            url.pathname,
            request.url,
            fileName
          ];

          for (const cacheKey of possibleKeys) {
            try {
              cachedResponse = await cache.match(cacheKey);
              if (cachedResponse) {
                console.log(`🎵 Cache hit for: ${request.url} (found with key: ${cacheKey})`);
                break;
              }
            } catch (err) {
              // Ignoruj chyby při hledání
            }
          }
        }

        if (cachedResponse) {
          console.log(`🎵 Cache hit for: ${request.url} (using cached version)`);

          // Pokud je opaque response, převeď ho na normální Response s blobem
          // Opaque responses nefungují s Audio elementem na Androidu
          if (cachedResponse.type === 'opaque') {
            console.log(`🔄 Converting opaque response to blob for: ${request.url}`);
            try {
              // Pokus se z opaque response získat blob
              const blob = await cachedResponse.blob();

              // Vytvoř nový Response s blobem a správnými hlavičkami
              const newResponse = new Response(blob, {
                status: 200,
                statusText: 'OK',
                headers: {
                  'Content-Type': 'audio/mpeg',
                  'Content-Length': blob.size.toString(),
                  'Cache-Control': 'public, max-age=31536000'
                }
              });

              console.log(`✅ Converted opaque response to normal Response for: ${request.url}`);
              return newResponse;
            } catch (blobError) {
              console.warn(`⚠️ Failed to convert opaque response for: ${request.url}`, blobError);
              // Pokud se nepodaří převést, zkus fetch
              return fetch(request);
            }
          }

          // Pro normální responses vrať přímo
          return cachedResponse;
        }

        // Pokud není v cache, nech prohlížeč zpracovat požadavek přímo (bez interceptování)
        // Tím se zabrání opaque responses, které nefungují na Androidu
        console.log(`🎵 Cache miss for: ${request.url} (bypassing Service Worker)`);
        return fetch(request);
      }).catch(() => {
        // V případě chyby zkus fetch
        return fetch(request);
      })
    );
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
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
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

// Cache First strategie pro audio soubory - NENÍ POUŽÍVÁNA (MP3 jsou ignorovány)
// Zachována pro případné budoucí použití
// eslint-disable-next-line no-unused-vars
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

// Cache First strategie pro Firebase Storage soubory - NENÍ POUŽÍVÁNA (Firebase Storage je ignorován)
// Zachována pro případné budoucí použití
// eslint-disable-next-line no-unused-vars
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

// Poznámka: cacheFirst funkce je deklarována výše na řádku 116

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
    self.clients.openWindow('/')
  );
});






