// Siatek Alpha Teknik - Enterprise PWA Service Worker
const CACHE_NAME = 'siatek-pwa-v5';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // YALNIZCA kendi originimizdeki GET isteklerini ele al.
  //
  // Eskiden bu handler TUM GET isteklerini yakaliyordu: Google'in auth
  // script'leri (apis.google.com), Firebase uclari, yazi tipleri... Bir istek
  // basarisiz olunca (or. tarayici eklentisi bloklayinca) asagidaki catch
  // bloğu bunu SAHTE bir "503 Offline" yanitina ceviriyordu. Cagiran taraf
  // gercek ag hatasi yerine gecerli bir HTTP yaniti gorup yanlis davraniyordu.
  // Konsoldaki 503'lerin kaynagi buydu. (19.09.2026)
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return; // Tarayici normal sekilde halletsin
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful responses for assets
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
