// 首頁用：從 Supabase 讀取後台設定的「活動公告」與「可編輯文字／圖片」。
// 讀取失敗或尚未設定時，頁面維持原本的預設內容，不會壞掉。
(function () {
  'use strict';
  var cfg = window.SITE_CONFIG;
  if (!cfg || !cfg.url || !cfg.anonKey || cfg.url.indexOf('YOUR-') !== -1) return;

  var headers = { apikey: cfg.anonKey };
  var isZh = /^zh/i.test(document.documentElement.lang || '');

  function get(path) {
    return fetch(cfg.url + '/rest/v1/' + path, { headers: headers })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  // ---- 可編輯的文字與圖片（只套用在中文頁，英文頁維持英文原文）----
  if (isZh) {
    get('site_content?select=key,value').then(function (rows) {
      var map = {};
      rows.forEach(function (r) { map[r.key] = r.value; });

      [].forEach.call(document.querySelectorAll('[data-key]'), function (el) {
        var v = map[el.getAttribute('data-key')];
        if (typeof v === 'string' && v.trim() !== '') {
          el.textContent = v;   // 用 textContent，內容不會被當成 HTML 執行
          el.hidden = false;
        }
      });
      [].forEach.call(document.querySelectorAll('[data-img-key]'), function (el) {
        var v = map[el.getAttribute('data-img-key')];
        if (typeof v === 'string' && /^https:\/\//.test(v)) {
          el.src = v;
          el.style.display = '';
        }
      });
    });
  }

  // ---- 點圖片看原圖（完整、不裁切、不縮放）----
  var lightbox = null;
  function openLightbox(url, alt) {
    if (!lightbox) {
      lightbox = document.createElement('dialog');
      lightbox.className = 'lightbox';
      var big = document.createElement('img');
      var x = document.createElement('button');
      x.type = 'button'; x.className = 'lb-close'; x.textContent = '\u00d7'; x.setAttribute('aria-label', 'Close');
      x.addEventListener('click', function () { lightbox.close(); });
      lightbox.addEventListener('click', function (e) { if (e.target === lightbox) lightbox.close(); });
      lightbox.appendChild(big); lightbox.appendChild(x);
      document.body.appendChild(lightbox);
    }
    var im = lightbox.querySelector('img');
    im.src = url; im.alt = alt;
    if (typeof lightbox.showModal === 'function') lightbox.showModal(); else window.open(url, '_blank', 'noopener');
  }

  // ---- 活動公告（中英文頁都顯示，最新 3 則）----
  var list = document.getElementById('announcement-list');
  if (list) {
    get('announcements?select=id,title,body,event_date,image_url' +
        '&published=eq.true&order=event_date.desc.nullslast,created_at.desc&limit=3')
      .then(function (rows) {
        if (!rows.length) return;
        rows.forEach(function (a) {
          var card = document.createElement('article');
          card.className = 'ann';

          if (typeof a.image_url === 'string' && /^https:\/\//.test(a.image_url)) {
            var img = document.createElement('img');
            img.src = a.image_url;
            img.alt = a.title || '';
            img.loading = 'lazy';
            var frame = document.createElement('button');
            frame.type = 'button';
            frame.className = 'ann-img';
            frame.setAttribute('aria-label', a.title || 'image');
            frame.appendChild(img);
            frame.addEventListener('click', openLightbox.bind(null, a.image_url, a.title || ''));
            card.appendChild(frame);
          }

          var body = document.createElement('div');
          body.className = 'body';
          if (a.event_date) {
            var time = document.createElement('time');
            time.dateTime = a.event_date;
            time.textContent = String(a.event_date).replace(/-/g, '/');
            body.appendChild(time);
          }
          var h = document.createElement('h3');
          h.textContent = a.title || '';
          body.appendChild(h);
          if (a.body) {
            var p = document.createElement('p');
            p.textContent = a.body;
            body.appendChild(p);
          }
          card.appendChild(body);
          list.appendChild(card);
        });
        var empty = document.getElementById('announcement-empty');
        if (empty) empty.hidden = true;
      });
  }
})();
