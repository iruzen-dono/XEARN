const SW_VERSION = '2026-05-08-1';
const APP_SHELL_CACHE = `xearn-app-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `xearn-runtime-${SW_VERSION}`;
const STATIC_ASSETS = ['/', '/manifest.json'];

// Install — pre-cache only truly static assets (not auth pages)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches and keep only the current version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      )
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

  // C6 fix: Never cache protected pages (dashboard, admin, profile)
  if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/admin')) return;

  // Static assets (JS, CSS, images) — stale-while-revalidate
  if (/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.open(APP_SHELL_CACHE).then(async (cache) => {
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
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
