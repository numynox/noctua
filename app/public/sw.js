/* Minimal service worker for Noctua PWA
   - Precache icon assets for installability
   - No offline support (app requires internet connection)
   - Compatible with Firefox and all modern browsers
*/

const CACHE_PREFIX = "noctua-v3";
const PRECACHE_ASSETS = [
  "/noctua/favicon.ico",
  "/noctua/android-chrome-192x192.png",
  "/noctua/android-chrome-512x512.png",
  "/noctua/noctua.png",
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
