const CACHE_NAME = 'task-manager-v3'; // ✨ Bumped version

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (
    url.origin !== self.location.origin &&
    !url.hostname.includes("fonts.googleapis.com") &&
    !url.hostname.includes("fonts.gstatic.com")
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedHtml = await caches.match('/index.html');
        // ✨ THE FIX: Always return a Response object
        return cachedHtml || new Response('App is offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        // ✨ THE FIX: If it's missing, return a safe 404 to prevent the TypeError crash
        return cachedResponse || new Response('Not found in cache', { status: 404 });
      })
  );
});