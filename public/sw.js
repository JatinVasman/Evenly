// Evenly Service Worker — App Shell Cache for Android PWA
const CACHE_NAME = "evenly-shell-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests for navigations and static files
  // Never intercept or cache sensitive financial APIs or mutations
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) {
    return; // Pass through directly to server
  }

  // Network-first strategy with cache fallback for app shell
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid response and static resource, update cache
        if (
          response &&
          response.status === 200 &&
          (url.pathname.startsWith("/icons/") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js"))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Network unavailable", {
            status: 503,
            statusText: "Offline",
            headers: new Headers({ "Content-Type": "text/plain" }),
          });
        });
      })
  );
});
