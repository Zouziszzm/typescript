const CACHE = "reader-v2";
const SHELL = ["/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => {
      // @ts-expect-error service worker scope
      self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept Next.js assets or dev hot reload
  if (url.pathname.startsWith("/_next")) return;
  if (url.pathname.startsWith("/api")) return;

  // HTML navigations: network only (avoid stale app shell)
  if (req.mode === "navigate") {
    event.respondWith(fetch(req));
    return;
  }

  // Static shell assets: cache first
  if (SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => cached ?? fetch(req)),
    );
    return;
  }
});
