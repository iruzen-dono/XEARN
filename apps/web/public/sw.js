const CACHE_NAME = 'xearn-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install — pre-cache only truly static assets (not auth pages)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for navigations, stale-while-revalidate for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET, API requests, and auth-related pages
  if (request.method !== 'GET' || request.url.includes('/api/')) return;
  const url = new URL(request.url);
  if (url.pathname === '/login' || url.pathname === '/register') return;

  // Static assets (JS, CSS, images) — stale-while-revalidate
  if (/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Navigation / HTML — network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
