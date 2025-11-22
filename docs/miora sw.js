// ==========================================
// MIORA SERVICE WORKER - Offline Support
// Fichier: miora-sw.js (à la racine)
// ==========================================

const CACHE_VERSION = 'miora-v2.1';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/miora-mobile.css',
  '/js/app.js',
  '/js/miora-offline.js',
  // Ajouter autres assets critiques
];

const CACHE_PRODUCTS = 'miora-products-v1';
const CACHE_IMAGES = 'miora-images-v1';

// Install - Cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_VERSION && 
                              name !== CACHE_PRODUCTS && 
                              name !== CACHE_IMAGES)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API calls - Network first, cache fallback
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response
          const responseClone = response.clone();
          
          // Determine cache based on URL
          let cacheName = CACHE_VERSION;
          if (url.pathname.includes('/products')) {
            cacheName = CACHE_PRODUCTS;
          }
          
          // Cache the response
          caches.open(cacheName).then((cache) => {
            cache.put(request, responseClone);
          });
          
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then((cached) => {
              if (cached) {
                console.log('[SW] Serving from cache:', request.url);
                return cached;
              }
              
              // Return offline page or error
              return new Response(
                JSON.stringify({
                  error: 'Offline',
                  message: 'Tsy misy Internet. Jereo cache.'
                }),
                {
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }
  
  // Images - Cache first
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          
          return fetch(request)
            .then((response) => {
              const responseClone = response.clone();
              caches.open(CACHE_IMAGES).then((cache) => {
                cache.put(request, responseClone);
              });
              return response;
            })
            .catch(() => {
              // Return placeholder image
              return new Response(
                '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-size="14">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            });
        })
    );
    return;
  }
  
  // Default - Cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        return cached || fetch(request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone);
            });
            return response;
          });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline.html') || 
                 new Response('<h1>Offline</h1><p>Tsy misy Internet</p>', {
                   headers: { 'Content-Type': 'text/html' }
                 });
        }
      })
  );
});

// Background sync for pending actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-products') {
    event.waitUntil(syncProducts());
  }
});

async function syncProducts() {
  try {
    // Sync cached products with server when online
    const cache = await caches.open(CACHE_PRODUCTS);
    const requests = await cache.keys();
    
    console.log('[SW] Syncing', requests.length, 'cached products');
    
    // Update cache with fresh data
    for (const request of requests) {
      try {
        const response = await fetch(request);
        await cache.put(request, response);
      } catch (error) {
        console.warn('[SW] Failed to sync:', request.url);
      }
    }
    
    console.log('[SW] Sync complete');
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
          }
