const CACHE_VERSION = 'v7';
const CACHE_NAME = `vales-amor-${CACHE_VERSION}`;
const ASSETS = [
  '/Flayer/',
  '/Flayer/index.html',
  '/Flayer/manifest.json'
];

// Instalar y cachear assets esenciales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Limpiar caches antiguos al activar
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('vales-amor-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Estrategia de caché
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Ignorar peticiones a PocketBase y APIs externas
  if (url.hostname !== location.hostname || 
      url.pathname.includes('/api/') ||
      url.port === '8090') {
    return;
  }

  // Network-first para HTML (siempre fresco)
  if (e.request.mode === 'navigate' || 
      url.pathname.endsWith('.html') || 
      url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Cachear la respuesta fresca
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request) || caches.match('/Flayer/index.html'))
    );
    return;
  }

  // Stale-while-revalidate para JS y otros assets
  if (url.pathname.endsWith('.js')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, response.clone()));
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Cache-first para el resto (fuentes, imágenes)
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request).then(response => {
        // Solo cachear respuestas exitosas
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }))
      .catch(() => new Response('Offline', { status: 503 }))
  );
});
