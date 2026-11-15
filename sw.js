/* AudioPhraser Studio — service worker (offline app shell)
   Pages (HTML): network-first, falling back to the cache when offline,
   so a fresh deployment is picked up immediately when online.
   Static files (js/css/icons/manifest): cache-first with background
   refresh. Cross-origin (Firebase SDK, fonts): network, cache fallback.
   Bump SW_VERSION on every deployment that changes cached files. */
const SW_VERSION = "aps-pwa-14";
const CORE = [
  "/", "/index.html", "/editor.html", "/player.html", "/login.html", "/admin.html",
  "/firebase-config.js", "/auth-gate.js", "/manifest.webmanifest",
  "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(SW_VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (req.mode === "navigate" || (sameOrigin && (url.pathname.endsWith(".html") || url.pathname === "/"))) {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(SW_VERSION).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match("/index.html")))
    );
    return;
  }
  if (sameOrigin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(res => { const copy = res.clone(); caches.open(SW_VERSION).then(c => c.put(req, copy)); return res; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }
  e.respondWith(
    fetch(req).then(res => { const copy = res.clone(); caches.open(SW_VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
