// Master Reminder App — Service Worker
// Handles: offline app-shell caching, background/periodic sync signalling, and update notifications.
//
// IMPORTANT KNOWN LIMITATION: this app currently stores reminders/habits/finance data in
// localStorage, which a service worker CANNOT access (different execution context — no DOM,
// no localStorage). So `sync` and `periodicsync` below can only wake up and message any
// currently-open tabs to run their own sync/check — they cannot check or notify about your
// data while the app is fully closed. True "check reminders while closed" needs either a
// migration to IndexedDB (which a service worker CAN read) or a real backend push service.

// --- WEB PUSH (Firebase Cloud Messaging) — background message handling ---
// Needed so a push arriving while no tab is open still shows a notification.
// Service workers can't read variables from the page, so the (non-secret)
// Firebase web config is duplicated here — this is Firebase's own documented
// pattern for background messaging, not a special exception for this app.
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyDc-k1JnOySVExS4QbDsbkh7Ro9pvNydIY",
  authDomain: "reminder-76588.firebaseapp.com",
  projectId: "reminder-76588",
  storageBucket: "reminder-76588.firebasestorage.app",
  messagingSenderId: "813515230126",
  appId: "1:813515230126:web:dde11175645257dc44d63f"
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Master Reminder App';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

const CACHE_VERSION = 'v1';
const CACHE_NAME = `master-app-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/js/00-foundation/01-config.js',
  '/js/00-foundation/02-logger.js',
  '/js/00-foundation/03-services.js',
  '/js/00-foundation/04-privacy-analytics.js',
  '/js/01-core/01-bootstrap.js',
  '/js/01-core/02-navigation-auth.js',
  '/js/01-core/03-sync-profile.js',
  '/js/01-core/04-calendar-pomodoro.js',
  '/js/01-core/06-account-deletion.js',
  '/js/01-core/07-two-factor-auth.js',
  '/js/02-tasks/01-reminders-utils.js',
  '/js/02-tasks/02-habits.js',
  '/js/02-tasks/03-reminders-core.js',
  '/js/02-tasks/04-recycle-bin.js',
  '/js/03-wellbeing/01-notifications-projects.js',
  '/js/03-wellbeing/02-mood-sharing.js',
  '/js/03-wellbeing/03-sleep-and-tasks.js',
  '/js/03-wellbeing/04-integrations.js',
  '/js/04-ai-calendar/01-ai-assistant.js',
  '/js/04-ai-calendar/02-calendar-habits.js',
  '/js/04-ai-calendar/03-workspace.js',
  '/js/05-work-finance/01-shifts.js',
  '/js/05-work-finance/02-finance.js',
  '/js/05-work-finance/03-student-journal.js',
  '/js/06-lifestyle/01-life-admin.js',
  '/js/06-lifestyle/02-settings-core.js',
  '/js/06-lifestyle/03-extras.js',
  '/js/06-lifestyle/04-reports-export.js',
  '/js/06-lifestyle/05-health-dashboard.js',
  '/js/06-lifestyle/06-advanced-widgets.js',
  '/js/06-lifestyle/07-emergency-contacts.js',
  '/js/07-automation/01-rules-notifications.js',
  '/js/07-automation/02-analytics-search.js',
  '/js/07-automation/03-engagement-reports.js',
  '/js/07-automation/04-gamification.js',
  '/js/08-khata-family/01-khata.js',
  '/js/08-khata-family/02-more-page.js',
  '/js/08-khata-family/03-family-profile.js',
  '/js/08-khata-family/04-planning.js',
  '/js/09-new-features/00-glue.js',
  '/js/09-new-features/01-cycle-tracker.js',
  '/js/09-new-features/02-family-wallet.js',
  '/js/09-new-features/03-fitness-log.js',
  '/js/09-new-features/04-webhooks.js',
  '/js/09-new-features/05-widget-page.js',
  '/js/09-new-features/06-recipe-planner.js',
  '/js/09-new-features/09-crash-monitoring.js',
  '/js/09-new-features/10-tos-gate.js',
  '/js/09-new-features/11-web-push.js',
  '/js/09-new-features/13-payments.js',
  '/js/09-new-features/14-subscription-page.js',
  '/js/09-new-features/15-free-tier-limits.js',
  '/js/09-new-features/16-referral.js',
  '/js/09-new-features/17-rating-prompt.js'
  // MAINTENANCE: this list MUST match every <script src="js/..."> tag in
  // index.html exactly, or cache.addAll() below rejects entirely (even one
  // 404 fails the whole install) — silently breaking offline support and
  // blocking this SW version from ever activating. It drifted out of sync
  // with index.html for several updates after a file-reorganization pass
  // before this comment was added. `node build.js` now checks this
  // automatically (see build.js) — run it before deploying if unsure.
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

// NOTIFICATION IMPROVEMENT: handles taps on the Mark Done / Snooze action
// buttons added to push notifications (see showPushNotification in
// js/03-wellbeing/01-notifications-projects.js). Relayed to an open tab via
// postMessage — the actual reminder update happens there since this service
// worker can't reach localStorage (see the file-level comment at the top).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const reminderId = event.notification.data && event.notification.data.reminderId;
  const action = event.action; // '' if the notification body itself was tapped, not a button

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (action && reminderId) {
        if (clientsList.length) {
          clientsList.forEach((client) => client.postMessage({ type: 'NOTIF_ACTION', action, reminderId }));
          clientsList[0].focus();
        } else {
          // No tab open to act on this — open the app so the user can handle
          // it themselves rather than silently dropping the action.
          await self.clients.openWindow('/');
        }
        return;
      }
      // Plain tap (no action button): just bring the app to the front.
      if (clientsList.length) {
        clientsList[0].focus();
      } else {
        await self.clients.openWindow('/');
      }
    })()
  );
});
