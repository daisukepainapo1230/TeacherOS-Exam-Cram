"use strict";

var CACHE_PREFIX = "teacheros-exam-cram-";
var CACHE_NAME = CACHE_PREFIX + "v1.4.0";
var BASE_URL = new URL("./", self.location.href).href;
var INDEX_URL = new URL("index.html", BASE_URL).href;
var MANIFEST_URL = new URL("manifest.json", BASE_URL).href;
var APP_SHELL = [BASE_URL, INDEX_URL, MANIFEST_URL];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve(false);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { return cache.put(request, copy); });
          }
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match(INDEX_URL).then(function (index) {
              return index || caches.match(BASE_URL);
            });
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok && response.type === "basic") {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { return cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
