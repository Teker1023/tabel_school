// Кешує програму, щоб вона відкривалась без інтернету.
// Після зміни файлів програми збільште номер версії.
const CACHE = 'tabel-v1';
const FILES = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сторінка: спершу мережа (щоб оновлення з'являлись одразу), але не довше 3 секунд —
// далі береться збережена копія. Решта файлів — з кешу.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const net = fetch(e.request).then(r => {
        if (r.ok && !r.redirected) cache.put('./', r.clone());
        return r;
      });
      const timeout = new Promise(res => setTimeout(res, 3000));
      const fast = await Promise.race([net.catch(() => null), timeout]);
      /* сервер відповів помилкою (сайт тимчасово недоступний) — відкриваємо збережену копію програми */
      if (fast && fast.ok) return fast;
      return (await cache.match('./')) || fast || net;
    })());
    return;
  }

  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
