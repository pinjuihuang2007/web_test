// 簡單的離線快取：頁面優先連網（內容才會是最新），失敗再用快取；靜態檔案優先用快取。
// 後台、Supabase、vAMSYS、VATSIM 等即時資料完全不經過快取。
var VERSION = 'calva-v2';
var SHELL = ['./', 'index.html', 'index-en.html', 'assets/css/slides.css', 'assets/js/slides.js', 'assets/js/content.js',
             'assets/js/member.js', 'assets/js/site-config.js', 'assets/img/logo-dark.png', 'assets/img/hero-bg.jpg',
             'assets/img/favicon.png', 'assets/vendor/boxicons/css/boxicons.min.css'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;           // 跨網域（API）不處理
  if (/admin\.html$/.test(url.pathname) || url.search.indexOf('code=') !== -1) return; // 後台與登入回傳不快取
  if (/\.(mp4|webm)$/.test(url.pathname)) return;                                // 影片不快取
  // 頁面、程式、樣式、資料一律「優先連網」，這樣網站更新後一重新整理就是新的；沒網路時才用快取
  if (req.mode === 'navigate' || /\.(html|json|csv|js|css|webmanifest)$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok) { var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return r;
    }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('index.html'); }); }));
    return;
  }
  // 圖片與字型很少變動：優先用快取
  e.respondWith(caches.match(req).then(function (m) {
    return m || fetch(req).then(function (r) {
      if (r.ok) { var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return r;
    });
  }));
});
