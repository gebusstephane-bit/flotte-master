/**
 * Service Worker FleetFlow - Mode hors-ligne basique
 * Cache stratégie: Cache First pour les assets, Network First pour les données
 */

const CACHE_NAME = "fleetflow-v1";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Installation: cache des assets statiques
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Cache ouvert");
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error("[SW] Erreur cache:", err);
      })
  );
  self.skipWaiting();
});

// Activation: nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => {
        console.log("[SW] Activé");
        return self.clients.claim();
      })
  );
});

// Stratégie de fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes API (données dynamiques)
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Ne pas intercepter Supabase
  if (url.hostname.includes("supabase.co")) {
    return;
  }

  // Stratégie: Cache First pour les assets statiques
  if (request.destination === "image" || request.destination === "script" || request.destination === "style") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            // Mettre en cache la nouvelle ressource
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Si offline et pas en cache, retourner une fallback
            if (request.destination === "image") {
              return new Response("", { status: 404 });
            }
            return new Response("Hors ligne", { status: 503 });
          });
      })
    );
    return;
  }

  // Stratégie: Network First pour les pages HTML
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre à jour le cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Retourner la version en cache si disponible
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Page hors ligne fallback
            return caches.match("/");
          });
        })
    );
    return;
  }

  // Par défaut: essayer le réseau, sinon cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Gestion des messages depuis le client
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
