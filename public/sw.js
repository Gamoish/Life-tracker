// App-shell-only service worker. Deliberately narrow: it only ever caches
// Next's content-hashed static assets and the icon files, and never touches
// navigations, RSC payloads, or /api/* — this app needs a live connection to
// Supabase, and caching a page or API response here would risk serving stale
// database data while "offline".
const CACHE_NAME = "tracker-shell-v1";
const SHELL_PATH_PREFIXES = ["/_next/static/", "/icons/"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!SHELL_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
