const CACHE_NAME = 'tick-calendar-v1';
const DYNAMIC_CACHE = 'tick-calendar-dynamic';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './logo.png',
    './manifest.json',
    './?source=pwa'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting()) // Ensure new service worker activates immediately
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Update caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim()
        ])
    );
});

// Fetch event with network-first strategy for HTML and data
self.addEventListener('fetch', (event) => {
    // Parse the request URL
    const requestUrl = new URL(event.request.url);

    // Network-first strategy for HTML and API calls
    if (event.request.mode === 'navigate' || 
        event.request.headers.get('accept').includes('text/html') ||
        requestUrl.pathname.includes('api')) {
        
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone the response
                    const responseClone = response.clone();
                    
                    // Update cache
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    
                    return response;
                })
                .catch(() => {
                    // If offline, try to return cached response
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache-first strategy for other assets
    event.respondWith(
        caches.match(event.request)
            .then((cacheResponse) => {
                // Return cached response if found
                if (cacheResponse) {
                    // Try to update cache in background
                    fetch(event.request)
                        .then(networkResponse => {
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => cache.put(event.request, networkResponse));
                        })
                        .catch(() => {/* Ignore network errors */});
                    
                    return cacheResponse;
                }

                // If not in cache, try network
                return fetch(event.request)
                    .then(response => {
                        // Clone the response
                        const responseClone = response.clone();
                        
                        // Cache the new resource only if URL scheme is supported
                        const url = new URL(event.request.url);
                        if (url.protocol === 'http:' || url.protocol === 'https:') {
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => cache.put(event.request, responseClone));
                        }
                        
                        return response;
                    })
                    .catch(() => {
                        return new Response('Offline: Unable to fetch resource', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Listen for updates from the main thread
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});