// Master Reminder App - Service Worker v3
const CACHE_NAME = 'master-app-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/sw.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore-compat.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js',
];

// Install — pre-cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        STATIC_ASSETS.map(async (url) => {
          try {
            const req = url.startsWith('http') ? new Request(url, { mode: 'no-cors' }) : new Request(url);
            await cache.add(req);
          } catch (e) {
            console.warn('[SW cache skip]', url, e);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for static, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip Chrome extensions and non-http
  if (!event.request.url.startsWith('http')) return;

  // Firebase/API — network first, fall back to cache
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis') ||
      url.hostname.includes('generativelanguage') || url.hostname.includes('firestore')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback — return index.html for navigation
        if (event.request.destination === 'document') return caches.match('/index.html');
      });
    })
  );
});

// Background Sync for offline task saves
self.addEventListener('sync', event => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Notify all clients to sync when back online
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_NOW' }));
}

// Push Notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Master App Reminder', {
      body: data.body || 'You have a task due!',
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

// Periodic reminder check (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkUpcomingReminders());
  }
});

async function checkUpcomingReminders() {
  const clients = await self.clients.matchAll();
  if (clients.length > 0) return; // App is open, skip
  // Notify background reminders
  const cache = await caches.open(CACHE_NAME);
  // SW-based reminder logic would go here for background checks
}


self.addEventListener('message', event => {
  if (event.data?.type === 'APP_READY') {
    // placeholder hook for future background logic
  }
});
