// Service Worker for 100% Offline Local WebLLM Chat
const CACHE_NAME = 'local-ai-shell-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: pre-cache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache warning on service worker install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: cleanup old versioned caches except model weight caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && !key.includes('webllm') && !key.includes('tvmjs') && !key.includes('mlc') && !key.includes('huggingface'))
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-while-revalidate / Cache-first
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and chrome extensions
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Let WebLLM's internal CacheStorage API manage its own binary blobs
  if (url.pathname.includes('/resolve/main/') || url.pathname.endsWith('.wasm') || url.pathname.endsWith('.bin')) {
    // Model weights and wasm binaries are cached via Cache API by WebLLM
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // Cache a copy for future offline access
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is an HTML page navigation, return root app shell
          if (event.request.mode === 'navigate') {
            return cache.match('/') || cache.match('/index.html');
          }
          return cachedResponse;
        });

      // If cached copy exists and it's a static hashed asset, return cached copy immediately while revalidating
      if (cachedResponse && (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js'))) {
        return cachedResponse;
      }

      // Otherwise try network first, falling back to cache
      return fetchPromise.then((res) => res || cachedResponse).catch(() => cachedResponse);
    })
  );
});
