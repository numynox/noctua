/* Simple service worker for static Noctua site
   - Precache the shell assets on install
   - Serve navigation requests with network-first, falling back to cache and offline.html
   - Cache same-origin static assets (CSS/JS/fonts/images) with stale-while-revalidate
   Note: Paths are relative to the site root. Keep the worker simple to work on static hosting.
*/

const CACHE_PREFIX = "noctua-v1";
const PRECACHE_ASSETS = [
  "/noctua/",
  "/noctua/offline.html",
  "/noctua/favicon.svg",
  "/noctua/icons/icon-192.svg",
  "/noctua/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_PREFIX).then(async (cache) => {
      // Add assets one-by-one and ignore individual failures so a single
      // missing resource doesn't fail the whole install (common on S3/GH pages).
      for (const asset of PRECACHE_ASSETS) {
        try {
          const res = await fetch(asset, { cache: "no-store" });
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          await cache.put(asset, res.clone());
        } catch (err) {
          // Log and continue; service worker should still install.
          // eslint-disable-next-line no-console
          console.warn("sw: precache failed for", asset, err);
        }
      }
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_PREFIX).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Utility to determine same-origin requests
function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Navigation requests (pages) -> try network first, fallback to cache then offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Optionally update cache with fresh response
          const copy = res.clone();
          caches.open(CACHE_PREFIX).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            // Try common fallbacks: root, index.html, then offline page
            return caches
              .match("/")
              .then((root) => root || caches.match("/index.html"))
              .then((found) => found || caches.match("/offline.html"))
              .then((finalFound) => {
                if (!finalFound) {
                  // eslint-disable-next-line no-console
                  console.warn(
                    "sw: no cached navigation fallback for",
                    request.url,
                  );
                }
                return finalFound;
              });
          }),
        ),
    );
    return;
  }

  // For same-origin static assets (CSS/JS/images), use stale-while-revalidate
  if (isSameOrigin(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches
                .open(CACHE_PREFIX)
                .then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch(() => null);

        return cached || networkFetch;
      }),
    );
  }
  // Otherwise let browser handle it
});
