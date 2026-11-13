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

  // ---- 活動公告（中英文頁都顯示；置頂優先，其餘依日期由新到舊，最多 3 則）----
  function getRaw(path) {
    return fetch(cfg.url + '/rest/v1/' + path, { headers: headers })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function buildCard(a) {
    var pinLabel = (document.getElementById('announcement-list') || document.body).getAttribute('data-pin') || '';
    var title = (!isZh && a.title_en) || a.title || '';
    var text = (!isZh && a.body_en) || a.body || '';
    var card = document.createElement('article');
    card.className = 'ann';

    if (typeof a.image_url === 'string' && /^https:\/\//.test(a.image_url)) {
      var img = document.createElement('img');
      img.src = a.image_url;
      img.alt = title;
      img.loading = 'lazy';
      var frame = document.createElement('button');
      frame.type = 'button';
      frame.className = 'ann-img';
      frame.setAttribute('aria-label', title || 'image');
      frame.appendChild(img);
      frame.addEventListener('click', openLightbox.bind(null, a.image_url, title));
      card.appendChild(frame);
    }

    var body = document.createElement('div');
    body.className = 'body';
    if (a.event_date || a.pinned) {
      var meta = document.createElement('div');
      meta.className = 'meta';
      if (a.pinned) {
        var pin = document.createElement('span');
        pin.className = 'pin';
        pin.textContent = pinLabel;
        meta.appendChild(pin);
      }
      if (a.event_date) {
        var time = document.createElement('time');
        time.dateTime = a.event_date;
        time.textContent = String(a.event_date).replace(/-/g, '/');
        meta.appendChild(time);
      }
      body.appendChild(meta);
    }
    var h = document.createElement('h3');
    h.textContent = title;
    body.appendChild(h);
    if (text) {
      var p = document.createElement('p');
      p.textContent = text;
      body.appendChild(p);
    }
    card.appendChild(body);
    return card;
  }

  // 「全部公告」視窗：第一次打開時才載入（最多 60 則，含完整內文）
  var allDlg = document.getElementById('ann-all'), allLoaded = false;
  function openAll(focusId) {
    if (!allDlg || typeof allDlg.showModal !== 'function') return;
    var box = allDlg.querySelector('.ann-all-list');
    var show = function () {
      if (!allDlg.open) allDlg.showModal();
      allDlg.scrollTop = 0;
      if (focusId) {
        var t = box.querySelector('[data-id="' + focusId + '"]');
        if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' });
      }
    };
    if (allLoaded) { show(); return; }
    var q1 = 'announcements?select=id,title,body,event_date,event_at,image_url,pinned,title_en,body_en&published=eq.true&order=pinned.desc,event_date.desc.nullslast,created_at.desc&limit=60';
    var q2 = 'announcements?select=id,title,body,event_date,image_url&published=eq.true&order=event_date.desc.nullslast,created_at.desc&limit=60';
    getRaw(q1).then(function (r) { return r !== null ? r : getRaw(q2); }).then(function (rows) {
      box.textContent = '';
      (rows || []).forEach(function (a) { var cd = buildCard(a); cd.setAttribute('data-id', a.id); cd.classList.add('ann-full'); box.appendChild(cd); });
      allLoaded = true; show();
    });
  }
  if (allDlg) {
    var xb = allDlg.querySelector('.ann-all-close');
    if (xb) xb.addEventListener('click', function () { allDlg.close(); });
    allDlg.addEventListener('click', function (e) { if (e.target === allDlg) allDlg.close(); });
  }
  var list = document.getElementById('announcement-list');
  if (list) {
    var pinLabel = list.getAttribute('data-pin') || '';
    // 先用新欄位查詢；如果後台資料庫還沒升級（欄位不存在）就退回舊查詢，網站不會壞
    getRaw('announcements?select=id,title,body,event_date,event_at,image_url,pinned,title_en,body_en' +
           '&published=eq.true&order=pinned.desc,event_date.desc.nullslast,created_at.desc&limit=3')
      .then(function (rows) {
        return rows !== null ? rows : getRaw('announcements?select=id,title,body,event_date,image_url' +
          '&published=eq.true&order=event_date.desc.nullslast,created_at.desc&limit=3');
      })
      .then(function (rows) {
        rows = rows || [];
        if (!rows.length) return;
        rows.forEach(function (a) {
          var card = buildCard(a);
          card.classList.add('ann-click');
          card.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.ann-img')) return;
            openAll(a.id);
          });
          list.appendChild(card);
        });
        var more = document.getElementById('ann-more');
        if (more) { more.hidden = false; more.addEventListener('click', function () { openAll(); }); }
        var empty = document.getElementById('announcement-empty');
        if (empty) empty.hidden = true;
      });
  }

  // ---- 下一場活動倒數（取已發布、尚未開始、最近的一場；只要後台有填「日期＋時間」就會出現）----
  var cd = document.getElementById('countdown'), heroCd = document.getElementById('hero-countdown');
  if (cd || heroCd) {
    var nowIso = new Date().toISOString();
    getRaw('announcements?select=id,title,title_en,event_at&published=eq.true&event_at=gt.' + encodeURIComponent(nowIso) +
           '&order=event_at.asc&limit=1').then(function (rows) {
      if (!rows || !rows.length || !rows[0].event_at) return;
      var ev = rows[0], start = new Date(ev.event_at), title = (!isZh && ev.title_en) || ev.title || '';
      var S = function (k) { return (cd && cd.getAttribute('data-' + k)) || ''; };
      var timer = null;
      function fmt(ms) {
        var m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
        var sp = isZh ? ' ' : '';
        if (d > 0) return d + sp + S('d') + ' ' + h + sp + S('h');
        if (h > 0) return h + sp + S('h') + ' ' + mm + sp + S('m');
        return Math.max(mm, 1) + sp + S('m');
      }
      function tick() {
        var ms = start.getTime() - Date.now();
        if (ms <= 0) { if (cd) cd.hidden = true; if (heroCd) heroCd.hidden = true; clearInterval(timer); return; }
        var t = fmt(ms);
        if (cd) {
          cd.querySelector('.cd-label').textContent = S('prefix');
          cd.querySelector('.cd-time').textContent = t;
          cd.querySelector('.cd-title').textContent = title;
          cd.hidden = false;
        }
        if (heroCd) { heroCd.textContent = S('prefix') + ' ' + t + (title ? ' · ' + title : ''); heroCd.hidden = false; }
      }
      tick(); timer = setInterval(tick, 30000);

      var btn = cd && cd.querySelector('.cd-ics');
      if (btn) btn.addEventListener('click', function () {
        var pad = function (n) { return ('0' + n).slice(-2); };
        var stamp = function (d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z'; };
        var esc = function (x) { return String(x).replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n'); };
        var end = new Date(start.getTime() + 2 * 3600 * 1000);
        var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CALVA//Event//EN', 'BEGIN:VEVENT',
          'UID:' + ev.id + '@calva', 'DTSTAMP:' + stamp(new Date()), 'DTSTART:' + stamp(start), 'DTEND:' + stamp(end),
          'SUMMARY:' + esc(title || 'CALVA'), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
        var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
        var a = document.createElement('a'); a.href = url; a.download = 'calva-event.ics';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      });
    });
  }
})();
