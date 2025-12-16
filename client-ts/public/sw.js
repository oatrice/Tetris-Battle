const CACHE_NAME = 'tetris-battle-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/src/main.ts',
    '/src/style.css'
];
// Note: In production with Vite, paths will be different. 
// A robust solution requires a build step to inject the manifest.
// For now, we use a runtime caching strategy for visited assets.

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE).catch((err) => {
                console.warn('Failed to cache strict list, falling back to runtime', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Network First Strategy
    // Try to fetch from network first.
    // If successful, update the cache and return the response.
    // If network fails (offline), fall back to cache.

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Update the cache with the fresh version
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            })
            .catch(() => {
                // Network failed, try to get from cache
                return caches.match(event.request);
            })
    );
});
