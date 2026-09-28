// Service Worker for 100% Offline Local WebLLM Chat
const SHELL_CACHE = 'local-ai-shell-v4';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

// All caches that store offline assets and model binaries
const MODEL_CACHES = ['webllm/model', 'webllm/wasm', 'webllm/config', 'tvmjs'];

// Install: pre-cache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache warning on service worker install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: cleanup old versioned caches except model weight & wasm caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && !key.includes('webllm') && !key.includes('tvmjs') && !key.includes('mlc'))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Searches across all known caches for a matching request
 */
async function matchInAllCaches(request) {
  // 1. Try Shell Cache
  const shellCache = await caches.open(SHELL_CACHE);
  const shellMatch = await shellCache.match(request);
  if (shellMatch) return shellMatch;

  // 2. Try WebLLM model caches
  for (const cacheName of MODEL_CACHES) {
    try {
      const cache = await caches.open(cacheName);
      const match = await cache.match(request);
      if (match) return match;
    } catch {}
  }

  // 3. Fallback: search any other open cache
  const allCacheMatch = await caches.match(request);
  if (allCacheMatch) return allCacheMatch;

  return null;
}

// Fetch handler: CACHE-FIRST strategy for 100% offline isolation
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and unsupported protocols
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    (async () => {
      // Step 1: Check if the file is ALREADY stored offline in any cache
      const cached = await matchInAllCaches(event.request);
      if (cached) {
        // Return instantly from local cache - ZERO network requests once loaded
        return cached;
      }

      // Step 2: If offline and not in cache, avoid hanging or throwing uncaught network errors
      if (!self.navigator.onLine) {
        // If navigating to an HTML page while offline, return the cached app shell
        if (event.request.mode === 'navigate') {
          const shellCache = await caches.open(SHELL_CACHE);
          const offlineApp = (await shellCache.match('/')) || (await shellCache.match('/index.html'));
          if (offlineApp) return offlineApp;
        }

        // Return a clean offline synthetic response
        return new Response('Offline — file not cached', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Step 3: Online and not cached yet — fetch once and cache immediately for future offline use
      try {
        const networkResponse = await fetch(event.request);

        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const clone = networkResponse.clone();
          const urlStr = event.request.url.toLowerCase();

          // Route to specialized persistent caches based on asset type
          if (urlStr.endsWith('.wasm')) {
            const wasmCache = await caches.open('webllm/wasm');
            wasmCache.put(event.request, clone).catch(() => {});
          } else if (urlStr.includes('mlc-chat-config.json')) {
            const configCache = await caches.open('webllm/config');
            configCache.put(event.request, clone).catch(() => {});
            const modelCache = await caches.open('webllm/model');
            modelCache.put(event.request, networkResponse.clone()).catch(() => {});
          } else if (
            urlStr.includes('/resolve/main/') ||
            urlStr.endsWith('.bin') ||
            urlStr.endsWith('.safetensors') ||
            urlStr.includes('tensor-cache.json') ||
            urlStr.includes('ndarray-cache.json') ||
            urlStr.includes('tokenizer')
          ) {
            const modelCache = await caches.open('webllm/model');
            modelCache.put(event.request, clone).catch(() => {});
          } else {
            // App shell, JavaScript bundles, CSS stylesheets, fonts, icons
            const shellCache = await caches.open(SHELL_CACHE);
            shellCache.put(event.request, clone).catch(() => {});
          }
        }

        return networkResponse;
      } catch (err) {
        // Network fetch failed (e.g. offline during request)
        if (event.request.mode === 'navigate') {
          const shellCache = await caches.open(SHELL_CACHE);
          const fallback = (await shellCache.match('/')) || (await shellCache.match('/index.html'));
          if (fallback) return fallback;
        }

        return new Response('Offline — network request unavailable', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});
