// 离线缓存：每次更新内容时把 VERSION 改一下，设备联网打开后会自动换成新版
const VERSION = 'lucas-v1.8.0';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'content/math-levels.js', 'content/hanzi.js', 'js/hanzi.js', 'content/english.js', 'js/english.js', 'content/rewards.js', 'fonts/kai.woff2', 'js/characters.js', 'js/mapart.js', 'js/math.js', 'js/sync.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'img/cheese.png', 'img/lucas.jpg',
  'voice/A01.m4a', 'voice/A02.m4a', 'voice/A03.m4a', 'voice/A04.m4a', 'voice/A05.m4a', 'voice/A06.m4a', 'voice/A07.m4a', 'voice/A08.m4a', 'voice/A09.m4a', 'voice/A10.m4a', 'voice/B01.m4a', 'voice/B02.m4a', 'voice/B03.m4a', 'voice/C01.m4a', 'voice/C02.m4a', 'voice/C03.m4a', 'voice/C04.m4a', 'voice/C05.m4a', 'voice/C06.m4a', 'voice/D01.m4a', 'voice/D03.m4a', 'voice/D04.m4a', 'js/lottie_light.min.js', 'js/anims.js',
];
self.addEventListener('install', (e) => {
  // cache: 'reload'：跳过浏览器缓存，保证存进去的都是最新文件
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // 同步请求（GitHub）直接走网络
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
