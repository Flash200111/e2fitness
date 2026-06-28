const CACHE_NAME = 'e2fitness-v5';

// Install — skip waiting immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate — clean ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — always network first, no caching of HTML
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Always go to network for everything - no caching
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline — please reconnect', { status: 503 });
    })
  );
});
