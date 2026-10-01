// 离线缓存：每次更新内容时把 VERSION 改一下，设备联网打开后会自动换成新版
const VERSION = 'lucas-v1.2.0';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'content/math-levels.js', 'js/characters.js', 'js/math.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'img/cheese.png', 'js/lottie_light.min.js', 'js/anims.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
