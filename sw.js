const CACHE = "jacob-log-v1";

const ASSETS = [
  "index.html",
  "animals.html",
  "map.html",
  "help.html",
  "kids.html",
  "favourites.html",

  "css/styles.css",

  "js/app.js",
  "js/animals.js",
  "js/map.js",
  "js/favourites.js",

  "manifest.json",
  "data/animals.json",

  // ✅ Art-directed hero images (match index.html <picture>)
  "assets/img/hero-portrait.jpg",
  "assets/img/hero-landscape.jpg",

  // Animal images
  "assets/img/hedgehog.jpg",
  "assets/img/badger.jpg",
  "assets/img/barn-owl.jpg",
  "assets/img/fox.jpg",
  "assets/img/otter.jpg",
  "assets/img/red-squirrel.avif"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
