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
            img.alt = '';
            img.loading = 'lazy';
            card.appendChild(img);
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
