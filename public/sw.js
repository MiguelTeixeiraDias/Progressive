/* Progressive PWA service worker.
 *
 * Goals: make the app installable (Chrome requires a SW with a fetch handler)
 * and resilient on flaky gym Wi-Fi/cell. Strategy:
 *   - navigations -> network-first, fall back to the cached app shell ("/")
 *   - same-origin static assets (hashed JS/CSS, icons) -> stale-while-revalidate
 *   - everything cross-origin (e.g. Supabase REST/Auth) is left untouched so we
 *     never serve stale API data or cache authenticated responses.
 *
 * Bump CACHE_VERSION on any change to this file to roll caches forward. Hashed
 * bundle URLs change every deploy, so stale-while-revalidate can't pin old code.
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `progressive-${CACHE_VERSION}`;
const APP_SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle our own origin; let Supabase and other hosts pass through.
  if (url.origin !== self.location.origin) return;

  // App navigations: prefer fresh HTML, fall back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(APP_SHELL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(APP_SHELL).then((r) => r || caches.match(request))),
    );
    return;
  }

  // Static assets: serve from cache immediately, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
