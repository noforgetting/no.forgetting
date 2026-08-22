// Change this value whenever you release files that should replace the old offline copy.
const CACHE_NAME = "noforgetting-offline-v1";
const APP_FILES = [
  "",
  "index.html",
  "assignments.html",
  "tests.html",
  "reminders.html",
  "style.css",
  "manifest.json",
  "NoForgettinglogo.png",
  "js/dashboard.js",
  "js/assignments.js",
  "js/tests.js",
  "js/personal-reminders.js",
  "js/navbar.js",
  "js/mobile-nav.css",
  "js/utils.js"
].map((file) => new URL(file, self.registration.scope).toString());

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("noforgetting-offline-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Do not interfere with form submissions or requests to other services.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(new URL("index.html", self.registration.scope).toString())))
    );
    return;
  }

  // Use the stored app shell immediately when offline; refresh it in the background when online.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkUpdate = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });

      if (cached) {
        event.waitUntil(networkUpdate.catch(() => undefined));
        return cached;
      }

      return networkUpdate;
    })
  );
});
