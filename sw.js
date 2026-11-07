// Gatelight offline cache. Bump VERSION whenever you change any app file.
const VERSION = "gatelight-v1";
const FILES = ["./", "index.html", "film.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// App files: cache first, so the app opens with no signal. Fonts: cached the first time they load.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      const url = new URL(e.request.url);
      if (res.ok && (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com"))) {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
