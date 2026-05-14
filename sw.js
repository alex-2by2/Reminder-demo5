const CACHE_NAME = 'master-reminder-v2';

self.addEventListener('install', (e) => { 
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(['/']))); 
    self.skipWaiting(); 
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => { 
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request))); 
});
