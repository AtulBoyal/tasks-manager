const CACHE_NAME = 'task-manager-v2';

// The critical files React needs to boot up the empty shell
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. INSTALL: Force download the critical shell files immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE: Clean up old, broken caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: The smart offline router
self.addEventListener('fetch', (event) => {
  // Ignore Supabase database calls! We want localStorage to handle that.
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // ✨ THE FIX: If the browser is asking for a webpage (Navigation), always give it index.html if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For all other files (JS, CSS, Images): Try network first, then cache.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});