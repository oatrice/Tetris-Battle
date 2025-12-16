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
    // Network First strategy for navigation requests (HTML)
    // This ensures users get the latest version on refresh (cmd+r)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone response to cache it
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                })
                .catch(() => {
                    // Start of offline fallback
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache First strategy for other resources (assets, images, scripts)
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchResponse) => {
                // Cache valid responses
                if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                    return fetchResponse;
                }
                const responseToCache = fetchResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return fetchResponse;
            });
        })
    );
});
