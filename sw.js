/* Forge service worker — network-first so updates show up promptly,
   with a cache fallback so it still works offline. */
const CACHE = "forge-v20";
const ASSETS = [
  "./",
  "./index.html",
  "./exercises.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-maskable.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first with a fast cache fallback (handles an asleep/unreachable server).
function networkFirst(req) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r) => { if (!settled && r) { settled = true; resolve(r); } };
    const timer = setTimeout(() => {
      caches.match(req).then((c) => finish(c));
    }, 2500);
    fetch(req)
      .then((res) => {
        clearTimeout(timer);
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        finish(res);
      })
      .catch(() => {
        clearTimeout(timer);
        caches.match(req).then((c) => finish(c || caches.match("./index.html")));
      });
  });
}

// tapping the rest-over notification brings the app back to the front
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      return clients.openWindow("./");
    })
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).pathname.startsWith("/api/")) return; // never cache the backup API
  e.respondWith(networkFirst(req));
});
