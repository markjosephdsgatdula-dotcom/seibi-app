try {
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');
  importScripts('/js/data/firebase-config.js');
} catch (e) {
  console.error('[sw.js] importScripts failed:', e);
}

// Initialize Firebase Messaging in SW
let messaging;
try {
  messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: './images/icon.svg',
      vibrate: [200, 100, 200]
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.warn('[sw.js] Firebase Messaging initialization failed:', e);
}

const CACHE_NAME = 'seibi-app-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/reset.css',
  './css/tokens.css',
  './css/app.css',
  './css/nav.css',
  './css/home.css',
  './css/calendar.css',
  './css/notice.css',
  './css/history.css',
  './css/assets.css',
  './css/wiremap.css',
  './css/manual.css',
  './js/data/i18n.js',
  './js/data/assets.js',
  './js/data/manuals.js',
  './js/data/firebase-config.js',
  './js/store/db.js',
  './js/views/home.js',
  './js/views/assets.js',
  './js/views/notice.js',
  './js/views/history.js',
  './js/views/calendar.js',
  './js/views/wiremap.js',
  './js/views/manual.js',
  './js/app.js',
  './images/icon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Best effort caching - if some assets fail, we don't abort
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => {
          return fetch(url).then(response => {
            if (!response.ok) throw new Error(`Request failed for ${url}`);
            return cache.put(url, response);
          });
        })
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Stale-while-revalidate strategy
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Ignore fetch errors, we rely on cached response
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: './images/icon.svg',
      badge: './images/icon.svg',
      tag: tag || 'seibi-notification',
      vibrate: [200, 100, 200],
      requireInteraction: true
    });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
