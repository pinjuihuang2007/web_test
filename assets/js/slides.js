// 首頁（一頁一頁滑動版）的互動：頁面進場、導覽點、影片、統計、隱私權視窗。
(function () {
  'use strict';

  // ---- 深色／淺色模式：完全跟著裝置（系統）設定，裝置切換時即時跟著變 ----
  (function () {
    if (!window.matchMedia) return;
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var root = document.documentElement;
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    var apply = function () {
      root.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
      if (metaTheme) metaTheme.setAttribute('content', mq.matches ? '#14101f' : '#7b5cc4');
    };
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  })();


  // ---- 鍵盤換頁：↑↓、PageUp/PageDown、空白鍵、Home/End（輸入框、視窗開啟時不處理）----
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || (t && t.isContentEditable)) return;
    if (document.querySelector('dialog[open]')) return;
    var all = [].slice.call(document.querySelectorAll('.slide'));
    if (!all.length) return;
    var k = e.key, dir = 0, edge = null;
    if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) dir = 1;
    else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) dir = -1;
    else if (k === 'Home') edge = 0;
    else if (k === 'End') edge = all.length - 1;
    else return;
    var mid = window.innerHeight / 2, cur = 0;
    all.forEach(function (s, i) { var r = s.getBoundingClientRect(); if (r.top <= mid) cur = i; });
    // 高度超過一個畫面的頁面（例如手機的會員頁）：先正常捲動，捲到底才換頁
    var r0 = all[cur].getBoundingClientRect();
    if (edge === null && ((dir > 0 && r0.bottom > window.innerHeight + 8) || (dir < 0 && r0.top < -8))) return;
    var next = edge !== null ? edge : Math.max(0, Math.min(all.length - 1, cur + dir));
    e.preventDefault();
    all[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---- 看板標題列的時鐘：台灣時間 + UTC（飛模擬飛行的人常用 Zulu 時間）----
  (function () {
    var el = document.getElementById('fb-clock');
    if (!el) return;
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var d = new Date(), t = new Date(d.getTime() + 8 * 3600 * 1000);
      el.textContent = 'TPE ' + p2(t.getUTCHours()) + ':' + p2(t.getUTCMinutes()) + ' · UTC ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes());
    };
    tick(); setInterval(tick, 15000);
  })();

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

  // ---- 首頁影片：優先播放自家影片檔；檔案不存在時退回 YouTube（靜音、行內播放，手機也可自動播放） ----
  var video = document.getElementById('hero-video');
  if (video) {
    var fellBack = false;
    var useYouTube = function () {
      if (fellBack) return;
      fellBack = true;
      var url = video.getAttribute('data-fallback');
      if (!url) return;
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

    // 復古翻頁看板：列數固定（電腦 8 列、手機 9 列）；航班多於列數時每 10 秒輪播下一頁
    var fbRoot = document.getElementById('fb-rows'), fbMsg = document.getElementById('fb-msg'), fbPage = document.getElementById('fb-page');
    var narrow = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    var COLS = [{ cls: 'st', len: 3 }, { cls: 'cs', len: 7 }, { cls: 'ty', len: 4 }, { cls: 'fr', len: 4 }, { cls: 'to', len: 4 }, { cls: 'fl', len: 3 }, { cls: 'gs', len: 3 }]
      .filter(function (c) { return !narrow || ['st', 'cs', 'fr', 'to'].indexOf(c.cls) !== -1; });
    var perPage = narrow ? 8 : (window.innerHeight >= 820 ? 8 : 7);
    if (fbRoot && fbRoot.parentNode) fbRoot.parentNode.style.setProperty('--rows', perPage);
    var board = (fbRoot && window.CALVAFlipBoard) ? window.CALVAFlipBoard.create(fbRoot, { rows: perPage, cols: COLS }) : null;
    var labels = document.getElementById('fb-labels');
    if (labels) COLS.forEach(function (c) {
      var sp = document.createElement('span');
      sp.textContent = labels.getAttribute('data-' + c.cls) || '';
      sp.style.width = 'calc((var(--w) + 2px) * ' + c.len + ')';
      labels.appendChild(sp);
    });
    var pages = [], pageNo = 0, pager = null;

    // 機場分頁：全部 / RCTP / RCSS / RCKH / RCMQ / 其他
    var MAIN = ['RCTP', 'RCSS', 'RCKH', 'RCMQ'], sel = 'ALL', lastData = null;
    var tabsEl = document.getElementById('fb-tabs');
    if (tabsEl) {
      [['ALL', tabsEl.getAttribute('data-all')]].concat(MAIN.map(function (m) { return [m, m]; }), [['OTHER', tabsEl.getAttribute('data-other')]])
        .forEach(function (t) {
          var b = document.createElement('button');
          b.type = 'button'; b.textContent = t[1]; b.setAttribute('data-k', t[0]);
          b.setAttribute('aria-pressed', t[0] === sel ? 'true' : 'false');
          b.addEventListener('click', function () {
            sel = t[0]; pageNo = 0;
            [].forEach.call(tabsEl.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
            if (lastData) render(lastData);
          });
          tabsEl.appendChild(b);
        });
    }
    var inSel = function (a, b) {
      if (sel === 'ALL') return true;
      if (sel === 'OTHER') return MAIN.indexOf(a) === -1 && MAIN.indexOf(b) === -1;
      return a === sel || b === sel;
    };
    var atcEl = document.getElementById('fb-atc'), footEl = document.getElementById('fb-foot');
    var renderAtc = function (list) {
      if (!atcEl) return;
      atcEl.textContent = '';
      var shown = list.filter(function (c) {
        if (sel === 'ALL') return true;
        var cs = String(c.callsign);
        if (cs.indexOf('RCAA') === 0) return true;                 // 台北區管（FIR）全部機場都適用
        if (sel === 'OTHER') return !MAIN.some(function (m) { return cs.indexOf(m) === 0; });
        return cs.indexOf(sel) === 0;
      });
      if (!shown.length) {
        var none = document.createElement('span'); none.className = 'none';
        none.textContent = footEl.getAttribute('data-none'); atcEl.appendChild(none); return;
      }
      shown.slice(0, 12).forEach(function (c) {
        var chip = document.createElement('span'); chip.className = 'chip';
        chip.textContent = String(c.callsign) + (c.frequency ? ' ' + c.frequency : '');
        atcEl.appendChild(chip);
      });
    };
    var showPage = function () {
      if (!board) return;
      board.set((pages[pageNo] || []).map(function (o) { return COLS.map(function (c) { return o[c.cls]; }); }));
      if (fbPage) fbPage.textContent = pages.length > 1 ? (pageNo + 1) + ' / ' + pages.length : '';
    };
    var setBoard = function (rows, msg) {
      if (!board) return;
      pages = [];
      for (var i = 0; i < rows.length; i += perPage) pages.push(rows.slice(i, i + perPage));
      if (pageNo >= pages.length) pageNo = 0;
      if (fbMsg) { fbMsg.textContent = msg || ''; fbMsg.hidden = !msg; }
      showPage();
      if (pager) { clearInterval(pager); pager = null; }
      if (pages.length > 1) pager = setInterval(function () { if (visible && !document.hidden) { pageNo = (pageNo + 1) % pages.length; showPage(); } }, 10000);
    };
    var cell = function (tr, text, cls) {
      var td = document.createElement('td');
      if (cls) td.className = cls;
      td.textContent = text;
      tr.appendChild(td);
      return td;
    };
    var message = function (text) {
      setBoard([], text);
      liveBody.textContent = '';
      var tr = document.createElement('tr');
      var td = cell(tr, text, 'note'); td.colSpan = 5;
      liveBody.appendChild(tr);
    };

    var rowOf = function (p, kind) {
      var fp = p.flight_plan, isTwDep = TW.indexOf(fp.departure) !== -1;
      if (kind === 'pre') return { st: 'PRE', cs: String(p.callsign), ty: String(fp.aircraft_short || ''), fr: String(fp.departure || ''), to: String(fp.arrival || ''), fl: '---', gs: '---' };
      var alt = Number(p.altitude) || 0, gs = Number(p.groundspeed) || 0;
      return {
        st: isTwDep ? 'DEP' : 'ARR', cs: String(p.callsign), ty: String(fp.aircraft_short || ''),
        fr: String(fp.departure || ''), to: String(fp.arrival || ''),
        fl: alt >= 1000 ? ('00' + Math.round(alt / 100)).slice(-3) : 'GND', gs: ('00' + Math.min(999, Math.round(gs))).slice(-3)
      };
    };
    // 依目前選的機場分頁，重畫看板、純文字表格與管制員列
    var render = function (d) {
      var rows = [];
      d.flights.forEach(function (p) { if (inSel(p.flight_plan.departure, p.flight_plan.arrival)) rows.push(rowOf(p, 'live')); });
      d.pre.forEach(function (p) { if (inSel(p.flight_plan.departure, p.flight_plan.arrival)) rows.push(rowOf(p, 'pre')); });
      liveBody.textContent = '';
      if (!rows.length) { message(liveBody.getAttribute('data-empty')); }
      else {
        setBoard(rows.slice(0, 60), '');
        rows.slice(0, 15).forEach(function (r) {
          var tr = document.createElement('tr');
          var td = document.createElement('td');
          var badge = document.createElement('span');
          badge.className = 'badge ' + r.st.toLowerCase();
          badge.textContent = liveBody.getAttribute('data-' + r.st.toLowerCase());
          td.appendChild(badge); tr.appendChild(td);
          cell(tr, r.cs, 'cs'); cell(tr, r.ty || '—'); cell(tr, r.fr || '—'); cell(tr, r.to || '—');
          liveBody.appendChild(tr);
        });
      }
      renderAtc(d.atc);
    };

    var refresh = function () {
      if (loading || document.hidden) return;
      loading = true;
      fetch('https://data.vatsim.net/v3/vatsim-data.json')
        .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
        .then(function (data) {
          var twPlan = function (p) {
            var fp = p.flight_plan;
            return fp && (TW.indexOf(fp.departure) !== -1 || TW.indexOf(fp.arrival) !== -1);
          };
          var byCs = function (a, b) { return String(a.callsign).localeCompare(String(b.callsign)); };
          lastData = {
            flights: (data.pilots || []).filter(twPlan).sort(byCs),
            pre: (data.prefiles || []).filter(twPlan).sort(byCs),
            // 台灣管制席位：呼號以 RC 開頭，且不是觀察員（facility 0）
            atc: (data.controllers || []).filter(function (c) { return /^RC/.test(String(c.callsign)) && Number(c.facility) > 0; })
                   .sort(byCs)
          };
          render(lastData);
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
