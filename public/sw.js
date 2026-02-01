/**
 * Service Worker FleetFlow - CACHE VIDÉ POUR MISE À JOUR
 * Version: 2.0 - Force refresh
 */

const CACHE_NAME = "fleetflow-v2-reset-" + Date.now();

// Installation: désactiver l'ancien cache
self.addEventListener("install", (event) => {
  console.log("[SW] Installation v2.0 - Cache reset");
  self.skipWaiting();
});

// Activation: supprimer TOUS les anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            console.log("[SW] Suppression cache:", name);
            return caches.delete(name);
          })
        );
      })
      .then(() => {
        console.log("[SW] Tous les caches supprimés");
        return self.clients.claim();
      })
  );
});

// Pas de cache pour les pages - toujours réseau
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
