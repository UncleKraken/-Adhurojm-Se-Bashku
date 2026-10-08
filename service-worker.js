// Adhurojmë Së Bashku — Service Worker v10
// Caches the app shell for offline use and fast repeat loads.
const CACHE_NAME = 'asb-v11';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './og-image.jpg',
];

// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation, cache-first for everything else
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    // Network-first for HTML navigations so fresh content loads when online
    e.respondWith(
      fetch(request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
  } else {
    // Cache-first for assets (JS, CSS, fonts, images)
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(r => {
          if (!r || r.status !== 200 || r.type === 'opaque') return r;
          const clone = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return r;
        });
      })
    );
  }
});
