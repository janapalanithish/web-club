const CACHE = 'webclub-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/variables.css',
  '/src/css/reset.css',
  '/src/css/typography.css',
  '/src/css/layout.css',
  '/src/css/categories.css',
  '/src/css/form.css',
  '/src/css/responsive.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});
