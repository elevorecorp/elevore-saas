const CACHE = 'elevore-v1';
const ASSETS = ['/', '/src/main.jsx', '/src/App.jsx', '/src/index.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase')) return; // never cache API calls
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request) || caches.match('/'))
  );
});
