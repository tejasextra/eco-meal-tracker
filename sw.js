const CACHE_NAME = 'ecotracker-v1.0.5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css?v=1.0.5',
  './js/app.js?v=1.0.5',
  './js/storage.js?v=1.0.5',
  './js/foodData.js?v=1.0.5',
  './js/charts.js?v=1.0.5',
  './js/achievements.js?v=1.0.5',
  './manifest.json?v=1.0.5',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap'
];

// Install Event - Pre-cache core assets
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline assets v1.0.5');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[ServiceWorker] Pre-cache partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache First with Network Fallback
self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;

  evt.respondWith(
    caches.match(evt.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to update cache asynchronously
        fetch(evt.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, networkResponse));
          }
        }).catch(() => {/* Offline fallback */});
        return cachedResponse;
      }

      return fetch(evt.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, responseToCache));
        return networkResponse;
      }).catch(() => {
        // Fallback to offline index page
        if (evt.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
