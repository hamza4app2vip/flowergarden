/* Service Worker - نظام إدارة الطلبات */
const CACHE = 'orders-v1';
const ASSETS = ['./index.html','./style.css','./app.js','./icon-192.png','./icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

/* ── Notification Handling ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});

/* ── Message from main page ── */
self.addEventListener('message', e => {
  if (!e.data) return;

  // Show immediate notification
  if (e.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title, {
      body,
      tag: tag || 'orders-alert',
      icon: './icon-192.png',
      badge: './icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      requireInteraction: true,
    });
  }

  // Ping to check alerts
  if (e.data.type === 'CHECK_ALERTS') {
    const alerts = e.data.alerts || [];
    const now    = Date.now();
    alerts.forEach(a => {
      if (a.dueAt <= now) {
        self.registration.showNotification('⏰ تنبيه طلب', {
          body: `${a.clientName}: ${a.alertNote}`,
          tag:  `alert-${a.id}`,
          icon: './icon-192.png',
          badge:'./icon-192.png',
          dir:  'rtl',
          lang: 'ar',
          vibrate: [200, 100, 200],
          requireInteraction: true,
        });
      }
    });
  }
});
