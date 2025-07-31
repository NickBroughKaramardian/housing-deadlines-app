const CACHE_NAME = 'cc-project-manager-v2';
const STATIC_CACHE = 'cc-project-manager-static-v2';
const DYNAMIC_CACHE = 'cc-project-manager-dynamic-v2';

// Files to cache immediately
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/CC_App_Icon.svg',
  '/apple-touch-icon.png',
  '/logo192.png',
  '/logo512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/static/')) {
    // Static assets - cache first
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/api/')) {
    // API calls - network first
    event.respondWith(networkFirst(request));
  } else {
    // HTML pages - network first
    event.respondWith(networkFirst(request));
  }
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