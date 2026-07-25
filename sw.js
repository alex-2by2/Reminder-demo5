// Master Reminder App — Service Worker
// Handles: offline app-shell caching, background/periodic sync signalling, and update notifications.
//
// IMPORTANT KNOWN LIMITATION: this app currently stores reminders/habits/finance data in
// localStorage, which a service worker CANNOT access (different execution context — no DOM,
// no localStorage). So `sync` and `periodicsync` below can only wake up and message any
// currently-open tabs to run their own sync/check — they cannot check or notify about your
// data while the app is fully closed. True "check reminders while closed" needs either a
// migration to IndexedDB (which a service worker CAN read) or a real backend push service.

const CACHE_VERSION = 'v1';
const CACHE_NAME = `master-app-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/js/01-core-init.js',
  '/js/02-reminders-habits.js',
  '/js/03-notifications-mood-sleep.js',
  '/js/04-ai-features-calendar.js',
  '/js/05-shifts-finance-student.js',
  '/js/06-lifestyle-settings-widgets.js',
  '/js/07-automation-analytics.js',
  '/js/08-khata-family-final.js'
];

// Cross-origin CDN library hosts we're okay opportunistically caching for offline resilience.
// (Firestore/Auth/Gemini/Weather/Translate endpoints are deliberately NOT in this list — those
// are live data/API calls and must always go to the network, never served from cache.)
const CDN_HOSTS = [
  'www.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter((n) => n.startsWith('master-app-') && n !== CACHE_NAME);
      await Promise.all(oldCaches.map((n) => caches.delete(n)));
      await self.clients.claim();

      // Only announce "update available" if there WAS a previous version cached
      // (i.e. this is a real update, not the very first install for a new user).
      if (oldCaches.length > 0) {
        const clientsList = await self.clients.matchAll({ type: 'window' });
        clientsList.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      }
    })()
  );
});

function isCdnHost(url) {
  return CDN_HOSTS.some((host) => url.hostname === host);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never intercept POST/PUT (Firestore, AI calls, etc.)

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navigation requests (loading the app itself): network-first, falling back to the
  // cached shell so the app still opens offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Same-origin static assets (css/js/icons/manifest): cache-first, updating the cache
  // in the background so the next load picks up changes.
  if (isSameOrigin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Cross-origin CDN libraries: cache-first, opportunistically caching on first fetch.
  if (isCdnHost(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else (Firestore, Firebase Auth, Gemini AI, weather, Google Translate, etc.):
  // always go straight to the network — never cache live/authenticated data.
});

// Background Sync — fired when connectivity returns after window.requestBackgroundSync(tag)
// was called while offline. We can't reach localStorage from here, so we message any open tabs.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(notifyClients({ type: 'SYNC_NOW' }));
  }
});

// Periodic Background Sync — fired roughly every 15+ min if the browser grants it (Chrome/Android
// only, and only for installed PWAs the user opens often). Same localStorage limitation applies.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(notifyClients({ type: 'SYNC_NOW' }));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'APP_READY') {
    // App just opened — nudge it to sync in case anything queued up while it was closed.
    notifyClients({ type: 'SYNC_NOW' });
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function notifyClients(message) {
  const clientsList = await self.clients.matchAll({ type: 'window' });
  clientsList.forEach((client) => client.postMessage(message));
}
