// Albumify service worker — minimal, app-shell only.
// Deliberately does NOT cache Spotify API or auth requests.

const CACHE = 'albumify-v1';
const SHELL = [
  '/albumify/',
  '/albumify/index.html',
  '/albumify/manifest.json',
  '/albumify/icon-192.png',
  '/albumify/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle our own GitHub Pages origin. Everything else
  // (Spotify API, accounts.spotify.com, unpkg, etc.) goes straight
  // to the network untouched.
  const isOwnOrigin = url.origin === self.location.origin;
  const isAppPath = url.pathname.startsWith('/albumify/');

  if (!isOwnOrigin || !isAppPath) {
    return; // let the browser handle it normally
  }

  // Never cache requests carrying an OAuth code
  if (url.search.includes('code=')) {
    return;
  }

  // App shell: network-first, falling back to cache when offline
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match('/albumify/index.html')))
  );
});
