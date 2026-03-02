const CACHE_NAME = "gym-tracker-v17";
const ASSETS = [
  "./",
  "./index.html",
  "./css/variables.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/workout.css",
  "./css/builder.css",
  "./css/history.css",
  "./js/store.js",
  "./js/ui.js",
  "./js/workout.js",
  "./js/builder.js",
  "./js/history.js",
  "./js/main.js",
  "https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js"
];

// Installation : Le navigateur télécharge les fichiers pour le hors-ligne
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Interception : Si tu n'as pas internet, il te sert les fichiers enregistrés
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
