/* ==========================================
   SERVICE WORKER - MIJORO BOUTIQUE PWA
   Optimized for PWABuilder compliance
   ========================================== */

const CACHE_NAME = 'mijoro-v1.4';
const OFFLINE_CACHE = 'mijoro-offline-v1';
const RUNTIME_CACHE = 'mijoro-runtime-v1';

// Critical assets to pre-cache
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// URL patterns to cache dynamically
const CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
  /\.(?:woff2?|ttf|eot|otf)$/i,
  /\.(?:css|js)$/i,
  /ibb\.co/i,
  /supabase\.co\/storage/i
];

// URLs to never cache
const SKIP_CACHE = [
  /chrome-extension:/,
  /localhost:.*hot-update/,
  /\.map$/i,
  /\/auth\//i,
  /\/realtime\//i
];

// Cache size limits
const MAX_CACHE_SIZE = 50;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/* ==========================================
   INSTALL - Pre-cache critical assets
   ========================================== */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[SW] Pre-cache failed:', error);
      })
      .then(() => self.skipWaiting())
  );
});

/* ==========================================
   ACTIVATE - Clean old caches
   ========================================== */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== CACHE_NAME && 
                     name !== OFFLINE_CACHE && 
                     name !== RUNTIME_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/* ==========================================
   FETCH - Smart caching strategy
   ========================================== */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip blacklisted URLs
  if (SKIP_CACHE.some((pattern) => pattern.test(url.href))) {
    return;
  }

  // Cache strategy for static assets
  if (shouldCache(url.href)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network first for API calls
  event.respondWith(networkFirst(request));
});

/* ==========================================
   CACHING STRATEGIES
   ========================================== */

function shouldCache(url) {
  return CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

async function cacheFirst(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      // Update cache in background for non-images
      if (!/\.(jpg|jpeg|png|gif|webp|woff2?)$/i.test(request.url)) {
        fetch(request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(request, response.clone());
            }
          })
          .catch(() => {});
      }
      
      return cached;
    }

    // Not in cache - fetch and cache
    const response = await fetch(request);
    
    if (response && response.ok && request.method === 'GET') {
      const contentLength = response.headers.get('content-length');
      const sizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;
      
      if (sizeMB < 5) {
        cache.put(request, response.clone());
      }
    }
    
    return response;
    
  } catch (error) {
    console.warn('[SW] Cache first failed:', error);
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response && response.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    console.warn('[SW] Network failed, trying cache:', error);
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Hors ligne - Mijoro Boutique</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Montserrat', system-ui, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          text-align: center;
          padding: 20px;
        }
        .container {
          max-width: 400px;
          padding: 40px;
          background: rgba(0,0,0,0.3);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 12px;
          font-weight: 800;
        }
        p {
          font-size: 16px;
          opacity: 0.9;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        button {
          padding: 14px 32px;
          background: #fff;
          color: #667eea;
          border: none;
          border-radius: 999px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transition: all 0.3s ease;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>Hors ligne</h1>
        <p>Vous n'êtes pas connecté à Internet. Veuillez vérifier votre connexion et réessayer.</p>
        <button onclick="location.reload()">♻️ Réessayer</button>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    }
  );
}

/* ==========================================
   PUSH NOTIFICATIONS
   ========================================== */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: '🆕 Mijoro Boutique',
    body: 'Nouveau produit disponible!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: 'mijoro-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: '/?source=push'
    }
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
    } catch (error) {
      console.warn('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if available
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => client.navigate(urlToOpen));
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

/* ==========================================
   BACKGROUND SYNC
   ========================================== */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

async function syncOfflineOrders() {
  console.log('[SW] Syncing offline orders...');
  // Add your sync logic here
}

/* ==========================================
   MESSAGE HANDLER
   ========================================== */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      event.ports[0]?.postMessage({ success: true });
    });
  }
});

/* ==========================================
   CACHE MAINTENANCE
   ========================================== */
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

async function cleanOldCache() {
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  const now = Date.now();
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (!response) continue;
    
    const dateHeader = response.headers.get('date');
    if (dateHeader) {
      const age = now - new Date(dateHeader).getTime();
      if (age > MAX_AGE_MS) {
        await cache.delete(request);
      }
    }
  }
}

// Run cleanup periodically
setInterval(() => {
  limitCacheSize(RUNTIME_CACHE, MAX_CACHE_SIZE);
  cleanOldCache();
}, 6 * 60 * 60 * 1000); // Every 6 hours