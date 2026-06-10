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

// Fetch — network first for HTML, cache first for other assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network for API calls
  if (url.hostname === 'api.anthropic.com' || url.hostname.includes('supabase.co') || url.hostname.includes('workers.dev')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network first for HTML files so updates are always fresh
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
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
