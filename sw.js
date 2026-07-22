const CACHE_NAME = 'e2fitness-v3';
const ASSETS = [
  '/app.html',
  '/manifest.json'
];

// Install — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - app.html (and the root/navigation requests that resolve to it) use
//   NETWORK-FIRST with cache: 'no-store' so the browser's own HTTP cache
//   can't hand back a stale response underneath us — every load hits the
//   network for real. Falls back to the service-worker cache only if
//   offline. This is what "network-first" was missing before: fetch()
//   without cache: 'no-store' can still be satisfied by the browser's HTTP
//   cache depending on the response headers GitHub Pages sends, so a new
//   deploy could silently keep serving the old file.
// - everything else (manifest, images, etc.) stays cache-first for speed.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network for API calls
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  const isAppShell = event.request.mode === 'navigate' || url.pathname.endsWith('/app.html');

  if (isAppShell) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || new Response('Offline — please reconnect', { status: 503 })))
    );
    return;
  }

  // Cache first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline — please reconnect', { status: 503 }));
    })
  );
});

