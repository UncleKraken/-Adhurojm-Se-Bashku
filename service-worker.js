// Adhurojmë Së Bashku — Service Worker
// Version — bump this to force cache refresh
const CACHE_VERSION = 'asb-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Files to cache immediately on install
const STATIC_FILES = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Roboto+Mono:wght@400;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
];

// Install — cache static files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return Promise.allSettled(
        STATIC_FILES.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for static, network-first for Supabase
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and chrome-extension requests
  if(event.request.method !== 'GET') return;
  if(url.protocol === 'chrome-extension:') return;

  // Supabase API — network first, fallback to cache
  if(url.hostname.includes('supabase.co')){
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static files — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(res => {
        if(res && res.status === 200){
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback for navigation
        if(event.request.mode === 'navigate'){
          return caches.match('./index.html');
        }
      });
    })
  );
});
