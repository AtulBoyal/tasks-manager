const CACHE_NAME = 'task-manager-assets-v1';

// 1. INSTALLATION: Fires the first time the user visits the site
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces the browser to activate this immediately
});

// 2. ACTIVATION: Cleans up old caches if we ever update the CACHE_NAME
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. THE INTERCEPTOR: Listens to every single network request the app makes
self.addEventListener('fetch', (event) => {
  // RULE 1: Only cache GET requests (ignore POST/PUT/DELETE)
  if (event.request.method !== 'GET') return;

  // RULE 2: NEVER cache Supabase Database calls! 
  // We want our React App's localStorage to handle offline data, not the Service Worker.
  if (event.request.url.includes('supabase.co')) return;

  // RULE 3: Ignore Chrome extensions or weird browser internal requests
  if (!event.request.url.startsWith('http')) return;

  // DYNAMIC CACHING: Try the network first. If it fails, use the hard drive cache.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // We have internet! Clone the response and save it to the hard drive.
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        // Return the fresh internet response to the app
        return networkResponse;
      })
      .catch(async () => {
        // OFFLINE! The network failed. Look for the file in the hard drive cache.
        console.log('[Service Worker] Serving from cache:', event.request.url);
        const cachedResponse = await caches.match(event.request);
        
        // If we found the file, serve it. If not, the request fails natively.
        return cachedResponse;
      })
  );
});