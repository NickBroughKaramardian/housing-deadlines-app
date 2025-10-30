const CACHE_NAME = 'cc-project-manager-v5';
const STATIC_CACHE = 'cc-project-manager-static-v5';
const DYNAMIC_CACHE = 'cc-project-manager-dynamic-v5';

// Files to cache immediately
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/CC_App_Icon.svg'
];

// Install event - DISABLED CACHING
self.addEventListener('install', (event) => {
  console.log('Service Worker: Caching DISABLED - forcing fresh loads');
  // Skip caching entirely
  self.skipWaiting();
});

// Activate event - CLEAR ALL CACHES
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Clearing ALL caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Service Worker: All caches cleared');
      return self.clients.claim();
    })
  );
});

// Fetch event - DISABLED CACHING - ALWAYS NETWORK
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other unsupported schemes
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:' || url.protocol === 'ms-browser-extension:') {
    return;
  }

  // ALWAYS use network - no caching
  console.log('Service Worker: Bypassing cache for:', url.pathname);
  event.respondWith(fetch(request));
});

// Cache first strategy for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline fallback for images
    if (request.destination === 'image') {
      return caches.match('/CC_App_Icon.svg');
    }
    throw error;
  }
}

// Network first strategy for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for HTML requests
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any pending offline actions
  console.log('Background sync triggered');
}

// Push notifications (if you want to add them later)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New task deadline!',
    icon: '/CC_App_Icon.svg',
    badge: '/CC_App_Icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Task',
        icon: '/CC_App_Icon.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/CC_App_Icon.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('C&C Project Manager', options)
  );
}); 