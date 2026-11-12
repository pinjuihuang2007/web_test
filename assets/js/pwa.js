// 註冊離線快取（Service Worker）。路徑用相對位置，放在 /web_test/ 底下也能正常運作。
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https:$|^http:$/.test(location.protocol)) return;
  if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
    // 新版本接手後，自動重新整理一次，確保看到的是最新頁面
    var had = !!navigator.serviceWorker.controller, done = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (had && !done) { done = true; window.location.reload(); }
    });
  });
})();
