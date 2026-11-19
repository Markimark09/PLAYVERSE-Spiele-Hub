/* PLAYVERSE – Service Worker (Offline-Fähigkeit & App-Installation)
   Strategie: Eigene Dateien „Netzwerk zuerst, sonst Cache“ (Updates kommen sofort an, offline läuft die App trotzdem).
   Firebase-SDK von gstatic wird gecacht. Datenbank-Verbindungen, Chat, GIFs usw. werden NICHT angefasst. */
const VERSION = 'pv-2026-11-17-1';
const STATIC = 'pv-static-' + VERSION;
const SDK = 'pv-sdk-v1';
const PRECACHE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css', 'css/playverse-patch.css',
  'js/core.js', 'js/solo.js', 'js/multi.js', 'js/games.js', 'js/games2.js', 'js/boards.js', 'js/boards2.js',
  'js/racer.js', 'js/boards3.js', 'js/clanboss.js',
  'js/news.js', 'js/shop.js', 'js/community.js', 'js/progress.js', 'js/mastery.js', 'js/comfort.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
      caches.open(STATIC).then(cache => Promise.allSettled(PRECACHE.map(u => cache.add(u))))   // fehlende Dateien blockieren die Installation nicht
          .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith('pv-static-') && k !== STATIC)).map(k => caches.delete(k))))
          .then(() => self.clients.claim())
  );
});

function networkFirst(req, cacheName, fallbackUrl){
  return fetch(req).then(res => {
    if(res && res.ok){ const copy = res.clone(); caches.open(cacheName).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req)
      .then(hit => hit || (fallbackUrl ? caches.match(fallbackUrl) : null))
      .then(hit => hit || new Response('Offline', { status: 503, statusText: 'Offline' })));
}
function cacheFirst(req, cacheName){
  return caches.match(req).then(hit => hit || fetch(req).then(res => {
    if(res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(cacheName).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  }));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin === self.location.origin){
    if(req.mode === 'navigate'){ event.respondWith(networkFirst(req, STATIC, 'index.html')); return; }
    event.respondWith(networkFirst(req, STATIC));
    return;
  }
  // Firebase-SDK-Skripte (versionierte, unveränderliche URLs) dauerhaft cachen
  if(url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0){ event.respondWith(cacheFirst(req, SDK)); return; }
  // alles andere (Firebase-Datenbank, GIF-Server, Schriften …) geht unverändert durch
});

self.addEventListener('message', event => { if(event.data === 'skipWaiting') self.skipWaiting(); });