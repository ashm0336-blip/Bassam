const CACHE_NAME = 'crowd-services-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

let offlineEnabled = false;
let cachePages = true;
let cacheImages = false;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_OFFLINE_CONFIG') {
    offlineEnabled = event.data.offlineEnabled;
    cachePages = event.data.cachePages;
    cacheImages = event.data.cacheImages;
    if (!offlineEnabled) {
      caches.delete(CACHE_NAME);
    }
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  if (event.request.url.includes('/ws')) return;

  if (!offlineEnabled) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((r) => r || caches.match('/index.html'))
      )
    );
    return;
  }

  const isPage = event.request.mode === 'navigate';
  const isImage = event.request.destination === 'image';

  if ((isPage && cachePages) || (isImage && cacheImages) || STATIC_ASSETS.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cache.match(event.request).then((r) => r || cache.match('/')))
      )
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((r) => r || caches.match('/index.html'))
      )
    );
  }
});
