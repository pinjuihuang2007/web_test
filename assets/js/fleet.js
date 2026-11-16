/* 機隊與航線頁：互動航線地圖、航線規劃、時區換算 */
(function () {
  'use strict';
  var AP = window.CALVA_AIRPORTS || {};
  var zh = /^zh/i.test(document.documentElement.lang || '');
  var $ = function (id) { return document.getElementById(id); };
  var RAD = Math.PI / 180;

  function distNm(a, b) {
    var dLat = (b[0] - a[0]) * RAD, dLon = (b[1] - a[1]) * RAD;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function fmtTime(h, tag) {
    var m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60;
    return hh + ' ' + tag.h + (mm ? ' ' + mm + ' ' + tag.m : '');
  }
  var nf = function (n) { return Math.round(n).toLocaleString(); };

  // 大圓路徑：回傳 [lat, lon] 陣列，經度連續展開（跨太平洋不會斷線）
  function arc(a, b, n) {
    var la1 = a[0] * RAD, lo1 = a[1] * RAD, la2 = b[0] * RAD, lo2 = b[1] * RAD;
    var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((la2 - la1) / 2), 2) + Math.cos(la1) * Math.cos(la2) * Math.pow(Math.sin((lo2 - lo1) / 2), 2)));
    var pts = [], prev = a[1];
    for (var i = 0; i <= n; i++) {
      var f = i / n;
      var A = Math.sin((1 - f) * d) / Math.sin(d || 1), B = Math.sin(f * d) / Math.sin(d || 1);
      var x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
      var y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
      var z = A * Math.sin(la1) + B * Math.sin(la2);
      var lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / RAD, lon = Math.atan2(y, x) / RAD;
      while (lon - prev > 180) lon -= 360;
      while (lon - prev < -180) lon += 360;
      prev = lon; pts.push([lat, lon]);
    }
    return pts;
  }

  /* ---------- 航線地圖 ---------- */
  function initMap() {
    var el = $('route-map'), dataEl = $('routes-data');
    if (!el || !dataEl || !window.L) return;
    var routes = JSON.parse(dataEl.textContent).filter(function (r) { return AP[r.from] && AP[r.to]; });
    var tag = { h: el.getAttribute('data-h'), m: el.getAttribute('data-m') };
    var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    var map = L.map(el, { worldCopyJump: true, minZoom: 2, zoomSnap: 0.5, scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/' + (dark ? 'dark_all' : 'light_all') + '/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd', maxZoom: 12
    }).addTo(map);
    // 點一下地圖才啟用滾輪縮放，避免頁面捲動時被地圖卡住
    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur', function () { map.scrollWheelZoom.disable(); });

    var typesSeen = [];
    routes.forEach(function (r) { r.types.forEach(function (t) { if (typesSeen.indexOf(t) < 0) typesSeen.push(t); }); });
    var layer = L.layerGroup().addTo(map), active = 'ALL';
    var HUBS = ['RCTP', 'RCSS', 'RCKH'];
    var pos = {};   // 機場 -> 展開後的 [lat, lon]（以第一次出現的航線為準）

    function draw() {
      layer.clearLayers();
      var shown = routes.filter(function (r) { return active === 'ALL' || r.types.indexOf(active) >= 0; });
      var bounds = [];
      shown.forEach(function (r) {
        var a = AP[r.from], b = AP[r.to];
        var pts = arc(a, b, 48);
        var line = L.polyline(pts, { color: '#7b5cc4', weight: 2, opacity: .55 }).addTo(layer);
        var nm = distNm(a, b), kt = r.types.indexOf('A359') >= 0 || r.types.indexOf('B77W') >= 0 ? 480 : 450;
        line.bindPopup('<b>' + r.from + ' → ' + r.to + '</b><br>' + el.getAttribute('data-distance') + '：' + nf(nm) + ' nm<br>' +
          el.getAttribute('data-time') + '：' + fmtTime(nm / kt + 25 / 60, tag) + '<br>' + el.getAttribute('data-types') + '：' + r.types.join(', '));
        line.on('mouseover', function () { line.setStyle({ weight: 4, opacity: 1, color: '#d9709f' }); });
        line.on('mouseout', function () { line.setStyle({ weight: 2, opacity: .55, color: '#7b5cc4' }); });
        pts.forEach(function (p) { bounds.push(p); });
        pos[r.from] = pos[r.from] || pts[0]; pos[r.to] = pts[pts.length - 1];
        [[r.from, pts[0]], [r.to, pts[pts.length - 1]]].forEach(function (x) {
          var hub = HUBS.indexOf(x[0]) >= 0;
          L.circleMarker(x[1], { radius: hub ? 6 : 3.5, color: hub ? '#c73a72' : '#7b5cc4', weight: 1.5, fillColor: hub ? '#d9709f' : '#fff', fillOpacity: 1 })
            .bindTooltip(x[0], { direction: 'top' }).addTo(layer);
        });
      });
      $('rm-count').textContent = shown.length + ' ' + el.getAttribute('data-count');
      if (bounds.length) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 5 });
    }

    var box = $('rm-filters');
    ['ALL'].concat(typesSeen).forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = t === 'ALL' ? el.getAttribute('data-all') : t;
      b.setAttribute('aria-pressed', t === 'ALL' ? 'true' : 'false');
      b.addEventListener('click', function () {
        active = t;
        [].forEach.call(box.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
        draw();
      });
      box.appendChild(b);
    });
    draw();
    setTimeout(function () { map.invalidateSize(); }, 300);
  }

  /* ---------- 航線規劃 ---------- */
  function initPlanner() {
    var form = $('planner-form'); if (!form) return;
    var root = $('planner'), res = $('pl-result'), list = $('apt-list');
    Object.keys(AP).sort().forEach(function (k) { var o = document.createElement('option'); o.value = k; list.appendChild(o); });
    var tag = { h: root.getAttribute('data-h'), m: root.getAttribute('data-m') };
    function calc() {
      var a = $('pl-from').value.trim().toUpperCase(), b = $('pl-to').value.trim().toUpperCase();
      var sel = $('pl-type'), opt = sel.options[sel.selectedIndex], kt = Number(opt.getAttribute('data-kt')) || 450;
      res.textContent = '';
      var msg = function (t) { var p = document.createElement('p'); p.className = 'err'; p.textContent = t; res.appendChild(p); };
      if (!AP[a] || !AP[b]) { msg(root.getAttribute('data-unknown')); return; }
      if (a === b) { msg(root.getAttribute('data-same')); return; }
      var nm = distNm(AP[a], AP[b]);
      var row = function (k, v) { var d = document.createElement('div'); var s = document.createElement('span'); s.textContent = k; var b2 = document.createElement('b'); b2.textContent = v; d.appendChild(s); d.appendChild(b2); res.appendChild(d); };
      row(res.getAttribute('data-dist'), nf(nm) + ' nm · ' + nf(nm * 1.852) + ' km');
      row(res.getAttribute('data-time'), fmtTime(nm / kt + 25 / 60, tag));
      var link = document.createElement('a');
      link.className = 'sb'; link.target = '_blank'; link.rel = 'noopener';
      link.href = 'https://dispatch.simbrief.com/options/custom?orig=' + encodeURIComponent(a) + '&dest=' + encodeURIComponent(b) + '&type=' + encodeURIComponent(sel.value);
      link.textContent = res.getAttribute('data-sb') + ' ↗';
      res.appendChild(link);
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
    $('pl-type').addEventListener('change', calc);
    calc();
  }

  /* ---------- 時區換算 ---------- */
  function initTz() {
    var form = $('tz-form'); if (!form) return;
    var ZONES = [
      ['Asia/Taipei', '台北 Taipei'], ['UTC', 'UTC / Zulu'], ['Asia/Tokyo', '東京 Tokyo'], ['Asia/Seoul', '首爾 Seoul'],
      ['Asia/Hong_Kong', '香港 Hong Kong'], ['Asia/Singapore', '新加坡 Singapore'], ['Asia/Bangkok', '曼谷 Bangkok'],
      ['Australia/Sydney', '雪梨 Sydney'], ['Europe/London', '倫敦 London'], ['Europe/Berlin', '法蘭克福 Frankfurt'],
      ['America/Los_Angeles', '洛杉磯 Los Angeles'], ['America/New_York', '紐約 New York']
    ];
    var localZone = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    function parts(ms, tz) {
      var f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      var o = {}; f.formatToParts(new Date(ms)).forEach(function (x) { o[x.type] = x.value; });
      if (o.hour === '24') o.hour = '00';
      return o;
    }
    function offsetMs(ms, tz) { var o = parts(ms, tz); return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second) - Math.floor(ms / 1000) * 1000; }
    function toUtc(d, t, tz) {
      var D = d.split('-').map(Number), T = t.split(':').map(Number);
      var guess = Date.UTC(D[0], D[1] - 1, D[2], T[0], T[1]);
      var z = tz === 'local' ? localZone : tz;
      var ms = guess - offsetMs(guess, z);
      return guess - offsetMs(ms, z);
    }
    function render() {
      var d = $('tz-date').value, t = $('tz-time').value; if (!d || !t) return;
      var ms = toUtc(d, t, $('tz-zone').value), body = $('tz-body');
      var base = parts(ms, $('tz-zone').value === 'local' ? localZone : $('tz-zone').value);
      var baseDay = Date.UTC(+base.year, +base.month - 1, +base.day);
      body.textContent = '';
      var zones = ZONES.slice();
      if (!zones.some(function (z) { return z[0] === localZone; })) zones.push([localZone, $('tz').getAttribute('data-local')]);
      zones.forEach(function (z) {
        var o = parts(ms, z[0]), day = Date.UTC(+o.year, +o.month - 1, +o.day);
        var diff = Math.round((day - baseDay) / 864e5);
        var tr = document.createElement('tr'), a = document.createElement('td'), b = document.createElement('td');
        a.textContent = zh ? z[1] : z[1].replace(/^[^\x00-\x7F]+\s*/, '');
        b.textContent = o.year + '-' + o.month + '-' + o.day + ' ' + o.hour + ':' + o.minute + (diff ? ' (' + (diff > 0 ? '+' : '') + diff + 'd)' : '');
        if (z[0] === 'Asia/Taipei' || z[0] === 'UTC') tr.className = 'hl';
        tr.appendChild(a); tr.appendChild(b); body.appendChild(tr);
      });
    }
    function now() {
      var o = parts(Date.now(), $('tz-zone').value === 'local' ? localZone : $('tz-zone').value);
      $('tz-date').value = o.year + '-' + o.month + '-' + o.day;
      $('tz-time').value = o.hour + ':' + o.minute;
      render();
    }
    ['tz-date', 'tz-time', 'tz-zone'].forEach(function (id) { $(id).addEventListener('input', render); $(id).addEventListener('change', render); });
    $('tz-now').addEventListener('click', now);
    now();
  }

  function init() { try { initMap(); } catch (e) { if (window.console) console.error(e); } initPlanner(); initTz(); }
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
