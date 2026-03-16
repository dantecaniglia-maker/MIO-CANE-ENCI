// ── CAMBIA QUESTO NUMERO AD OGNI DEPLOY ──
const VERSION = '6.0';
const CACHE = 'miocane-' + VERSION;

self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', function(e) {
  console.log('[SW] Install v' + VERSION);
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(['/index.html', '/manifest.json']);
    }).then(function() {
      return self.skipWaiting(); // Attiva subito senza aspettare
    })
  );
});

self.addEventListener('activate', function(e) {
  console.log('[SW] Activate v' + VERSION);
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { 
              console.log('[SW] Elimino cache vecchia:', k);
              return caches.delete(k); 
            })
      );
    }).then(function() {
      return self.clients.claim(); // Prende controllo di tutte le tab aperte
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  
  // Per index.html: sempre network-first (così prende aggiornamenti)
  if (e.request.url.includes('index.html') || e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return res;
      }).catch(function() {
        return caches.match('/index.html');
      })
    );
    return;
  }
  
  // Per tutto il resto: cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        return caches.match('/index.html');
      });
    })
  );
});
