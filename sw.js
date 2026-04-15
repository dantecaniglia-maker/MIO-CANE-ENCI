// ── CAMBIA QUESTO NUMERO AD OGNI DEPLOY ──
const VERSION = '12.29';
const CACHE = 'miocane-' + VERSION;

self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', function(e) {
  console.log('[SW] Install v' + VERSION);
  e.waitUntil(
    // index.html NON viene pre-cachato — sempre da rete
    caches.open(CACHE).then(function(c) {
      return c.addAll(['/manifest.json']);
    }).then(function() {
      return self.skipWaiting();
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
      return self.clients.claim();
    })
  );
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true})
    .then(function(cls){
      for(var i=0;i<cls.length;i++){
        if(cls[i].url.includes(self.location.origin)){
          return cls[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  var reqUrl = e.request.url;
  if (reqUrl.includes('/survey') ||
      reqUrl.includes('/survey.html') ||
      reqUrl.includes('breedped.com') ||
      reqUrl.includes('/vetrina') ||
      reqUrl.includes('/annuncio')) return;

  var url = e.request.url;
  var isDeepLink = url.includes('?code=') || url.includes('?import=');

  if (isDeepLink) {
    try {
      var parsed = new URL(url);
      var dlCode = parsed.searchParams.get('code');
      var dlB64  = parsed.searchParams.get('import');
      self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(clients){
        clients.forEach(function(c){
          c.postMessage({type:'DEEP_LINK_IMPORT', code:dlCode, b64:dlB64});
        });
      });
    } catch(ex) {}
  }

  // index.html e root: SEMPRE dalla rete, mai dalla cache
  // {cache:'no-store'} bypassa anche la HTTP cache del browser
  var urlPath = '';
  try { urlPath = new URL(url).pathname; } catch(ex){}
  var isRoot = urlPath === '/' || urlPath === '/index.html';
  if (isRoot || url.includes('_v=') || url.includes('_t=') || isDeepLink) {
    e.respondWith(
      fetch(new Request(e.request.url, {
        method: 'GET',
        headers: e.request.headers,
        cache: 'no-store'
      })).catch(function() {
        // Offline: prova dalla cache come ultima risorsa
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
