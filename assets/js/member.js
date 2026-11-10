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
      drop(TOKEN_KEY); cardEl.hidden = true; cardEl.textContent = ''; setStatus(''); showLogin();
    });
    cardEl.appendChild(out);
    cardEl.hidden = false;
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
