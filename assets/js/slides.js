// 首頁（一頁一頁滑動版）的互動：頁面進場、導覽點、影片、統計、隱私權視窗。
(function () {
  'use strict';

  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var dots = [].slice.call(document.querySelectorAll('.dots a'));

  // ---- 目前頁面：進場動畫 + 左側圓點高亮 ----
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        var i = slides.indexOf(e.target);
        dots.forEach(function (d, j) { d.classList.toggle('on', i === j); });
      });
    }, { threshold: 0.55 });
    slides.forEach(function (s) { io.observe(s); });
  } else {
    slides.forEach(function (s) { s.classList.add('in'); });
  }

  // ---- 首頁影片：優先播放自家影片檔；檔案不存在時，電腦退回 YouTube、手機顯示封面圖 ----
  var video = document.getElementById('hero-video');
  if (video) {
    var fellBack = false;
    var touchDevice = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
    var useYouTube = function () {
      if (fellBack) return;
      fellBack = true;
      var url = video.getAttribute('data-fallback');
      if (!url || touchDevice) return;     // 手機的瀏覽器不會自動播放 YouTube 嵌入，維持封面圖
      var f = document.createElement('iframe');
      f.src = url;
      f.title = '';
      f.setAttribute('allow', 'autoplay; encrypted-media');
      f.setAttribute('tabindex', '-1');
      f.setAttribute('aria-hidden', 'true');
      video.style.display = 'none';
      video.parentNode.appendChild(f);
    };
    var source = video.querySelector('source');
    if (source) source.addEventListener('error', useYouTube);
    video.addEventListener('error', useYouTube);

    // iOS 要求：靜音、行內播放，而且要在程式裡明確設定才會自動播放
    video.muted = true; video.defaultMuted = true; video.playsInline = true;
    video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
    var tryPlay = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
    tryPlay();
    video.addEventListener('canplay', tryPlay, { once: true });
    // 省電模式等情況下被擋時，使用者第一次觸碰畫面就補播
    var kick = function () { if (video.paused) tryPlay(); };
    ['touchstart', 'pointerdown', 'scroll'].forEach(function (ev) { window.addEventListener(ev, kick, { once: true, passive: true }); });
    // 回到分頁／頁面可見時繼續播
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  }

  // ---- 隱私權政策視窗 ----
  var dlg = document.getElementById('privacy');
  var openBtn = document.getElementById('open-privacy');
  var closeBtn = document.getElementById('close-privacy');
  if (dlg && openBtn) {
    openBtn.addEventListener('click', function () {
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    });
    closeBtn.addEventListener('click', function () {
      if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg && dlg.close) dlg.close(); });
  }

  // ---- 台灣即時航班（VATSIM 公開資料）----
  // 只顯示呼號、機型、起訖機場；不顯示飛行員姓名。所有文字都用 textContent，避免被塞入惡意內容。
  var liveBody = document.getElementById('live-body');
  if (liveBody) {
    var TW = ['RCTP', 'RCSS', 'RCKH', 'RCMQ', 'RCYU', 'RCFG', 'RCNN', 'RCQC', 'RCBS', 'RCKU', 'RCLY', 'RCGI', 'RCPO', 'RCFN'];
    var liveSlide = document.getElementById('live');
    var updated = document.getElementById('live-updated');
    var visible = false, timer = null, loading = false;

    var cell = function (tr, text, cls) {
      var td = document.createElement('td');
      if (cls) td.className = cls;
      td.textContent = text;
      tr.appendChild(td);
      return td;
    };
    var message = function (text) {
      liveBody.textContent = '';
      var tr = document.createElement('tr');
      var td = cell(tr, text, 'note'); td.colSpan = 5;
      liveBody.appendChild(tr);
    };

    var refresh = function () {
      if (loading || document.hidden) return;
      loading = true;
      fetch('https://data.vatsim.net/v3/vatsim-data.json')
        .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
        .then(function (data) {
          var flights = (data.pilots || []).filter(function (p) {
            var fp = p.flight_plan;
            return fp && (TW.indexOf(fp.departure) !== -1 || TW.indexOf(fp.arrival) !== -1);
          }).sort(function (a, b) { return String(a.callsign).localeCompare(String(b.callsign)); });

          if (!flights.length) { message(liveBody.getAttribute('data-empty')); }
          else {
            liveBody.textContent = '';
            flights.slice(0, 15).forEach(function (p) {
              var fp = p.flight_plan, isDep = TW.indexOf(fp.departure) !== -1;
              var tr = document.createElement('tr');
              var td = document.createElement('td');
              var badge = document.createElement('span');
              badge.className = 'badge ' + (isDep ? 'dep' : 'arr');
              badge.textContent = liveBody.getAttribute(isDep ? 'data-dep' : 'data-arr');
              td.appendChild(badge); tr.appendChild(td);
              cell(tr, String(p.callsign), 'cs');
              cell(tr, String(fp.aircraft_short || '—'));
              cell(tr, String(fp.departure || '—'));
              cell(tr, String(fp.arrival || '—'));
              liveBody.appendChild(tr);
            });
          }
          if (updated) updated.textContent = updated.getAttribute('data-label') + ' ' + new Date().toLocaleTimeString();
        })
        .catch(function () { message(liveBody.getAttribute('data-error')); })
        .then(function () { loading = false; });
    };

    var start = function () { refresh(); if (!timer) timer = setInterval(refresh, 60000); };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    if ('IntersectionObserver' in window && liveSlide) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();   // 離開該頁就停止更新，省流量
      }, { threshold: 0.3 }).observe(liveSlide);
    } else { start(); }
  }

  // ---- 統計數據 ----
  function countUp(el, end) {
    if (!el) return;
    var start = null, dur = 1000;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = end.toLocaleString(); return;
    }
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(end * t).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var stats = document.getElementById('stats');
  if (stats) {
    var unitLegs = stats.getAttribute('data-unit-legs') || '';
    var unitHours = stats.getAttribute('data-unit-hours') || '';

    // 機師人數：members.csv 每一位成員一列（第一欄是編號）
    fetch('assets/members.csv')
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var n = text.split(/\r?\n/).filter(function (l) { return /^\d+,/.test(l.replace(/^﻿/, '')); }).length;
        countUp(document.getElementById('purecounter-pilots'), n);
      })
      .catch(function () {});

    fetch('assets/statistics.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        countUp(document.getElementById('purecounter-legs'), data.trackedLeg || 0);
        countUp(document.getElementById('purecounter-time'), Math.floor((data.trackedTime || 0) / 60));

        // 前 5 名名單（id 格式：statistics-{all|year|month}-{legs|duration}）
        [].forEach.call(document.querySelectorAll('.rank'), function (ol) {
          var m = /^statistics-(all|year|month)-(legs|duration)$/.exec(ol.id);
          if (!m || !data[m[1]]) return;
          var rows = (m[2] === 'legs' ? data[m[1]].legs : data[m[1]].time) || [];
          if (!rows.length) {
            var empty = document.createElement('li');
            empty.textContent = '—';
            ol.appendChild(empty);
            return;
          }
          rows.forEach(function (row, i) {
            var li = document.createElement('li');
            var n = document.createElement('span'); n.className = 'n'; n.textContent = String(i + 1);
            var who = document.createElement('span'); who.className = 'who'; who.textContent = row.name;
            var val = document.createElement('span'); val.className = 'val';
            val.textContent = m[2] === 'legs'
              ? row.legs + ' ' + unitLegs
              : Math.round(row.duration) + ' ' + unitHours;
            li.appendChild(n); li.appendChild(who); li.appendChild(val);
            ol.appendChild(li);
          });
        });
      })
      .catch(function () {});

    // 分頁籤
    var tabs = [].slice.call(document.querySelectorAll('.tab'));
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
        [].forEach.call(document.querySelectorAll('.rank'), function (ol) {
          ol.hidden = ol.id !== tab.getAttribute('data-target');
        });
      });
    });
  }
})();
