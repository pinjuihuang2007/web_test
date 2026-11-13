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

// iPhone / iPad 的 Safari：還沒加入主畫面時，提示一次「加入主畫面」的做法（關掉後 30 天內不再顯示）
(function () {
  'use strict';
  try {
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Line\//.test(ua);
    var standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    if (!ios || !safari || standalone) return;
    var until = +localStorage.getItem('calva_a2hs_until') || 0;
    if (Date.now() < until) return;
    var en = /^en/i.test(document.documentElement.lang || '');
    window.addEventListener('load', function () {
      setTimeout(function () {
        var bar = document.createElement('div');
        bar.className = 'a2hs';
        bar.setAttribute('role', 'dialog');
        var msg = document.createElement('span');
        msg.textContent = en ? 'Install as an app: tap Share, then “Add to Home Screen”.' : '想像 App 一樣使用？點下方「分享」→「加入主畫面」。';
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = en ? 'Got it' : '知道了';
        b.addEventListener('click', function () {
          try { localStorage.setItem('calva_a2hs_until', String(Date.now() + 30 * 864e5)); } catch (e) {}
          bar.remove();
        });
        bar.appendChild(msg); bar.appendChild(b);
        document.body.appendChild(bar);
      }, 4000);
    });
  } catch (e) {}
})();

// 語言建議：中文頁但瀏覽器語言不是中文時，提示可切換英文版（只提示一次）
(function () {
  'use strict';
  try {
    var lang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (!/^zh/i.test(document.documentElement.lang || '') || /^zh/i.test(lang) || !lang) return;
    if (localStorage.getItem('calva_lang_hint')) return;
    var link = null;
    [].forEach.call(document.querySelectorAll('.top a'), function (a) { if (!link && /^English$/i.test((a.textContent || '').trim())) link = a; });
    if (!link) return;
    window.addEventListener('load', function () {
      setTimeout(function () {
        var bar = document.createElement('div');
        bar.className = 'a2hs';
        bar.setAttribute('role', 'dialog');
        var msg = document.createElement('span');
        msg.textContent = 'This page is in Traditional Chinese. View the English version?';
        var go = document.createElement('a');
        go.href = link.getAttribute('href'); go.textContent = 'English';
        go.className = 'a2hs-go';
        var x = document.createElement('button');
        x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Close');
        var done = function () { try { localStorage.setItem('calva_lang_hint', '1'); } catch (e) {} };
        go.addEventListener('click', done);
        x.addEventListener('click', function () { done(); bar.remove(); });
        bar.appendChild(msg); bar.appendChild(go); bar.appendChild(x);
        document.body.appendChild(bar);
      }, 1500);
    });
  } catch (e) {}
})();
