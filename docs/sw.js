/*==========================================
   SERVICE WORKER - OFFLINE MODE (OPTIMIZED)
   ========================================== */

const CACHE_NAME = 'mijoro-v1.3';
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
  /\.(?:woff2?|ttf|eot|otf)$/i, // Fonts
  /\.(?:css|js)$/i, // Styles & Scripts
  /ibb\.co/i, // ImgBB (vos images hébergées)
  /supabase\.co/i // Supabase assets
];

// URLs à ne JAMAIS mettre en cache
const SKIP_CACHE = [
  /chrome-extension:/,
  /localhost:.*hot-update/, // HMR dev
  /\.map$/i // Source maps
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
   ACTIVATE - Nettoyage des anciens caches
   ========================================== */
self.addEventListener('activate', (e) => {
  console.log('[SW] Activation...');
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== OFFLINE_CACHE)
          .map((key) => {
            console.log('[SW] Suppression cache obsolète:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/* ==========================================
   FETCH - Stratégie de cache intelligente
   ========================================== */
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignore les requêtes non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // Skip cache pour certaines URLs
  if (SKIP_CACHE.some((pattern) => pattern.test(url.href))) {
    return;
  }

  // Stratégie: Cache First pour assets statiques
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

// Cache First: Cherche en cache d'abord, sinon réseau - OPTIMIZED
async function cacheFirst(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('[SW] Cache hit:', request.url);
      
      // ✅ PERFORMANCE: Pas de background update pour images/fonts (économise RAM)
      const url = request.url;
      const skipUpdate = /\.(jpg|jpeg|png|gif|webp|woff2?|ttf|eot)$/i.test(url);
      
      if (!skipUpdate) {
        // Mise à jour en arrière-plan (stale-while-revalidate)
        fetch(request).then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
        }).catch(() => {});
      }
      
      return cached;
    }

    // Pas en cache -> fetch + mise en cache
    const response = await fetch(request);
    if (response && response.ok && request.method === 'GET') {
      // ✅ PERFORMANCE: Limiter taille cache pour images volumineuses
      const contentLength = response.headers.get('content-length');
      const sizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;
      
      if (sizeMB < 5) { // Max 5MB par fichier
        cache.put(request, response.clone());
      }
    }
    return response;
    
  } catch (err) {
    console.warn('[SW] Erreur cache first:', err);
    return caches.match(request).then((r) => r || offlineFallback());
  }
}

// Network First: Réseau d'abord, sinon cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Met en cache si GET et réponse OK
    if (response && response.ok && request.method === 'GET') {
      const cache = await caches.open(OFFLINE_CACHE);
      cache.put(request, response.clone());
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
    {
      headers: { 'Content-Type': 'text/html' }
    }
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
   MESSAGE HANDLER (communication avec app)
   ========================================== */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (e.data && e.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      e.ports[0].postMessage({ success: true });
    });
  }
});

/* ==========================================
   PUSH NOTIFICATIONS HANDLER (FIXED)
   ========================================== */

self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);
  
  // ✅ DEFAULT fallback
  let notificationData = {
    title: '🆕 Nouveau produit Mijoro!',
    body: 'Découvrez les dernières nouveautés',
    icon: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg',
    badge: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg',
    tag: 'new-product',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {}
  };
  
  // ✅ Parse payload avy backend
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Parsed payload:', payload);
      
      // ✅ MERGE amin'ny defaults
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        requireInteraction: typeof payload.requireInteraction !== 'undefined' ?
          payload.requireInteraction :
          true,
        vibrate: payload.vibrate || notificationData.vibrate,
        data: payload.data || notificationData.data,
        actions: payload.actions || []
      };
    } catch (err) {
      console.warn('[SW] Failed to parse push data:', err);
      // Use defaults
    }
  }
  
  // ✅ Show notification
  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );
  
  event.waitUntil(promiseChain);
});

/* ==========================================
   NOTIFICATION CLICK HANDLER (FIXED)
   ========================================== */

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  const productId = data.productId;
  
  // Handle dismiss action
  if (action === 'dismiss' || action === 'close') {
    console.log('[SW] User dismissed notification');
    return;
  }
  
  // Build URL to open
  let urlToOpen = self.location.origin + '/';
  
  if (productId) {
    urlToOpen = self.location.origin + '/?product=' + productId + '#shop';
  } else if (data.url) {
    urlToOpen = self.location.origin + data.url;
  }
  
  console.log('[SW] Opening URL:', urlToOpen);
  
  // Open or focus existing window
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(windowClients) {
    console.log('[SW] Found', windowClients.length, 'windows');
    
    // Check if app is already open
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        console.log('[SW] Focusing existing window');
        return client.navigate(urlToOpen).then(() => client.focus());
      }
    }
    
    // Open new window if none found
    if (clients.openWindow) {
      console.log('[SW] Opening new window');
      return clients.openWindow(urlToOpen);
    }
  }).catch(err => {
    console.error('[SW] Error opening window:', err);
  });
  
  event.waitUntil(promiseChain);
});
/* ==========================================
   CACHE SIZE LIMITER - Fanadiovana auto
   ========================================== */

const MAX_CACHE_SIZE = 50; // Max 50 fichiers par cache
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

// Fonction limiter cache
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    console.log('[SW] Nettoyage cache:', keys.length - maxItems, 'fichiers');
    
    // ✅ Fafao ny taloha indrindra
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// ✅ Appelé après chaque fetch
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;
  if (SKIP_CACHE.some((pattern) => pattern.test(url.href))) return;

  if (shouldCache(url.href)) {
    e.respondWith(
      cacheFirst(request).then(response => {
        // ✅ CLEANUP après cache
        limitCacheSize(CACHE_NAME, MAX_CACHE_SIZE);
        return response;
      })
    );
    return;
  }

  e.respondWith(networkFirst(request));
});

// ✅ PATCH: Nettoyage cache old entries
async function cleanOldCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const now = Date.now();
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (!response) continue;
    
    const dateHeader = response.headers.get('date');
    if (dateHeader) {
      const age = now - new Date(dateHeader).getTime();
      if (age > MAX_AGE_MS) {
        console.log('[SW] Suppression cache expiré:', request.url);
        await cache.delete(request);
      }
    }
  }
}

// ✅ Exécute nettoyage toutes les 6 heures
setInterval(cleanOldCache, 6 * 60 * 60 * 1000);