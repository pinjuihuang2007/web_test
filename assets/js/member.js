// 會員數位識別證：vAMSYS 機師登入（OAuth 授權碼 + PKCE，公開客戶端）。
// - 不使用 client secret；換權杖時用 code_verifier 證明身分。
// - 權杖與資料只存在這個瀏覽器分頁（sessionStorage），不會傳到本站或任何資料庫。
// - 畫面上的所有文字都用 textContent 顯示，避免被塞入惡意內容。
(function () {
  'use strict';

  var box = document.getElementById('member-box');
  if (!box) return;

  var cfg = (window.SITE_CONFIG && window.SITE_CONFIG.vamsys) || {};
  var CLIENT_ID = cfg.clientId;
  var SCOPE = cfg.scope || 'identity:basic pilot:read flights:read';
  var AUTH_URL = cfg.authorizeUrl || 'https://vamsys.io/oauth/authorize';
  var TOKEN_URL = cfg.tokenUrl || 'https://vamsys.io/oauth/token';
  var API = (cfg.apiBase || 'https://vamsys.io/api/v3/pilot').replace(/\/$/, '');
  var REDIRECT = cfg.redirectUri || (window.location.origin + '/');
  var PROXY = cfg.proxyUrl || '';   // 有填才改走 Supabase Edge Function

  var loginBox = document.getElementById('member-login');
  var loginBtn = document.getElementById('member-login-btn');
  var statusEl = document.getElementById('member-status');
  var cardEl = document.getElementById('member-card');
  var T = function (k) { return box.getAttribute('data-' + k) || ''; };

  var PKCE_KEY = 'calva_pkce', TOKEN_KEY = 'calva_token';

  /* ---------------- 小工具 ---------------- */
  function b64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function randomString(byteLen) {
    var a = new Uint8Array(byteLen);
    window.crypto.getRandomValues(a);
    return b64url(a);
  }
  function store(key, value) { try { sessionStorage.setItem(key, value); } catch (e) {} }
  function load(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function drop(key) { try { sessionStorage.removeItem(key); } catch (e) {} }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function setStatus(text) {
    statusEl.textContent = text || '';
    statusEl.hidden = !text;
  }
  function showLogin() {
    loginBox.hidden = false;
    cardEl.hidden = true;
  }
  function cleanUrl() {
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }

  /* ---------------- 1) 開始登入 ---------------- */
  async function startLogin() {
    if (!CLIENT_ID) { setStatus(T('failed')); return; }
    if (!(window.crypto && window.crypto.subtle)) { setStatus(T('failed')); return; }
    var verifier = randomString(64);
    var state = randomString(16);
    var digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    store(PKCE_KEY, JSON.stringify({ v: verifier, s: state, r: window.location.pathname }));
    var q = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT,
      response_type: 'code',
      scope: SCOPE,
      state: state,
      code_challenge: b64url(new Uint8Array(digest)),
      code_challenge_method: 'S256'
    });
    window.location.href = AUTH_URL + '?' + q.toString();
  }

  /* ---------------- 2) 登入完成後，用授權碼換權杖 ---------------- */
  async function finishLogin(code, state) {
    var saved = null;
    try { saved = JSON.parse(load(PKCE_KEY) || 'null'); } catch (e) {}
    drop(PKCE_KEY);
    cleanUrl();
    if (!saved || !saved.v || saved.s !== state) { showLogin(); setStatus(T('denied')); return; }

    setStatus(T('loading'));
    loginBox.hidden = true;
    var res;
    try {
      res = PROXY
        ? await fetch(PROXY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'token', code: code, code_verifier: saved.v, redirect_uri: REDIRECT })
          })
        : await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: CLIENT_ID,
              redirect_uri: REDIRECT,
              code: code,
              code_verifier: saved.v
            }).toString()
          });
    } catch (e) { showLogin(); setStatus(T('network')); return; }

    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || !data.access_token) { showLogin(); setStatus(T('denied')); return; }

    store(TOKEN_KEY, JSON.stringify({
      t: data.access_token,
      e: Date.now() + (Number(data.expires_in) || 3600) * 1000
    }));

    // 如果是從英文頁出發的，登入後回到原本那一頁
    if (saved.r && saved.r !== window.location.pathname && /^\/[A-Za-z0-9._\-\/]*$/.test(saved.r)) {
      window.location.replace(saved.r + '#member');
      return;
    }
    loadProfile();
  }

  /* ---------------- 3) 讀取本人資料並顯示 ---------------- */
  function getToken() {
    var raw = load(TOKEN_KEY), t = null;
    try { t = JSON.parse(raw || 'null'); } catch (e) {}
    if (!t || !t.t || t.e < Date.now()) { drop(TOKEN_KEY); return null; }
    return t.t;
  }

  function api(path, token) {
    return fetch(API + path, { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' } })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { var e = new Error('auth'); e.code = 'auth'; throw e; }
        if (!r.ok) { var e2 = new Error('http'); e2.code = 'http'; throw e2; }
        return r.json();
      });
  }

  function viaProxyProfile(token) {
    return fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'profile', access_token: token })
    }).then(function (r) {
      if (r.status === 401) { var e = new Error('auth'); e.code = 'auth'; throw e; }
      if (!r.ok) { var e2 = new Error('http'); e2.code = 'http'; throw e2; }
      return r.json();
    }).then(function (d) { return [d.user, d.profile]; });
  }

  async function loadProfile() {
    var token = getToken();
    if (!token) { showLogin(); return; }
    loginBox.hidden = true;
    setStatus(T('loading'));
    try {
      var results = PROXY ? await viaProxyProfile(token) : await Promise.all([
        api('/user', token),
        api('/profile', token).catch(function (e) { if (e.code === 'auth') throw e; return null; })
      ]);
      render(results[0], results[1]);
      setStatus('');
      if (!PROXY) loadMap(token);
    } catch (e) {
      if (e.code === 'auth') { drop(TOKEN_KEY); showLogin(); setStatus(T('expired')); }
      else if (e.code === 'http') { showLogin(); setStatus(T('failed')); }
      else { showLogin(); setStatus(T('network')); }
    }
  }

  function unwrap(o) { return (o && typeof o === 'object' && o.data && typeof o.data === 'object') ? o.data : o; }
  function scalar(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string' || typeof v === 'number') return v;
    if (typeof v === 'object' && v.name && typeof v.name === 'string') return v.name;   // 例如 rank: { name: "..." }
    return null;
  }
  function pick(objs, keys) {
    for (var i = 0; i < keys.length; i++)
      for (var j = 0; j < objs.length; j++) {
        if (!objs[j]) continue;
        var v = scalar(objs[j][keys[i]]);
        if (v !== null && v !== '') return v;
      }
    return null;
  }
  function fmtDate(v) {
    if (v === null) return null;
    var d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.getFullYear() + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2);
  }

  function render(userRaw, profileRaw) {
    var objs = [unwrap(userRaw), unwrap(profileRaw)];
    var name = pick(objs, ['name', 'full_name', 'display_name', 'username']);
    var callsign = pick(objs, ['callsign', 'username', 'pilot_id']);
    var rank = pick(objs, ['rank']);
    var hours = pick(objs, ['total_hours', 'flight_hours', 'hours']);
    var flights = pick(objs, ['total_flights', 'flights', 'flight_count']);
    var joined = fmtDate(pick(objs, ['joined_at', 'join_date', 'created_at']));

    cardEl.textContent = '';
    var top = el('div', 'top-row');
    var left = el('div');
    left.appendChild(el('div', 'kicker', 'CALVA DIGITAL ID'));
    left.appendChild(el('h3', '', name || '—'));
    if (callsign && callsign !== name) left.appendChild(el('div', 'sub-line', callsign));
    top.appendChild(left);
    if (rank) top.appendChild(el('div', 'rank', rank));
    cardEl.appendChild(top);

    var known = [[T('hours'), hours], [T('flights'), flights], [T('joined'), joined]];
    if (known.some(function (k) { return k[1] !== null; })) {
      var grid = el('div', 'grid3');
      known.forEach(function (k) {
        var cell = el('div');
        cell.appendChild(el('span', '', k[0]));
        cell.appendChild(el('b', '', k[1] !== null ? k[1] : '—'));
        grid.appendChild(cell);
      });
      cardEl.appendChild(grid);
    }

    // 還沒對上欄位名稱時，列出回傳的簡單欄位（排除可能敏感的欄位），方便確認 vAMSYS 實際回傳的內容
    if (!name || (hours === null && flights === null)) {
      var dl = el('dl'), count = 0;
      objs.forEach(function (o) {
        if (!o || typeof o !== 'object') return;
        Object.keys(o).forEach(function (k) {
          var v = scalar(o[k]);
          if (v === null || count >= 14 || /token|secret|password|email|phone|address/i.test(k)) return;
          dl.appendChild(el('dt', '', k)); dl.appendChild(el('dd', '', v)); count++;
        });
      });
      if (count) cardEl.appendChild(dl);
    }

    var out = el('button', 'out', T('logout'));
    out.type = 'button';
    out.addEventListener('click', function () {
      drop(TOKEN_KEY); cardEl.hidden = true; cardEl.textContent = ''; if (mapBox) { mapBox.hidden = true; mapBox.textContent = ''; box.classList.remove('has-map'); } setStatus(''); showLogin();
    });
    cardEl.appendChild(out);
    cardEl.hidden = false;
  }


  /* ---------------- 我的航線圖（實驗功能） ----------------
     vAMSYS 的航班紀錄欄位名稱我們還沒有實際驗證過，所以這裡盡量寬鬆地讀取；
     讀不到任何航線時就不顯示這一塊，不會影響會員證本身。 */
  var mapBox = document.getElementById('member-map');
  var AIRPORTS = window.CALVA_AIRPORTS || {};
  function icao(v) {
    if (!v) return null;
    if (typeof v === 'string') { v = v.trim(); return /^[A-Za-z]{4}$/.test(v) ? v.toUpperCase() : null; }
    if (typeof v === 'object') return icao(v.icao || v.icao_code || v.ident || v.code || v.airport);
    return null;
  }
  function routeOf(it) {
    if (!it || typeof it !== 'object') return null;
    var d = icao(it.departure_airport) || icao(it.departure) || icao(it.dep) || icao(it.dep_icao) || icao(it.origin) || icao(it.from) ||
            icao(it.departure_icao) || icao(it.departure_airport_icao) || icao(it.departureAirport);
    var a = icao(it.arrival_airport) || icao(it.arrival) || icao(it.arr) || icao(it.arr_icao) || icao(it.destination) || icao(it.to) ||
            icao(it.arrival_icao) || icao(it.arrival_airport_icao) || icao(it.arrivalAirport);
    return d && a ? [d, a] : null;
  }
  async function fetchRoutes(token) {
    var paths = ['/flights', '/pireps', '/flights/history'];
    for (var i = 0; i < paths.length; i++) {
      try {
        var d = await api(paths[i], token);
        var list = Array.isArray(d) ? d : (d && (d.data || d.flights || d.pireps)) || [];
        if (!Array.isArray(list)) continue;
        var routes = list.map(routeOf).filter(Boolean);
        if (routes.length) return routes;
      } catch (e) { if (e && e.code === 'auth') return []; }
    }
    return [];
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function drawMap(routes) {
    var pts = {}, pairs = {}, total = routes.length;
    routes.forEach(function (r) {
      if (!AIRPORTS[r[0]] || !AIRPORTS[r[1]] || r[0] === r[1]) return;
      pts[r[0]] = AIRPORTS[r[0]]; pts[r[1]] = AIRPORTS[r[1]];
      var key = [r[0], r[1]].sort().join('-'); pairs[key] = (pairs[key] || 0) + 1;
    });
    var codes = Object.keys(pts);
    if (!codes.length) return;
    var lons = codes.map(function (c) { return pts[c][1]; });
    var wrap = Math.max.apply(null, lons) - Math.min.apply(null, lons) > 180;     // 跨太平洋：把西半球加 360 度接起來
    var P = {};
    codes.forEach(function (c) { P[c] = [pts[c][0], wrap && pts[c][1] < 0 ? pts[c][1] + 360 : pts[c][1]]; });
    var la = codes.map(function (c) { return P[c][0]; }), lo = codes.map(function (c) { return P[c][1]; });
    var minLa = Math.min.apply(null, la), maxLa = Math.max.apply(null, la), minLo = Math.min.apply(null, lo), maxLo = Math.max.apply(null, lo);
    var spanLa = Math.max(maxLa - minLa, 6), spanLo = Math.max(maxLo - minLo, 8);
    var W = 600, H = 340, pad = 46, sc = Math.min((W - 2 * pad) / spanLo, (H - 2 * pad) / spanLa);
    var cLo = (minLo + maxLo) / 2, cLa = (minLa + maxLa) / 2;
    var X = function (c) { return (P[c][1] - cLo) * sc + W / 2; }, Y = function (c) { return H / 2 - (P[c][0] - cLa) * sc; };

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': mapBox.getAttribute('data-title') || '' });
    for (var g = 1; g < 6; g++) {                                                   // 淡淡的格線
      svg.appendChild(svgEl('line', { x1: g * W / 6, y1: 0, x2: g * W / 6, y2: H, class: 'grid' }));
      if (g < 4) svg.appendChild(svgEl('line', { x1: 0, y1: g * H / 4, x2: W, y2: g * H / 4, class: 'grid' }));
    }
    Object.keys(pairs).forEach(function (k) {
      var ab = k.split('-'), x1 = X(ab[0]), y1 = Y(ab[0]), x2 = X(ab[1]), y2 = Y(ab[1]);
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var cx = mx - dy / len * len * 0.18, cy = my + dx / len * len * 0.18 - len * 0.05;
      svg.appendChild(svgEl('path', { d: 'M' + x1 + ' ' + y1 + ' Q' + cx + ' ' + cy + ' ' + x2 + ' ' + y2, class: 'route', 'stroke-width': Math.min(1.4 + pairs[k] * 0.5, 4) }));
    });
    codes.forEach(function (c) {
      svg.appendChild(svgEl('circle', { cx: X(c), cy: Y(c), r: 4.2, class: 'ap' }));
      var t = svgEl('text', { x: X(c), y: Y(c) - 9, 'text-anchor': 'middle', class: 'apl' });
      t.textContent = c; svg.appendChild(t);
    });

    mapBox.textContent = '';
    var h = el('h4', '', mapBox.getAttribute('data-title') || '');
    var sum = el('p', 'sum', total + ' ' + (mapBox.getAttribute('data-flights') || '') + ' · ' +
      Object.keys(pairs).length + ' ' + (mapBox.getAttribute('data-routes') || '') + ' · ' + codes.length + ' ' + (mapBox.getAttribute('data-airports') || ''));
    mapBox.appendChild(h); mapBox.appendChild(svg); mapBox.appendChild(sum);
    mapBox.hidden = false;
    box.classList.add('has-map');
  }
  async function loadMap(token) {
    if (!mapBox) return;
    try { var routes = await fetchRoutes(token); if (routes.length) drawMap(routes); } catch (e) { /* 讀不到就不顯示 */ }
  }

  /* ---------------- 進入頁面時的流程 ---------------- */
  if (loginBtn) loginBtn.addEventListener('click', function () { startLogin(); });

  var params = new URLSearchParams(window.location.search);
  if (params.has('error')) {
    cleanUrl(); drop(PKCE_KEY); showLogin(); setStatus(T('denied'));
  } else if (params.has('code')) {
    finishLogin(params.get('code'), params.get('state'));
  } else if (getToken()) {
    loadProfile();
  }
})();
