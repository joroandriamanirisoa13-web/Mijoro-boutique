/* ==========================================
   SERVICE WORKER - OFFLINE MODE (merged + patched)
   ========================================== */

const CACHE_NAME = 'mijoro-v1.3';           // bumped version
const OFFLINE_CACHE = 'mijoro-offline-v1';

// Assets critiques à mettre en cache (pre-cache)
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Patterns d'URLs à mettre en cache dynamiquement
const CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i, // Images
  /\.(?:woff2?|ttf|eot|otf)$/i,            // Fonts
  /\.(?:css|js)$/i,                        // Styles & Scripts
  /ibb\.co/i,                              // ImgBB (vos images hébergées)
  /supabase\.co/i                          // Supabase assets
];

// URLs à ne JAMAIS mettre en cache
const SKIP_CACHE = [
  /chrome-extension:/,
  /localhost:.*hot-update/, // HMR dev
  /\.map$/i                 // Source maps
];

/* ==========================================
   INSTALL - Pre-cache des assets critiques
   ========================================== */
self.addEventListener('install', (e) => {
  console.log('[SW] Installation...');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des assets statiques');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Erreur pre-cache:', err);
        // Continue même si certains assets échouent
      });
    }).then(() => self.skipWaiting())
  );
});

/* ==========================================
   ACTIVATE - Nettoyage des anciens caches + nav preload
   ========================================== */
self.addEventListener('activate', (e) => {
  console.log('[SW] Activation...');
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME && key !== OFFLINE_CACHE)
        .map((key) => {
          console.log('[SW] Suppression cache obsolète:', key);
          return caches.delete(key);
        })
    );
    // Optionnel: activer navigation preload (perf)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

/* ==========================================
   FETCH - Stratégie de cache intelligente (patched)
   ========================================== */
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignore les requêtes non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // Laisse passer les requêtes non-GET (POST/PUT/DELETE...)
  if (request.method !== 'GET') return;

  // Skip cache pour certaines URLs
  if (SKIP_CACHE.some((pattern) => pattern.test(url.href))) {
    return;
  }

  // Navigation requests (HTML) — app shell fallback offline
  if (request.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        // Essaye le réseau d'abord
        const network = await fetch(request);
        // Re-cache la route pour usage offline
        const c = await caches.open(OFFLINE_CACHE);
        c.put(request, network.clone()).catch(() => {});
        return network;
      } catch {
        // Essaye la route en cache
        const cachedRoute = await caches.match(request);
        if (cachedRoute) return cachedRoute;
        // Fallback: index.html (app shell), sinon offline page
        const shell =
          (await caches.match('./index.html')) ||
          (await caches.match('/')) ||
          null;
        return shell || offlineFallback();
      }
    })());
    return;
  }

  // Stratégie: Cache First pour assets statiques (images, fonts, css/js)
  if (shouldCache(url.href)) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // Stratégie: Network First pour API/données dynamiques
  e.respondWith(networkFirst(request));
});

/* ==========================================
   HELPERS - Stratégies de cache
   ========================================== */

// Check si l'URL doit être mise en cache
function shouldCache(url) {
  return CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

// Cache First: Cherche en cache d'abord, sinon réseau (patched opaque)
async function cacheFirst(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Cache hit:', request.url);

      // Mise à jour en arrière-plan (stale-while-revalidate) — accepte opaque
      fetch(request).then((response) => {
        if (response && (response.ok || response.type === 'opaque')) {
          cache.put(request, response.clone());
        }
      }).catch(() => {});

      return cached;
    }

    // Pas en cache -> fetch + mise en cache (accepte opaque)
    const response = await fetch(request);
    if (response && request.method === 'GET') {
      const okOrOpaque = response.ok || response.type === 'opaque';
      if (okOrOpaque) {
        cache.put(request, response.clone());
      }
    }
    return response;

  } catch (err) {
    console.warn('[SW] Erreur cache first:', err);
    return caches.match(request).then((r) => r || offlineFallback());
  }
}

// Network First: Réseau d'abord, sinon cache (patched opaque)
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    // Met en cache si GET et réponse OK ou opaque
    if (response && request.method === 'GET') {
      const okOrOpaque = response.ok || response.type === 'opaque';
      if (okOrOpaque) {
        const cache = await caches.open(OFFLINE_CACHE);
        cache.put(request, response.clone());
      }
    }

    return response;
  } catch (err) {
    console.warn('[SW] Network failed, trying cache:', err);
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

// Fallback offline (page simple)
function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Hors ligne</title>
      <style>
        body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;
             min-height:100vh;background:linear-gradient(135deg,#667eea,#764ba2);
             font-family:system-ui,sans-serif;color:#fff;text-align:center}
        .offline-box{padding:40px;background:rgba(0,0,0,.3);border-radius:20px;
                     backdrop-filter:blur(10px);max-width:400px}
        h1{font-size:3em;margin:0 0 20px}
        p{font-size:1.1em;opacity:.9;line-height:1.6}
        button{margin-top:24px;padding:12px 32px;background:#fff;color:#667eea;
               border:none;border-radius:999px;font-weight:700;cursor:pointer;
               font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,.2)}
        button:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.3)}
      </style>
    </head>
    <body>
      <div class="offline-box">
        <h1>📡</h1>
        <h2>Hors ligne</h2>
        <p>Tsy misy connexion internet. Mba avereno rehefa vita ny connexion.</p>
        <button onclick="location.reload()">♻️ Reload</button>
      </div>
    </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

/* ==========================================
   BACKGROUND SYNC (optionnel - pour POST ultérieures)
   ========================================== */
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-data') {
    e.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Logique pour synchroniser données offline (ex: panier)
  console.log('[SW] Background sync triggered');
}

/* ==========================================
   MESSAGE HANDLER (communication avec app) (patched CLEAR_CACHE)
   ========================================== */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (e.data && e.data.type === 'CLEAR_CACHE') {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => {
        if (e.ports && e.ports[0]) {
          e.ports[0].postMessage({ success: true });
        } else {
          self.clients.matchAll().then((clientsArr) => {
            clientsArr.forEach((c) => c.postMessage({ type: 'CACHE_CLEARED' }));
          });
        }
      });
  }
});

/* ==========================================
   PUSH NOTIFICATIONS HANDLER (patched icons/badge local)
   ========================================== */
self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);

  let notificationData = {
    title: 'Nouveau produit Mijoro!',
    body: 'Découvrez les dernières nouveautés',
    icon: '/icons/notification-icon-192.png',     // local PNG
    badge: '/icons/notification-badge-72.png',    // local PNG (monochrome recommended)
    tag: 'new-product',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {}
  };

  // Parse data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        title: payload.title ?? notificationData.title,
        body: payload.body ?? notificationData.body,
        icon: payload.icon ?? notificationData.icon,
        badge: payload.badge ?? notificationData.badge,
        data: payload.data ?? {}
      };
    } catch (err) {
      console.warn('[SW] Failed to parse push data:', err);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );

  event.waitUntil(promiseChain);
});

// Handle notification click (patched: focus + navigate or open)
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const action = event.action;
  const productId = event.notification.data?.productId;

  if (action === 'dismiss') return;

  const urlToOpen = productId
    ? new URL(`/?product=${productId}`, self.location.origin).href
    : new URL('/', self.location.origin).href;

  const promiseChain = (async () => {
    const windowClients = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of windowClients) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) return client.navigate(urlToOpen);
        client.postMessage({ type: 'NAVIGATE', url: urlToOpen });
        return;
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  })();

  event.waitUntil(promiseChain);
});
