const CACHE_NAME = 'reminder-app-v1';
const OFFLINE_URL = 'index.html';
const ASSETS = [
  '/',
  'index.html',
  'manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          if (event.request.url.startsWith(self.location.origin)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});
