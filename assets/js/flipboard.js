// 復古翻頁式航班看板（split-flap）。純 CSS 3D 翻牌＋少量 JS，不需要任何外部套件。
// 所有字元都用 textContent 寫入，來源資料不會被當成 HTML。
(function () {
  'use strict';
  var SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/ ';
  var MAX_ROLL = 9;          // 單一格最多連翻幾下（距離太遠就從目標前幾格開始轉）
  var STEP_MS = 110;         // 每一下翻牌的時間
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function half(cls) {
    var h = document.createElement('div'); h.className = 'h ' + cls;
    var s = document.createElement('span'); s.textContent = ' ';
    h.appendChild(s); return h;
  }
  function setText(node, ch) { node.firstChild.textContent = ch; }

  function Tile(parent, cls) {
    var t = document.createElement('div'); t.className = 'tile' + (cls ? ' ' + cls : '');
    this.up = half('up'); this.lo = half('lo'); this.ft = half('ft'); this.fb = half('fb');
    [this.up, this.lo, this.ft, this.fb].forEach(function (n) { t.appendChild(n); });
    parent.appendChild(t);
    this.el = t; this.ch = ' '; this.token = 0;
  }
  Tile.prototype.show = function (ch) {
    this.ch = ch; [this.up, this.lo, this.ft, this.fb].forEach(function (n) { setText(n, ch); });
    this.el.classList.remove('go');
  };
  Tile.prototype.flipOnce = function (to, done) {
    var self = this, from = this.ch;
    setText(this.up, to); setText(this.fb, to); setText(this.ft, from); setText(this.lo, from);
    this.el.classList.remove('go'); void this.el.offsetWidth;   // 重新啟動動畫
    this.el.classList.add('go');
    setTimeout(function () { self.show(to); done && done(); }, STEP_MS);
  };
  Tile.prototype.setTo = function (to, delay) {
    var self = this, tk = ++this.token;
    if (to === this.ch) return;
    if (reduce || SET.indexOf(to) === -1) { this.show(SET.indexOf(to) === -1 ? ' ' : to); return; }
    var from = SET.indexOf(this.ch), target = SET.indexOf(to), n = SET.length;
    var dist = (target - from + n) % n;
    var cur = dist > MAX_ROLL ? (target - MAX_ROLL + n) % n : from;
    if (dist > MAX_ROLL) this.show(SET.charAt(cur));
    function step() {
      if (tk !== self.token) return;             // 被新的指令取代
      if (cur === target) return;
      cur = (cur + 1) % n;
      self.flipOnce(SET.charAt(cur), step);
    }
    setTimeout(step, delay || 0);
  };

  function create(root, opts) {
    var cols = opts.cols, rows = opts.rows, tiles = [];
    root.textContent = '';
    for (var r = 0; r < rows; r++) {
      var row = document.createElement('div'); row.className = 'fb-row';
      var rowTiles = [];
      cols.forEach(function (c) {
        var g = document.createElement('div'); g.className = 'fb-col ' + c.cls;
        var list = [];
        for (var i = 0; i < c.len; i++) list.push(new Tile(g, c.cls));
        row.appendChild(g); rowTiles.push(list);
      });
      root.appendChild(row); tiles.push(rowTiles);
    }
    return {
      // data: 二維陣列 [[欄1, 欄2, ...], ...]；不足的列會翻成空白
      set: function (data) {
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols.length; c++) {
            var text = (data[r] && data[r][c] != null ? String(data[r][c]) : '').toUpperCase();
            for (var i = 0; i < cols[c].len; i++) {
              var ch = text.charAt(i) || ' ';
              tiles[r][c][i].setTo(ch, r * 70 + c * 40 + i * 25);   // 由上而下、由左而右依序翻動
            }
          }
        }
      }
    };
  }
  window.CALVAFlipBoard = { create: create };
})();
